import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Logo Kit',
  description: 'Generate SVG logos and favicons from a JSON config',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
