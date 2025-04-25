// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions, User, SessionStrategy, Session } from "next-auth"; // เพิ่ม User
import { JWT } from "next-auth/jwt"; // เพิ่ม JWT
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../lib/prisma"; // ตรวจสอบ path prisma
import bcrypt from "bcryptjs";


export const authOptions: NextAuthOptions = { // ใส่ Type ให้ authOptions
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) { // เพิ่ม check email ด้วย
             return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // ตรวจสอบ user และ hashedPassword ก่อน compare
        if (!user || !user.hashedPassword) {
            console.log("User not found or no hashed password for:", credentials.email);
            return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);

        if (!isValid) {
            console.log("Invalid password for user:", credentials.email);
            return null;
        }

        console.log("Authorization successful for:", user.email, "Role:", user.role);
        // --- แก้ไขตรงนี้: เพิ่ม role เข้าไปใน object ที่ return ---
        return {
          id: user.id.toString(),
          email: user.email,
          // name: `${user.firstName} ${user.lastName}`, // อาจจะใส่ name กลับไป ถ้าต้องการ
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          point: user.point ?? 0, // <<-- เพิ่ม role
        };
      }
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy, // ใช้ JWT strategy ถูกต้องแล้ว
  },
  secret: process.env.NEXTAUTH_SECRET, // ต้องมีค่านี้ใน .env.local

  // --- เพิ่มส่วน Callbacks ตรงนี้ ---
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) { // ระบุ Type
      // ตอน login ครั้งแรก (object 'user' จาก authorize จะถูกส่งมา)
      if (user?.role) { // ถ้ามี user และ role
        token.role = user.role; // เพิ่ม role เข้าไปใน token
        token.id = user.id; 
            // เพิ่ม id เข้าไปใน token
         // token.name = user.name; // ถ้าต้องการ name ใน token ด้วย
         // token.picture = user.image; // ถ้าต้องการ image
      }
      // console.log("JWT Callback - Token:", token); // สำหรับ Debug
      return token; // คืนค่า token ที่มีข้อมูลเพิ่มแล้ว
    },
    async session({ session, token }: { session: Session; token: JWT }) { // ระบุ Type
      // ตอนเรียกใช้ session (เช่นผ่าน useSession)
      if (token?.role && session.user) { // ถ้า token มี role และ session.user มีค่า
        session.user.role = token.role as string; // เอา role จาก token มาใส่ใน session.user
        session.user.id = token.id as string;     // เอา id จาก token มาใส่ใน session.user
        // session.user.name = token.name; // ถ้าต้องการ name ใน session
        // session.user.image = token.picture; // ถ้าต้องการ image
      }
      // console.log("Session Callback - Session:", session); // สำหรับ Debug
      return session; // คืนค่า session ที่มีข้อมูล user ครบถ้วน
    },
  },
  // --- จบส่วน Callbacks ---

  pages: {
     signIn: '/login', // หน้า Login ของคุณ
     // signOut: '/',
     // error: '/auth/error', // หน้าแสดงข้อผิดพลาด (ถ้ามี)
     // verifyRequest: '/auth/verify-request', // สำหรับ Email provider
     // newUser: '/auth/new-user' // หน้าสำหรับผู้ใช้ใหม่ครั้งแรก (ถ้ามี)
   },
   // debug: process.env.NODE_ENV === 'development', // เปิด debug mode ตอนพัฒนา
};

export default NextAuth(authOptions);