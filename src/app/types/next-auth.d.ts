// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

// ขยาย Type ของ Session
declare module "next-auth" {
  /**
   * ขยาย session.user ให้มี id และ role
   */
  interface Session {
    user: {
      /** User ID ที่เราเพิ่มเข้ามา */
      id: string;
      /** User Role ที่เราเพิ่มเข้ามา */
      role: string;
    } & DefaultSession["user"] // ใช้ & เพื่อรวมกับ properties เดิม (name, email, image)
  }

  /**
   * ขยาย Type ของ User ที่มาจาก authorize หรือ provider อื่นๆ
   * ให้มี role ด้วย
   */
  interface User extends DefaultUser {
     role: string;
  }
}

// ขยาย Type ของ JWT Token
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
     /** User ID */
     id: string;
    /** User Role */
    role: string;
  }
}