// src/pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions, User as NextAuthUserOriginal, Account, Profile, SessionStrategy, Session } from "next-auth";
import { AdapterUser } from "next-auth/adapters"; // Import AdapterUser
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/prisma"; // ตรวจสอบ path prisma
import bcrypt from "bcryptjs";

// User type ที่ขยายแล้วจะถูก import โดยอัตโนมัติจาก next-auth.d.ts
// ไม่จำเป็นต้องประกาศ CustomAuthorizeUser ที่นี่อีก ถ้า User ใน next-auth.d.ts ครอบคลุมแล้ว

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          console.log("Authorize: Missing credentials");
          return null;
        }

        const userFromDb = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!userFromDb || !userFromDb.hashedPassword) {
          console.log("Authorize: User not found or no hashed password for:", credentials.email);
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, userFromDb.hashedPassword);

        if (!isValidPassword) {
          console.log("Authorize: Invalid password for user:", credentials.email);
          return null;
        }

        console.log("Authorize: Successful for:", userFromDb.email, "ProfileImg from DB:", userFromDb.profileImg);

        // Return object ที่มี field ตรงกับ User interface ใน next-auth.d.ts
        // NextAuth คาดหวัง field `image` สำหรับรูปโปรไฟล์ที่จะ map ไปยัง session.user.image
        return {
          id: userFromDb.id.toString(), // id ของ NextAuth User เป็น string
          email: userFromDb.email,
          name: (userFromDb.firstName && userFromDb.lastName) ? `${userFromDb.firstName} ${userFromDb.lastName}` : userFromDb.firstName || userFromDb.lastName || null,
          firstName: userFromDb.firstName, // ส่งไปด้วยถ้าต้องการใช้ใน token หรือ session
          lastName: userFromDb.lastName,   // ส่งไปด้วยถ้าต้องการใช้ใน token หรือ session
          image: userFromDb.profileImg, // <<<< สำคัญ: Map `profileImg` จาก DB ไปยัง `image` ที่ NextAuth คาดหวัง
          role: userFromDb.role,
          // profileImg: userFromDb.profileImg, // ถ้าต้องการส่ง profileImg แยกต่างหากด้วยก็ได้ แต่ image จะถูกใช้สำหรับ session.user.image
        };
      }
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy,
  },
  secret: process.env.NEXTAUTH_SECRET, // ตรวจสอบว่ามีใน .env.local
  callbacks: {
    async jwt({ token, user, account, profile, trigger, isNewUser }) {
      // `user` object (จาก authorize หรือ OAuth) จะมีค่าตอน sign-in หรือ link account
      if (user) { // ตรวจสอบว่า user object ไม่ใช่ undefined
        token.id = user.id; // user.id จาก authorize (ซึ่งควรเป็น string)

        // DefaultJWT มี name, email, picture อยู่แล้ว
        // ถ้า user object (จาก authorize) มีค่าเหล่านี้ มันควรจะถูก map มาใส่ token โดยอัตโนมัติในระดับหนึ่ง
        // แต่เพื่อความแน่นอน หรือถ้าชื่อ field ไม่ตรง ก็ set เองได้
        if (user.name) token.name = user.name;
        if (user.email) token.email = user.email; // โดยปกติ email จะอยู่ใน token อยู่แล้ว

        // user.image (ที่เรา map มาจาก userFromDb.profileImg ใน authorize) จะถูกใช้สำหรับ token.picture
        // ซึ่งเป็น field มาตรฐานที่ NextAuth ใช้สำหรับรูปโปรไฟล์ใน token
        if (user.image !== undefined) {
          token.picture = user.image;
        }

        // เพิ่ม custom fields อื่นๆ
        if (user.role) {
          token.role = user.role;
        }
        // console.log("JWT Callback - User object received:", user);
      }
      // console.log("JWT Callback - Token being returned:", token);
      return token;
    },
    async session({ session, token }) {
      // ข้อมูลจาก token จะถูกนำมาใส่ใน session object
      if (session.user) {
        // session.user.name, session.user.email, session.user.image
        // ควรจะถูกตั้งค่าโดยอัตโนมัติจาก token.name, token.email, token.picture ตามลำดับ
        // แต่เราสามารถ override หรือเพิ่ม custom fields ได้
        session.user.id = token.id as string | undefined;
        session.user.role = token.role as string | undefined;

        // ตรวจสอบอีกครั้งเพื่อให้แน่ใจว่า image ถูกส่งไป
        if (token.picture !== undefined) {
          session.user.image = token.picture;
        } else {
          session.user.image = null; // หรือ undefined ถ้าไม่มีรูปใน token
        }
      }
      // console.log("Session Callback - Session being returned:", session);
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  // debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);