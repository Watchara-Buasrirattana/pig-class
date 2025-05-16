// src/app/types/next-auth.d.ts
import NextAuth, { DefaultSession, User as DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * ขยาย session.user
   * DefaultSession["user"] ปกติจะมี name?: string | null; email?: string | null; image?: string | null;
   */
  interface Session {
    user: {
      id?: string | null;
      role?: string | null;
      // 'image' มีอยู่ใน DefaultSession["user"] อยู่แล้ว ไม่ต้องประกาศซ้ำถ้าใช้ชื่อนี้
      // ถ้าคุณต้องการใช้ชื่ออื่นใน session.user เช่น profileImg ก็เพิ่มตรงนี้
      // profileImg?: string | null;
    } & DefaultSession["user"];
  }

  /**
   * ขยาย Type ของ User object ที่ authorize function ของคุณ return
   * และที่ OAuth provider's profile function return
   * DefaultUser มี id (เป็น string), name, email, image (image เป็น optional)
   */
  interface User extends DefaultUser {
     role?: string | null;
     // ถ้า Prisma User model หรือ object ที่ authorize return มี field ชื่อ profileImg
     // และคุณต้องการใช้ชื่อนี้ใน User object ที่ส่งให้ jwt callback ก็ประกาศตรงนี้
     profileImg?: string | null;
     firstName?: string | null;
     lastName?: string | null;
     // point?: number | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * ขยาย Type ของ JWT Token
   * DefaultJWT มี name, email, picture (optional), sub (คือ user id)
   */
  interface JWT extends DefaultJWT {
     id?: string | null; // ถ้าต้องการใช้ id แยกจาก sub
     role?: string | null;
     // 'picture' มีอยู่ใน DefaultJWT อยู่แล้ว และมักจะถูก map ไป session.user.image
     // ถ้าคุณ set token.picture จาก user.profileImg ก็ไม่จำเป็นต้องประกาศซ้ำ
     // แต่ถ้าคุณต้องการ field ชื่ออื่นใน token เช่น token.customProfileImg ก็เพิ่มตรงนี้
     // customProfileImg?: string | null;
  }
}