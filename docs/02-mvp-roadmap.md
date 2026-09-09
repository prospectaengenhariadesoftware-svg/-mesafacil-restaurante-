# MVP e Roadmap — App para Restaurante

## MVP escolhido

**Cardápio digital com pedidos por QR Code para consumo na mesa.**

## Objetivo do MVP

Validar se restaurantes conseguem operar pedidos digitais com baixo atrito, sem implantação complexa e sem depender de aplicativo nativo.

## Funcionalidades obrigatórias do MVP

### Cliente

- Abrir cardápio por QR Code;
- Ver nome/logo do restaurante;
- Ver mesa identificada;
- Navegar por categorias;
- Ver produtos;
- Adicionar/remover itens do carrinho;
- Alterar quantidade;
- Escrever observação no item;
- Enviar pedido;
- Ver confirmação do pedido.

### Atendimento

- Login;
- Ver pedidos recebidos;
- Ver pedidos por status;
- Confirmar pedido;
- Cancelar pedido;
- Marcar pedido como entregue.

### Cozinha

- Login;
- Ver fila de pedidos;
- Abrir detalhes;
- Marcar como em preparo;
- Marcar como pronto.

### Admin

- Login;
- Cadastrar categorias;
- Cadastrar produtos;
- Subir imagem do produto;
- Alterar preço;
- Ativar/desativar produto;
- Cadastrar mesas;
- Gerar QR Code;
- Ver histórico básico.

## Funcionalidades fora do MVP

- Pagamento online;
- Delivery;
- Retirada no balcão;
- Estoque completo;
- Fiscal/NF-e/NFC-e;
- Integração iFood;
- Programa de fidelidade;
- Cupons;
- Impressora térmica;
- Aplicativo nativo.

## Roadmap por fases

### Fase 0 — Planejamento

Entregáveis:
- PRD;
- escopo do MVP;
- modelo de dados;
- fluxo de telas;
- regras de negócio.

### Fase 1 — Base técnica

Entregáveis:
- projeto Next.js;
- Supabase configurado;
- autenticação interna;
- schema inicial do banco;
- layout base.

### Fase 2 — Admin do cardápio

Entregáveis:
- CRUD de categorias;
- CRUD de produtos;
- upload de imagens;
- disponibilidade de produtos.

### Fase 3 — Mesas e QR Code

Entregáveis:
- CRUD de mesas;
- URL pública da mesa;
- geração/download de QR Code.

### Fase 4 — Pedido do cliente

Entregáveis:
- cardápio público;
- carrinho;
- envio de pedido;
- confirmação.

### Fase 5 — Operação interna

Entregáveis:
- painel de pedidos;
- painel da cozinha;
- alteração de status;
- visualização em tempo real.

### Fase 6 — Relatórios básicos

Entregáveis:
- vendas do dia;
- ticket médio;
- produtos mais vendidos;
- pedidos cancelados.

### Fase 7 — Piloto real

Entregáveis:
- testar em restaurante real;
- coletar problemas;
- ajustar UX;
- preparar versão comercial.

## Ordem recomendada de construção

1. Banco de dados;
2. Login interno;
3. Admin de restaurante/cardápio;
4. Mesas e QR Codes;
5. Cardápio público;
6. Carrinho e pedido;
7. Painel operacional;
8. Realtime;
9. Relatórios;
10. Polimento visual.
