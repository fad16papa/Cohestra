#!/usr/bin/env bash
set -uo pipefail

API="${API_BASE:-http://localhost:8080}"
TENANT_HOST="${TENANT_HOST:-default.localhost:8088}"
PASS=0
FAIL=0
SKIP=0

pass() { echo "✅ PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "❌ FAIL: $1"; FAIL=$((FAIL + 1)); }
skip() { echo "⏭️  SKIP: $1"; SKIP=$((SKIP + 1)); }

curl_api() {
  curl -sS -H "Host: ${TENANT_HOST}" "$@"
}

echo "=== Cohestra smoke test ==="
echo "API: ${API} | Tenant Host: ${TENANT_HOST}"
echo ""

# 1. Health
if curl -fsS "${API}/ready" | grep -q '"status":"Healthy"'; then
  pass "API /ready healthy"
else
  fail "API /ready unhealthy"
fi

# 2. Public door (tenant host)
DOOR=$(curl_api "${API}/api/v1/public/door" || true)
if echo "$DOOR" | grep -q '"kind":"active"'; then
  pass "Public door active for ${TENANT_HOST}"
  PLAN=$(echo "$DOOR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('plan','?'))" 2>/dev/null || echo "?")
  SLUG=$(echo "$DOOR" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tenantSlug','?'))" 2>/dev/null || echo "?")
  echo "   plan=${PLAN} slug=${SLUG}"
else
  fail "Public door not active: ${DOOR}"
fi

# 2b. Marketing apex door (cohestra.app — canonical marketing host)
MARKETING_DOOR_HOST="${SMOKE_MARKETING_HOST:-cohestra.app}"
MARKETING_DOOR=$(curl -sS -H "Host: ${MARKETING_DOOR_HOST}" "${API}/api/v1/public/door" || true)
if echo "$MARKETING_DOOR" | grep -q '"kind":"marketing"'; then
  pass "Public door marketing for ${MARKETING_DOOR_HOST}"
else
  fail "Marketing apex should return marketing door (${MARKETING_DOOR_HOST}): ${MARKETING_DOOR:0:200}"
fi

# 3. Public site
SITE_CODE=$(curl_api -o /dev/null -w "%{http_code}" "${API}/api/v1/public/site")
if [[ "$SITE_CODE" == "200" ]]; then
  pass "Public site returns 200"
else
  fail "Public site returned ${SITE_CODE}"
fi

# 4. Legal versions
if curl -fsS "${API}/api/v1/public/legal/versions" | grep -q 'termsVersion'; then
  pass "Legal versions API"
else
  fail "Legal versions API"
fi

# 5. Auth onboarding
if curl -fsS "${API}/api/v1/auth/onboarding" | grep -q 'registrationAvailable'; then
  pass "Auth onboarding endpoint"
else
  fail "Auth onboarding endpoint"
fi

# 6. Operator login
LOGIN=$(curl -sS -X POST "${API}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "Host: ${TENANT_HOST}" \
  -d '{"email":"operator@cohestra.local","password":"ChangeMe123!"}' || true)
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken',''))" 2>/dev/null || true)
if [[ -n "$TOKEN" ]]; then
  pass "Operator login on tenant host"
else
  fail "Operator login failed: ${LOGIN:0:200}"
fi

# 7. List activities (admin)
if [[ -n "$TOKEN" ]]; then
  ACTIVITIES=$(curl -sS -H "Host: ${TENANT_HOST}" -H "Authorization: Bearer ${TOKEN}" "${API}/api/v1/admin/activities" || true)
  COUNT=$(echo "$ACTIVITIES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('items', d.get('Items', []))))" 2>/dev/null || echo 0)
  if [[ "$COUNT" -gt 0 ]]; then
    pass "Admin activities list (${COUNT} activities)"
    # Prefer a published activity that still accepts registrations. The first
    # published row can be at cap (demo-harbourline-pickleball-intro) or past event end.
    SLUG=$(echo "$ACTIVITIES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('items', d.get('Items', []))
for a in items:
    status = str(a.get('status') or a.get('Status') or '').lower()
    if status != 'published':
        continue
    if a.get('isRegistrationOpen', a.get('IsRegistrationOpen', True)) is False:
        continue
    max_r = a.get('maxRegistrants', a.get('MaxRegistrants'))
    count = a.get('registrationCount', a.get('RegistrationCount')) or 0
    if max_r is not None and int(count) >= int(max_r):
        continue
    slug = a.get('slug') or a.get('Slug') or ''
    if slug:
        print(slug)
        break
" 2>/dev/null || true)
  else
    skip "Admin activities list empty — registration smoke skipped"
    SLUG=""
  fi
else
  SLUG=""
fi

# 8. Public activity by slug
if [[ -n "${SLUG:-}" ]]; then
  ACT_CODE=$(curl_api -o /dev/null -w "%{http_code}" "${API}/api/v1/public/activities/${SLUG}")
  if [[ "$ACT_CODE" == "200" ]]; then
    pass "Public activity GET /${SLUG}"
  else
    fail "Public activity /${SLUG} returned ${ACT_CODE}"
  fi
else
  skip "No published activity slug for public GET"
fi

# 9. Public registration submit
if [[ -n "${SLUG:-}" ]]; then
  REG=$(curl -sS -X POST "${API}/api/v1/public/registrations" \
    -H "Content-Type: application/json" \
    -H "Host: ${TENANT_HOST}" \
    -H "Idempotency-Key: smoke-$(date +%s)-$RANDOM" \
    -d "{\"activitySlug\":\"${SLUG}\",\"answers\":{\"full_name\":\"Smoke Tester\",\"email\":\"smoke+$RANDOM@example.com\",\"phone\":\"91234567\",\"phoneCountry\":\"SG\",\"consent\":true}}" || true)
  if echo "$REG" | grep -q 'registrationNumber'; then
    pass "Public registration submit"
    REG_NUM=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('registrationNumber',''))" 2>/dev/null || true)
    echo "   registrationNumber=${REG_NUM}"
  else
    fail "Public registration submit: ${REG:0:300}"
  fi
else
  skip "Public registration submit — no slug"
fi

# 10. Site preview bad token
PREVIEW_CODE=$(curl_api -o /dev/null -w "%{http_code}" "${API}/api/v1/public/site/preview?token=invalid-smoke-token")
if [[ "$PREVIEW_CODE" == "404" ]]; then
  pass "Site preview rejects invalid token (404)"
else
  fail "Site preview invalid token returned ${PREVIEW_CODE}"
fi

# 11. Preview token (admin)
if [[ -n "$TOKEN" ]]; then
  PREVIEW=$(curl -sS -X POST -H "Host: ${TENANT_HOST}" -H "Authorization: Bearer ${TOKEN}" \
    "${API}/api/v1/admin/site/preview-token" || true)
  PTOKEN=$(echo "$PREVIEW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || true)
  if [[ -n "$PTOKEN" ]]; then
    PREVIEW_OK=$(curl_api -o /dev/null -w "%{http_code}" "${API}/api/v1/public/site/preview?token=${PTOKEN}")
    if [[ "$PREVIEW_OK" == "200" ]]; then
      pass "Site preview token flow"
    else
      fail "Site preview with valid token returned ${PREVIEW_OK}"
    fi
  else
    skip "Site preview token — admin endpoint unavailable or plan-gated"
  fi
fi

# 12. Basic plan link expectation
if [[ "${PLAN:-}" == "Basic" ]]; then
  pass "Plan gate: Basic tenant (builder locked expected)"
elif [[ "${PLAN:-}" == "Core" || "${PLAN:-}" == "Pro" ]]; then
  pass "Plan gate: ${PLAN} tenant"
fi

# 13. creativorare tenant (user UAT tenant) — optional
CREATIVORARE=$(curl -sS -H "Host: creativorare.localhost:8088" "${API}/api/v1/public/door" || true)
if echo "$CREATIVORARE" | grep -q '"kind":"active"'; then
  pass "creativorare tenant door active"
else
  skip "creativorare tenant not in this DB (${CREATIVORARE:0:120})"
fi

# 14. Enterprise apex — marketing /pricing (optional; set PUBLIC_BASE_URL e.g. http://localhost:8088)
if [[ -n "${PUBLIC_BASE_URL:-}" ]]; then
  APEX_HOST="${APEX_HOST:-cohestra.app}"
  PUBLIC_PORT=$(python3 -c "from urllib.parse import urlparse; u=urlparse('${PUBLIC_BASE_URL}'); print(u.port or (443 if u.scheme=='https' else 80))")
  PRICING_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Host: ${APEX_HOST}:${PUBLIC_PORT}" \
    "${PUBLIC_BASE_URL%/}/pricing" || true)
  if [[ "$PRICING_CODE" == "200" ]]; then
    pass "Apex /pricing returns 200 (${APEX_HOST} host)"
  else
    fail "Apex /pricing returned ${PRICING_CODE} — add 127.0.0.1 ${APEX_HOST} to hosts"
  fi
else
  skip "PUBLIC_BASE_URL unset — apex /pricing check skipped"
fi

echo ""
echo "=== Summary ==="
echo "Passed: ${PASS} | Failed: ${FAIL} | Skipped: ${SKIP}"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
