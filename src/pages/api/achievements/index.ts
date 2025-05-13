// pages/api/achievements/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../auth/[...nextauth]"; // ปรับ Path ให้ถูกต้อง

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = await getServerSession(req, res, authOptions);

    if (req.method === 'GET') {
        try {
            const achievements = await prisma.achievement.findMany({
                orderBy: { id: 'desc' } // หรือเรียงตามที่คุณต้องการ
            });
            return res.status(200).json(achievements);
        } catch (error) {
            console.error("Error fetching achievements:", error);
            return res.status(500).json({ error: 'Failed to fetch achievements.' });
        }
    } else if (req.method === 'POST') {
        // --- ตรวจสอบสิทธิ์ Admin ---
        if (!session || session.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
        // --------------------------
        try {
            const { image } = req.body; // รับแค่ image URL

            if (!image || typeof image !== 'string' || !image.startsWith('https://')) {
                return res.status(400).json({ error: 'Valid achievement image URL is required.' });
            }

            const newAchievement = await prisma.achievement.create({
                data: {
                    image: image,
                },
            });
            return res.status(201).json(newAchievement);

        } catch (error) {
            console.error("Error creating achievement:", error);
            return res.status(500).json({ error: 'Failed to create achievement.' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}