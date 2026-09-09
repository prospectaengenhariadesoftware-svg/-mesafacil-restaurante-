# Modelo de Dados — MesaFácil SaaS Multi-Tenant

## Decisão de identificação do tenant

O identificador padrão de tenant no MesaFácil será:

```text
tenant_id
```

Neste projeto, cada restaurante é um tenant independente. Não será usado `tenant_id` em paralelo para evitar ambiguidade.

Toda tabela operacional deverá possuir:

1. `tenant_id` direto; ou
2. vínculo indireto obrigatório e documentado até uma tabela com `tenant_id`.

Exemplo de vínculo indireto:

```text
order_items → orders → tenant_id
order_status_events → orders → tenant_id
```

## Entidades atuais do MVP

## tenants

Representa o restaurante cliente e também o tenant da plataforma.

Campos atuais/recomendados:

- `id`: uuid, PK;
- `name`: text;
- `slug`: text, único;
- `logo_url`: text;
- `phone`: text;
- `address`: text;
- `is_active`: boolean;
- `status`: enum futuro — active, trialing, blocked, cancelled;
- `plan_id`: uuid futuro;
- `trial_ends_at`: timestamp futuro;
- `subscription_status`: text futuro;
- `created_at`: timestamp;
- `updated_at`: timestamp.

Regras:

- restaurante inativo/bloqueado não deve permitir operação interna normal;
- dados de um restaurante nunca podem ser expostos a outro;
- toda configuração comercial futura deve se vincular ao restaurante.

## profiles

Tabela planejada para perfil global do usuário autenticado.

Campos recomendados:

- `id`: uuid, PK e FK `auth.users.id`;
- `full_name`: text;
- `phone`: text;
- `avatar_url`: text;
- `status`: enum active/blocked/deleted;
- `created_at`: timestamp;
- `updated_at`: timestamp.

Observação:

- `profiles` representa a pessoa globalmente;
- permissões por restaurante ficam em `tenant_users`.

## tenant_users

Relaciona usuários ao tenant/restaurante.

Campos atuais/recomendados:

- `id`: uuid, PK;
- `tenant_id`: uuid, FK `tenants.id`;
- `user_id`: uuid, FK `auth.users.id`;
- `role`: enum;
- `status`: enum active/invited/blocked/removed;
- `is_active`: boolean no schema atual, poderá evoluir para `status`;
- `created_at`: timestamp;
- `updated_at`: timestamp;
- unique (`tenant_id`, `user_id`).

Papéis planejados:

- `owner`;
- `admin`;
- `manager`;
- `attendant`;
- `waiter`;
- `kitchen`;
- `cashier`;
- `operator`.

Regras:

- usuário pode participar de mais de um restaurante no futuro;
- cada vínculo define papel/permissão naquele restaurante específico;
- usuário sem vínculo ativo não acessa área interna;
- usuário de um restaurante não acessa outro.

## platform_admins

Tabela planejada para Super Admin da plataforma MesaFácil.

Campos recomendados:

- `id`: uuid, PK;
- `user_id`: uuid, FK `auth.users.id`;
- `role`: enum owner/support/finance/ops;
- `status`: enum active/blocked;
- `created_by`: uuid;
- `created_at`: timestamp;
- `updated_at`: timestamp.

Regras:

- não usar e-mail hardcoded no frontend;
- não usar variável pública para conceder privilégio;
- acesso a dados internos de tenant deve ser auditável.

## tables

Mesas do restaurante.

Campos:

- `id`: uuid, PK;
- `tenant_id`: uuid, FK `tenants.id`;
- `number`: text;
- `label`: text;
- `qr_token`: text, único;
- `is_active`: boolean;
- `created_at`: timestamp.

Regras:

- mesa pertence a um único restaurante;
- QR Code deve identificar mesa e restaurante de forma segura;
- `qr_token` não deve ser sequencial;
- mesa inativa não deve aceitar pedido.

## categories

Categorias do cardápio.

Campos:

- `id`: uuid, PK;
- `tenant_id`: uuid, FK `tenants.id`;
- `name`: text;
- `description`: text;
- `sort_order`: integer;
- `is_active`: boolean;
- `created_at`: timestamp;
- `updated_at`: timestamp.

Regras:

- categoria pertence a um único restaurante;
- usuários só podem alterar categorias do próprio restaurante;
- categoria de A nunca pode aparecer para B.

## products

Produtos/pratos/bebidas do cardápio.

Campos:

- `id`: uuid, PK;
- `tenant_id`: uuid, FK `tenants.id`;
- `category_id`: uuid, FK `categories.id`;
- `name`: text;
- `description`: text;
- `price_cents`: integer;
- `image_url`: text;
- `is_available`: boolean;
- `is_featured`: boolean;
- `sort_order`: integer;
- `created_at`: timestamp;
- `updated_at`: timestamp.

Regras:

- produto deve pertencer ao mesmo `tenant_id` da categoria;
- preço deve ser salvo em centavos;
- alteração futura de produto não altera pedido antigo;
- imagem do produto deve respeitar storage por restaurante.

## orders

Pedido realizado pelo cliente ou equipe.

Campos:

