// pages/api/orders/my-history.ts (ตัวอย่างสำหรับ Pages Router)
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../auth/[...nextauth]"; // ปรับ Path ตาม NextAuth config

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
        const orders = await prisma.order.findMany({
            where: { userId: userId },
            include: {
                items: { // ดึงรายการสินค้าในแต่ละ Order
                    include: {
                        course: { // ดึงข้อมูล Course ของแต่ละ Item
                            select: {
                                id: true,
                                courseName: true,
                                courseImg: true,
                                courseNumber: true,
                            }
                        }
                    }
                },
                payments: { // (Optional) ดึงข้อมูลการชำระเงินที่เกี่ยวข้อง
                    select: {
                        status: true,
                        paymentDate: true,
                        totalAmount: true, // อาจจะไม่ต้อง เพราะ Order มี totalPrice แล้ว
                    },
                    orderBy: {
                        paymentDate: 'desc'
                    },
                    take: 1 // เอา Payment ล่าสุด (ถ้ามีหลายครั้ง)
                }
            },
            orderBy: {
                orderDate: 'desc' // เรียงตามวันที่สั่งซื้อล่าสุด
            }
        });

        res.status(200).json(orders);

    } catch (error) {
        console.error("API Error fetching order history:", error);
        res.status(500).json({ error: 'Failed to fetch order history.' });
    }
}