# Product Image Upload Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implementar upload real e seguro de imagens de produto no MesaFácil, substituindo a dependência exclusiva de URL manual e mantendo isolamento por tenant.

**Architecture:** Usar Supabase Storage com bucket público apenas para imagens de cardápio, paths prefixados por `tenant_id`, policies de Storage/RLS para impedir escrita/leitura administrativa cruzada, validação server-side do arquivo e persistência do `image_url` no produto. A UI continuará simples e server-rendered, com input de arquivo no cadastro/edição de produto e feedback seguro.

**Tech Stack:** Next.js App Router 16, Server Actions, Supabase Auth, Supabase Storage, PostgreSQL/RLS, Vitest, Supabase SQL tests, Vercel.

---

## Current findings

- Roadmap obrigatório: `docs/02-mvp-roadmap.md`, Fase 2, linha de escopo “subir imagem do produto”.
- Estado atual: `src/components/catalog/product-manager.tsx` possui apenas campo `imageUrl` textual.
- Estado atual: `src/app/actions/catalog.ts` salva apenas `image_url` informado como URL.
- Estado atual: buscas por `storage`, `bucket` e `objects` em `supabase/` não mostram bucket/policies de Storage para produto.
- Regra do projeto: imagens públicas de cardápio podem ser públicas, mas upload/alteração exige autorização e path iniciado pelo `tenant_id` autorizado.

## Acceptance criteria

1. Administrador/usuário autorizado do tenant consegue cadastrar produto com arquivo de imagem válido.
2. Administrador/usuário autorizado consegue trocar/remover imagem no produto existente.
3. Arquivos são gravados em path tenant-safe: `<tenant_id>/products/<product_id-or-temp>/<safe-file-name>` ou padrão equivalente.
4. Usuário de Tenant A não consegue gravar/alterar/remover imagem no path do Tenant B.
5. Arquivo inválido é rejeitado antes de persistir produto: tipo não permitido, tamanho excessivo ou arquivo vazio.
6. `image_url` salvo no produto é uma URL pública/canônica do Supabase Storage ou `null` se removida.
7. Falha de upload não pode criar produto com imagem quebrada reportando sucesso.
8. Falha de atualização não pode apagar imagem existente sem confirmação explícita.
9. `npm test`, `npm run lint`, `npm run build`, `supabase db lint --linked` e testes SQL passam.
10. Revisão independente aprova antes de commit/push/deploy.

---

## Task 1: Mapear Storage e padrões Supabase do projeto

**Objective:** Confirmar nomes, versionamento e permissões antes de criar migration.

**Files:**
- Read: `package.json`
- Read: `src/lib/supabase/server.ts`
- Read: `supabase/config.toml`
- Read: `supabase/migrations/*.sql`

**Steps:**
1. Rodar:
   ```bash
   npm ls @supabase/supabase-js
   ```
2. Ler `src/lib/supabase/server.ts` para confirmar client server-side autenticado.
3. Consultar no banco remoto:
   ```bash
   supabase db query --linked <<'SQL'
   select id, name, public from storage.buckets order by id;
   SQL
   ```
4. Registrar se bucket já existe ou se será criado via migration.

**Expected:** Decisão documentada: criar bucket novo `tenant-product-images` se inexistente.

---

## Task 2: Criar teste RED de validação de arquivo

**Objective:** Definir contrato de validação antes de implementar upload.

**Files:**
- Create/Modify: `src/lib/validation/product-image.ts`
- Create: `src/lib/validation/product-image.test.ts`

**Step 1: Write failing test**

Criar testes para:
- aceita `image/png`, `image/jpeg`, `image/webp`;
- rejeita `image/svg+xml`, `text/plain`, arquivo vazio;
- rejeita arquivo maior que limite definido, recomendado 2 MB;
- gera nome seguro sem path traversal;
- aceita ausência de arquivo como “sem alteração”.

**Step 2: Run test to verify failure**

```bash
npm test -- src/lib/validation/product-image.test.ts
```

Expected: FAIL porque `product-image.ts` ainda não existe.

---

## Task 3: Implementar validação de imagem

