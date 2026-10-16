#!/usr/bin/env bash
# Smoke test: signs in as each seeded login and checks the pages, APIs and
# emails each role should reach.
#
#   npm run test:local                      # uses `npm run dev` if it's running,
#                                           # otherwise starts a throwaway stack itself
#   BASE_URL=http://localhost:3001 npm run test:local
set -u
cd "$(dirname "$0")/.."

# Nothing running: start fresh emulators (no saved data, so the run is clean),
# seed them, boot the app on a spare port, and re-run this script inside.
if [ -z "${BASE_URL:-}" ] && [ -z "${SMOKE_INNER:-}" ] && ! curl -s -o /dev/null http://localhost:3000/api/auth/csrf; then
    echo "No app on :3000, starting a temporary one (about 30s)..."
    export NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-discipleos \
        FIREBASE_PROJECT_ID=demo-discipleos SUPER_ADMIN_EMAILS=admin@example.com \
        NEXTAUTH_URL=http://localhost:3100 SMOKE_INNER=1 BASE_URL=http://localhost:3100
    npx -y firebase-tools emulators:exec --project demo-discipleos \
        'npm run -s seed:fbc-test >/dev/null && { npx next dev -p 3100 >"${TMPDIR:-/tmp}/disciple-smoke-next.log" 2>&1 & } &&
         for i in $(seq 1 120); do curl -s -o /dev/null http://localhost:3100/api/auth/csrf && break; sleep 1; done &&
         bash scripts/smoke-local.sh; code=$?; pkill -f "next dev -p 3100"; exit $code' 2>&1 |
        grep -vE "^(i |✔ |⚠ |\s*$)|emulators:|Emulator|firebase-tools|Java|seq 1 120|bash scripts/smoke-local.sh;"
    exit "${PIPESTATUS[0]}"
fi

BASE="${BASE_URL:-http://localhost:3000}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
failures=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; failures=$((failures + 1)); }

login() {
    rm -f "$JAR"
    local csrf
    csrf=$(curl -s -c "$JAR" -b "$JAR" "$BASE/api/auth/csrf" | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')
    curl -s -c "$JAR" -b "$JAR" -o /dev/null -X POST "$BASE/api/auth/callback/credentials" \
        --data-urlencode "csrfToken=$csrf" --data-urlencode "email=$1" \
        --data-urlencode "password=$2" -d json=true
    if curl -s -b "$JAR" "$BASE/api/auth/session" | grep -q "\"email\":\"$1\""; then
        pass "sign in as $1"
    else
        fail "sign in as $1"
    fi
}

# expect_json PATH PATTERN — body must contain PATTERN (an extended regex).
expect_json() {
    local body
    body=$(curl -s -b "$JAR" "$BASE$1")
    if printf '%s' "$body" | grep -qE "$2"; then pass "GET $1"; else fail "GET $1 → ${body:0:160}"; fi
}

expect_page() {
    local code
    code=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE$1")
    if [ "$code" = 200 ]; then pass "page $1"; else fail "page $1 → HTTP $code"; fi
}

if ! curl -s -o /dev/null "$BASE/api/auth/csrf"; then
    echo "Nothing is listening on $BASE — start it with: npm run dev"
    exit 1
fi

echo "FBC Test church owner"
login fbc-test@example.com 'FbcTest2026!'
expect_json /api/me '"name":"FBC Test"'
expect_json /api/surveys '"responseCount":64'
expect_json /api/billing '"credits":[0-9]+'
for p in /dashboard /dashboard/surveys/import /dashboard/sermons /dashboard/billing /dashboard/settings; do
    expect_page "$p"
done

echo "Survey kinds"
# Church Analysis: created already published, with the fixed questions.
ca=$(curl -s -b "$JAR" -H 'content-type: application/json' -d '{"kind":"church_analysis","title":"Smoke Church Analysis"}' "$BASE/api/surveys")
ca_id=$(printf '%s' "$ca" | sed -n 's/.*"survey":{"id":"\([^"]*\)".*/\1/p')
ca_slug=$(printf '%s' "$ca" | sed -n 's/.*"publicSlug":"\([^"]*\)".*/\1/p')
if printf '%s' "$ca" | grep -q '"status":"published"' && printf '%s' "$ca" | grep -q 'Top Stressor 3'; then
    pass "church analysis created and published"
else
    fail "church analysis created and published → ${ca:0:160}"
fi
expect_page "/s/$ca_slug"
# A congregant fills it out: answer every question with the first option or some text.
answers=$(curl -s "$BASE/api/public/surveys/$ca_slug" | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
        const { survey } = JSON.parse(s);
        const a = {};
        for (const q of survey.questions) a[q.id] = q.options?.length ? q.options[0] : "Smoke test answer";
        process.stdout.write(JSON.stringify({ answers: a }));
    });')
