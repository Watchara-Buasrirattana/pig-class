// pages/api/webhooks/stripe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { buffer } from 'micro'; // Helper สำหรับอ่าน Raw Request Body

const prisma = new PrismaClient();

// --- Stripe Instance (ใช้ Secret Key) ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-04-10' as any, // หรือ Version ล่าสุดที่คุณใช้ใน checkout_sessions
});

// --- Webhook Signing Secret (จาก Stripe CLI หรือ Dashboard) ---
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification will fail.");
    // ไม่ควร throw error ตอน build, แต่ควรจะ log หรือมีกลไกแจ้งเตือน
}

// --- สำคัญ: ปิด bodyParser ของ Next.js เพื่อให้ Stripe SDK รับ Raw Body ได้ ---
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const sig = req.headers['stripe-signature'] as string; // Signature จาก Stripe
    const rawBody = await buffer(req); // อ่าน Raw Body

    let event: Stripe.Event;

    // 1. ตรวจสอบ Signature (สำคัญมากเพื่อความปลอดภัย)
    try {
        if (!webhookSecret) { // ตรวจสอบอีกครั้งเผื่อกรณีข้างบนไม่ได้ throw
             console.error('STRIPE_WEBHOOK_SECRET is missing. Cannot verify webhook signature.');
             return res.status(500).send('Webhook secret not configured.');
        }
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        console.log(`[Webhook] Event ${event.id} (Type: ${event.type}) received.`);
    } catch (err: any) {
        console.error(`[Webhook] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. จัดการ Event ที่ได้รับ (เราสนใจ checkout.session.completed เป็นหลัก)
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                console.log(`[Webhook] Processing checkout.session.completed for session ID: ${session.id}`);

                // --- ตรวจสอบสถานะการจ่ายเงินของ Session ---
                // ถึงแม้ Event จะเป็น 'completed' ควรเช็ค payment_status อีกที
                if (session.payment_status === 'paid' && session.status === 'complete') {
                    // ดึง Order ID และ User ID จาก metadata หรือ client_reference_id
                    const orderIdString = session.metadata?.dbOrderId || session.client_reference_id;
                    const userIdString = session.metadata?.dbUserId;

                    if (!orderIdString || !userIdString) {
                        console.error(`[Webhook] Error: Missing dbOrderId or dbUserId in metadata for session ${session.id}`, session.metadata);
                        return res.status(400).json({ error: "Webhook Error: Missing required metadata." });
                    }

                    const orderId = parseInt(orderIdString, 10);
                    const userId = parseInt(userIdString, 10);

                    if (isNaN(orderId) || isNaN(userId)) {
                        console.error(`[Webhook] Error: Invalid metadata format (orderId or userId) for session ${session.id}`, { orderIdString, userIdString });
                        return res.status(400).json({ error: "Webhook Error: Invalid metadata format." });
                    }

                    console.log(`[Webhook] Payment successful. Order ID: ${orderId}, User ID: ${userId}`);

                    // --- อัปเดต Database (ใช้ Transaction เพื่อความปลอดภัยของข้อมูล) ---
                    // 3. ตรวจสอบ Order และป้องกันการประมวลผลซ้ำ (Idempotency)
                    const existingOrder = await prisma.order.findUnique({
                        where: { id: orderId },
                        include: { items: true } // ดึง items มาด้วยเพื่อสร้าง Enrollment
                    });

                    if (!existingOrder) {
                        console.error(`[Webhook] Error: Order ${orderId} not found in DB.`);
                        return res.status(404).json({ error: 'Order not found.' }); // Stripe อาจจะ Retry
                    }

                    // ถ้า Order นี้ถูก Process ไปแล้ว (สถานะเป็น PAID) ก็ไม่ต้องทำอะไรอีก
                    if (existingOrder.status === 'PAID') {
                        console.log(`[Webhook] Info: Order ${orderId} is already marked as PAID. Skipping update.`);
                        return res.status(200).json({ received: true, status: 'Order already processed' });
                    }

                    // 4. อัปเดต Order Status, สร้าง Payment Record, สร้าง Enrollment Records
                    console.log(`[Webhook] Updating Order ${orderId} to PAID and creating related records...`);
                    await prisma.$transaction(async (tx) => {
                        // อัปเดต Order
                        await tx.order.update({
                            where: { id: orderId },
                            data: {
                                status: 'PAID',
                                // อัปเดต stripeSessionId ด้วย ถ้ายังไม่ได้ทำตอนสร้าง Order
                                stripeSessionId: session.id,
                            }
                        });

                        // สร้าง Payment Record
                        await tx.payment.create({
                            data: {
                                orderId: orderId,
                                userId: userId,
                                totalAmount: (session.amount_total || 0) / 100, // Stripe ใช้ Cent
                                status: session.payment_status, // ควรจะเป็น 'paid'
                                stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
                                // paymentDate จะเป็น default now() ตาม Schema
                            }
                        });

                        // สร้าง Enrollment Records สำหรับแต่ละ Course Item ใน Order
                        const enrollmentsToCreate = existingOrder.items.map(item => ({
                            userId: userId,
                            courseId: item.courseId,
                            // date จะเป็น default now() ตาม Schema
                        }));

                        if (enrollmentsToCreate.length > 0) {
                            await tx.enrollment.createMany({
                                data: enrollmentsToCreate,
                                skipDuplicates: true, // ป้องกัน Error ถ้า User เคย Enroll ไปแล้วด้วยเหตุผลอื่น
                            });
                            console.log(`[Webhook] Created ${enrollmentsToCreate.length} enrollment(s) for order ${orderId}.`);
                        }
                    });
                    console.log(`[Webhook] Successfully processed Order ${orderId} and marked as PAID.`);

                } else {
                    console.warn(`[Webhook] Checkout session ${session.id} completed but payment_status is ${session.payment_status} or session status is ${session.status}. No database update performed.`);
                    // คุณอาจจะต้องการอัปเดต Order เป็น FAILED หรือ CANCELLED ตรงนี้
                }
                break;

            // --- สามารถ Handle Event อื่นๆ ที่สำคัญได้ เช่น ---
            case 'payment_intent.succeeded':
                const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
                console.log('[Webhook] PaymentIntent succeeded:', paymentIntentSucceeded.id);
                // หากใช้ Payment Intents โดยตรง หรือต้องการ Logic เพิ่มเติม
                break;

            case 'payment_intent.payment_failed':
                const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
                console.log('[Webhook] PaymentIntent failed:', paymentIntentFailed.id);
                // แจ้งเตือนผู้ใช้ หรืออัปเดตสถานะ Order เป็น FAILED
                // อาจจะต้องหา Order ID จาก metadata ของ PaymentIntent หรือ Charge
                break;

            // ... เพิ่ม event types อื่นๆ ที่คุณต้องการจัดการ ...

            default:
                console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        // ตอบกลับ Stripe ว่าได้รับ Event เรียบร้อยแล้ว (สำคัญมาก)
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('[Webhook] Error processing event:', error);
        // ส่ง Status 500 เพื่อให้ Stripe ลองส่ง Event นี้มาใหม่ในภายหลัง (ถ้าเป็น Error ชั่วคราว)
        // หรือส่ง 200 ถ้าไม่ต้องการให้ Retry แต่ Log Error ไว้ (เช่น Order ไม่เจอแล้ว)
        res.status(500).json({ error: 'Webhook handler failed.' });
    }
}