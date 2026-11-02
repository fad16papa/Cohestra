"""Canonical repo paths. Fail closed on ambiguity. Never exec path contents."""

from __future__ import annotations

import re
import unicodedata
from urllib.parse import unquote

_CONTROL_FILE = re.compile(r"^(?:codeowners|action\.ya?ml)$", re.IGNORECASE)


class PathError(Exception):
    pass


def canonicalize_repo_path(raw: str) -> str:
    if not isinstance(raw, str) or raw.strip() == "":
        raise PathError("ambiguous path")
    if "\x00" in raw or "\\" in raw or "\n" in raw or "\r" in raw:
        raise PathError("ambiguous path")
    if any(ord(ch) < 32 or ord(ch) > 126 for ch in raw):
        raise PathError("ambiguous path")
    once = unquote(raw)
    twice = unquote(once)
    if twice != once:
        raise PathError("ambiguous encoding")
    if (
        "\x00" in once
        or "\\" in once
        or any(ord(ch) < 32 or ord(ch) > 126 for ch in once)
    ):
        raise PathError("ambiguous path")
    text = unicodedata.normalize("NFC", once)
    if text.startswith("/") or re.match(r"^[A-Za-z]:", text):
        raise PathError("absolute path")
    parts: list[str] = []
    for segment in text.split("/"):
        if segment == "" or segment == ".":
            raise PathError("ambiguous path")
        if segment == "..":
            raise PathError("path traversal")
        if segment != segment.strip() or segment.endswith("."):
            raise PathError("ambiguous path")
        parts.append(segment)
    if not parts:
        raise PathError("ambiguous path")
    return "/".join(parts)


def secret_path_reason(path: str) -> str | None:
    for segment in path.split("/"):
        if _secret_segment(segment):
            return f"secret-like path: {path}"
    return None


def _secret_segment(segment: str) -> bool:
    name = segment.lower()
    if ".env" in name:
        return True
    if re.search(r"(?:^|[._-])(?:pem|key|p12|pfx)(?:$|[._-])", name):
        return True
    if re.fullmatch(r"id_(?:rsa|dsa|ecdsa|ed25519)\d*(?:[._-].*)?", name):
        return True
    if name == "credentials" or name.startswith("credentials."):
        return True
    if re.search(r"(?:^|[._-])secrets?\.(?:json|ya?ml|txt)(?:$|[._-])", name):
        return True
    return False


def control_filename_reason(path: str) -> str | None:
    for segment in path.split("/"):
        if _CONTROL_FILE.match(segment):
            return f"forbidden control-plane path: {path}"
    return None
