import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import StormBackground from '@/components/StormBackground';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata = {
  title: 'AI Support Agent — the front desk that never closes',
  description:
    "An AI support agent that answers customers instantly on your website, WhatsApp, and Instagram — grounded only in your own docs. No invented answers.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="relative min-h-screen bg-bg font-sans text-text antialiased">
        <StormBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
