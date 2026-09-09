# Plano Técnico de Implementação — App para Restaurante

> **Para Hermes:** Use subagent-driven-development skill para implementar este plano task-by-task quando o desenvolvimento começar.

## Objetivo

Construir o MVP do MesaFácil como plataforma SaaS Multi-Tenant, com cardápio digital, pedido por QR Code, painel interno e gestão básica, mantendo desde o início isolamento absoluto entre restaurantes por `tenant_id`.

## Arquitetura

Aplicação web full-stack com Next.js no frontend/backend, Supabase como banco, autenticação, storage e realtime. A área pública permite pedido sem login apenas por QR Code válido; a área interna exige autenticação, autorização RBAC e isolamento por `tenant_id`. O frontend nunca será a única camada de segurança: RLS, APIs e Server Actions devem validar tenant e permissão.

## Stack

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- Supabase PostgreSQL;
- Supabase Auth;
- Supabase Storage;
- Supabase Realtime;
- Vercel.

---

## Etapa 1 — Criar projeto base

### Tarefa 1: Criar aplicação Next.js

Objetivo: iniciar a base do projeto.

Comando sugerido:

```bash
npx create-next-app@latest app-restaurante --typescript --tailwind --eslint --app
```

Verificação:

```bash
cd app-restaurante
npm run dev
```

Esperado:
- aplicação abre localmente;
- página inicial padrão aparece.

### Tarefa 2: Instalar dependências Supabase e QR Code

Comando:

```bash
npm install @supabase/supabase-js @supabase/ssr qrcode
npm install -D @types/qrcode
```

Verificação:

```bash
npm run lint
```

---

## Etapa 2 — Configurar Supabase

### Tarefa 3: Criar variáveis de ambiente

Criar `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Regra:
- nunca expor service role no frontend;
- service role somente em rotas server-side/admin protegidas.

### Tarefa 4: Criar schema inicial

Criar tabelas:
- restaurants;
- tenant_users;
- tables;
- categories;
- products;
- orders;
- order_items;
- order_status_events.

Verificação:
- migrations aplicadas;
- tabelas aparecem no Supabase;
- RLS habilitado onde necessário.

---

## Etapa 3 — Autenticação interna

### Tarefa 5: Criar login

Rotas:
- `/login`;
- `/admin`.

Comportamento:
- usuário não logado é redirecionado para login;
- usuário logado acessa painel.

### Tarefa 6: Carregar restaurante do usuário

Função:
- buscar vínculo em `tenant_users`;
- carregar restaurante ativo;
- bloquear acesso se não houver vínculo.

---

## Etapa 4 — Cardápio administrativo

### Tarefa 7: CRUD de categorias

Rotas:
- `/admin/categories`.

Campos:
- nome;
- descrição;
- ordem;
- ativo.

### Tarefa 8: CRUD de produtos

Rotas:
- `/admin/products`.

Campos:
- categoria;
- nome;
- descrição;
- preço;
- imagem;
- disponível;
- destaque.

### Tarefa 9: Upload de imagem

Usar Supabase Storage.

Regra:
- imagens em bucket por restaurante;
- validar tipo de arquivo;
- limitar tamanho.

---

## Etapa 5 — Mesas e QR Codes

### Tarefa 10: CRUD de mesas

Rota:
- `/admin/tables`.

Campos:
- número;
- rótulo;
- ativo.

### Tarefa 11: Gerar QR Code

URL pública:

```text
/r/[restaurantSlug]/m/[qrToken]
```

Ação:
- gerar imagem QR Code;
- permitir download/impressão.

---

## Etapa 6 — Área pública do cliente

### Tarefa 12: Página pública da mesa

Rota:
- `/r/[restaurantSlug]/m/[qrToken]`.

Validações:
- restaurante existe e está ativo;
- mesa existe e está ativa.

### Tarefa 13: Cardápio público

Mostrar:
- categorias ativas;
- produtos disponíveis;
- preço;
- imagem;
- descrição.

### Tarefa 14: Carrinho local

Implementar carrinho no estado local do navegador.

Deve permitir:
- adicionar item;
- remover item;
- alterar quantidade;
- observação por item;
- total.

### Tarefa 15: Enviar pedido

Criar rota server-side/API para:
- validar mesa;
- validar produtos;
- recalcular preços no servidor;
- criar order;
- criar order_items;
- retornar confirmação.

---

## Etapa 7 — Operação interna

### Tarefa 16: Painel de pedidos

Rota:
- `/admin/orders`.

Mostrar:
- pedidos por status;
- mesa;
- horário;
- total;
- ações.

### Tarefa 17: Detalhe do pedido

Rota:
- `/admin/orders/[id]`.

Mostrar:
- itens;
- observações;
- status;
- histórico;
- botões de ação.

### Tarefa 18: Painel da cozinha

Rota:
- `/kitchen` ou `/admin/kitchen`.

Mostrar:
- pedidos received/confirmed/preparing;
- itens grandes;
- observações destacadas;
- botões em preparo/pronto.

### Tarefa 19: Realtime

Usar Supabase Realtime para:
- novos pedidos aparecerem sem atualizar página;
- status mudar em tempo real.

---

## Etapa 8 — Relatórios básicos

### Tarefa 20: Dashboard

Indicadores:
- vendas do dia;
- pedidos do dia;
- ticket médio;
- produtos mais vendidos;
- pedidos cancelados.

---

## Etapa 9 — Verificação final do MVP

Checklist:

- [ ] Login interno funciona;
- [ ] Admin cria categoria;
- [ ] Admin cria produto;
- [ ] Admin cria mesa;
- [ ] QR Code abre cardápio da mesa;
- [ ] Cliente envia pedido;
- [ ] Pedido aparece no painel;
- [ ] Cozinha altera status;
- [ ] Atendimento finaliza;
- [ ] Relatório mostra pedido finalizado;
- [ ] Dados ficam isolados por restaurante;
- [ ] Mobile está utilizável.

## Critério de pronto

O MVP está pronto quando um restaurante real consegue usar o sistema durante um atendimento simples de mesa, do QR Code até a entrega do pedido.
