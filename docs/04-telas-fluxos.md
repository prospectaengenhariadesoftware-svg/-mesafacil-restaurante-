# Telas e Fluxos — App para Restaurante

## Mapa de telas

## Área pública do cliente

### 1. Tela de abertura da mesa

URL sugerida:

```text
/r/[restaurantSlug]/m/[qrToken]
```

Elementos:
- logo do restaurante;
- nome do restaurante;
- identificação da mesa;
- botão Ver cardápio;
- aviso: pedido será enviado para esta mesa.

### 2. Cardápio

Elementos:
- categorias horizontais ou em lista;
- cards de produto;
- foto;
- nome;
- descrição curta;
- preço;
- indicação de indisponível;
- botão adicionar.

### 3. Detalhe do produto

Elementos:
- imagem maior;
- descrição completa;
- preço;
- seletor de quantidade;
- campo observação;
- botão adicionar ao carrinho.

### 4. Carrinho

Elementos:
- lista de itens;
- quantidade;
- subtotal;
- remover item;
- observação geral;
- total;
- botão enviar pedido.

### 5. Confirmação

Elementos:
- mensagem de pedido recebido;
- número do pedido;
- mesa;
- total;
- status inicial;
- orientação: aguarde atendimento.

## Área interna

### 6. Login

Elementos:
- email;
- senha;
- entrar;
- recuperação de senha em fase futura.

### 7. Dashboard

Elementos:
- pedidos abertos;
- pedidos prontos;
- vendas do dia;
- produtos indisponíveis;
- atalhos para cardápio, mesas e pedidos.

### 8. Painel de pedidos

Colunas/status:
- Recebido;
- Confirmado;
- Em preparo;
- Pronto;
- Entregue;
- Cancelado.

Cada card de pedido mostra:
- número;
- mesa;
- horário;
- total;
- quantidade de itens;
- status.

### 9. Detalhe do pedido

Elementos:
- mesa;
- horário;
- itens;
- observações;
- total;
- histórico de status;
- botões de ação.

Ações:
- confirmar;
- enviar para preparo;
- marcar pronto;
- marcar entregue;
- cancelar.

### 10. Painel da cozinha

Elementos:
- pedidos recebidos/em preparo;
- foco em itens e observações;
- botões grandes;
- sem informações financeiras desnecessárias.

### 11. Gestão de categorias

Ações:
- criar;
- editar;
- ordenar;
- ativar/desativar.

### 12. Gestão de produtos

Ações:
- criar produto;
- editar produto;
- subir imagem;
- alterar preço;
- marcar indisponível;
- destacar produto.

### 13. Gestão de mesas

Ações:
- criar mesa;
- editar rótulo;
- ativar/desativar;
- gerar QR Code;
- baixar QR Code.

### 14. Relatórios básicos

Indicadores:
- vendas do dia;
- total de pedidos;
- ticket médio;
- produtos mais vendidos;
- pedidos cancelados.

## Fluxo principal do cliente

1. Escaneia QR Code;
2. Abre página da mesa;
3. Entra no cardápio;
4. Adiciona produtos;
5. Confere carrinho;
6. Envia pedido;
7. Recebe confirmação.

## Fluxo operacional

1. Pedido entra como recebido;
2. Atendimento confirma ou cancela;
3. Cozinha marca em preparo;
4. Cozinha marca pronto;
5. Atendimento entrega;
6. Pedido fica entregue no histórico.

## Estados do pedido

- received: pedido enviado pelo cliente;
- confirmed: equipe confirmou recebimento;
- preparing: cozinha iniciou preparo;
- ready: cozinha finalizou;
- delivered: entregue ao cliente;
- cancelled: cancelado.

## Regras de UX

- Cliente deve conseguir pedir com poucos toques;
- Botão de enviar pedido deve bloquear duplo clique;
- Preço e total devem estar claros;
- Produto indisponível não deve confundir cliente;
- Cozinha precisa de tela limpa, com letras grandes;
- Administração deve priorizar ações rápidas.
