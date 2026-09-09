# Plano de Testes — MesaFácil MVP SaaS

## Objetivo

Definir a estratégia de testes obrigatória para validar o MVP do MesaFácil como plataforma SaaS Multi-Tenant, garantindo autenticação segura, isolamento absoluto entre restaurantes e permissões coerentes por papel.

## Critério obrigatório para aprovação

Nenhuma etapa deverá ser considerada concluída se existir possibilidade de um restaurante acessar dados pertencentes a outro restaurante.

Se houver qualquer falha de isolamento entre tenants, a versão deve ser considerada reprovada.

## Ambientes de teste

## Local

Usado para testes rápidos de unidade, componentes e regras de domínio.

Comandos previstos:

```bash
npm test
npm run lint
npm run build
```

## Supabase remoto/staging

Usado para validar autenticação, RLS, Storage e fluxos multi-tenant reais.

Deve possuir dados de teste controlados.

## Produção

Não deve ser usada para testes destrutivos.

## Dados mínimos de teste

Criar pelo menos:

## Tenant A / Restaurante A

- restaurante: `Tenant A / Restaurante A`;
- usuário proprietário A;
- usuário administrador A;
- usuário gerente A;
- usuário garçom A;
- usuário cozinha A;
- usuário caixa A;
- categorias A;
- produtos A;
- mesas A;
- pedidos A;
- arquivos A.

## Tenant B / Restaurante B

- restaurante: `Tenant B / Restaurante B`;
- usuário proprietário B;
- usuário administrador B;
- usuário gerente B;
- usuário garçom B;
- usuário cozinha B;
- usuário caixa B;
- categorias B;
- produtos B;
- mesas B;
- pedidos B;
- arquivos B.

## 1. Testes de autenticação

Validar:

- login correto;
- senha incorreta;
- usuário inexistente;
- usuário bloqueado;
- usuário sem vínculo com restaurante;
- usuário com vínculo inativo;
- logout;
- recuperação de senha;
- redefinição de senha;
- confirmação de e-mail, quando habilitada;
- sessão expirada;
- token inválido;
- token ausente;
- acesso direto por URL em rota protegida.

Resultados esperados:

- credenciais válidas entram;
- credenciais inválidas são negadas;
- usuário bloqueado não opera;
- usuário sem tenant não acessa painel;
- rotas internas redirecionam ou retornam acesso negado;
- nenhuma informação sensível é exposta nas mensagens de erro.

## 2. Testes Multi-Tenant

Criar cenários com Tenant A / Restaurante A e Tenant B / Restaurante B.

Validar que A não consegue acessar absolutamente nenhum dado de B, e B não consegue acessar dados de A.

Testar isolamento em:

- produtos;
- categorias;
- mesas;
- pedidos;
- itens de pedidos;
- clientes;
- usuários;
- relatórios;
- arquivos;
- configurações;
- logs;
- integrações;
- dados financeiros;
- assinaturas.

Cenário obrigatório:

1. Usuário A autentica.
2. Usuário A lista produtos.
3. Resultado deve conter somente produtos do Tenant A / Restaurante A.
4. Usuário A tenta acessar produto do Tenant B / Restaurante B pelo ID.
5. Resultado esperado: **ACESSO NEGADO** ou recurso inexistente.

Repetir o mesmo padrão para cada recurso.

## 3. Teste manipulando URL

Tentar alterar IDs diretamente na URL.

Exemplos:

```text
/admin/orders/{id_do_restaurante_b}
/admin/products/{id_do_restaurante_b}
/admin/users/{id_do_usuario_b}
/admin/reports?tenant_id={restaurante_b}
```

Resultado esperado:

- acesso negado;
- recurso inexistente;
- redirecionamento seguro;
- log de tentativa suspeita quando aplicável.

Nunca retornar dados do outro restaurante.

## 4. Teste manipulando chamadas da API

Alterar manualmente `tenant_id` em payloads enviados pelo navegador.

Exemplos:

- criar produto com `tenant_id` de outro restaurante;
- atualizar pedido de outro restaurante;
- cancelar pedido de outro restaurante;
- listar relatórios usando query string de outro tenant;
- fazer upload em path de outro tenant.

Resultado esperado:

- acesso negado;
- operação não executada;
- nenhum dado alterado;
- log de tentativa indevida, quando aplicável.

## 5. Teste das políticas RLS

Executar testes diretamente no Supabase/PostgreSQL usando usuários autenticados de tenants diferentes.

Operações obrigatórias:

## SELECT

- Usuário A tenta selecionar registros do Tenant B / Restaurante B.
- Esperado: zero registros ou acesso negado.

## INSERT

- Usuário A tenta inserir registro com `tenant_id` do Tenant B / Restaurante B.
- Esperado: bloqueado por RLS/política.

## UPDATE

- Usuário A tenta atualizar registro do Tenant B / Restaurante B.
- Esperado: bloqueado.

## DELETE

- Usuário A tenta excluir registro do Tenant B / Restaurante B.
- Esperado: bloqueado.

Tabelas mínimas:

- `tenants`;
- `tenant_users`;
- `tables`;
- `categories`;
- `products`;
- `orders`;
- `order_items`;
- `order_status_events`;
- `profiles`, quando criada;
- `audit_logs`, quando criada;
- tabelas de assinatura, quando criadas.