**Objective:** Criar funções puras para validar arquivo e path.

**Files:**
- Create: `src/lib/validation/product-image.ts`
- Test: `src/lib/validation/product-image.test.ts`

**Implementation guidance:**
- Exportar limite: `MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024`.
- Exportar allowed types: PNG, JPEG, WEBP.
- Validar `File` recebido do `FormData`.
- Retornar union `{ success: true, data } | { success: false, error }`.
- Sanitizar nome para letras/números/hífen/ponto; nunca aceitar `/`, `..`, `\`.
- Preferir nome final gerado no servidor com UUID/timestamp para evitar colisão.

**Verification:**
```bash
npm test -- src/lib/validation/product-image.test.ts
```

Expected: PASS.

---

## Task 4: Criar migration de Storage bucket/policies

**Objective:** Adicionar bucket e policies para upload tenant-safe.

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_tenant_product_image_storage.sql`
- Create/Modify: `supabase/tests/rls_product_image_storage.sql`

**Migration requirements:**
- Criar bucket `tenant-product-images` em `storage.buckets` com `public = true` e tamanho compatível com app.
- Policies em `storage.objects` com prefixo `tenant_id`:
  - SELECT público se o bucket for público, ou SELECT autenticado por tenant se optar por bucket privado. Para cardápio público, preferir bucket público limitado a imagens não sensíveis.
  - INSERT/UPDATE/DELETE apenas para usuário autenticado com acesso ao tenant cujo UUID é o primeiro segmento do path.
- Usar `storage.foldername(name)[1]` ou função equivalente para comparar o primeiro segmento do path com tenant autorizado.
- Não usar service role no browser.

**SQL test requirements:**
- Tenant A consegue inserir object em `tenant-a/products/...`.
- Tenant A não consegue inserir/update/delete em `tenant-b/products/...`.
- Usuário sem tenant ativo não consegue escrever.
- Policies não liberam escrita pública.

**Verification:**
```bash
supabase db lint --linked
supabase db query --linked --file supabase/tests/rls_product_image_storage.sql
```

Expected: PASS.

---

## Task 5: Implementar helper de Storage no servidor

**Objective:** Centralizar upload/removal e evitar lógica espalhada nas actions.

**Files:**
- Create: `src/lib/storage/product-images.ts`
- Test if practical: `src/lib/storage/product-images.test.ts`

**Implementation guidance:**
- Função `buildProductImagePath(tenantId, productId, originalName)` testável.
- Função `uploadProductImage({ supabase, tenantId, productId, file })`.
- Usar `supabase.storage.from('tenant-product-images').upload(path, file, { upsert: false, contentType })`.
- Retornar URL pública via `getPublicUrl(path)`.
- Não imprimir URL com tokens; bucket público não deve exigir token.
- Se upload falhar, retornar erro amigável.

**Verification:**
```bash
npm test -- src/lib/storage/product-images.test.ts src/lib/validation/product-image.test.ts
```

Expected: PASS.

---

## Task 6: Adaptar cadastro de produto para upload

**Objective:** Permitir criar produto com imagem enviada pelo usuário.

**Files:**
- Modify: `src/components/catalog/product-manager.tsx`
- Modify: `src/app/actions/catalog.ts`

**UI changes:**
- Trocar/adicionar input:
  ```tsx
  <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" />
  ```
- Manter `imageUrl` opcional somente como fallback se necessário, mas deixar claro que upload é preferencial.
- Garantir `form` com `encType="multipart/form-data"` se necessário.

**Server Action changes:**
- Criar produto primeiro com `image_url: null` para obter `product.id`, ou usar transação/RPC se for necessário atomicidade forte.
- Fazer upload com path contendo `tenantId` e `product.id`.
- Atualizar `tenant_products.image_url` após upload.
- Se upload falhar após insert, inativar/remover produto recém-criado ou reportar fail-closed sem sucesso falso. Preferir caminho transacional via RPC se a inconsistência for inaceitável.
- Validar categoria same-tenant continua pelo banco e RLS.

**Verification:**
```bash
npm test
npm run lint
npm run build
```

Expected: PASS.

---

