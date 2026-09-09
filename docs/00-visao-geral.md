# App para Restaurante — Visão Geral

## Nome provisório

**MesaFácil**

Outras opções de nome:
- NaMesa
- ComandaZap
- PedidoNaMesa
- MenuFácil

## Objetivo do produto

Criar uma plataforma web responsiva SaaS Multi-Tenant para restaurantes receberem pedidos digitais por QR Code, reduzindo atrito no atendimento, organizando a cozinha e permitindo ao administrador controlar cardápio, mesas, pedidos e vendas.

Cada restaurante será tratado como tenant independente da plataforma. O isolamento padrão será feito por `tenant_id`, com RLS no Supabase/PostgreSQL, autorização no backend e testes específicos contra vazamento entre restaurantes.

## Problema que o app resolve

Restaurantes pequenos e médios geralmente enfrentam:

- demora no atendimento em horários de pico;
- erros em comandas manuais;
- dificuldade para atualizar cardápio e preços;
- falta de visão em tempo real dos pedidos;
- retrabalho entre garçom, caixa e cozinha;
- ausência de dados simples sobre vendas e produtos mais pedidos.

## Solução proposta

Um app web acessível por QR Code na mesa, onde o cliente vê o cardápio, monta o pedido e envia diretamente ao restaurante. O pedido aparece em um painel interno para atendimento/cozinha, com controle de status e gestão administrativa.

## Público-alvo

### Cliente principal

Restaurantes, lanchonetes, hamburguerias, pizzarias, cafés, bares e pequenos estabelecimentos de alimentação.

### Usuários do sistema

- Cliente final do restaurante;
- Garçom/atendente;
- Cozinha;
- Caixa;
- Dono/administrador.

## Proposta de valor

- Cardápio digital simples;
- Pedido por QR Code;
- Redução de erro operacional;
- Organização da cozinha;
- Atualização rápida de preços/produtos;
- Painel de vendas básico;
- Implantação rápida sem app nativo.

## Plataforma recomendada

- Aplicação web responsiva;
- Cliente acessa pelo navegador do celular;
- Painel interno também via navegador;
- Sem necessidade inicial de app na Play Store/App Store.

## Stack sugerida

- Frontend: Next.js / React;
- Backend: Supabase;
- Banco: PostgreSQL;
- Autenticação interna: Supabase Auth;
- Storage de imagens: Supabase Storage;
- Tempo real: Supabase Realtime;
- Deploy: Vercel.

## Estratégia de lançamento

Começar com MVP focado em pedidos por mesa via QR Code. Evitar funcionalidades complexas na primeira versão, como pagamento online, delivery completo, estoque avançado ou integração com iFood.

## Princípio do MVP

**Fazer poucos fluxos, mas funcionando bem:**

1. restaurante cadastra produtos;
2. restaurante gera QR Codes por mesa;
3. cliente faz pedido;
4. cozinha/atendimento recebe e altera status;
5. administrador acompanha pedidos e vendas básicas.
