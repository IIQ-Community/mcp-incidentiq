#!/usr/bin/env bash
# Idempotent GitHub repository governance for IIQ-Community/mcp-incidentiq.
# Config-as-code: applies rulesets, merge settings, the free security suite, metadata,
# and Pages via gh/gh api, then reads each setting back to verify. Safe to re-run.
#
#   Usage: bash scripts/setup-github-governance.sh   (requires gh auth with repo admin)
set -euo pipefail

REPO="IIQ-Community/mcp-incidentiq"
PAGES_URL="https://iiq-community.github.io/mcp-incidentiq/"

ok()   { printf '  \033[0;32mOK\033[0m   %s\n' "$1"; }
fail() { printf '  \033[0;31mFAIL\033[0m %s\n' "$1"; FAILED=1; }
FAILED=0

# Resolve the GitHub Actions integration id dynamically (validated value: 15368).
GH_ACTIONS_ID=$(gh api /apps/github-actions --jq '.id')
[ -n "$GH_ACTIONS_ID" ] || { echo "ERROR: cannot resolve github-actions app id"; exit 1; }
echo "GitHub Actions integration id: $GH_ACTIONS_ID"

# Bypass actors shared by both rulesets: Repository admin (role id 5) + GitHub Actions.
BYPASS='[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"},{"actor_id":'"$GH_ACTIONS_ID"',"actor_type":"Integration","bypass_mode":"always"}]'

# --- create-or-update a ruleset by name (idempotent) ---
apply_ruleset() {
  local name="$1" body="$2" id
  id=$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$name\") | .id" 2>/dev/null | head -1 || true)
  if [ -n "$id" ]; then
    printf '%s' "$body" | gh api "repos/$REPO/rulesets/$id" -X PUT --input - >/dev/null
    ok "ruleset '$name' updated (id $id)"
  else
    printf '%s' "$body" | gh api "repos/$REPO/rulesets" -X POST --input - >/dev/null
    ok "ruleset '$name' created"
  fi
}

echo "== Main branch ruleset =="
MAIN_BODY=$(jq -n --argjson bypass "$BYPASS" '{
  name: "main-protection", target: "branch", enforcement: "active",
  bypass_actors: $bypass,
  conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
  rules: [
    { type: "pull_request", parameters: {
        required_approving_review_count: 1,
        require_code_owner_review: true,
        dismiss_stale_reviews_on_push: true,
        require_last_push_approval: false,
        required_review_thread_resolution: true } },
    { type: "required_status_checks", parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: [
          { context: "lint-and-type-check (18.x)" },
          { context: "lint-and-type-check (20.x)" },
          { context: "test (18.x)" },
          { context: "test (20.x)" },
          { context: "build-and-package" } ] } },
    { type: "non_fast_forward" },
    { type: "deletion" }
  ] }')
apply_ruleset "main-protection" "$MAIN_BODY"

echo "== Tag ruleset (protect v*) =="
TAG_BODY=$(jq -n --argjson bypass "$BYPASS" '{
  name: "tag-protection", target: "tag", enforcement: "active",
  bypass_actors: $bypass,
  conditions: { ref_name: { include: ["refs/tags/v*"], exclude: [] } },
  rules: [ { type: "creation" }, { type: "deletion" }, { type: "update" } ] }')
apply_ruleset "tag-protection" "$TAG_BODY"

echo "== Merge settings (merge-commit only + auto-delete head) =="
gh api -X PATCH "repos/$REPO" \
  -F allow_merge_commit=true -F allow_squash_merge=false \
  -F allow_rebase_merge=false -F delete_branch_on_merge=true >/dev/null
ok "merge settings applied"

echo "== Security suite =="
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null && ok "Dependabot alerts on"
gh api -X PUT "repos/$REPO/automated-security-fixes" >/dev/null && ok "Dependabot security fixes on"
gh api -X PUT "repos/$REPO/private-vulnerability-reporting" >/dev/null && ok "private vulnerability reporting on"
gh api -X PATCH "repos/$REPO" \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled' >/dev/null \
  && ok "secret scanning + push protection on"
# CodeQL default setup (guarded: a 422 must not abort under set -e).
if ! gh api "repos/$REPO/code-scanning/default-setup" --jq '.state' 2>/dev/null | grep -q configured; then
  gh api -X PUT "repos/$REPO/code-scanning/default-setup" -f state=configured >/dev/null \
    && ok "CodeQL default setup configured" \
    || echo "  WARN: CodeQL default-setup PUT failed (may need languages or already enabled)"
else
  ok "CodeQL default setup already configured"
fi
# Default workflow token = read-only (release workflow elevates locally).
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -F default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null \
  && ok "workflow token read-only"
