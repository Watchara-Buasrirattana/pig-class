// pages/api/articles/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace ด้วย
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // <-- ตรวจสอบ Path ให้ถูกต้อง

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'GET') {
        // --- (Optional) GET Handler to list articles ---
        try {
            const articles = await prisma.article.findMany({
                 orderBy: { publishedAt: 'desc'},
                 include: {
                    category: { select: { name: true } },
                    images: { orderBy: { id: 'asc' } } // ดึงรูปมาด้วย
                }
             });
             return res.status(200).json(articles);
        } catch (error) {
             console.error("Error fetching articles:", error);
             return res.status(500).json({ error: 'Failed to fetch articles.' });
        }

    } else if (req.method === 'POST') {
        // --- สร้างบทความใหม่ ---

        // 1. Check Session and Admin Role (ยังคงจำเป็น)
        const session = await getServerSession(req, res, authOptions);
        if (!session || session.user?.role !== 'admin') { // เช็คแค่ role ก็พอ ไม่ต้องเช็ค user.id แล้วก็ได้
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }
        // ไม่ต้องดึง userId มาใช้แล้ว
        // const userId = parseInt(session.user.id, 10);
        // if (isNaN(userId)) { ... }

        try {
            // 2. Get Data from Request Body (เหมือนเดิม)
            const { title, description, categoryId, imageUrls, coverImage } = req.body;

            // 3. Validation (เหมือนเดิม)
            // ... (validate title, description, categoryId, imageUrls, coverImage) ...
            const categoryIdAsNumber = parseInt(categoryId, 10);
            if (isNaN(categoryIdAsNumber)) { /* ... */ }
            if (!Array.isArray(imageUrls) || imageUrls.length === 0 || !imageUrls.every((url: any) => typeof url === 'string' && url.startsWith('https://'))) { /* ... */ }
            const categoryExists = await prisma.category.findUnique({ where: { id: categoryIdAsNumber } });
            if (!categoryExists) { /* ... */ }
            // --- End Validation ---


            // 4. Create Article and ArticleImages (ลบ userId ออก)
            const newArticle = await prisma.article.create({
                data: {
                    title: title.trim(),
                    description: description,
                    publishedAt: new Date(),
                    // userId: userId,       // <<--- ลบบรรทัดนี้ออก
                    categoryId: categoryIdAsNumber,
                    coverImage: coverImage || imageUrls[0] || null,
                    images: {
                        create: imageUrls.map((url: string, index: number) => ({
                            url: url,
                            order: index + 1
                        })),
                    },
                },
                // Include อาจจะไม่ต้อง include user แล้ว
                include: {
                    images: { orderBy: { order: 'asc' } },
                    category: { select: { name: true } },
                    // user: { select: { firstName: true, lastName: true } } // <<-- เอา user ออก
                }
            });


            console.log("Successfully created article:", newArticle.id);
            return res.status(201).json(newArticle); // 201 Created

        } catch (error) {
            console.error("Error creating article:", error);
            // ตรวจสอบ Prisma error codes เพิ่มเติมถ้าต้องการ
            return res.status(500).json({ error: 'Failed to create article.' });
        }

    } else {
        res.setHeader('Allow', ['GET', 'POST']); // กำหนด Method ที่อนุญาต
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}