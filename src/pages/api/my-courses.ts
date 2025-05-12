// pages/api/my-courses.ts (ตัวอย่างสำหรับ Pages Router)
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]"; // ปรับ Path ตาม NextAuth config

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end('Method Not Allowed');
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }
    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
        return res.status(500).json({ error: 'Invalid user ID in session.' });
    }

    try {
        // 1. ค้นหา Enrollments ของ User นี้
        const enrollments = await prisma.enrollment.findMany({
            where: { userId: userId },
            include: { // 2. ดึงข้อมูล Course ที่เกี่ยวข้องมาด้วย
                course: {
                    select: { // เลือกเฉพาะ Field ที่ต้องการแสดงผลในหน้า Profile
                        id: true,
                        courseName: true,
                        courseNumber: true,
                        courseImg: true,
                        description: true, // อาจจะเอาแค่ส่วนสั้นๆ หรือไม่ต้องเอามาเลย
                        price: true, // อาจจะไม่จำเป็นต้องแสดงราคาตรงนี้
                        // เพิ่ม Field อื่นๆ ของ Course ที่ต้องการแสดง
                    }
                }
            },
            orderBy: {
                date: 'desc' // เรียงตามวันที่ลงทะเบียนล่าสุด
            }
        });

        // 3. แปลงผลลัพธ์ให้อยู่ในรูปแบบ Course Array
        const enrolledCourses = enrollments.map(enrollment => enrollment.course);

        res.status(200).json(enrolledCourses);

    } catch (error) {
        console.error("API Error fetching enrolled courses:", error);
        res.status(500).json({ error: 'Failed to fetch enrolled courses.' });
    }
}