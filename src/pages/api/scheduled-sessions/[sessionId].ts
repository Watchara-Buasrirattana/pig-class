// pages/api/scheduled-sessions/[sessionId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../auth/[...nextauth]"; // ปรับ Path

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { sessionId } = req.query;
    if (typeof sessionId !== 'string' || isNaN(parseInt(sessionId, 10))) {
        return res.status(400).json({ error: 'Invalid Session ID format.' });
    }
    const idAsNumber = parseInt(sessionId, 10);

    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    // GET: ดึงข้อมูล Session เดียว (อาจจะไม่ต้องใช้ ถ้าไม่ต้องการหน้ารายละเอียด Session)
    if (req.method === 'GET') {
        try {
            const scheduledSession = await prisma.scheduledSession.findUnique({
                where: { id: idAsNumber },
                include: { course: { select: { id:true, courseName: true } } }
            });
            if (!scheduledSession) return res.status(404).json({ error: 'Scheduled session not found.' });
            return res.status(200).json(scheduledSession);
        } catch (error) { /* ... */ }
    }
    // PUT: Admin แก้ไข Scheduled Session
    else if (req.method === 'PUT') {
        try {
            const { courseId, title, description, startTime, endTime, location } = req.body;
            const updateData: Prisma.ScheduledSessionUpdateInput = {};

            // --- Validation & Data Preparation ---
            if (courseId !== undefined) {
                const courseIdAsNumber = parseInt(courseId as string, 10);
                if (isNaN(courseIdAsNumber)) return res.status(400).json({ error: 'Invalid Course ID.' });
                updateData.course = { connect: { id: courseIdAsNumber } };
            }
            if (title !== undefined) updateData.title = title || null;
            if (description !== undefined) updateData.description = description || null;
            if (startTime !== undefined) {
                const startDate = new Date(startTime as string);
                if (isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid start time.' });
                updateData.startTime = startDate;
            }
            if (endTime !== undefined) {
                const endDate = new Date(endTime as string);
                if (isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid end time.' });
                updateData.endTime = endDate;
            }
            if (updateData.startTime && updateData.endTime && (new Date(updateData.endTime as string) <= new Date(updateData.startTime as string))) {
                return res.status(400).json({ error: 'End time must be after start time.'});
            }
            if (location !== undefined) updateData.location = location || null;
            // --- End Validation ---

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ error: "No fields to update." });
            }

            const updatedSession = await prisma.scheduledSession.update({
                where: { id: idAsNumber },
                data: updateData,
                include: { course: { select: { courseName: true } } }
            });
            return res.status(200).json(updatedSession);

        } catch (error: any) {
            console.error(`Error updating scheduled session ${idAsNumber}:`, error);
            if (error.code === 'P2025') return res.status(404).json({ error: 'Scheduled session not found.' });
            return res.status(500).json({ error: 'Failed to update scheduled session.' });
        }
    }
    // DELETE: Admin ลบ Scheduled Session
    else if (req.method === 'DELETE') {
        try {
            await prisma.scheduledSession.delete({
                where: { id: idAsNumber }
            });
            return res.status(204).end(); // No Content
        } catch (error: any) {
            console.error(`Error deleting scheduled session ${idAsNumber}:`, error);
            if (error.code === 'P2025') return res.status(404).json({ error: 'Scheduled session not found.' });
            return res.status(500).json({ error: 'Failed to delete scheduled session.' });
        }
    }
    // Methods อื่นๆ
    else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}