- `id`: uuid, PK;
- `tenant_id`: uuid, FK `tenants.id`;
- `table_id`: uuid, FK `tables.id`;
- `order_number`: integer;
- `status`: enum received/confirmed/preparing/ready/delivered/cancelled;
- `type`: enum dine_in/takeaway/delivery;
- `customer_name`: text, opcional;
- `notes`: text;
- `total_cents`: integer;
- `cancellation_reason`: text;
- `created_at`: timestamp;
- `updated_at`: timestamp;
- `delivered_at`: timestamp.

Regras:

- pedido deve pertencer a um único restaurante;
- `table_id`, quando existir, deve pertencer ao mesmo `tenant_id`;
- `order_number` pode ser único por restaurante;
- total deve ser recalculado no servidor;
- cliente não pode forjar preço;
- status deve seguir transições permitidas.

## order_items

Itens do pedido.

Campos:

- `id`: uuid, PK;
- `order_id`: uuid, FK `orders.id`;
- `product_id`: uuid, FK `products.id`;
- `product_name_snapshot`: text;
- `unit_price_cents`: integer;
- `quantity`: integer;
- `notes`: text;
- `subtotal_cents`: integer;
- `created_at`: timestamp.

Regras:

- isolamento herdado por `orders.tenant_id`;
- produto deve pertencer ao mesmo restaurante do pedido;
- salvar snapshot de nome e preço;
- subtotal deve ser calculado no servidor.

## order_status_events

Histórico de mudança de status.

Campos:

- `id`: uuid, PK;
- `order_id`: uuid, FK `orders.id`;
- `from_status`: text;
- `to_status`: text;
- `changed_by`: uuid, FK `auth.users.id`, opcional;
- `note`: text;
- `created_at`: timestamp.

Regras:

- isolamento herdado por `orders.tenant_id`;
- alteração relevante de status deve gerar evento;
- cancelamentos e fechamentos devem ser auditáveis.

## audit_logs

Tabela planejada para auditoria.

Campos recomendados:

- `id`: uuid, PK;
- `tenant_id`: uuid, opcional para eventos globais;
- `actor_user_id`: uuid;
- `actor_role`: text;
- `operation`: text;
- `resource_type`: text;
- `resource_id`: uuid/text;
- `metadata`: jsonb;
- `ip_address`: text;
- `user_agent`: text;
- `created_at`: timestamp.

Eventos futuros:

- login;
- alteração de usuário;
- alteração de permissão;
- criação/cancelamento/fechamento de pedido;
- alteração de preço;
- alteração de configuração;
- acesso Super Admin a tenant;
- alteração de plano/assinatura.

## Entidades SaaS futuras

## plans

Planos comerciais da plataforma.

Campos recomendados:

- `id`;
- `name`;
- `price_cents`;
- `billing_interval`;
- `limits`, jsonb;
- `features`, jsonb;
- `is_active`;
- `created_at`.

## subscriptions

Assinatura do restaurante.

Campos recomendados:

- `id`;
- `tenant_id`;
- `plan_id`;
- `status`;
- `trial_ends_at`;
- `current_period_start`;
- `current_period_end`;
- `cancel_at`;
- `external_customer_id`;
- `external_subscription_id`;
- `created_at`;
- `updated_at`.

## tenant_usage_snapshots

Uso por restaurante para limites de plano.

Campos recomendados:

- `id`;
- `tenant_id`;
- `period_start`;
- `period_end`;
- `orders_count`;
- `products_count`;
- `users_count`;
- `storage_bytes`;
- `created_at`.

## Regras de isolamento

- Todo dado operacional deve ter `tenant_id` direto ou vínculo indireto protegido;
- usuário interno só acessa restaurante vinculado em `tenant_users`;
- cliente público só pode ler restaurante/cardápio/mesa ativos;
- cliente público só pode criar pedidos para mesa ativa;
- cliente público não pode listar pedidos de outras mesas;
- RLS deve proteger SELECT/INSERT/UPDATE/DELETE;
- APIs devem validar autenticação, tenant e permissão;
- Storage deve separar arquivos por `tenant_id`.

## Índices recomendados

- `tenants.slug`;
- `tenant_users.tenant_id`;
- `tenant_users.user_id`;
- `tables.tenant_id`;
- `tables.qr_token`;
- `categories.tenant_id`;
- `products.tenant_id`;
- `products.category_id`;
- `products.is_available`;
- `orders.tenant_id`;
- `orders.table_id`;
- `orders.status`;
- `orders.created_at`;
- `order_items.order_id`;
- `order_status_events.order_id`;
- `audit_logs.tenant_id`;
- `audit_logs.actor_user_id`.

## Status do schema atual

O schema inicial em `mesafacil/supabase/schema.sql` já contém:

- `tenants`;
- `tenant_users`;
- `tables`;
- `categories`;
- `products`;
- `orders`;
- `order_items`;
- `order_status_events`;
- RLS habilitada nas tabelas atuais.

Pendências antes de operação comercial:

- criar políticas RLS completas;
- expandir enum de roles;
- adicionar `profiles`;
- adicionar `platform_admins`;
- adicionar `audit_logs`;
- adicionar tabelas comerciais SaaS quando cobrança for entrar;
- criar testes de isolamento entre tenants.

## Observações importantes

- Preço deve ser salvo em centavos para evitar erro com decimal.
- Pedido deve salvar nome e preço do produto como snapshot.
- Alteração futura de produto não deve alterar histórico do pedido.
- Status deve ter histórico para auditoria operacional.
- `tenant_id` deve ser tratado como tenant do SaaS inteiro.
