// pages/api/cart/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // ปรับ Path ให้ถูกต้อง

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }
    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
        return res.status(500).json({ error: 'Invalid user ID in session.' });
    }

    if (req.method === 'GET') {
        // --- ดึงข้อมูลตะกร้าปัจจุบันของผู้ใช้ ---
        try {
            const cart = await prisma.cart.findUnique({
                where: { userId: userId },
                include: {
                    items: { // ดึงรายการสินค้าในตะกร้า
                        where: { quantity: { gt: 0 } }, // เอาเฉพาะที่มีจำนวนมากกว่า 0
                        include: {
                            course: { // ดึงข้อมูล Course ที่เกี่ยวข้อง
                                select: { // เลือกเฉพาะ Field ที่จำเป็น
                                    id: true,
                                    courseName: true,
                                    price: true,
                                    courseImg: true,
                                    courseNumber: true,
                                    // ไม่จำเป็นต้องเอา stripePriceId มาแสดงในตะกร้า Frontend
                                }
                            }
                        },
                        orderBy: { id: 'asc' } // เรียงตาม ID ของ CartItem
                    }
                }
            });

            if (!cart) {
                // ถ้าไม่เจอ Cart ของ User นี้ อาจจะ return ตะกร้าว่าง
                return res.status(200).json({ id: null, userId: userId, items: [] });
            }

            return res.status(200).json(cart);

        } catch (error) {
            console.error("API Error fetching cart:", error);
            return res.status(500).json({ error: 'Failed to fetch cart data.' });
        }
    } else if (req.method === 'POST') {
        // --- นี่คือ API /api/cart/items.ts ที่ใช้เพิ่มสินค้า ---
        // --- ถ้าคุณรวมไฟล์ ให้ย้าย Logic จากไฟล์นั้นมาไว้ตรงนี้ ---
        // --- หรือถ้าแยกไฟล์ ก็ไม่ต้องมีส่วน POST นี้ใน /api/cart/index.ts ---
        // ตัวอย่าง: res.status(405).end('Method Not Allowed here, use /api/cart/items');
        // สมมติว่าเราใช้ /api/cart/items แยกต่างหาก
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed on /api/cart`);
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}