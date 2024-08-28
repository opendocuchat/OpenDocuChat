import { Inter } from "next/font/google";
import "../globals.css";
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
          <Navigation />
          <main className="p-7 bg-gray-50">
            {children}
          </main>
      </body>
    </html>
  );
}