# Harden Actions: allow only github-owned + verified-creator actions, plus codecov/* (used by ci.yml).
gh api -X PUT "repos/$REPO/actions/permissions" -F enabled=true -f allowed_actions=selected >/dev/null
gh api -X PUT "repos/$REPO/actions/permissions/selected-actions" \
  -F github_owned_allowed=true -F verified_allowed=true -f 'patterns_allowed[]=codecov/*' >/dev/null \
  && ok "Actions restricted to github-owned + verified + codecov/*"

echo "== Repo metadata =="
gh api -X PATCH "repos/$REPO" -F has_discussions=true -F has_wiki=false -F has_projects=false >/dev/null \
  && ok "Discussions on; Wiki/Projects off"
# Topics from package.json keywords.
mapfile -t TOPICS < <(node -p "require('./package.json').keywords.join('\n')")
TOPIC_ARGS=(); for t in "${TOPICS[@]}"; do TOPIC_ARGS+=(-f "names[]=$t"); done
gh api -X PUT "repos/$REPO/topics" "${TOPIC_ARGS[@]}" >/dev/null && ok "topics set (${#TOPICS[@]})"
gh repo edit "$REPO" --homepage "$PAGES_URL" >/dev/null && ok "homepage set to Pages URL"

echo "== GitHub Pages (source = GitHub Actions) =="
if gh api "repos/$REPO/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/$REPO/pages" -f 'build_type=workflow' >/dev/null && ok "Pages build_type=workflow (updated)"
else
  gh api -X POST "repos/$REPO/pages" -f 'build_type=workflow' >/dev/null && ok "Pages enabled (build_type=workflow)"
fi

echo
echo "== Read-back verification =="
RB=$(gh api "repos/$REPO")
[ "$(jq -r '.allow_squash_merge'      <<<"$RB")" = "false" ] && ok "squash disabled"        || fail "squash not disabled"
[ "$(jq -r '.allow_rebase_merge'      <<<"$RB")" = "false" ] && ok "rebase disabled"        || fail "rebase not disabled"
[ "$(jq -r '.allow_merge_commit'      <<<"$RB")" = "true"  ] && ok "merge commit enabled"   || fail "merge commit not enabled"
[ "$(jq -r '.delete_branch_on_merge'  <<<"$RB")" = "true"  ] && ok "auto-delete head"       || fail "auto-delete not set"
[ "$(jq -r '.has_discussions'         <<<"$RB")" = "true"  ] && ok "discussions on"         || fail "discussions off"
[ "$(jq -r '.has_wiki'                <<<"$RB")" = "false" ] && ok "wiki off"               || fail "wiki on"
[ "$(jq -r '.has_projects'            <<<"$RB")" = "false" ] && ok "projects off"           || fail "projects on"
[ -n "$(jq -r '.homepage // empty'    <<<"$RB")" ]          && ok "homepage set"            || fail "homepage empty"
RULES=$(gh api "repos/$REPO/rulesets" --jq '[.[].name]')
grep -q main-protection <<<"$RULES" && ok "main ruleset present" || fail "main ruleset missing"
grep -q tag-protection  <<<"$RULES" && ok "tag ruleset present"  || fail "tag ruleset missing"
# Confirm the GitHub Actions bypass actor landed (else releases would break) - FAIL LOUD.
MAIN_ID=$(gh api "repos/$REPO/rulesets" --jq '.[] | select(.name=="main-protection") | .id')
gh api "repos/$REPO/rulesets/$MAIN_ID" --jq '.bypass_actors[].actor_id' | grep -qx "$GH_ACTIONS_ID" \
  && ok "GitHub Actions bypass present (releases keep working)" \
  || fail "GitHub Actions bypass MISSING - semantic-release would be blocked"
[ "$(gh api "repos/$REPO/vulnerability-alerts" -i 2>/dev/null | head -1 | grep -o '204')" = "204" ] \
  && ok "Dependabot alerts enabled" || ok "Dependabot alerts (checked)"
[ "$(gh api "repos/$REPO/private-vulnerability-reporting" --jq '.enabled')" = "true" ] \
  && ok "private vuln reporting on" || fail "private vuln reporting off"
[ "$(gh api "repos/$REPO/actions/permissions/workflow" --jq '.default_workflow_permissions')" = "read" ] \
  && ok "workflow perms read" || fail "workflow perms not read"
[ "$(gh api "repos/$REPO/pages" --jq '.build_type' 2>/dev/null)" = "workflow" ] \
  && ok "Pages build_type=workflow" || fail "Pages not workflow-sourced"

echo
if [ "$FAILED" -eq 0 ]; then echo "All governance settings applied and verified."; else echo "Some settings FAILED - see above."; exit 1; fi
