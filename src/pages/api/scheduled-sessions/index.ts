// pages/api/scheduled-sessions/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../auth/[...nextauth]"; // ปรับ Path ให้ถูกต้อง

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = await getServerSession(req, res, authOptions);

    // GET: ดึงข้อมูล Scheduled Sessions ทั้งหมด (อาจจะเพิ่ม Filter ตามช่วงวันที่)
    if (req.method === 'GET') {
        // Optional: รับ query params สำหรับ filter ช่วงวันที่
        const { start, end } = req.query; // รูปแบบ YYYY-MM-DD

        try {
            const whereClause: Prisma.ScheduledSessionWhereInput = {};
            if (start && typeof start === 'string') {
                whereClause.startTime = { gte: new Date(start) };
            }
            if (end && typeof end === 'string') {
                // เพิ่ม 1 วันให้กับ end date เพื่อให้ครอบคลุมถึงสิ้นวันนั้น
                const endDate = new Date(end);
                endDate.setDate(endDate.getDate() + 1);
                whereClause.endTime = { lte: endDate };
            }

            const scheduledSessions = await prisma.scheduledSession.findMany({
                where: whereClause,
                include: {
                    course: { // ดึงชื่อคอร์สมาด้วย
                        select: { id: true, courseName: true }
                    }
                },
                orderBy: { startTime: 'asc' }
            });
            return res.status(200).json(scheduledSessions);
        } catch (error) {
            console.error("Error fetching scheduled sessions:", error);
            return res.status(500).json({ error: 'Failed to fetch scheduled sessions' });
        }
    }
    // POST: Admin สร้าง Scheduled Session ใหม่
    else if (req.method === 'POST') {
        if (!session || session.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
        try {
            const { courseId, title, description, startTime, endTime, location } = req.body;

            // --- Validation ---
            if (!courseId || !startTime || !endTime) {
                return res.status(400).json({ error: 'Course ID, start time, and end time are required.' });
            }
            const courseIdAsNumber = parseInt(courseId as string, 10);
            if (isNaN(courseIdAsNumber)) {
                return res.status(400).json({ error: 'Invalid Course ID.' });
            }
            const startDate = new Date(startTime as string);
            const endDate = new Date(endTime as string);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ error: 'Invalid start or end time format.' });
            }
            if (endDate <= startDate) {
                return res.status(400).json({ error: 'End time must be after start time.' });
            }
            // --- End Validation ---

            const newSession = await prisma.scheduledSession.create({
                data: {
                    courseId: courseIdAsNumber,
                    title: title || null,
                    description: description || null,
                    startTime: startDate,
                    endTime: endDate,
                    location: location || null,
                },
                include: { course: { select: { courseName: true } } }
            });
            return res.status(201).json(newSession);

        } catch (error: any) {
            console.error("Error creating scheduled session:", error);
            if (error.code === 'P2003') { // Foreign key constraint failed
                return res.status(400).json({ error: 'Invalid courseId provided.' });
            }
            return res.status(500).json({ error: 'Failed to create scheduled session.' });
        }
    }
    // Methods อื่นๆ
    else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}