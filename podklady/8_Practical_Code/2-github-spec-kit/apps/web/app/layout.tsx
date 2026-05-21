import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers.tsx';

export const metadata: Metadata = {
  title: 'Imagineer — On-demand custom 3D printing',
  description:
    'Describe a thing or upload a photo. We generate a 3D model, you preview it, we print and ship it.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-border">
              <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
                <a href="/" className="text-lg font-semibold">
                  Imagineer
                </a>
                <nav className="flex items-center gap-4 text-sm">
                  <a href="/orders" className="hover:underline">
                    My orders
                  </a>
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border mt-12">
              <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-foreground/60">
                © Imagineer — printed and shipped from Brooklyn, NY
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
