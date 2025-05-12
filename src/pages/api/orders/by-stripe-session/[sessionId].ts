// pages/api/orders/by-stripe-session/[sessionId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../../auth/[...nextauth]"; // <<-- ปรับ Path ให้ถูกต้อง

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    // เราต้องใช้ userId จาก session ที่ login อยู่จริง เพื่อความปลอดภัย
    // ไม่ใช่ userId ที่อาจจะอยู่ใน metadata ของ Stripe session อย่างเดียว
    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const currentUserId = parseInt(session.user.id, 10); // ID ของ User ที่ Login อยู่

    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Stripe Session ID is required' });
    }

    try {
        const order = await prisma.order.findUnique({
            where: {
                stripeSessionId: sessionId,
                // เพิ่มเงื่อนไข: ตรวจสอบว่าเป็น Order ของ User ที่ Login อยู่จริง
                userId: currentUserId,
            },
            // --- แก้ไข select ตรงนี้ ---
            select: {
                id: true,
                orderNumber: true,
                totalPrice: true,
                status: true,
                userId: true, // <<-- เพิ่มบรรทัดนี้ เพื่อดึง userId กลับไปด้วย
                // items: { // Optional: ถ้าต้องการแสดงรายการสินค้าในหน้านี้ด้วย
                //     select: {
                //         course: { select: { courseName: true } },
                //         quantity: true,
                //         price: true
                //     }
                // }
            }
            // ------------------------
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found for this session ID or user.' });
        }

        return res.status(200).json(order); // ตอนนี้ order จะมี userId แล้ว
    } catch (error) {
        console.error("Error fetching order by stripe session ID:", error);
        return res.status(500).json({ error: 'Failed to fetch order details.' });
    }
}