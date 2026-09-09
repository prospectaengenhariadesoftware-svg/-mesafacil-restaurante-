# Permissões e Usuários — MesaFácil

## Princípio fundamental

Toda permissão no MesaFácil deverá considerar obrigatoriamente:

```text
USUÁRIO + RESTAURANTE/TENANT + FUNÇÃO + PERMISSÃO + RECURSO
```

Nunca considerar somente o usuário.

Um usuário autenticado pode ter papéis diferentes em restaurantes diferentes.

Exemplo futuro permitido:

- Maria é `proprietário` no Restaurante A;
- Maria é `gerente` no Restaurante B;
- Maria não tem acesso ao Restaurante C.

A associação autorizada deve estar registrada em `restaurant_users`.

## Modelo base de usuários

## Usuário global

Origem: Supabase Auth.

Representa a identidade autenticada.

## Perfil

Tabela planejada: `profiles`.

Representa dados globais do usuário, como nome, telefone e status geral.

## Vínculo com restaurante

Tabela: `restaurant_users`.

Campos essenciais:

- `id`;
- `restaurant_id`;
- `user_id`;
- `role`;
- `status`;
- `created_at`;
- `updated_at`.

## Papéis iniciais

- Super Administrador;
- Proprietário;
- Administrador;
- Gerente;
- Atendente;
- Garçom;
- Cozinha;
- Caixa;
- Usuário operacional.

## Matriz resumida de permissões

## 1. Super Administrador da plataforma

Escopo: plataforma MesaFácil.

Pode:

- administrar a plataforma;
- visualizar tenants/restaurantes;
- cadastrar planos;
- editar planos;
- bloquear tenant;
- desbloquear tenant;
- visualizar status das assinaturas;
- visualizar métricas gerais;
- prestar suporte;
- administrar configurações globais;
- consultar logs globais;
- investigar problemas técnicos;
- configurar limites por plano.

Restrições:

- acesso aos dados internos dos restaurantes deve ser controlado;
- acesso a dados sensíveis deve ser auditável;
- ações de suporte devem gerar `audit_logs`;
- não deve existir Super Admin por e-mail hardcoded no frontend;
- não deve existir Super Admin por variável pública.

Não deve, sem justificativa/auditoria:

- alterar pedidos de restaurante;
- alterar produtos de restaurante;
- exportar dados internos de restaurante;
- acessar dados financeiros sensíveis sem necessidade operacional.

## 2. Proprietário

Escopo: próprio restaurante.

Pode:

- administrar o próprio restaurante;
- cadastrar usuários;
- editar usuários;
- ativar/desativar usuários;
- configurar restaurante;
- administrar produtos;
- administrar cardápio;
- administrar mesas;
- visualizar pedidos;
- alterar status de pedidos;
- cancelar pedidos;
- visualizar relatórios;
- administrar configurações;
- visualizar assinatura;
- gerenciar equipe;
- configurar integrações;
- visualizar logs do próprio restaurante;
- solicitar cancelamento/alteração de plano.

Não pode:

- acessar outro restaurante;
- alterar dados globais da plataforma;
- conceder Super Admin;
- burlar bloqueio de assinatura;
- acessar segredos internos da plataforma.

## 3. Administrador

Escopo: próprio restaurante.

Permissões próximas ao proprietário.

Pode:

- administrar produtos;
- administrar cardápio;
- administrar mesas;
- visualizar pedidos;
- alterar status de pedidos;
- cancelar pedidos;
- visualizar relatórios;
- cadastrar usuários operacionais;
- editar usuários operacionais;
- configurar dados operacionais do restaurante;
- acompanhar cozinha e atendimento.

Não pode:

- mudar proprietário;
- excluir definitivamente o tenant;
- acessar outro restaurante;
- alterar assinatura sem permissão explícita;
- acessar configurações financeiras sensíveis;
- conceder papel de proprietário;
- conceder Super Admin.

## 4. Gerente