## Task 7: Adaptar edição/remoção de imagem do produto

**Objective:** Permitir trocar/remover imagem sem quebrar produto existente.

**Files:**
- Modify: `src/components/catalog/product-manager.tsx`
- Modify: `src/app/actions/catalog.ts`

**UI changes:**
- Mostrar imagem atual como preview/link quando `product.image_url` existir.
- Adicionar input `imageFile` na edição.
- Adicionar checkbox explícito `removeImage` com texto claro.

**Server Action changes:**
- Se `removeImage=true`, setar `image_url=null` e tentar remover object antigo somente se o path pertencer ao tenant.
- Se novo arquivo enviado, validar/upload e atualizar `image_url`.
- Não remover imagem antiga antes de confirmar upload da nova.
- Se upload novo falhar, manter imagem antiga.

**Verification:**
```bash
npm test
npm run lint
npm run build
```

Expected: PASS.

---

## Task 8: Atualizar visualização de produto/cardápio público

**Objective:** Garantir que imagem enviada apareça nos painéis e no cardápio público sem expor campos internos.

**Files:**
- Modify if needed: `src/components/catalog/product-manager.tsx`
- Inspect/Modify if needed: public menu components/routes under `src/app/r/[restaurantSlug]/m/[qrToken]` and `src/lib/public-menu/*`

**Steps:**
1. Confirmar que o RPC público já retorna `image_url`.
2. Renderizar imagem com `next/image` ou `<img>` simples conforme padrão atual.
3. Usar alt seguro com nome do produto.
4. Não expor `product.id`, `table.id` ou tenant interno no payload público.

**Verification:**
```bash
npm test
npm run lint
npm run build
```

Expected: PASS.

---

## Task 9: Rodar verificação completa e revisão independente

**Objective:** Bloquear regressões antes de commit.

**Commands:**
```bash
npm test
npm run lint
npm run build
supabase db lint --linked
for f in supabase/tests/*.sql; do supabase db query --linked --file "$f"; done
```

**Independent review:**
- Criar bundle com `git diff` e arquivos novos.
- Pedir revisão independente com foco em:
  - RLS/Storage path tenant-safe;
  - vazamento de IDs/tokens;
  - atomicidade create product + upload;
  - remoção segura da imagem antiga;
  - ausência de service role no frontend;
  - compatibilidade com cardápio público.

**Expected:** Reviewer retorna `passed: true` sem `security_concerns` e sem `logic_errors`.

---

## Task 10: Commit, push, deploy e verificação de produção

**Objective:** Publicar somente depois de passar em tudo.

**Commands:**
```bash
git status --short
git add src lib supabase docs

git commit -m "[verified] feat: add tenant product image uploads"
GIT_SSH_COMMAND='ssh -i [REDACTED] -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' git push origin main
npx vercel deploy --prod --yes
```

**Production checks:**
```bash
curl -sSIL https://mesafacil-restaurante.vercel.app
curl -sSIL https://mesafacil-restaurante.vercel.app/tenants/00000000-0000-0000-0000-000000000000/produtos
```

Expected:
- raiz `HTTP/2 200`;
- rota protegida redireciona para login quando sem autenticação;
- deploy Vercel `Ready / Production`.

---

## Risks and decisions to revisit during implementation

- **Atomicidade:** Supabase Storage + update SQL não são uma única transação. Implementação deve evitar sucesso falso e limpar/inativar em falha.
- **Bucket público:** aceitável para imagens de cardápio, mas só para conteúdo não sensível. Escrita deve ser autenticada e tenant-scoped.
- **Path parsing:** testar explicitamente `tenant_id` como primeiro segmento para evitar bypass por nome de arquivo.
- **Tipos de arquivo:** não confiar só no `accept` do input; validar no servidor.
- **Tamanho:** limite recomendado inicial de 2 MB para MVP.
- **Imagem antiga:** nunca remover antes de novo upload/update confirmado.

## Not included in this plan

- Edição/corte automático de imagem.
- CDN customizada.
- Compressão server-side.
- Upload múltiplo por produto.
- Galeria de imagens.
- Pagamento online, delivery, fidelidade ou estoque.
