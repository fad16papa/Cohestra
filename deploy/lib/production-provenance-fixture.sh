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
  git -C "$localc" config user.email test@example.com
  git -C "$localc" config user.name testd
  git -C "$localc" fetch -q origin main

  write_pass_fixtures "$fix" "$merge" "$head" "$parent"

  PROVENANCE_MERGE="$merge"
  PROVENANCE_HEAD="$head"
  PROVENANCE_PARENT="$parent"
  PROVENANCE_LOCAL="$localc"
  PROVENANCE_FIX="$fix"
  PROVENANCE_ANCHOR_FILE="$dest/anchor"
  printf '%s\n' "$parent" >"$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_ALLOW_ANCHOR_OVERRIDE=true
}

# Layer B fixtures for one merge commit. Does not overwrite Layer A CI runs.
write_merge_layer_b() {
  local fix="$1"
  local merge="$2"
  local head="$3"
  local number="$4"

  cat >"$fix/pulls_${merge}.json" <<JSON
[{"number":${number},"merged":null,"base":{"ref":"main"},"merge_commit_sha":"${merge}","head":{"sha":"deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"}}]
JSON
  cat >"$fix/pr_${number}.json" <<JSON
{"number":${number},"merged":true,"base":{"ref":"main"},"merge_commit_sha":"${merge}","head":{"sha":"deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"}}
JSON
  cat >"$fix/pr_commits_${number}.json" <<JSON
[{"sha":"${head}"}]
JSON
  cat >"$fix/checks_${head}.json" <<JSON
{"total_count":1,"check_runs":[{"id":${number}99,"name":"GitGuardian Security Checks","app":{"slug":"gitguardian"},"head_sha":"${head}","status":"completed","conclusion":"success","completed_at":"2026-10-22T00:00:01Z"}]}
JSON
}

_git_ident() {
  git -C "$1" config user.email test@example.com
  git -C "$1" config user.name testd
}

_merge_feature() {
  local repo="$1"
  local name="$2"
  git -C "$repo" checkout -q -b "$name"
  echo "$name" >"$repo/$name"
  git -C "$repo" add "$name"
  git -C "$repo" commit -q -m "$name"
  local head
  head="$(git -C "$repo" rev-parse HEAD)"
  git -C "$repo" checkout -q main
  git -C "$repo" merge --no-ff -q "$name" -m "Merge ${name}"
  local merge
  merge="$(git -C "$repo" rev-parse HEAD)"
  printf '%s %s' "$merge" "$head"
}

# T -> D -> M1 -> M2. D has no PR. M1/M2 have Layer B fixtures.
build_launder_fixture() {
  local dest="$1"
  local remote="$dest/remote"
  local localc="$dest/local"
  local fix="$dest/api"
  mkdir -p "$remote" "$fix"
  git init -q -b main "$remote"
  _git_ident "$remote"
  echo T >"$remote/f"
  git -C "$remote" add f
  git -C "$remote" commit -q -m T
  local t
  t="$(git -C "$remote" rev-parse HEAD)"
  echo D >"$remote/f"
  git -C "$remote" add f
  git -C "$remote" commit -q -m D
  local d
  d="$(git -C "$remote" rev-parse HEAD)"
  local m1_pair m1 m1head m2_pair m2 m2head
  m1_pair="$(_merge_feature "$remote" feat1)"
  m1="${m1_pair%% *}"
  m1head="${m1_pair##* }"
  m2_pair="$(_merge_feature "$remote" feat2)"
  m2="${m2_pair%% *}"
  m2head="${m2_pair##* }"
  git clone -q "$remote" "$localc"
  _git_ident "$localc"
  git -C "$localc" fetch -q origin main
  write_merge_layer_b "$fix" "$m1" "$m1head" 21
  write_merge_layer_b "$fix" "$m2" "$m2head" 22
  write_layer_a "$fix" "$m2"
  PROVENANCE_T="$t"
  PROVENANCE_D="$d"
  PROVENANCE_M1="$m1"
  PROVENANCE_M1_HEAD="$m1head"
  PROVENANCE_M2="$m2"
  PROVENANCE_M2_HEAD="$m2head"
  PROVENANCE_LOCAL="$localc"
  PROVENANCE_FIX="$fix"
  PROVENANCE_ANCHOR_FILE="$dest/anchor"
  printf '%s\n' "$t" >"$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_ALLOW_ANCHOR_OVERRIDE=true
}

