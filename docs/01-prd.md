# PRD — App para Restaurante

## 1. Resumo executivo

O MesaFácil é uma plataforma web **SaaS Multi-Tenant** para digitalizar o atendimento em restaurantes por meio de cardápio digital, pedidos via QR Code e painel operacional para cozinha/atendimento.

Cada restaurante será tratado como um tenant independente, identificado de forma padronizada por `restaurant_id`. O isolamento entre restaurantes é requisito crítico: um restaurante nunca poderá visualizar, alterar ou excluir dados de outro.

O MVP deve permitir que restaurantes cadastrem cardápio, gerem QR Codes por mesa e recebam pedidos em tempo real, com controle simples de status, mantendo a arquitetura preparada para planos, assinatura, trial, cobrança recorrente, limites por plano e painel Super Admin.

## 2. Objetivos

### Objetivo principal

Permitir que o restaurante receba pedidos digitais feitos pelo próprio cliente na mesa, sem necessidade de instalação de aplicativo.

### Objetivos secundários

- Diminuir erros de pedido;
- Agilizar atendimento;
- Facilitar atualização do cardápio;
- Organizar fila da cozinha;
- Criar base para relatórios e automações futuras.

## 3. Não objetivos do MVP

O MVP não deve tentar resolver tudo de uma vez. Ficam fora da primeira versão:

- pagamento online;
- integração com iFood;
- emissão fiscal;
- controle completo de estoque;
- programa de fidelidade;
- split de pagamento;
- app nativo Android/iOS;
- marketplace de restaurantes;
- delivery avançado com roteirização.

## 4. Personas

### 4.1 Cliente final

Pessoa que está sentada em uma mesa do restaurante e quer fazer o pedido pelo celular.

Necessidades:
- acessar rápido;
- entender o cardápio;
- ver preços;
- enviar pedido sem criar conta;
- receber confirmação.

### 4.2 Atendente

Funcionário responsável por acompanhar os pedidos e entregar ao cliente.

Necessidades:
- ver pedidos por mesa;
- saber o status;
- confirmar/cancelar pedidos;
- marcar pedido como entregue.

### 4.3 Cozinha

Equipe responsável por preparar os pedidos.

Necessidades:
- ver pedidos novos claramente;
- saber itens, quantidades e observações;
- mudar status para em preparo/pronto;
- evitar pedidos perdidos.

### 4.4 Administrador/dono

Responsável por configurar restaurante, cardápio, preços e acompanhar vendas.

Necessidades:
- cadastrar produtos;
- ajustar preços;
- desativar itens indisponíveis;
- criar mesas;
- gerar QR Codes;
- visualizar vendas básicas.

## 5. Funcionalidades do MVP

### 5.1 Cardápio digital público

O cliente deve poder:
- acessar o cardápio por QR Code;
- navegar por categorias;
- visualizar produto com nome, descrição, preço e imagem;
- adicionar produtos ao carrinho;
- alterar quantidade;
- incluir observações.

### 5.2 Pedido por mesa

O cliente deve poder:
- visualizar número da mesa detectado pelo QR Code;
- revisar carrinho;
- enviar pedido;
- receber número/identificador do pedido;
- visualizar confirmação.

### 5.3 Painel de pedidos

A equipe interna deve poder:
- ver pedidos recebidos;
- filtrar por status;
- abrir detalhes do pedido;
- alterar status;
- cancelar pedido com motivo opcional;
- finalizar pedido.

### 5.4 Painel da cozinha

A cozinha deve poder:
- ver fila de pedidos novos;
- visualizar itens e observações;
- marcar como em preparo;
- marcar como pronto.

### 5.5 Gestão do cardápio

O administrador deve poder:
- criar categorias;
- editar categorias;
- ordenar categorias;
- criar produtos;
- editar produtos;
- adicionar imagem;
- alterar preço;
- ativar/desativar produto.

### 5.6 Gestão de mesas

O administrador deve poder:
- cadastrar mesas;
- ativar/desativar mesa;
- gerar QR Code por mesa;
- imprimir ou baixar QR Code.

### 5.7 Login interno

Funcionários devem acessar painel por login.

Perfis mínimos:
- admin;
- atendimento;
- cozinha.

## 6. Regras de negócio

1. Cliente não precisa login para pedir na mesa.
2. Cada QR Code deve identificar restaurante e mesa.
3. Pedido enviado não pode ser editado pelo cliente no MVP.
4. Produto indisponível não deve aparecer para pedido.
5. Produto pode continuar cadastrado mesmo indisponível.
6. Pedido cancelado deve sair da fila operacional, mas permanecer no histórico.
7. Alteração de preço não deve modificar pedidos antigos.
8. Item do pedido deve salvar preço unitário no momento da compra.
9. Funcionários só veem dados do próprio restaurante.
10. Admin pode ver tudo do restaurante.
11. Cozinha não deve precisar acessar relatórios financeiros.
12. Atendimento pode alterar status operacional.

## 7. Critérios de aceite do MVP

O MVP será considerado pronto quando:

- restaurante consegue criar categorias e produtos;
- restaurante consegue criar mesas e gerar QR Codes;
- cliente consegue abrir QR Code e fazer pedido;
- pedido aparece no painel interno;
- cozinha consegue mudar status do pedido;
- atendimento consegue finalizar pedido;
- administrador consegue ver histórico básico de pedidos;
- sistema funciona em celular e desktop;
- dados ficam isolados por restaurante;
- políticas RLS e validações backend impedem vazamento entre tenants;
- usuários só acessam restaurantes aos quais estão vinculados em `restaurant_users`.

## 8. Métricas iniciais

- número de pedidos por dia;
- ticket médio;
- produtos mais vendidos;
- tempo entre pedido recebido e pedido pronto;
- quantidade de pedidos cancelados;
- horário de maior movimento.

## 9. Riscos

### Risco: cliente sem internet

Mitigação: restaurante manter processo manual como contingência.

### Risco: equipe ignorar painel

Mitigação: painel simples, sinal sonoro/notificação visual em pedidos novos.

### Risco: pedido duplicado

Mitigação: bloquear duplo clique no envio e usar identificador único.

### Risco: cardápio desatualizado

Mitigação: botão rápido de disponível/indisponível.

### Risco: complexidade excessiva

Mitigação: manter pagamento, estoque e delivery fora do MVP.

## 10. Roadmap resumido

### Fase 1 — MVP mesa

Cardápio, pedido por QR Code, painel da cozinha, gestão básica.

### Fase 2 — Operação melhorada

Notificações, relatórios melhores, impressão, controle de caixa simples.

### Fase 3 — Comercial

Planos, múltiplos restaurantes, assinatura, onboarding.

### Fase 4 — Expansão

Delivery, pagamento online, fidelidade e integrações.
