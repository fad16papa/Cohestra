"""Parse owner trust material and GitHub read-only evidence.

This module does not sign, does not generate keys, and does not choose a
verdict. Callers supply bytes they already fetched with GET. A recorded
comment, a check-run output body, and a caller flag are not inputs.
"""

from __future__ import annotations

import base64
import hashlib
import json
import math
import re
from dataclasses import dataclass
from urllib.parse import urlsplit

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from .authorization import OwnerKeyError, OwnerKeyring, verify_owner_authorization
from .manifest import KEY_FINGERPRINT_RE, KEY_ID_RE, SHA_RE, Manifest, ManifestError, path_allowed

API_ORIGIN = "https://api.github.com"
MANIFEST_PATH = ".cohestra/story-manifest.json"
MAX_MANIFEST_BYTES = 65536
MAX_RESPONSE_BYTES = 2_000_000
MAX_MAP_BYTES = 8192
MAX_CHECK_PAGES = 20
CHECK_PAGE_SIZE = 100
COMPARE_FILE_CAP = 300
GITHUB_ACTIONS_APP_ID = 15368
ROLES = ("bmad", "catsec")

EVENT_INVALID = "event fields are invalid"
REPLAY_MISMATCH = "replay fingerprint does not match"
NOT_ENABLED = "trust evaluator is not enabled"
MATERIAL_MISSING = "trust material is missing"
MATERIAL_INVALID = "trust material is invalid"
UNAVAILABLE = "trusted verification is unavailable"
PULL_UNREADABLE = "pull request is not readable"
STALE_CLAIM = "claimed head does not match the pull request"
NOT_SAME_REPO = "pull request is not an open same-repository request"
BASE_NOT_MAIN = "base ref is not main"
MANIFEST_MISSING = "manifest is missing"
MANIFEST_INVALID = "manifest is invalid"
SIGNATURE_REJECTED = "owner signature was not accepted"
BINDING_MISMATCH = "manifest binding does not match"
SCOPE_OUTSIDE = "changed files are outside the manifest"
WORKFLOW_PATH = "changed files include workflow paths"
COMPARE_INCOMPLETE = "compare evidence is incomplete"
REVIEW_MISSING = "review evidence is missing"
REVIEW_UNTRUSTED = "review evidence is not trusted"
CHECKS_UNTRUSTED = "required checks are not trusted"
ACTIONS_UNCONFIRMED = "github-actions producer is not confirmed"
CLOSING_MISMATCH = "closing read does not match"
API_FAILURE = "github api failure"
STORE_UNREADABLE = "replay store is unreadable"
NO_AUTHORITY = "execution authority is not granted"
PASS_REASON = "evidence matched the trusted evaluator rules"

_EVENT_NAME_RE = re.compile(r"^pull_request_target$")
_EVENT_ID_RE = re.compile(r"^[1-9][0-9]{0,18}$")
_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_PULL_RE = re.compile(r"^[1-9][0-9]{0,9}$")
_APP_ID_RE = re.compile(r"^[1-9][0-9]{0,11}$")
_CHECK_NAME_RE = re.compile(r"^[^\r\n]{1,100}$")
_TASK_RE = re.compile(r"^[^\r\n]{1,200}$")
_FILE_STATUSES = frozenset({"added", "removed", "modified", "renamed", "copied", "changed", "unchanged"})
_WORKFLOW_FILE_RE = re.compile(r"^\.github/workflows/[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.ya?ml$")
_ACTIONS_DETAILS_RE = re.compile(
    r"^https://github\.com/(?P<repo>[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)/actions/runs/(?P<run>[1-9][0-9]{0,18})/job/[1-9][0-9]{0,18}$"
)
_ACTIONS_EVENTS = frozenset({"pull_request", "push"})
_PERMISSION_KEYS = frozenset(
    {
        "actions",
        "artifact-metadata",
        "attestations",
        "checks",
        "contents",
        "deployments",
        "discussions",
        "id-token",
        "issues",
        "models",
        "packages",
        "pages",
        "pull-requests",
        "repository-projects",
        "security-events",
        "statuses",
    }
)
_PERMISSION_LINE_RE = re.compile(r"([A-Za-z][A-Za-z0-9_-]*): (read|none)\Z")
_MAX_ACTIONS_RUNS = 20


