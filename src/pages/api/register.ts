// src/pages/api/register.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { NextApiRequest, NextApiResponse } from 'next'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role = 'student',
  } = req.body

  if (!email || !password || !firstName || !lastName || !phoneNumber) {
    return res.status(400).json({ message: 'Missing required fields' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        role,
      },
    })

    return res.status(201).json({ user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
