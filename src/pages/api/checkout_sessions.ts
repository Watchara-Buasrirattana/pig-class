// pages/api/checkout_sessions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]"; // ปรับ Path ตามต้องการ
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-04-10' as any, // ใช้ API version ล่าสุด (ใช้ as any เพื่อเลี่ยง Error เดิมไปก่อน)
});
// URL ของเว็บคุณ ต้องมีใน .env.local
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// --- เพิ่ม Type สำหรับข้อมูลที่จะใส่ใน Array ---
type OrderItemInputData = {
    courseId: number;
    quantity: number;
    price: number; // ราคา ณ ตอนซื้อ
};
// --- ---

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end('Method Not Allowed');
    }

    // 1. ตรวจสอบ Session และ User ID
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
        return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }
    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
         return res.status(500).json({ error: 'Invalid user ID in session.' });
    }

    try {
        // 2. ดึงข้อมูล Cart และ Items ของผู้ใช้
        const userCart = await prisma.cart.findUnique({
            where: { userId: userId },
            include: {
                items: {
                    where: { quantity: { gt: 0 } },
                    include: {
                        course: {
                            select: {
                                id: true, courseName: true, price: true, stripePriceId: true
                            }
                        }
                    },
                    orderBy: { id: 'asc' }
                }
            }
        });

        if (!userCart || userCart.items.length === 0) {
            return res.status(400).json({ error: 'Your cart is empty.' });
        }

        // 3. ตรวจสอบข้อมูลและเตรียม Line Items / OrderItems
        let calculatedTotalPrice = 0;
        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
        // --- แก้ไขการประกาศ Array โดยใส่ Type ---
        const orderItemsData: OrderItemInputData[] = []; // <<-- ระบุ Type ตรงนี้
        // -------------------------------------

        for (const item of userCart.items) {
            if (!item.course || !item.course.stripePriceId) {
                console.error(`Course ID ${item.courseId} in cart missing data or Stripe Price ID.`);
                return res.status(400).json({ error: `Course "${item.course?.courseName || item.courseId}" is currently unavailable. Please remove it.` });
            }
            const itemPrice = item.course.price * item.quantity;
            calculatedTotalPrice += itemPrice;

            line_items.push({
                price: item.course.stripePriceId,
                quantity: item.quantity,
            });

            // --- บรรทัดนี้จะไม่มี Error แล้ว ---
            orderItemsData.push({
                courseId: item.courseId,
                quantity: item.quantity,
                price: item.course.price // บันทึกราคา ณ ตอนซื้อ
            });
            // -----------------------------
        }

        if (calculatedTotalPrice <= 0) {
             return res.status(400).json({ error: 'Invalid total price.' });
         }

        // 4. สร้าง Order และ OrderItems ใน Database
        console.log("Creating order in database...");
         const newOrder = await prisma.order.create({
             data: {
                 userId: userId,
                 orderNumber: `PIG-${Date.now()}`,
                 totalPrice: calculatedTotalPrice,
                 status: 'PENDING',
                 items: {
                     create: orderItemsData // <-- ใช้ Array ที่มี Type ถูกต้อง
                 }
             }
         });
        console.log(`Order ${newOrder.id} created with status PENDING.`);

        // 5. สร้าง Stripe Checkout Session
        console.log("Creating Stripe Checkout Session...");
        const checkoutSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
            line_items: line_items,
            mode: 'payment',
            customer_email: session.user.email || undefined,
            success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/cart`,
            metadata: {
                dbOrderId: newOrder.id.toString(),
                dbUserId: userId.toString(),
            },
            client_reference_id: newOrder.id.toString(),
             allow_promotion_codes: true,
        };

        const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionCreateParams);
        console.log("Stripe Checkout Session created:", checkoutSession.id);

        // 6. อัปเดต Order ด้วย Stripe Session ID
         if(checkoutSession.id){
             await prisma.order.update({
                 where: { id: newOrder.id },
                 data: { stripeSessionId: checkoutSession.id }
             });
         }

        // 7. ส่ง Session ID กลับไปให้ Frontend
        res.status(200).json({ sessionId: checkoutSession.id });

    } catch (error: any) {
        console.error("API Error creating checkout session:", error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
}