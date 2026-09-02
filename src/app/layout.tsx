import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OUTLAW 100 · RDR2 Ultra Completionist',
  description: 'Companion completista de Red Dead Redemption 2 de Colter a American Venom.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
