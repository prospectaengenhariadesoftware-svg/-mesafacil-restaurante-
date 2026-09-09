# MesaFácil — App para Restaurante

MVP web para restaurante receber pedidos digitais por QR Code, organizar a cozinha e administrar cardápio, mesas e pedidos.

## Status atual

Base criada com:

- Next.js 16;
- React 19;
- TypeScript;
- Tailwind CSS 4;
- Supabase SDK;
- Vitest;
- estrutura inicial de telas;
- schema SQL inicial do Supabase;
- dados demonstrativos.

## Rotas iniciais

- `/` — landing/demo do produto;
- `/r/mesafacil-demo/m/mesa-12` — cardápio público demo do cliente;
- `/pedido-confirmado` — confirmação demo;
- `/admin` — painel administrativo demo;
- `/admin/kitchen` — painel da cozinha demo.

## Como rodar localmente

```bash
cd /root/.hermes/naia/projetos/app-restaurante/mesafacil
npm install
cp .env.example .env.local
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Testes e verificação

```bash
npm test
npm run lint
npm run build
```

## Supabase

O schema inicial está em:

```text
supabase/schema.sql
```

Ele cria:

- restaurants;
- restaurant_users;
- tables;
- categories;
- products;
- orders;
- order_items;
- order_status_events;
- enums;
- índices;
- RLS habilitado.

As policies de RLS ainda precisam ser detalhadas antes de produção.

## Próximas etapas recomendadas

1. Criar projeto Supabase real;
2. Aplicar `supabase/schema.sql`;
3. Criar seed de restaurante/categorias/produtos;
4. Implementar login interno;
5. Trocar dados mockados por queries Supabase;
6. Implementar carrinho real no cliente;
7. Criar API/server action para envio de pedido;
8. Adicionar realtime no painel da cozinha.

## Observações de segurança

- Não colocar `SUPABASE_SERVICE_ROLE_KEY` em código client-side.
- Usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` apenas para operações públicas controladas por RLS.
- Ativar e testar políticas de RLS antes de usar dados reais.
