import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Michi Binder Studio',
  description: 'A cozy studio for designing aesthetic Pokémon binder spreads.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
