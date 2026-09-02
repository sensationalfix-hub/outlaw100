import type { Metadata } from 'next';
import './globals.css';
import './dashboard-golden.css';
import './rdr-font.css';
import './dashboard-assets-hotfix.css';
import './dashboard-guide-hotfix.css';

export const metadata: Metadata = {
  title: 'OUTLAW 100 · RDR2 Ultra Completionist',
  description: 'Companion completista de Red Dead Redemption 2 de Colter a American Venom.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
