import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "../../../lib/prisma"
import bcrypt from "bcryptjs"
import { NextAuthOptions, SessionStrategy } from "next-auth"
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials) return null
      
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
      
        if (!user) return null
      
        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword)
      
        if (!isValid) return null
      
        return {
          id: user.id.toString(), 
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      }
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy,
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
