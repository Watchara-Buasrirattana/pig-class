// pages/api/courses/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from "../../../lib/prisma"; // ตรวจสอบ Path ของ prisma
import Stripe from 'stripe'; // Import Stripe
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

// --- Stripe Instance (เหมือนกับใน checkout_sessions.ts) ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-04-10' as any, // หรือเวอร์ชันที่คุณใช้
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // ... (โค้ด GET เหมือนเดิม) ...
        try {
            const courses = await prisma.course.findMany({
                 orderBy: { id: 'desc' } // ตัวอย่าง
            });
            res.status(200).json(courses);
        } catch (error) {
            console.error("Error fetching courses:", error);
            res.status(500).json({ message: 'Failed to fetch courses' });
        }

    } else if (req.method === 'POST') {
        // --- ตรวจสอบสิทธิ์ Admin ก่อน (สำคัญมาก) ---
        const session = await getServerSession(req, res, authOptions);
        if (!session || session.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required.' });
        }
        // ------------------------------------

        const { courseNumber, courseName, description, price, courseImg, category, teacher, level } = req.body;

        // --- Basic Validation ---
        if (!courseName || !courseNumber || !description || price === undefined || price === null) {
            return res.status(400).json({ message: 'Missing required course fields.' });
        }
        const coursePrice = parseFloat(price);
        if (isNaN(coursePrice) || coursePrice < 0) {
            return res.status(400).json({ message: 'Invalid price format.' });
        }
        // --- End Basic Validation ---

        try {
            // 1. สร้าง Product ใน Stripe ก่อน
            console.log(`Creating Stripe Product for: ${courseName}`);
            const stripeProduct = await stripe.products.create({
                name: courseName, // ใช้ชื่อคอร์สเป็นชื่อ Product ใน Stripe
                description: description, // (Optional) ใส่คำอธิบายได้
                // สามารถใส่ metadata อื่นๆ ได้ถ้าต้องการ
                // metadata: { ourCourseId: courseNumber } // ตัวอย่าง
            });
            console.log(`Stripe Product created: ${stripeProduct.id}`);

            // 2. สร้าง Price สำหรับ Product นั้นใน Stripe
            // Stripe ต้องการราคาเป็นหน่วยเล็กที่สุด (เช่น สตางค์)
            // ถ้า price คือ 990 บาท ต้องส่ง 99000 (990 * 100)
            console.log(`Creating Stripe Price for Product ID: ${stripeProduct.id}`);
            const stripePrice = await stripe.prices.create({
                product: stripeProduct.id, // ID ของ Product ที่เพิ่งสร้าง
                unit_amount: Math.round(coursePrice * 100), // แปลงเป็นสตางค์ และเป็น Integer
                currency: 'thb', // สกุลเงินบาท
                // recurring: { interval: 'month' } // ถ้าเป็น Subscription
            });
            console.log(`Stripe Price created: ${stripePrice.id}`);

            // 3. สร้าง Course ใน Database ของเรา พร้อมเก็บ stripePriceId
            console.log("Creating course in our database with Stripe Price ID:", stripePrice.id);
            const course = await prisma.course.create({
                data: {
                    courseNumber,
                    courseName,
                    description,
                    price: coursePrice,
                    courseImg,
                    category,
                    teacher,
                    level,
                    stripePriceId: stripePrice.id, // <<-- บันทึก Stripe Price ID ที่ได้
                },
            });
            console.log("Course created in DB:", course);

            res.status(201).json(course); // ส่งข้อมูล Course ที่สร้าง (รวม stripePriceId) กลับไป

        } catch (error: any) {
            console.error("Error creating course or Stripe product/price:", error);
            // ถ้าเกิด Error จาก Stripe API อาจจะมี error.raw.message หรือ error.message
            const stripeErrorMessage = error.raw?.message || error.message || 'Unknown Stripe error';
            if (error.type === 'StripeCardError') { // ตัวอย่างการจัดการ Stripe Error
                return res.status(400).json({ message: `Stripe error: ${stripeErrorMessage}` });
            }
            return res.status(500).json({ message: 'Failed to create course', error: stripeErrorMessage });
        }

    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: 'Method not allowed' });
    }
}