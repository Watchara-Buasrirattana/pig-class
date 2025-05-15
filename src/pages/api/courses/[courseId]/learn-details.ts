// pages/api/courses/[courseId]/learn-details.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next"; // ถ้าต้องการเช็คว่า Login ถึงจะดูได้
import { authOptions } from "../../auth/[...nextauth]";

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { courseId } = req.query;
    if (typeof courseId !== 'string' || isNaN(parseInt(courseId, 10))) {
        return res.status(400).json({ error: 'Invalid Course ID' });
    }
    const idAsNumber = parseInt(courseId, 10);

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) { // ตรวจสอบ user.id ด้วย
        return res.status(401).json({ error: "Unauthorized: Please log in." });
    }
    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
        return res.status(500).json({ error: 'Invalid user ID in session.' });
    }

    // --- ตรวจสอบ Enrollment ---
    const enrollment = await prisma.enrollment.findUnique({
        where: {
            userId_courseId: { // <<-- Prisma จะรู้จัก Type นี้หลัง prisma generate
                userId: userId,
                courseId: idAsNumber
            }
        },
    });

    // Admin สามารถดูได้เสมอ แม้จะไม่ได้ลงทะเบียน
    if (!enrollment && session.user.role !== 'admin') {
        return res.status(403).json({ error: "You are not enrolled in this course." });
    }
    // --- จบการตรวจสอบ Enrollment ---


    if (req.method === 'GET') {
        try {
            const courseWithDetails = await prisma.course.findUnique({
                where: { id: idAsNumber },
                select: {
                    id: true,
                    courseName: true,
                    courseNumber: true,
                    courseImg: true,
                    lessons: {
                        orderBy: { lessonNumber: 'asc' },
                        select: {
                            id: true, title: true, lessonNumber: true,
                            videos: {
                                orderBy: { order: 'asc' },
                                select: { id: true, title: true, url: true, order: true }
                            }
                        }
                    },
                    documents: {
                        orderBy: { title: 'asc' },
                        select: { id: true, title: true, fileUrl: true, fileSize: true }
                    }
                }
            });

            if (!courseWithDetails) {
                return res.status(404).json({ error: 'Course not found' });
            }
            return res.status(200).json(courseWithDetails);
        } catch (error) {
            console.error("Error fetching course learn details:", error);
            return res.status(500).json({ error: 'Failed to fetch course details for learning.' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}