Escopo: próprio restaurante.

Pode:

- acompanhar operação;
- acompanhar pedidos;
- gerenciar produtos;
- ativar/desativar produtos;
- gerenciar mesas;
- gerenciar usuários operacionais;
- acompanhar cozinha;
- acompanhar atendimento;
- consultar relatórios operacionais;
- cancelar pedidos com justificativa;
- resolver problemas de mesa/atendimento.

Não pode:

- alterar proprietário;
- alterar assinatura;
- alterar configurações financeiras;
- acessar outro restaurante;
- criar administradores;
- alterar permissões administrativas críticas.

## 5. Atendente

Escopo: próprio restaurante.

Pode:

- visualizar mesas;
- abrir atendimento;
- inserir itens em atendimento, quando permitido;
- consultar pedidos;
- acompanhar status;
- confirmar pedido;
- solicitar fechamento;
- registrar observações operacionais;
- marcar pedido como entregue, se autorizado.

Não pode:

- alterar configurações;
- gerenciar assinatura;
- acessar dados de outro restaurante;
- alterar permissões administrativas;
- criar usuários;
- alterar preços;
- excluir produtos;
- ver relatórios financeiros completos.

## 6. Garçom

Escopo: próprio restaurante.

Pode:

- visualizar mesas designadas ou todas, conforme configuração;
- abrir atendimento;
- lançar itens, se o fluxo permitir;
- consultar pedidos da mesa;
- acompanhar status;
- solicitar fechamento;
- registrar observações da mesa.

Não pode:

- alterar cardápio;
- alterar preço;
- cancelar pedidos sem permissão;
- fechar caixa;
- gerenciar usuários;
- acessar assinatura;
- acessar outro restaurante.

## 7. Cozinha

Escopo: próprio restaurante.

Pode:

- visualizar pedidos enviados à cozinha;
- visualizar itens, quantidades e observações;
- alterar status operacional permitido;
- informar preparo;
- informar pedido pronto;
- filtrar fila por status.

Não deve possuir acesso administrativo.

Não pode:

- alterar produtos;
- alterar preços;
- gerenciar mesas;
- gerenciar usuários;
- visualizar assinatura;
- acessar relatórios financeiros;
- fechar conta;
- acessar outro restaurante.

## 8. Caixa

Escopo: próprio restaurante.

Pode:

- visualizar pedidos;
- fechar contas;
- registrar pagamentos;
- consultar valores relacionados ao atendimento;
- aplicar descontos autorizados, se houver regra;
- emitir comprovante operacional, se implementado;
- visualizar histórico de pagamentos do próprio restaurante.

Não pode:

- alterar produtos sem permissão;
- alterar usuários administrativos;
- alterar assinatura;
- acessar outro restaurante;
- conceder permissões;
- excluir dados operacionais críticos.

## 9. Usuário operacional

Escopo: próprio restaurante.

Papel genérico para permissões reduzidas ou customizadas.

Pode:

- executar somente permissões atribuídas explicitamente;
- acessar apenas recursos necessários à função.

Não pode:

- acessar funções administrativas por padrão;
- acessar dados financeiros por padrão;
- acessar outro restaurante;
- alterar permissões.

## Permissões granulares sugeridas

## Plataforma

- `platform.tenants.read`;
- `platform.tenants.update_status`;
- `platform.plans.manage`;
- `platform.subscriptions.read`;
- `platform.metrics.read`;
- `platform.support.access_tenant`;
- `platform.settings.manage`.

## Restaurante

- `restaurant.read`;
- `restaurant.update`;
- `restaurant.settings.manage`;
- `restaurant.subscription.read`;
- `restaurant.subscription.manage`.

## Usuários

- `users.read`;
- `users.invite`;
- `users.update`;
- `users.disable`;
- `users.change_role`;
- `users.transfer_owner`.

## Cardápio

