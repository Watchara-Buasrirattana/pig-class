// pages/api/cart/items/[itemId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../../auth/[...nextauth]"; // ปรับ Path ตาม NextAuth config

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

    // ดึง itemId จาก Path Parameter
    const { itemId } = req.query;
    if (!itemId || typeof itemId !== 'string') {
        return res.status(400).json({ error: 'Cart Item ID is required.' });
    }
    const cartItemId = parseInt(itemId, 10);
    if (isNaN(cartItemId)) {
        return res.status(400).json({ error: 'Invalid Cart Item ID format.' });
    }

    if (req.method === 'DELETE') {
        try {
            // 1. ค้นหา CartItem ที่จะลบ
            const cartItemToDelete = await prisma.cartItem.findUnique({
                where: { id: cartItemId },
                include: { cart: true }, // ดึงข้อมูล Cart มาด้วยเพื่อเช็ค userId
            });

            if (!cartItemToDelete) {
                return res.status(404).json({ error: 'Cart item not found.' });
            }

            // 2. (สำคัญ) ตรวจสอบว่า CartItem นี้เป็นของ User ที่ Login อยู่จริง
            if (cartItemToDelete.cart.userId !== userId) {
                return res.status(403).json({ error: 'Forbidden: You do not own this cart item.' });
            }

            // 3. ลบ CartItem
            await prisma.cartItem.delete({
                where: { id: cartItemId },
            });

            console.log(`CartItem ID ${cartItemId} deleted successfully for user ${userId}.`);

            // (Optional) ตรวจสอบว่า Cart ของ User นี้ว่างเปล่าหรือยัง
            // ถ้าว่างเปล่า อาจจะลบ Cart Record ทิ้งไปด้วย (ขึ้นอยู่กับ Logic ที่คุณต้องการ)
            const remainingItems = await prisma.cartItem.count({
                where: { cartId: cartItemToDelete.cartId }
            });

            if (remainingItems === 0) {
                await prisma.cart.delete({
                    where: { id: cartItemToDelete.cartId }
                });
                console.log(`Cart ID ${cartItemToDelete.cartId} deleted as it became empty.`);
            }


            return res.status(200).json({ message: 'Item removed from cart successfully.' });

        } catch (error: any) {
            console.error("API Error removing item from cart:", error);
            if (error.code === 'P2025') { // Record to delete does not exist
                 return res.status(404).json({ error: 'Cart item not found or already deleted.' });
            }
            return res.status(500).json({ error: `Failed to remove item from cart: ${error.message}` });
        }
    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}