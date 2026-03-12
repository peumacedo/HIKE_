import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: '2rem', background: '#fafafa' }}>
        {children}
      </body>
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hike Advisory Cockpit',
  description: 'Fundação para advisory financeiro de projetos com múltiplos cenários e integração ERP.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