# T -> M1 -> M2 -> M3. Every post-anchor commit is a reviewed merge.
build_clean_chain_fixture() {
  local dest="$1"
  local remote="$dest/remote"
  local localc="$dest/local"
  local fix="$dest/api"
  mkdir -p "$remote" "$fix"
  git init -q -b main "$remote"
  _git_ident "$remote"
  echo T >"$remote/f"
  git -C "$remote" add f
  git -C "$remote" commit -q -m T
  local t
  t="$(git -C "$remote" rev-parse HEAD)"
  local p1 p2 p3 m1 m1h m2 m2h m3 m3h
  p1="$(_merge_feature "$remote" feat1)"
  m1="${p1%% *}"; m1h="${p1##* }"
  p2="$(_merge_feature "$remote" feat2)"
  m2="${p2%% *}"; m2h="${p2##* }"
  p3="$(_merge_feature "$remote" feat3)"
  m3="${p3%% *}"; m3h="${p3##* }"
  git clone -q "$remote" "$localc"
  _git_ident "$localc"
  git -C "$localc" fetch -q origin main
  write_merge_layer_b "$fix" "$m1" "$m1h" 31
  write_merge_layer_b "$fix" "$m2" "$m2h" 32
  write_merge_layer_b "$fix" "$m3" "$m3h" 33
  write_layer_a "$fix" "$m3"
  PROVENANCE_T="$t"
  PROVENANCE_M1="$m1"
  PROVENANCE_M2="$m2"
  PROVENANCE_M3="$m3"
  PROVENANCE_M3_HEAD="$m3h"
  PROVENANCE_LOCAL="$localc"
  PROVENANCE_FIX="$fix"
  PROVENANCE_ANCHOR_FILE="$dest/anchor"
  printf '%s\n' "$t" >"$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_ALLOW_ANCHOR_OVERRIDE=true
}

# Anchor is a second-parent only; first-parent walk never reaches it.
build_unreachable_anchor_fixture() {
  local dest="$1"
  local remote="$dest/remote"
  local localc="$dest/local"
  local fix="$dest/api"
  mkdir -p "$remote" "$fix"
  git init -q -b main "$remote"
  _git_ident "$remote"
  echo other >"$remote/f"
  git -C "$remote" add f
  git -C "$remote" commit -q -m other
  git -C "$remote" checkout -q --orphan tbranch
  echo T >"$remote/t"
  git -C "$remote" add t
  git -C "$remote" commit -q -m T
  local t
  t="$(git -C "$remote" rev-parse HEAD)"
  git -C "$remote" checkout -q main
  git -C "$remote" merge --no-ff --allow-unrelated-histories -q tbranch -m "Merge T as second parent"
  local merge head
  merge="$(git -C "$remote" rev-parse HEAD)"
  head="$(git -C "$remote" rev-parse "${merge}^2")"
  git clone -q "$remote" "$localc"
  _git_ident "$localc"
  git -C "$localc" fetch -q origin main
  write_merge_layer_b "$fix" "$merge" "$head" 41
  write_layer_a "$fix" "$merge"
  PROVENANCE_T="$t"
  PROVENANCE_MERGE="$merge"
  PROVENANCE_LOCAL="$localc"
  PROVENANCE_FIX="$fix"
  PROVENANCE_ANCHOR_FILE="$dest/anchor"
  printf '%s\n' "$t" >"$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_PRODUCTION_PROVENANCE_ANCHOR="$PROVENANCE_ANCHOR_FILE"
  export COHESTRA_ALLOW_ANCHOR_OVERRIDE=true
}

write_layer_a() {
  local fix="$1"
  local sha="$2"
  cat >"$fix/runs.json" <<JSON
{"total_count":1,"workflow_runs":[{"id":11,"event":"push","head_sha":"${sha}","head_branch":"main","status":"completed","conclusion":"success","created_at":"2026-10-22T00:00:00Z"}]}
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
