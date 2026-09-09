import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MesaFácil — App para Restaurante',
  description: 'MVP de cardápio digital e pedidos por QR Code para restaurantes.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
