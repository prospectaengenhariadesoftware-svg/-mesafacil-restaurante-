# Segurança e Arquitetura Multi-Tenant — MesaFácil

## Decisão arquitetural

O MesaFácil será uma plataforma **SaaS Multi-Tenant**.

Cada restaurante será tratado como um tenant independente.

A abordagem padronizada para identificação do tenant será:

```text
restaurant_id
```

Neste projeto, `restaurant_id` é o identificador oficial do tenant. Não será utilizado `tenant_id` em paralelo para evitar ambiguidade, duplicidade de regras e risco de falha de isolamento.

## 1. Arquitetura SaaS Multi-Tenant

O MesaFácil deve operar como uma plataforma SaaS para múltiplos restaurantes usando a mesma base de aplicação, infraestrutura e código, porém com isolamento absoluto de dados.

Estrutura lógica:

```text
PLATAFORMA MESAFÁCIL
→ RESTAURANTE / TENANT
→ USUÁRIOS DO RESTAURANTE
→ PAPÉIS E PERMISSÕES
→ DADOS OPERACIONAIS DO RESTAURANTE
```

Todos os dados operacionais pertencentes a um restaurante devem possuir vínculo direto ou indireto com `restaurant_id`.

O isolamento entre restaurantes deve ser absoluto. Um restaurante nunca poderá visualizar, alterar, excluir, exportar ou inferir dados pertencentes a outro restaurante.

Essa regra vale para:

- usuários;
- mesas;
- categorias;
- produtos;
- cardápios;
- pedidos;
- itens dos pedidos;
- clientes;
- histórico de pedidos;
- configurações;
- relatórios;
- imagens;
- arquivos;
- logs;
- integrações;
- dados financeiros;
- planos;
- assinaturas;
- eventos de auditoria.

### Regra obrigatória

Nenhuma tabela operacional multi-tenant deve existir sem uma estratégia clara de associação ao `restaurant_id`.

Quando a tabela não tiver `restaurant_id` direto, o caminho de associação deve ser explícito e protegido por chave estrangeira. Exemplo:

```text
order_items → orders → restaurant_id
```

## 2. Autenticação

A stack recomendada permanece:

- Supabase Auth;
- Next.js para rotas e Server Actions;
- PostgreSQL com RLS;
- Vercel para deploy.

O sistema deverá possuir login seguro para qualquer área administrativa ou operacional.

Funcionalidades planejadas:

- login por e-mail e senha;
- logout;
- recuperação de senha;
- redefinição de senha;
- confirmação de e-mail, quando necessário;
- controle de sessão;
- expiração segura de sessão;
- proteção contra acesso não autenticado;
- proteção das rotas internas;
- bloqueio de usuário desativado;
- possibilidade futura de autenticação em dois fatores.

Nenhuma tela administrativa ou operacional deve ficar acessível apenas por conhecer a URL.

Rotas protegidas devem validar:

1. usuário autenticado;
2. usuário ativo;
3. vínculo com restaurante;
4. restaurante ativo;
5. permissão para a operação solicitada.

Exemplos de rotas protegidas:

- `/admin`;
- `/admin/products`;
- `/admin/tables`;
- `/admin/orders`;
- `/admin/kitchen`;
- `/admin/users`;
- `/admin/settings`;
- `/platform` ou painel Super Admin.

## 3. Row Level Security — RLS

Como o projeto usa Supabase/PostgreSQL, todas as tabelas relacionadas a tenants deverão utilizar RLS.

A RLS não pode ser apenas visual ou dependente do frontend. A proteção deve existir diretamente no banco de dados.

O frontend pode filtrar por conveniência de interface, mas a segurança real precisa estar em:

- políticas RLS;
- funções SQL seguras;
- validações server-side;
- chaves estrangeiras;
- constraints;
- permissões por papel.

### Regras esperadas de RLS

Para tabelas com `restaurant_id` direto:

- `SELECT`: usuário só acessa registros cujo `restaurant_id` esteja vinculado a ele em `restaurant_users`;
- `INSERT`: usuário só cria registros para restaurante ao qual pertence e no qual tem permissão;
- `UPDATE`: usuário só altera registros do próprio restaurante e dentro da permissão do papel;
- `DELETE`: usuário só exclui registros do próprio restaurante e quando seu papel permitir.