- `categories.read`;
- `categories.create`;
- `categories.update`;
- `categories.delete`;
- `products.read`;
- `products.create`;
- `products.update`;
- `products.delete`;
- `products.change_price`;
- `products.change_availability`.

## Mesas

- `tables.read`;
- `tables.create`;
- `tables.update`;
- `tables.delete`;
- `tables.generate_qr`.

## Pedidos

- `orders.read`;
- `orders.create_internal`;
- `orders.confirm`;
- `orders.prepare`;
- `orders.mark_ready`;
- `orders.deliver`;
- `orders.cancel`;
- `orders.close`;
- `orders.refund`, futuro.

## Caixa e relatórios

- `payments.read`;
- `payments.create`;
- `payments.cancel`;
- `reports.operational.read`;
- `reports.financial.read`;
- `reports.export`.

## Configurações e arquivos

- `storage.upload_product_image`;
- `storage.delete_product_image`;
- `storage.read_private_document`;
- `integrations.manage`;
- `audit_logs.read`.

## Matriz papel → permissões iniciais

## Super Administrador

Inclui:

- todas as permissões `platform.*` conforme papel interno;
- acesso a tenant somente por fluxo auditado de suporte.

## Proprietário

Inclui:

- `restaurant.*` do próprio restaurante;
- `users.*`, exceto Super Admin;
- `categories.*`;
- `products.*`;
- `tables.*`;
- `orders.*`;
- `payments.*`;
- `reports.*`;
- `storage.*`;
- `integrations.manage`;
- `audit_logs.read` do próprio restaurante.

## Administrador

Inclui:

- `restaurant.read`;
- `restaurant.update`, exceto campos sensíveis;
- `users.read`;
- `users.invite` para papéis operacionais;
- `users.update` para papéis operacionais;
- `users.disable` para papéis operacionais;
- `categories.*`;
- `products.*`;
- `tables.*`;
- `orders.*`;
- `reports.operational.read`;
- `reports.financial.read`, se liberado pelo proprietário.

Não inclui:

- `users.transfer_owner`;
- `restaurant.subscription.manage`;
- `platform.*`.

## Gerente

Inclui:

- `restaurant.read`;
- `users.read`;
- `users.invite` apenas operacional;
- `products.read`;
- `products.update`;
- `products.change_availability`;
- `categories.read`;
- `tables.read`;
- `tables.update`;
- `orders.read`;
- `orders.confirm`;
- `orders.cancel`;
- `orders.deliver`;
- `reports.operational.read`.

## Atendente/Garçom

Inclui:

- `tables.read`;
- `orders.read`;
- `orders.create_internal`, se permitido;
- `orders.confirm`, se permitido;
- `orders.deliver`, se permitido;
- `orders.close`, apenas solicitar fechamento, salvo configuração específica.

## Cozinha

Inclui:

- `orders.read` filtrado para fila de cozinha;
- `orders.prepare`;
- `orders.mark_ready`.

## Caixa

Inclui:

- `orders.read`;
- `orders.close`;
- `payments.read`;
- `payments.create`;
- `reports.operational.read` limitado;
- `reports.financial.read` limitado, se autorizado.

## Usuário operacional

Inclui apenas permissões configuradas explicitamente.

## Regras de implementação

1. Frontend pode esconder botões, mas isso não substitui autorização real.
2. Server Actions e APIs devem chamar uma função central como `requireTenantPermission(permission)`.
3. RLS deve bloquear acesso horizontal entre restaurantes.
4. Funções administrativas devem gerar log de auditoria.
5. Usuário desativado em `restaurant_users.status` não pode operar aquele restaurante.
6. Restaurante bloqueado/inadimplente deve bloquear operações conforme regra de plano.
7. Nunca confiar em `restaurant_id` vindo do navegador sem validação.

## Critério de aprovação

Uma permissão só será considerada implementada quando estiver protegida em três camadas:

1. interface;
2. backend/API/Server Action;
3. banco/RLS, quando aplicável.