curl -s -o /dev/null -H 'content-type: application/json' -d "$answers" "$BASE/api/public/surveys/$ca_slug/submit"
expect_json "/api/surveys/$ca_id/responses" 'Smoke test answer'
# Custom: saved as a draft and refused analysis.
cu=$(curl -s -b "$JAR" -H 'content-type: application/json' \
    -d '{"kind":"custom","title":"Smoke Custom","questions":[{"prompt":"Favorite hymn?","type":"short_text"}]}' "$BASE/api/surveys")
cu_id=$(printf '%s' "$cu" | sed -n 's/.*"survey":{"id":"\([^"]*\)".*/\1/p')
code=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -H 'content-type: application/json' -d '{}' "$BASE/api/surveys/$cu_id/analyze")
if [ "$code" = 403 ]; then pass "custom survey refused analysis"; else fail "custom survey refused analysis → HTTP $code"; fi
for id in "$ca_id" "$cu_id"; do curl -s -b "$JAR" -o /dev/null -X DELETE "$BASE/api/surveys/$id"; done

echo "Emails (local test inbox)"
invitee="leader-$(date +%s)@example.com"
curl -s -b "$JAR" -o /dev/null -H 'content-type: application/json' -d "{\"email\":\"$invitee\"}" "$BASE/api/team"
curl -s -o /dev/null -H 'content-type: application/json' -d '{"email":"fbc-test@example.com"}' "$BASE/api/auth/reset"
inbox=$(curl -s "$BASE/dev/emails")
if printf '%s' "$inbox" | grep -q "To: $invitee"; then pass "team invite email caught"; else fail "team invite email caught"; fi
if printf '%s' "$inbox" | grep -q "Reset your DiscipleShip"; then pass "password reset email caught"; else fail "password reset email caught"; fi

echo "Church profile & size pricing"
church_id=$(curl -s -b "$JAR" "$BASE/api/me" | sed -n 's/.*"church":{"id":"\([^"]*\)".*/\1/p')
before=$(curl -s -b "$JAR" "$BASE/api/settings")
curl -s -b "$JAR" -o /dev/null -X PATCH -H 'content-type: application/json' \
    -d '{"denomination":"Southern Baptist","sizeTier":"250_499","leadPastor":"Smoke Test"}' "$BASE/api/settings"
expect_json /api/settings '"denomination":"Southern Baptist"'
expect_json /api/settings '"sizeTier":"250_499"'

echo "Platform admin"
login admin@example.com 'AdminTest2026!'
expect_json /api/admin/churches '"FBC Test"'
expect_page /admin
curl -s -b "$JAR" -o /dev/null -X PATCH -H 'content-type: application/json' -d '{"sizeTierLocked":true}' "$BASE/api/admin/churches/$church_id"

echo "Locked size"
login fbc-test@example.com 'FbcTest2026!'
code=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X PATCH -H 'content-type: application/json' -d '{"sizeTier":"under_100"}' "$BASE/api/settings")
if [ "$code" = 403 ]; then pass "owner can't change a confirmed size"; else fail "owner can't change a confirmed size → HTTP $code"; fi

# Put the profile back the way it was.
login admin@example.com 'AdminTest2026!'
prev_tier=$(printf '%s' "$before" | sed -n 's/.*"sizeTier":"\([^"]*\)".*/\1/p')
prev_lock=$(printf '%s' "$before" | grep -q '"sizeTierLocked":true' && echo true || echo false)
curl -s -b "$JAR" -o /dev/null -X PATCH -H 'content-type: application/json' \
    -d "{\"sizeTier\":\"$prev_tier\",\"sizeTierLocked\":$prev_lock}" "$BASE/api/admin/churches/$church_id"
login fbc-test@example.com 'FbcTest2026!'
prev_denom=$(printf '%s' "$before" | sed -n 's/.*"denomination":"\([^"]*\)".*/\1/p')
prev_pastor=$(printf '%s' "$before" | sed -n 's/.*"leadPastor":"\([^"]*\)".*/\1/p')
curl -s -b "$JAR" -o /dev/null -X PATCH -H 'content-type: application/json' \
    -d "{\"denomination\":\"$prev_denom\",\"leadPastor\":\"$prev_pastor\"}" "$BASE/api/settings"

echo
if [ "$failures" -eq 0 ]; then echo "All checks passed."; else echo "$failures check(s) failed."; exit 1; fi
