import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "./Providers";
import { Navigation } from "@/components/layout/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navigation />
          <main className="p-7">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
