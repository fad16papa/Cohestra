# shellcheck shell=bash
# Build a throwaway two-parent merge repo + GitHub API fixtures.

build_provenance_fixture() {
  local dest="$1"
  local remote="$dest/remote"
  local localc="$dest/local"
  local fix="$dest/api"
  mkdir -p "$remote" "$fix"
  git init -q -b main "$remote"
  git -C "$remote" config user.email test@example.com
  git -C "$remote" config user.name testd

  echo base >"$remote/f"
  git -C "$remote" add f
  git -C "$remote" commit -q -m base
  local parent
  parent="$(git -C "$remote" rev-parse HEAD)"

  git -C "$remote" checkout -q -b feat
  echo feat >"$remote/g"
  git -C "$remote" add g
  git -C "$remote" commit -q -m feat
  local head
  head="$(git -C "$remote" rev-parse HEAD)"

  git -C "$remote" checkout -q main
  git -C "$remote" merge --no-ff -q feat -m "Merge feature"
  local merge
  merge="$(git -C "$remote" rev-parse HEAD)"

  git clone -q "$remote" "$localc"
  git -C "$localc" fetch -q origin main

  write_pass_fixtures "$fix" "$merge" "$head" "$parent"

  PROVENANCE_MERGE="$merge"
  PROVENANCE_HEAD="$head"
  PROVENANCE_PARENT="$parent"
  PROVENANCE_LOCAL="$localc"
  PROVENANCE_FIX="$fix"
}

write_pass_fixtures() {
  local fix="$1"
  local merge="$2"
  local head="$3"
  local parent="$4"

  cat >"$fix/runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":11,"event":"push","head_sha":"${merge}","head_branch":"main","status":"completed","conclusion":"success","created_at":"2026-10-22T00:00:00Z"}]}
JSON
  cat >"$fix/jobs_11.json" <<'JSON'
{"total_count":5,"jobs":[
  {"name":".NET build and test","conclusion":"success"},
  {"name":"API integration tests","conclusion":"success"},
  {"name":"Next.js build","conclusion":"success"},
  {"name":"UAT isolation contract","conclusion":"success"},
  {"name":"Docker stack smoke","conclusion":"success"}
]}
JSON
  cat >"$fix/pulls_${merge}.json" <<JSON
[{"number":2,"merged":null,"base":{"ref":"main"},"merge_commit_sha":"${merge}","head":{"sha":"deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"}}]
JSON
  cat >"$fix/pr_2.json" <<JSON
{"number":2,"merged":true,"base":{"ref":"main"},"merge_commit_sha":"${merge}","head":{"sha":"deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"}}
JSON
  cat >"$fix/pr_commits_2.json" <<JSON
[{"sha":"${head}"}]
JSON
  cat >"$fix/checks_${head}.json" <<JSON
{"total_count":1,"check_runs":[{"id":99,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},"head_sha":"${head}","status":"completed","conclusion":"success","completed_at":"2026-10-22T00:00:01Z"}]}
JSON
  cat >"$fix/pulls_${parent}.json" <<JSON
[{"number":1,"merged":null,"base":{"ref":"main"},"merge_commit_sha":"${parent}"}]
JSON
  cat >"$fix/pr_1.json" <<JSON
{"number":1,"merged":true,"base":{"ref":"main"},"merge_commit_sha":"${parent}"}
JSON
}
