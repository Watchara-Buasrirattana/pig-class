// src/pages/api/admin/users.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma'; // ตรวจสอบ path prisma
import { getServerSession } from "next-auth/next";
import { authOptions } from '../auth/[...nextauth]'; // ตรวจสอบ path authOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user?.role !== 'admin') { // ตรวจสอบ role ให้ตรงกับค่าใน DB
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  if (req.method === 'GET') {
    // --- GET /api/admin/users (Get all users) ---
    try {
      const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, profileImg: true,
        }
      });
      res.status(200).json(users);
    } catch (error) {
      console.error("API GET /admin/users Error:", error);
      res.status(500).json({ message: 'Failed to fetch users', error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}