## 6. Testes de permissões

Testar cada papel.

## Cozinha tentando acessar usuários

Resultado esperado:

```text
NEGADO
```

## Garçom tentando alterar assinatura

Resultado esperado:

```text
NEGADO
```

## Administrador tentando operar outro restaurante

Resultado esperado:

```text
NEGADO
```

## Caixa tentando alterar preço de produto

Resultado esperado:

```text
NEGADO
```

## Gerente tentando mudar proprietário

Resultado esperado:

```text
NEGADO
```

## Proprietário tentando acessar outro tenant

Resultado esperado:

```text
NEGADO
```

## Super Admin acessando tenant sem fluxo auditado

Resultado esperado:

```text
NEGADO OU EXIGIR JUSTIFICATIVA/AUDITORIA
```

## 7. Testes de pedidos

Testar:

- criação de pedido;
- inclusão de item;
- remoção de item antes do envio;
- alteração de quantidade antes do envio;
- envio à cozinha;
- alteração de status;
- cancelamento;
- fechamento;
- histórico;
- snapshot de preço;
- produto indisponível não pode ser pedido;
- total recalculado no servidor;
- cliente não consegue forjar preço.

## 8. Pedidos simultâneos

Simular diversos pedidos ao mesmo tempo.

Validar:

- pedidos não são misturados;
- itens pertencem ao pedido correto;
- `order_number` não duplica dentro do mesmo restaurante;
- pedidos de restaurantes diferentes podem ter numeração independente;
- painel da cozinha de A não mostra pedidos de B;
- painel da cozinha de B não mostra pedidos de A.

## 9. Teste de mesa e QR Code

Garantir que:

- mesa pertence somente a um restaurante;
- QR Code está associado à mesa correta;
- `qr_token` não permite descobrir mesas sequencialmente;
- pedido originado pelo QR Code é vinculado ao restaurante correto;
- mesa inativa não aceita pedidos;
- restaurante bloqueado/inativo não aceita novos pedidos;
- QR Code de A não cria pedido em B.

## 10. Testes de responsividade

Validar:

- celular pequeno;
- celular médio;
- tablet;
- notebook;
- desktop;
- orientação retrato;
- orientação paisagem.

Telas mínimas:

- landing;
- cardápio público;
- carrinho;
- confirmação;
- login;
- admin;
- cozinha;
- pedidos.

## 11. Testes de segurança

Realizar verificações contra:

- IDOR;
- acesso horizontal indevido;
- acesso vertical indevido;
- manipulação de parâmetros;
- sessão inválida;
- chamadas sem autenticação;
- `tenant_id` adulterado;
- escalonamento de privilégio;
- enumeração de IDs;
- upload de arquivo indevido;
- exposição de secrets no bundle frontend;
- erro retornando dados sensíveis;
- uso indevido de service role;
- bypass de RLS por API mal protegida.

## 12. Testes de Storage

Validar:

- usuário A não faz upload no path do Tenant B / Restaurante B;
- usuário A não lê documento privado do Tenant B / Restaurante B;
- imagem pública só é pública quando intencional;
- arquivos privados exigem autenticação;
- path sempre começa por `tenant_id` autorizado;
- tipos de arquivos são validados;
- tamanho máximo é respeitado.

## 13. Testes de logs e auditoria

Validar registro de eventos importantes:

- login;
- alteração de usuário;
- alteração de permissão;
- criação de pedido;
- cancelamento;
- alteração de preços;
- fechamento;
- alteração de configurações;
- acesso Super Admin a tenant.

Cada log deve registrar, quando possível:

- usuário;
- tenant/restaurante;
- operação;
- data/hora;
- entidade;
- ID da entidade;
- metadados mínimos.

## 14. Testes de SaaS futuro

Mesmo sem implementar cobrança agora, validar que a arquitetura não impede:

- planos;
- assinatura;
- período de teste;
- cobrança recorrente;
- bloqueio por inadimplência;
- limite por plano;
- upgrade;
- downgrade;
- cancelamento;
- painel Super Admin;
- métricas da plataforma.

## 15. Checklist obrigatório antes de considerar MVP aprovado

- [ ] Login interno validado;
- [ ] rotas protegidas bloqueiam usuário não autenticado;
- [ ] RLS habilitada nas tabelas de tenant;
- [ ] políticas RLS testadas para SELECT/INSERT/UPDATE/DELETE;
- [ ] usuário A não acessa dados de B;
- [ ] usuário B não acessa dados de A;
- [ ] permissões RBAC testadas por papel;
- [ ] tentativa de manipular URL é bloqueada;
- [ ] tentativa de manipular API é bloqueada;
- [ ] tentativa de adulterar `tenant_id` é bloqueada;
- [ ] arquivos isolados por tenant;
- [ ] service role não aparece no frontend;
- [ ] logs críticos planejados/implementados conforme fase;
- [ ] build passa;
- [ ] testes automatizados passam;
- [ ] teste manual em celular e desktop realizado.

## Status atual deste plano

Este documento define a exigência de testes. A implementação automatizada completa ainda deve ser criada antes de operação comercial.
