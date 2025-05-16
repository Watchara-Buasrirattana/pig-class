// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout"; // ClientLayout ของคุณ
import NextAuthProvider from "./providers/NextAuthProvider"; // <<< Import Provider ที่สร้างขึ้น

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pig Class",
  description: "Description of Pig Class",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ถ้าคุณต้องการส่ง initial session จาก server component มาให้ SessionProvider
  // const session = await getServerSession(authOptions); // (ต้อง import getServerSession และ authOptions)

  return (
    <html lang="th">
      <body className={inter.className}>
        <NextAuthProvider> {/* <<--- ใช้ NextAuthProvider ที่นี่ */}
          {/* ถ้าส่ง initial session: <NextAuthProvider session={session}> */}
          <ClientLayout>{children}</ClientLayout>
        </NextAuthProvider>
      </body>
    </html>
  );
}