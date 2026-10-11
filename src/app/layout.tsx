import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { getCurrentUser } from '@/lib/auth';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { APP_NAME, APP_TAGLINE, VERSION } from '@/lib/version';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    'Book fire-roasted Mexican corn catering for parties, offices and weddings. Choose a package, add elote and esquites, and pick a delivery slot.',
  applicationName: APP_NAME,
  other: { 'app-version': VERSION },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Reading the session cookie makes every route dynamic, which is what we
  // want: the header reflects the current user on first paint.
  const user = await getCurrentUser();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col`}>
        <SiteHeader user={user} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
