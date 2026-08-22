#!/usr/bin/env bash
# Apply every repository migration to a disposable PostgreSQL database and run
# backend authority regressions. This is intentionally separate from npm test:
# it requires a local PostgreSQL superuser/test instance and never contacts the
# linked Supabase project.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="${LENA_PG_TEST_DB:-lena_authority_schema_test}"
PG_OS_USER="${LENA_PG_TEST_OS_USER:-postgres}"
USE_SUDO="${LENA_PG_TEST_USE_SUDO:-0}"

run_pg() {
  if [[ "$USE_SUDO" == "1" ]]; then
    sudo -n -u "$PG_OS_USER" "$@"
  else
    "$@"
  fi
}

cleanup() {
  run_pg dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

create_clean_database() {
  cleanup
  run_pg createdb "$DB_NAME"
  run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" < "$ROOT/tests/fixtures/supabase-clean-bootstrap.sql"
}

apply_migrations() {
  local maximum="${1:-}"
  while IFS= read -r migration; do
    local name
    name="$(basename "$migration")"
    if [[ -n "$maximum" && "$name" > "$maximum" ]]; then continue; fi
    echo "Applying $name"
    run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" < "$migration" >/dev/null
  done < <(find "$ROOT/supabase/migrations" -maxdepth 1 -type f -name '*.sql' -print | sort)
}

# Preserve an executable, disposable proof of the pre-fix staff bypass. This
# must succeed only before the remediation migrations are applied.
create_clean_database
apply_migrations "0020_public_showroom_profile.sql"
run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" < "$ROOT/tests/fixtures/supabase-legacy-snapshot-bypass-proof.sql"
echo "Historical legacy snapshot bypass reproduced in disposable pre-fix schema."

# The actual release gate starts from a fresh database and applies the complete
# current migration chain before testing the fixed authority surface.
create_clean_database
apply_migrations

# Two independent Auth-user inserts race before any owner bootstrap. The fixed
# trigger assigns both inactive staff; no "first writer" can acquire admin.
run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "insert into auth.users (id, email) values ('20000000-0000-4000-8000-000000000001', 'concurrent-one@example.test');" >/dev/null &
pid_one=$!
run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "insert into auth.users (id, email) values ('20000000-0000-4000-8000-000000000002', 'concurrent-two@example.test');" >/dev/null &
pid_two=$!
wait "$pid_one"
wait "$pid_two"

run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" < "$ROOT/tests/fixtures/supabase-authority-regression.sql"

# Regression for the last-admin race: two different admin rows can otherwise
# each observe the other as active. The first demotion commits; the second must
# wait on the invariant advisory lock and then fail, leaving one active admin.
run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true); update public.profiles set role = 'admin' where id = '10000000-0000-4000-8000-000000000003'; commit;" >/dev/null
run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true); update public.profiles set is_active = false where id = '10000000-0000-4000-8000-000000000001'; select pg_sleep(0.5); commit;" >/tmp/lena-admin-race-first.log 2>&1 &
first_pid=$!
sleep 0.1
set +e
run_pg psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true); update public.profiles set is_active = false where id = '10000000-0000-4000-8000-000000000003'; commit;" >/tmp/lena-admin-race-second.log 2>&1
second_status=$?
set -e
wait "$first_pid"
if [[ "$second_status" -eq 0 ]] || ! grep -q 'LENA_LAST_ACTIVE_ADMIN_REQUIRED' /tmp/lena-admin-race-second.log; then
  echo "last-admin concurrent-demotion regression did not fail closed" >&2
  exit 1
fi
active_admins="$(run_pg psql -At -d "$DB_NAME" -c "select count(*) from public.profiles where role = 'admin' and is_active;")"
if [[ "$active_admins" != "1" ]]; then
  echo "expected exactly one active admin after race, got $active_admins" >&2
  exit 1
fi

echo "Clean Supabase-compatible schema and authority regressions passed."