class TransportRefused(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class EventClaim:
    name: str
    event_id: str
    repository: str
    pull_number: int
    claimed_head: str


@dataclass(frozen=True)
class CheckPin:
    name: str
    app_id: int
    workflow: str | None = None


@dataclass(frozen=True)
class TrustConfig:
    key_id: str
    public_key: bytes
    fingerprint: str
    task_id: str
    bmad_app_id: int
    catsec_app_id: int
    bmad_check_name: str
    catsec_check_name: str
    checks_map: dict[str, CheckPin]


@dataclass(frozen=True)
class PullFacts:
    number: int
    state: str
    changed_files: int
    author: str
    head_sha: str
    head_repo: str
    base_sha: str
    base_ref: str
    base_repo: str


@dataclass(frozen=True)
class ChangedFile:
    path: str
    previous: str | None


@dataclass(frozen=True)
class CheckRun:
    name: str
    app_id: int
    slug: str | None
    head_sha: str
    status: str
    conclusion: str | None
    suite_id: int | None = None
    actions_repo: str | None = None
    actions_run_id: int | None = None


def fingerprint(claim: EventClaim) -> str:
    body = {
        "claimed_head": claim.claimed_head,
        "pull_number": claim.pull_number,
        "repository": claim.repository,
    }
    encoded = json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def parse_event(env: dict[str, str]) -> tuple[EventClaim | None, str | None]:
    name = env.get("EVENT_NAME", "")
    event_id = env.get("EVENT_ID", "")
    repository = env.get("REPOSITORY", "")
    pull_text = env.get("PULL_NUMBER", "")
    claimed = env.get("CLAIMED_HEAD_SHA", "")
    if (
        _EVENT_NAME_RE.fullmatch(name) is None
        or _EVENT_ID_RE.fullmatch(event_id) is None
        or _REPO_RE.fullmatch(repository) is None
        or _PULL_RE.fullmatch(pull_text) is None
        or SHA_RE.fullmatch(claimed) is None
    ):
        return None, EVENT_INVALID
    return EventClaim(name, event_id, repository, int(pull_text), claimed), None


def parse_config(env: dict[str, str]) -> tuple[TrustConfig | None, str | None]:
    enabled = env.get("COHESTRA_TRUST_EVALUATOR_ENABLED")
    if enabled != "true":
        return None, NOT_ENABLED
    keys = (
        "COHESTRA_OWNER_KEY_ID",
        "COHESTRA_OWNER_PUBLIC_KEY",
        "COHESTRA_OWNER_PUBLIC_KEY_SHA256",
        "COHESTRA_APPROVED_TASK_ID",
        "COHESTRA_REVIEW_APP_BMAD_ID",
        "COHESTRA_REVIEW_APP_CATSEC_ID",
        "COHESTRA_REVIEW_BMAD_CHECK_NAME",
        "COHESTRA_REVIEW_CATSEC_CHECK_NAME",
        "COHESTRA_REQUIRED_CHECKS_MAP",
    )
    if any(not env.get(key) for key in keys):
        return None, MATERIAL_MISSING
    key_id = env["COHESTRA_OWNER_KEY_ID"]
    fingerprint_text = env["COHESTRA_OWNER_PUBLIC_KEY_SHA256"]
    task_id = env["COHESTRA_APPROVED_TASK_ID"]
    bmad_name = env["COHESTRA_REVIEW_BMAD_CHECK_NAME"]
    catsec_name = env["COHESTRA_REVIEW_CATSEC_CHECK_NAME"]
    if (
        KEY_ID_RE.fullmatch(key_id) is None
        or KEY_FINGERPRINT_RE.fullmatch(fingerprint_text) is None
        or _TASK_RE.fullmatch(task_id) is None
        or _CHECK_NAME_RE.fullmatch(bmad_name) is None
        or _CHECK_NAME_RE.fullmatch(catsec_name) is None
        or bmad_name == catsec_name
    ):
        return None, MATERIAL_INVALID
    try:
        public_key = base64.b64decode(env["COHESTRA_OWNER_PUBLIC_KEY"], validate=True)
        Ed25519PublicKey.from_public_bytes(public_key)
    except ValueError:
        return None, MATERIAL_INVALID
    if len(public_key) != 32 or hashlib.sha256(public_key).hexdigest() != fingerprint_text:
        return None, MATERIAL_INVALID
    bmad_id = _app_id(env["COHESTRA_REVIEW_APP_BMAD_ID"])
    catsec_id = _app_id(env["COHESTRA_REVIEW_APP_CATSEC_ID"])
    if bmad_id is None or catsec_id is None or bmad_id == catsec_id:
        return None, MATERIAL_INVALID
    if bmad_id == GITHUB_ACTIONS_APP_ID or catsec_id == GITHUB_ACTIONS_APP_ID:
        return None, MATERIAL_INVALID
    checks_map, map_reason = _checks_map(env["COHESTRA_REQUIRED_CHECKS_MAP"])
    if map_reason is not None or checks_map is None:
        return None, map_reason or MATERIAL_INVALID
    return (
        TrustConfig(
            key_id,
            public_key,
            fingerprint_text,
            task_id,
            bmad_id,
            catsec_id,
            bmad_name,
            catsec_name,
            checks_map,
        ),
        None,
    )


def refuse_unless_get(url: str) -> None:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != "api.github.com":
        raise TransportRefused("host")
    if parsed.port not in (None, 443) or parsed.username or parsed.password or parsed.fragment:
        raise TransportRefused("host")
    if not parsed.path.startswith("/repos/"):
        raise TransportRefused("path")


def pull_url(repository: str, number: int) -> str:
    return f"{API_ORIGIN}/repos/{repository}/pulls/{number}"


def compare_url(repository: str, base_sha: str, head_sha: str) -> str:
    return f"{API_ORIGIN}/repos/{repository}/compare/{base_sha}...{head_sha}"


def manifest_url(repository: str, head_sha: str) -> str:
    return contents_url(repository, MANIFEST_PATH, head_sha)


def contents_url(repository: str, path: str, ref: str) -> str:
    return f"{API_ORIGIN}/repos/{repository}/contents/{path}?ref={ref}"


def workflow_run_url(repository: str, run_id: int) -> str:
    return f"{API_ORIGIN}/repos/{repository}/actions/runs/{run_id}"


def check_runs_url(repository: str, head_sha: str, page: int) -> str:
    return (
        f"{API_ORIGIN}/repos/{repository}/commits/{head_sha}/check-runs"
        f"?filter=all&per_page={CHECK_PAGE_SIZE}&page={page}"
    )


def load_object(data: bytes, *, limit: int, reject_floats: bool) -> tuple[dict[str, object] | None, str | None]:
    if len(data) > limit:
        return None, "oversize"
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return None, "json"
    try:
        parsed = json.loads(text, object_pairs_hook=_pairs, parse_constant=_reject_constant)
    except (json.JSONDecodeError, ValueError):
        return None, "json"
    if not isinstance(parsed, dict):
        return None, "json"
    if _bad_number(parsed, reject_floats):
        return None, "nonfinite"
    return parsed, None


def decode_manifest_response(payload: dict[str, object]) -> tuple[bytes | None, str | None]:
    if payload.get("type") != "file" or payload.get("encoding") != "base64":
        return None, MANIFEST_MISSING
    size = payload.get("size")
    content = payload.get("content")
    if type(size) is not int or size < 0 or size > MAX_MANIFEST_BYTES or not isinstance(content, str):
        return None, MANIFEST_INVALID
    try:
        raw = base64.b64decode("".join(content.split()), validate=True)
    except (ValueError, TypeError):
        return None, MANIFEST_INVALID
    if len(raw) != size:
        return None, MANIFEST_INVALID
    return raw, None


def parse_pull(payload: dict[str, object], *, repository: str, number: int) -> tuple[PullFacts | None, str | None]:
    if payload.get("number") != number:
        return None, PULL_UNREADABLE
    state = payload.get("state")
    author = _login(payload.get("user"))
    head_sha, head_repo = _ref_side(payload.get("head"))
    base_sha, base_repo = _ref_side(payload.get("base"))
    base_ref = payload.get("base").get("ref") if isinstance(payload.get("base"), dict) else None
    changed = payload.get("changed_files")
    if (
        not isinstance(state, str)
        or author is None
        or head_sha is None
        or head_repo is None
        or base_sha is None
        or base_repo is None
        or not isinstance(base_ref, str)
        or type(changed) is not int
        or changed < 0
    ):
        return None, PULL_UNREADABLE
    return PullFacts(number, state, changed, author, head_sha, head_repo, base_sha, base_ref, base_repo), None


def structural_hold(facts: PullFacts, claim: EventClaim) -> str | None:
    if facts.head_sha != claim.claimed_head:
        return STALE_CLAIM
    if facts.state != "open" or facts.head_repo != facts.base_repo or facts.base_repo != claim.repository:
        return NOT_SAME_REPO
    if facts.base_ref != "main":
        return BASE_NOT_MAIN
    return None


def parse_manifest_bytes(raw: bytes) -> tuple[Manifest | None, str | None]:
    payload, reason = load_object(raw, limit=MAX_MANIFEST_BYTES, reject_floats=True)
    if payload is None:
        return None, MANIFEST_INVALID if reason != "oversize" else MANIFEST_INVALID
    try:
        manifest = Manifest.from_dict(payload)
    except ManifestError:
        return None, MANIFEST_INVALID
    if manifest.manifest_version != 2:
        return None, MANIFEST_INVALID
    return manifest, None


def signature_holds(manifest: Manifest, config: TrustConfig) -> str | None:
    if manifest.owner_key_id != config.key_id or manifest.public_key_sha256 != config.fingerprint:
        return SIGNATURE_REJECTED
    try:
        keyring = OwnerKeyring({config.key_id: config.public_key})
    except OwnerKeyError:
        return MATERIAL_INVALID
    if not verify_owner_authorization(manifest, keyring):
        return SIGNATURE_REJECTED
    return None


def binding_holds(manifest: Manifest, facts: PullFacts, config: TrustConfig) -> str | None:
    if (
        manifest.repo != facts.base_repo
        or manifest.task_id != config.task_id
        or manifest.pull_number != facts.number
        or manifest.base_ref != facts.base_ref
        or manifest.base_sha != facts.base_sha
        or manifest.author_id.casefold() != facts.author.casefold()
    ):
        return BINDING_MISMATCH
    return None


def parse_compare(payload: dict[str, object], facts: PullFacts) -> tuple[tuple[ChangedFile, ...], str | None]:
    status = payload.get("status")
    behind = payload.get("behind_by")
    merge_base = payload.get("merge_base_commit")
    merge_sha = merge_base.get("sha") if isinstance(merge_base, dict) else None
    files = payload.get("files")
    if status not in {"ahead", "identical"} or type(behind) is not int or behind != 0:
        return (), COMPARE_INCOMPLETE
    if merge_sha != facts.base_sha:
        return (), COMPARE_INCOMPLETE
    if status == "identical" and facts.head_sha != facts.base_sha:
        return (), COMPARE_INCOMPLETE
    if not isinstance(files, list) or len(files) >= COMPARE_FILE_CAP or len(files) != facts.changed_files:
        return (), COMPARE_INCOMPLETE
    parsed: list[ChangedFile] = []
    for item in files:
        changed, reason = _one_file(item)
        if reason is not None or changed is None:
            return (), reason or COMPARE_INCOMPLETE
        parsed.append(changed)
    return tuple(parsed), None


def scope_holds(files: tuple[ChangedFile, ...], manifest: Manifest) -> str | None:
    paths: list[str] = []
    for item in files:
        paths.append(item.path)
        if item.previous is not None:
            paths.append(item.previous)
    if any(_workflow_path(path) for path in paths):
        return WORKFLOW_PATH
    if any(not path_allowed(path, manifest.allowed_paths) for path in paths):
        return SCOPE_OUTSIDE
    return None


def parse_check_page(payload: dict[str, object]) -> tuple[int | None, tuple[CheckRun, ...], str | None]:
    total = payload.get("total_count")
    rows = payload.get("check_runs")
    if type(total) is not int or total < 0 or total > MAX_CHECK_PAGES * CHECK_PAGE_SIZE:
        return None, (), REVIEW_UNTRUSTED
    if not isinstance(rows, list) or len(rows) > CHECK_PAGE_SIZE:
        return None, (), REVIEW_UNTRUSTED
    runs: list[CheckRun] = []
    for item in rows:
        run, reason = _one_run(item)
        if reason is not None or run is None:
            return None, (), reason or REVIEW_UNTRUSTED
        runs.append(run)
    return total, tuple(runs), None


def reviewer_hold(runs: tuple[CheckRun, ...], config: TrustConfig, head: str, author: str) -> str | None:
    pairs = (
        (config.bmad_app_id, config.bmad_check_name),
        (config.catsec_app_id, config.catsec_check_name),
    )
    for app_id, name in pairs:
        matched = [run for run in runs if run.app_id == app_id and run.name == name]
        if not matched:
            return REVIEW_MISSING
        good = [
            run
            for run in matched
            if run.status == "completed"
            and run.conclusion == "success"
            and run.head_sha == head
            and isinstance(run.slug, str)
        ]
        if len(good) != len(matched):
            return REVIEW_UNTRUSTED
        if any(_author_app(run.slug or "", author) for run in good):
            return REVIEW_UNTRUSTED
    return None


def required_checks_hold(
    runs: tuple[CheckRun, ...],
    manifest: Manifest,
    config: TrustConfig,
    head: str,
    *,
    repository: str | None = None,
    base_sha: str | None = None,
    proof: object | None = None,
) -> str | None:
    for entry in manifest.required_checks:
        pinned = config.checks_map.get(entry)
        if pinned is None:
            return CHECKS_UNTRUSTED
        if pinned.app_id == GITHUB_ACTIONS_APP_ID:
            reason = _actions_hold(runs, pinned, head, repository, base_sha, proof)
            if reason is not None:
                return reason
            continue
        named = [run for run in runs if run.name == pinned.name]
        if not named:
            return CHECKS_UNTRUSTED
        for run in named:
            if run.app_id != pinned.app_id or run.head_sha != head or run.status != "completed" or run.conclusion != "success":
                return CHECKS_UNTRUSTED
    return None


def _actions_hold(
    runs: tuple[CheckRun, ...],
    pin: CheckPin,
    head: str,
    repository: str | None,
    base_sha: str | None,
    proof: object | None,
) -> str | None:
    if pin.workflow is None:
        return ACTIONS_UNCONFIRMED
    if _WORKFLOW_FILE_RE.fullmatch(pin.workflow) is None:
        return CHECKS_UNTRUSTED
    named = [run for run in runs if run.name == pin.name]
    if not named or len(named) > _MAX_ACTIONS_RUNS:
        return CHECKS_UNTRUSTED
    for run in named:
        if (
            run.app_id != GITHUB_ACTIONS_APP_ID
            or run.slug != "github-actions"
            or run.head_sha != head
            or run.status != "completed"
            or run.conclusion != "success"
            or run.suite_id is None
            or run.actions_run_id is None
            or run.actions_repo != repository
        ):
            return CHECKS_UNTRUSTED
        if proof is None or not hasattr(proof, "workflow_run"):
            return CHECKS_UNTRUSTED
        payload = proof.workflow_run(run.actions_run_id)
        if not isinstance(payload, dict) or not _workflow_run_ok(
            payload,
            run_id=run.actions_run_id,
            workflow=pin.workflow,
            head=head,
            repository=repository or "",
            suite_id=run.suite_id,
        ):
            return CHECKS_UNTRUSTED
    if proof is None or base_sha is None or not hasattr(proof, "workflow_file"):
        return CHECKS_UNTRUSTED
    head_bytes = proof.workflow_file(pin.workflow, head)
    base_bytes = proof.workflow_file(pin.workflow, base_sha)
    if not isinstance(head_bytes, bytes) or head_bytes != base_bytes or not _workflow_permissions_ok(head_bytes):
        return CHECKS_UNTRUSTED
    return None


def _workflow_run_ok(
    payload: dict[str, object],
    *,
    run_id: int,
    workflow: str,
    head: str,
    repository: str,
    suite_id: int,
) -> bool:
    repo = payload.get("head_repository")
    full_name = repo.get("full_name") if isinstance(repo, dict) else None
    referenced = payload.get("referenced_workflows")
    return (
        type(payload.get("id")) is int
        and payload.get("id") == run_id
        and payload.get("path") == workflow
        and payload.get("head_sha") == head
        and payload.get("status") == "completed"
        and payload.get("conclusion") == "success"
        and payload.get("event") in _ACTIONS_EVENTS
        and isinstance(referenced, list)
        and referenced == []
        and type(payload.get("check_suite_id")) is int
        and payload.get("check_suite_id") == suite_id
        and full_name == repository
    )


def _workflow_permissions_ok(raw: bytes) -> bool:
    """Accept only explicit read or none grants. Any other permissions shape is refused."""
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return False
    if not text or "\x00" in text:
        return False
    lines = text.splitlines()
    saw_top = False
    index = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped or stripped.startswith("#"):
            index += 1
            continue
        if not _grant_line_allowed(stripped):
            return False
        indent = _indent(lines[index])
        if indent is None:
            return False
        if stripped == "permissions:":
            if indent == 0:
                if saw_top:
                    return False
                saw_top = True
            ok, index = _permission_block(lines, index + 1, indent)
            if not ok:
                return False
            continue
        if stripped.startswith("permissions:"):
            return False
        index += 1
    return saw_top


def _grant_line_allowed(stripped: str) -> bool:
    folded = stripped.casefold()
    if "permission" not in folded and "write" not in folded:
        return True
    return stripped == "permissions:" or _PERMISSION_LINE_RE.fullmatch(stripped) is not None


def _indent(line: str) -> int | None:
    if "\t" in line:
        return None
    count = len(line) - len(line.lstrip(" "))
    return count


def _permission_block(lines: list[str], start: int, parent: int) -> tuple[bool, int]:
    index = start
    count = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped or stripped.startswith("#"):
            index += 1
            continue
        indent = _indent(lines[index])
        if indent is None:
            return False, index
        if indent <= parent:
            break
        matched = _PERMISSION_LINE_RE.fullmatch(stripped)
        if matched is None or matched.group(1) not in _PERMISSION_KEYS:
            return False, index
        count += 1
        index += 1
    return count > 0, index


def _app_id(value: str) -> int | None:
    if _APP_ID_RE.fullmatch(value) is None:
        return None
    number = int(value)
    if number <= 0:
        return None
    return number


def _checks_map(raw: str) -> tuple[dict[str, CheckPin] | None, str | None]:
    if len(raw.encode("utf-8")) > MAX_MAP_BYTES:
        return None, MATERIAL_INVALID
    payload, reason = load_object(raw.encode("utf-8"), limit=MAX_MAP_BYTES, reject_floats=True)
    if payload is None or reason is not None:
        return None, MATERIAL_INVALID
    if len(payload) > 20:
        return None, MATERIAL_INVALID
    mapped: dict[str, CheckPin] = {}
    for key, value in payload.items():
        if _CHECK_NAME_RE.fullmatch(key) is None or not isinstance(value, dict):
            return None, MATERIAL_INVALID
        fields = set(value)
        workflow: str | None = None
        if fields == {"name", "app_id", "workflow"}:
            raw_workflow = value.get("workflow")
            if not isinstance(raw_workflow, str) or _WORKFLOW_FILE_RE.fullmatch(raw_workflow) is None:
                return None, MATERIAL_INVALID
            workflow = raw_workflow
        elif fields != {"name", "app_id"}:
            return None, MATERIAL_INVALID
        name = value.get("name")
        app_id = value.get("app_id")
        if not isinstance(name, str) or _CHECK_NAME_RE.fullmatch(name) is None or type(app_id) is not int or app_id <= 0:
            return None, MATERIAL_INVALID
        if workflow is not None and app_id != GITHUB_ACTIONS_APP_ID:
            return None, MATERIAL_INVALID
        mapped[key] = CheckPin(name, app_id, workflow)
    return mapped, None


def _pairs(items: list[tuple[str, object]]) -> dict[str, object]:
    payload: dict[str, object] = {}
    for key, value in items:
        if key in payload:
            raise ValueError("duplicate")
        payload[key] = value
    return payload


def _reject_constant(value: str) -> object:
    raise ValueError(value)


def _bad_number(value: object, reject_floats: bool) -> bool:
    if isinstance(value, float):
        return reject_floats or not math.isfinite(value)
    if isinstance(value, dict):
        return any(_bad_number(item, reject_floats) for item in value.values())
    if isinstance(value, list):
        return any(_bad_number(item, reject_floats) for item in value)
    return False


def _login(value: object) -> str | None:
    if not isinstance(value, dict):
        return None
    login = value.get("login")
    if not isinstance(login, str) or not login or any(ch in login for ch in "\r\n"):
        return None
    return login


def _ref_side(value: object) -> tuple[str | None, str | None]:
    if not isinstance(value, dict):
        return None, None
    sha = value.get("sha")
    repo = value.get("repo")
    full_name = repo.get("full_name") if isinstance(repo, dict) else None
    if not isinstance(sha, str) or SHA_RE.fullmatch(sha) is None:
        return None, None
    if not isinstance(full_name, str) or _REPO_RE.fullmatch(full_name) is None:
        return None, None
    return sha, full_name


def _clean_path(path: str) -> str | None:
    if not path or len(path) > 300 or path.startswith("/") or "\\" in path or "\x00" in path:
        return None
    if any(part in {"", ".", ".."} for part in path.split("/")):
        return None
    return path


def _one_file(item: object) -> tuple[ChangedFile | None, str | None]:
    if not isinstance(item, dict):
        return None, COMPARE_INCOMPLETE
    filename = item.get("filename")
    status = item.get("status")
    if not isinstance(filename, str) or not isinstance(status, str) or status not in _FILE_STATUSES:
        return None, COMPARE_INCOMPLETE
    path = _clean_path(filename)
    if path is None:
        return None, COMPARE_INCOMPLETE
    previous: str | None = None
    raw_previous = item.get("previous_filename")
    if status in {"renamed", "copied"}:
        if not isinstance(raw_previous, str):
            return None, COMPARE_INCOMPLETE
        previous = _clean_path(raw_previous)
        if previous is None:
            return None, COMPARE_INCOMPLETE
    elif isinstance(raw_previous, str):
        previous = _clean_path(raw_previous)
        if previous is None:
            return None, COMPARE_INCOMPLETE
    return ChangedFile(path, previous), None


def _workflow_path(path: str) -> bool:
    return path == ".github" or path.startswith(".github/")


def _one_run(item: object) -> tuple[CheckRun | None, str | None]:
    if not isinstance(item, dict):
        return None, REVIEW_UNTRUSTED
    name = item.get("name")
    head = item.get("head_sha")
    status = item.get("status")
    conclusion = item.get("conclusion")
    app = item.get("app")
    if (
        not isinstance(name, str)
        or _CHECK_NAME_RE.fullmatch(name) is None
        or not isinstance(head, str)
        or not isinstance(status, str)
        or not isinstance(app, dict)
    ):
        return None, REVIEW_UNTRUSTED
    if conclusion is not None and not isinstance(conclusion, str):
        return None, REVIEW_UNTRUSTED
    app_id = app.get("id")
    if type(app_id) is not int or app_id <= 0:
        return None, REVIEW_UNTRUSTED
    slug = app.get("slug")
    clean_slug = slug if isinstance(slug, str) and slug and _CHECK_NAME_RE.fullmatch(slug) else None
    suite_id = _suite_id(item.get("check_suite"))
    actions_repo, actions_run_id = _actions_target(item.get("details_url"))
    concluded = conclusion if isinstance(conclusion, str) else None
    return CheckRun(name, app_id, clean_slug, head, status, concluded, suite_id, actions_repo, actions_run_id), None


def _suite_id(value: object) -> int | None:
    if not isinstance(value, dict):
        return None
    number = value.get("id")
    if type(number) is not int or number <= 0:
        return None
    return number


def _actions_target(value: object) -> tuple[str | None, int | None]:
    if not isinstance(value, str):
        return None, None
    matched = _ACTIONS_DETAILS_RE.fullmatch(value)
    if matched is None:
        return None, None
    return matched.group("repo"), int(matched.group("run"))


def _author_app(slug: str, author: str) -> bool:
    return f"{slug}[bot]".casefold() == author.casefold()
