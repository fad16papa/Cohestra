---
label: AD25-OWNER-AUTH
status: research
do_not_modify_cursor_install: true
authority: issue-538
as_of: 2026-11-02T20:50:00+08:00
sources:
  - https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps
  - https://docs.github.com/en/apps/maintaining-github-apps/modifying-a-github-app-registration
  - https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
  - https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps
  - https://cursor.com/docs/integrations/github
---

# Cursor permission-management options (verified)

**Do not modify the Cursor installation in this task.**

## Finding (corrects the previous Layer A dropdown)

An installation administrator **cannot** individually downgrade a third-party GitHub App from `contents: write` to `contents: read`.

GitHub splits two objects:

| Object | Who can change permission *levels* | What the Cohestra owner can do |
| --- | --- | --- |
| **App registration** (`https://github.com/apps/cursor`) | Cursor (App owner / App managers) only | Nothing. Reducing `contents` on the registration would apply to every Cursor customer. |
| **Installation** on `fad16papa` | Account owner | Review granted permissions, change **which repositories** the App can access, **suspend**, or **uninstall**. |
| **User authorization** (user-to-server / OAuth) | The authorizing user | Revoke under Settings → Applications → Authorized GitHub Apps. Suspension of the installation does **not** revoke this. |

GitHub documents permission *level* changes only under “Modifying a GitHub App **registration**.” Adding permissions requires each installer to approve. Removing permissions takes effect immediately — for **all** installations of that App. There is no installer UI to set “contents: read-only on this repo.”

The previous setup checklist item “Repository → GitHub Apps → Cursor → contents Read-only” is **not a supported installer action** for a third-party App.

## Installation vs registration vs user token

| Token | Identity on merge | `contents: write` source | Seen on PR #541 |
| --- | --- | --- | --- |
| Installation access token (IAT) | `cursor[bot]` | App registration permission | **Yes** (`merged_by.login=cursor[bot]`) |
| User access token (UAT / user-to-server) | `fad16papa` (user), logs may note GitHub App user-to-server | Intersection of user rights and App permissions | Not the #541 merger; still a residual |
| Fine-grained/classic PAT in `GH_TOKEN` | `fad16papa` | PAT scopes, independent of the App | Residual if present in Cloud Agent secrets |

GitHub: `PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge` requires Contents **write** for both IAT and UAT.

Cursor Cloud Agents mint a **narrower** IAT than the advertised installation (forum: issues often omitted). That narrowing is Cursor-controlled and currently **still includes contents:write** (agents can `git push`). Cursor documents no reduced-permission GitHub App. Cursor staff: “more flexible permission controls are on our radar.”

## Installer levers that *do* exist

### 1. Restrict repository access (feasible, high development impact)

Settings → Applications → Installed GitHub Apps → Cursor → Configure → Repository access → Only select repositories → **omit Cohestra**.

Effect: Cursor IAT cannot push, merge, or read Cohestra. `cursor[bot]` cannot merge PR #542.

Impact on Cloud Agents: they cannot clone/push this repository via the App. Bugbot and Cloud Agent GitHub features on Cohestra stop until the repo is added back. Local Cursor Desktop using the owner’s git credentials still works.

### 2. Suspend the installation (feasible, account-wide)

Same Configure page → Suspend.

Effect: Cursor App cannot use the GitHub API or receive webhooks for the installation account. Permissions are **not** reduced; they are unusable until unsuspend.

Impact: Cloud Agents / Bugbot stop for **every** repository on that installation, not only Cohestra. User-to-server authorization is **not** revoked by suspend. Uninstall + revoke if the owner wants both IAT and UAT dead.

### 3. Uninstall (feasible, account-wide for that installation)

Removes IAT access to the account’s selected repos. Does not revoke Authorized GitHub Apps. Owner must also Revoke under Authorized GitHub Apps to kill user-to-server tokens.

### 4. Ask Cursor for a reduced-permission App (not currently offered)

No public Cursor GitHub App variant with `contents: read`. Not an executable owner step today.

## Least-privilege transition that preserves Cloud Agents (recommended)

**Do not suspend or uninstall Cursor** if Cloud Agent development on Cohestra must continue.

1. Leave the Cursor installation as-is (contents write remains; owner cannot downgrade it).
2. Do **not** put a Contents:write PAT in Cloud Agent `GH_TOKEN` / `GITHUB_TOKEN`. If a PAT is required for Issues, grant Issues only.
3. Optionally revoke stale Authorized GitHub Apps that are not the installation itself, if the owner is sure they are unused.
4. Install Owner-Policy App (Layer B) with a **pinned** `AD25-Owner-Policy` check. A required pinned check blocks merge by **any** actor, including `cursor[bot]` and `fad16papa`, until the independent App posts `failure` or `success`.
5. Require HMAC attestation so a user-token comment `OWNER_APPROVE_CONTROL_PLANE sha=…` without a MAC cannot turn the check green.

This does **not** stop `cursor[bot]` from *calling* merge; GitHub returns a failed-required-status-check error. That is sufficient to close the #541 hole once the pin is live.

## Least-privilege transition that stops `cursor[bot]` on this repo (optional, breaks Cloud Agents)

1. Restrict Cursor repository access to omit Cohestra (or uninstall if Cohestra is the only selected repo).
2. Revoke Authorized GitHub Apps if user-to-server merge is in scope.
3. Still install Layer B. Restriction is not a substitute for a pinned check on `main` (no ruleset today).
4. Accept that Cloud Agents cannot push to Cohestra until the repo is re-added.

## What not to do

- Do not wait for a Cursor UI “contents: read” dropdown. It does not exist for installers.
- Do not ask Cursor (the company) to globally drop `contents: write` — that would break Cloud Agents for every customer.
- Do not suspend Cursor “to try it” from an agent.
- Do not treat installation review screenshots as proof of a permission downgrade.
