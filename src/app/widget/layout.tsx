import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "../(private)/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Widget",
  description: "Embeddable widget",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}