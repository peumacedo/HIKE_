import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: '2rem', background: '#fafafa' }}>
        {children}
      </body>
    </html>
  );
}
