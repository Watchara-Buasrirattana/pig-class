// src/app/providers/NextAuthProvider.tsx
"use client"; // <<--- สำคัญมาก ทำให้เป็น Client Component

import { SessionProvider } from "next-auth/react";
import React from "react";

interface NextAuthProviderProps {
  children: React.ReactNode;
  // คุณสามารถรับ session ที่มาจาก server component ได้ ถ้าต้องการ initial session
  // session?: any;
}

export default function NextAuthProvider({ children }: NextAuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
  // หรือถ้าต้องการ initial session:
  // return <SessionProvider session={session}>{children}</SessionProvider>;
}