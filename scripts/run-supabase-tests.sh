#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="$ROOT_DIR/supabase/tests"
TARGET="${SUPABASE_TEST_TARGET:-local}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI não encontrado no PATH." >&2
  exit 127
fi

if [[ ! -d "$TEST_DIR" ]]; then
  echo "Diretório de testes SQL não encontrado: $TEST_DIR" >&2
  exit 1
fi

case "$TARGET" in
  local)
    QUERY_TARGET_FLAG="--local"
    ;;
  linked)
    if [[ "${ALLOW_LINKED_SUPABASE_TESTS:-}" != "1" ]]; then
      cat >&2 <<'MSG'
Recusando executar testes SQL no Supabase linked/remoto sem confirmação explícita.

Para rodar contra o projeto vinculado, use:
  ALLOW_LINKED_SUPABASE_TESTS=1 SUPABASE_TEST_TARGET=linked npm run test:sql

Por padrão, use o banco local:
  npm run test:sql
MSG
      exit 2
    fi
    QUERY_TARGET_FLAG="--linked"
    ;;
  *)
    echo "SUPABASE_TEST_TARGET inválido: $TARGET. Use 'local' ou 'linked'." >&2
    exit 2
    ;;
esac

mapfile -t SQL_TESTS < <(find "$TEST_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ ${#SQL_TESTS[@]} -eq 0 ]]; then
  echo "Nenhum teste SQL encontrado em $TEST_DIR" >&2
  exit 1
fi

echo "Alvo dos testes SQL Supabase: $TARGET ($QUERY_TARGET_FLAG)"

for test_file in "${SQL_TESTS[@]}"; do
  relative_path="${test_file#"$ROOT_DIR/"}"
  echo "==> supabase db query $QUERY_TARGET_FLAG --file $relative_path"
  supabase db query "$QUERY_TARGET_FLAG" --file "$test_file"
done

echo "Todos os testes SQL/Supabase passaram (${#SQL_TESTS[@]} arquivos) no alvo: $TARGET."
