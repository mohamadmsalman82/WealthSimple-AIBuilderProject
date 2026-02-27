import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WealthEasy",
  description: "AI-powered life event detection for Canadian financial planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{ background: '#F7F6F4', fontFamily: "'DM Sans', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
