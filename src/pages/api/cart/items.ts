// pages/api/cart/items.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../auth/[...nextauth]"; 

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
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
        const { courseId, quantity = 1 } = req.body; // รับ courseId, quantity (default 1)

        if (!courseId || typeof courseId !== 'number' || courseId <= 0) {
            return res.status(400).json({ error: 'Invalid courseId.' });
        }
        if (typeof quantity !== 'number' || quantity <= 0) {
             return res.status(400).json({ error: 'Invalid quantity.' });
        }

        // 1. หา Cart ของ User หรือสร้างใหม่ถ้ายังไม่มี
        let cart = await prisma.cart.findUnique({
            where: { userId: userId },
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId: userId },
            });
            console.log(`Cart created for user ${userId}, cartId: ${cart.id}`);
        }

        // 2. ตรวจสอบว่า Course นี้มีอยู่ใน CartItem ของ Cart นี้หรือยัง
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                cartId_courseId: { // ใช้ @@unique ที่เรากำหนดใน Schema
                    cartId: cart.id,
                    courseId: courseId,
                }
            }
        });

        let updatedCartItem;
        if (existingCartItem) {
            // ถ้ามีอยู่แล้ว ให้อัปเดต quantity (ตัวอย่างนี้คือบวกเพิ่ม)
            // หรือคุณอาจจะต้องการให้มันเป็น 1 เสมอสำหรับคอร์ส ก็เปลี่ยนเป็น set quantity = 1
            updatedCartItem = await prisma.cartItem.update({
                where: { id: existingCartItem.id },
                data: { quantity: { increment: quantity } }, // หรือ quantity: 1
            });
             console.log(`Updated quantity for course ${courseId} in cart ${cart.id}`);
        } else {
            // ถ้ายังไม่มี ให้สร้าง CartItem ใหม่
            updatedCartItem = await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    courseId: courseId,
                    quantity: quantity,
                }
            });
            console.log(`Added course ${courseId} to cart ${cart.id}`);
        }

        // (Optional) ดึงข้อมูล Cart ทั้งหมดกลับไปเพื่ออัปเดต UI ทันที
        const updatedFullCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: {
                items: {
                    include: { course: { select: { courseName: true, price: true, courseImg: true } } }
                }
            }
        });

        return res.status(200).json({ message: 'Item added to cart successfully', cartItem: updatedCartItem, cart: updatedFullCart });

    } catch (error: any) {
        console.error("API Error adding item to cart:", error);
         if (error.code === 'P2003') { // Foreign key constraint failed (e.g., courseId does not exist)
             return res.status(400).json({ error: 'Invalid course selected.' });
         }
        return res.status(500).json({ error: `Failed to add item to cart: ${error.message}` });
    }
}