Para tabelas com vínculo indireto:

- `order_items` deve herdar isolamento via `orders.restaurant_id`;
- `order_status_events` deve herdar isolamento via `orders.restaurant_id`;
- arquivos devem herdar isolamento por caminho/bucket associado ao restaurante.

### Princípio obrigatório

Não confiar em filtros aplicados somente pelo frontend.

Qualquer consulta sem filtro no frontend ainda deve retornar apenas o que a RLS permite.

## 4. Identificação segura do tenant

O tenant não poderá ser escolhido livremente pelo navegador.

O sistema nunca deve aceitar diretamente um `restaurant_id` enviado pelo cliente como autorização suficiente.

Fluxo seguro:

1. usuário autentica pelo Supabase Auth;
2. backend obtém `auth.uid()`;
3. banco verifica vínculo em `restaurant_users`;
4. restaurante ativo é carregado;
5. permissões são resolvidas;
6. operação é executada somente no tenant autorizado.

Estrutura recomendada:

## `profiles`

Perfil global do usuário.

Campos planejados:

- `id` — uuid, igual a `auth.users.id`;
- `full_name`;
- `phone`;
- `avatar_url`;
- `status` — active, blocked, deleted;
- `created_at`;
- `updated_at`.

## `restaurants`

Representa o tenant/restaurante.

Campos planejados:

- `id`;
- `name`;
- `slug`;
- `status` — active, trialing, blocked, cancelled;
- `plan_id`, futuro;
- `trial_ends_at`, futuro;
- `subscription_status`, futuro;
- `created_at`;
- `updated_at`.

## `restaurant_users`

Associação autorizada entre usuário e restaurante.

Campos obrigatórios:

- `id`;
- `restaurant_id`;
- `user_id`;
- `role`;
- `status`;
- `created_at`;
- `updated_at`.

Um usuário poderá futuramente participar de mais de um restaurante, desde que essa associação esteja registrada e autorizada.

## 5. Controle de permissões — RBAC

O sistema deverá implementar RBAC — Role Based Access Control.

Papéis iniciais:

- Super Administrador da plataforma;
- Proprietário do restaurante;
- Administrador;
- Gerente;
- Atendente;
- Garçom;
- Cozinha;
- Caixa;
- Usuário operacional.

A permissão deve considerar sempre:

```text
USUÁRIO + RESTAURANTE + FUNÇÃO + PERMISSÃO + RECURSO
```

Não basta verificar apenas:

```text
role = admin
```

Também não basta esconder botões no frontend. As permissões devem ser aplicadas em:

- componentes visuais;
- Server Actions;
- APIs;
- RLS;
- funções SQL;
- logs de auditoria.

## 6. Super Administrador

O MesaFácil terá o conceito de **Super Admin da plataforma**.

O Super Admin administra a plataforma SaaS e não pertence necessariamente a um restaurante específico.

Permissões previstas:

- visualizar tenants;
- bloquear/desbloquear tenants;
- administrar planos;
- visualizar status de assinaturas;
- acompanhar métricas gerais;
- prestar suporte;
- administrar configurações globais.

O acesso do Super Admin aos dados internos dos restaurantes deverá ser:

- explicitamente controlado;
- auditável;
- limitado ao necessário;
- registrado em logs quando envolver suporte ou visualização sensível.

Não serão aceitos mecanismos inseguros como:

- e-mail hardcoded no frontend;
- variável pública determinando administrador;
- parâmetro de URL concedendo acesso administrativo;
- lista local no navegador;
- bypass de RLS sem função controlada.

Estrutura recomendada:

## `platform_admins`

- `id`;
- `user_id`;
- `role` — owner, support, finance, ops;
- `status`;
- `created_at`;
- `created_by`.

## 7. Proteção das APIs

Qualquer API, Server Action, Route Handler, Edge Function ou endpoint deve seguir este fluxo obrigatório:

1. validar autenticação;
2. validar usuário e status;
3. identificar tenant a partir do vínculo autorizado;
4. validar permissão;
5. validar entrada;
6. executar operação somente no tenant autorizado;
7. registrar evento quando aplicável;
8. retornar resposta mínima necessária.

Nunca aceitar diretamente um `restaurant_id` enviado pelo navegador sem validar que o usuário pertence àquele restaurante.

Exemplo proibido:

```ts
await updateProduct({ restaurantId: form.restaurant_id, productId })
```

Exemplo esperado:

```ts
const context = await requireTenantPermission('products:update')
await updateProduct({ restaurantId: context.restaurantId, productId })
```

## 8. Storage

Arquivos e imagens também devem respeitar isolamento por restaurante.

Estrutura recomendada de path:

```text
restaurant-id/
  produtos/
  restaurante/
  documentos/
  usuarios/
```

Exemplos:

```text
8bb1.../produtos/foto-prato.jpg
8bb1.../restaurante/logo.png
8bb1.../documentos/contrato.pdf
8bb1.../usuarios/avatar.png
```

Regras:

- buckets privados quando o arquivo não for público;
- imagens públicas de cardápio podem ser servidas publicamente, mas upload/alteração exige autorização;
- documentos, contratos e arquivos financeiros devem ficar privados;
- políticas de Storage devem validar path iniciado pelo `restaurant_id` autorizado;
- service role não deve ser usada no browser.

## 9. Secrets e variáveis de ambiente

Nunca expor no frontend:

- `SUPABASE_SERVICE_ROLE_KEY`;
- chaves privadas;
- tokens;
- senhas;
- segredos de API;
- credenciais de pagamento;
- credenciais de integrações;
- webhooks secrets;
- credenciais fiscais.

Variáveis com prefixo `NEXT_PUBLIC_` são públicas e podem ser vistas pelo navegador.

Permitido no frontend:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`, desde que RLS esteja correta.

Obrigatório no servidor:

- service role;
- tokens de pagamento;
- segredos de integração;
- chaves fiscais;
- chaves de assinatura de webhook.

## 10. Logs e auditoria

O sistema deverá planejar tabela de auditoria para eventos relevantes.

Tabela recomendada:

## `audit_logs`

Campos:

- `id`;
- `restaurant_id`, opcional para eventos globais;
- `actor_user_id`;
- `actor_role`;
- `operation`;
- `resource_type`;
- `resource_id`;
- `metadata`, jsonb;
- `ip_address`, quando disponível;
- `user_agent`, quando disponível;
- `created_at`.

Eventos a registrar futuramente:

- login;
- logout;
- alteração de usuário;
- bloqueio de usuário;
- alteração de permissões;
- criação de pedido;
- cancelamento de pedido;
- alteração de preços;
- fechamento de pedido;
- alteração de configurações;
- eventos administrativos;
- acesso de Super Admin a tenant;
- alteração de plano/assinatura.

## 11. Segurança contra vazamento entre tenants

Devem existir testes específicos contra vazamento horizontal.

Cenário obrigatório:

1. Restaurante A cria um pedido.
2. Restaurante B cria outro usuário.
3. Usuário do Restaurante B tenta acessar diretamente o ID do pedido do Restaurante A.
4. Resultado esperado: **ACESSO NEGADO** ou recurso invisível.

Esse padrão deve ser repetido para:

- produtos;
- categorias;
- mesas;
- pedidos;
- itens;
- clientes;
- relatórios;
- arquivos;
- usuários;
- configurações;
- assinaturas.

## 12. SaaS comercial futuro

A arquitetura deve permitir futuramente:

- planos;
- assinatura;
- período de teste;
- cobrança recorrente;
- limite de recursos por plano;
- bloqueio por inadimplência;
- upgrade;
- downgrade;
- cancelamento;
- painel Super Admin;
- métricas da plataforma.

Tabelas futuras recomendadas:

- `plans`;
- `subscriptions`;
- `subscription_events`;
- `tenant_usage_limits`;
- `tenant_usage_snapshots`;
- `billing_customers`;
- `billing_invoices`;
- `platform_admins`;
- `platform_metrics`.

## 13. Critério de aprovação de segurança

Nenhuma funcionalidade operacional deve ser considerada pronta se existir possibilidade de um restaurante acessar dados pertencentes a outro restaurante.

Critério mínimo antes de produção comercial:

- RLS habilitada e com políticas testadas;
- APIs protegidas por autenticação/autorização;
- storage isolado por `restaurant_id`;
- testes de IDOR executados;
- matriz RBAC implementada;
- logs de auditoria para ações críticas;
- nenhum segredo exposto no frontend;
- rota administrativa sem login bloqueada.
