// pages/api/articles/[articleId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma, Article } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // Adjust path if needed
import { BlobServiceClient } from '@azure/storage-blob'; // For deleting images

const prisma = new PrismaClient();

// --- Environment Variables ---
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME_IMAGES = process.env.AZURE_STORAGE_CONTAINER_NAME || 'courseimages'; // Container รูป Article (ใช้ชื่อเดียวกับ Course?)
// *** ถ้าใช้ Container แยกสำหรับ Article Images ต้องแก้ชื่อตรงนี้ และใน Helper ***
const CONTAINER_NAME_ARTICLE_IMAGES = process.env.AZURE_STORAGE_CONTAINER_NAME_ARTICLES || 'articleimages';

if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.error('Azure Storage Connection String is not configured.');
    // Avoid throwing here during build time maybe? Or ensure it's always set.
}
const blobServiceClient = AZURE_STORAGE_CONNECTION_STRING
    ? BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
    : null; // Handle case where connection string might be missing at runtime


// --- Helper Functions (ควรแยกไปไฟล์ utils) ---
async function deleteBlobIfExists(containerName: string, blobName: string | null) {
    if (!blobName || !blobServiceClient) return;
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        console.log(`Attempting to delete blob: ${containerName}/${blobName}`);
        await blockBlobClient.deleteIfExists();
        console.log(`Successfully deleted blob: ${containerName}/${blobName}`);
    } catch (error) {
        console.error(`Error deleting blob ${containerName}/${blobName} from Azure:`, error);
    }
}

function getBlobNameFromUrl(url: string | null | undefined, allowedContainerNames: string[]): string | null {
    if (!url) return null;
    try {
        const urlParts = new URL(url);
        const pathSegments = urlParts.pathname.split('/');
        if (pathSegments.length > 2 && allowedContainerNames.includes(pathSegments[1])) {
            return pathSegments.slice(2).join('/');
        }
        return null;
    } catch (e) { return null; }
}
// --- End Helper Functions ---


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { articleId } = req.query;

    // --- Validation for articleId ---
    if (typeof articleId !== 'string' || isNaN(parseInt(articleId, 10))) {
        return res.status(400).json({ error: 'Invalid Article ID format.' });
    }
    const idAsNumber = parseInt(articleId, 10);
    // --- End Validation ---


    // --- Authentication and Authorization Check ---
    const session = await getServerSession(req, res, authOptions);
    // Allow GET for anyone? Or check for login? For PUT/DELETE, definitely check admin.
    const isAdmin = session?.user?.role === 'admin';
    const isLoggedIn = !!session?.user?.id;

    if ((req.method === 'PUT' || req.method === 'DELETE') && !isAdmin) {
         return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    // Add checks for GET if needed (e.g., must be logged in)
    // if (req.method === 'GET' && !isLoggedIn) {
    //      return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    // }
    // --- End Auth Check ---


    if (req.method === 'GET') {
        // --- ดึงข้อมูล Article ตัวเดียว (สำหรับหน้า Edit) ---
        console.log(`Workspaceing article details for ID: ${idAsNumber}`);
        try {
            const article = await prisma.article.findUnique({
                where: { id: idAsNumber },
                include: {
                    // ไม่ include user แล้ว เพราะเราลบ relation ออก
                    category: { select: { name: true } }, // Include category name
                    images: { orderBy: { order: 'asc' } } // Include related images
                }
            });

            if (!article) {
                console.log(`Article with ID ${idAsNumber} not found.`);
                return res.status(404).json({ error: 'Article not found' });
            }
            console.log(`Article ${idAsNumber} fetched successfully.`);
            return res.status(200).json(article); // ส่งข้อมูลตัวเต็มกลับไป

        } catch (error) {
            console.error(`Error fetching article ${idAsNumber}:`, error);
            return res.status(500).json({ error: 'Failed to fetch article details.' });
        }

    } else if (req.method === 'PUT') {
        // --- แก้ไขข้อมูล Article ---
        console.log(`Attempting to update article ID: ${idAsNumber}`);
        try {
            // 1. ดึงข้อมูลจาก Request Body
            const { title, description, categoryId, imageUrls, coverImage } = req.body;

            // 2. Validation (ตัวอย่าง - ควรปรับปรุงให้ครบถ้วน)
            let categoryIdAsNumber: number | undefined = undefined;
            if (categoryId !== undefined) {
                categoryIdAsNumber = parseInt(categoryId, 10);
                if (isNaN(categoryIdAsNumber)) {
                    return res.status(400).json({ error: 'Category ID must be a valid number.' });
                }
                // เช็คว่า Category ID นี้มีอยู่จริง
                const categoryExists = await prisma.category.findUnique({ where: { id: categoryIdAsNumber } });
                if (!categoryExists) {
                    return res.status(400).json({ error: `Category with ID ${categoryIdAsNumber} not found.` });
                }
            }
            if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
                return res.status(400).json({ error: 'Article title cannot be empty.' });
            }
             if (description !== undefined && (typeof description !== 'string' || description.trim() === '')) {
                 return res.status(400).json({ error: 'Article description cannot be empty.' });
             }
            if (imageUrls !== undefined && !Array.isArray(imageUrls)) {
                 return res.status(400).json({ error: 'imageUrls must be an array.' });
             }
             if (coverImage !== undefined && typeof coverImage !== 'string' && coverImage !== null) {
                 return res.status(400).json({ error: 'Cover image must be a valid URL string or null.' });
             }
            // --- End Validation ---


            // 3. สร้าง Object updateData (ส่วนที่แก้ไข)
            const updateData: Prisma.ArticleUpdateInput = {};
            if (title !== undefined) updateData.title = title.trim();
            if (description !== undefined) updateData.description = description; // ควร Sanitize ถ้าเป็น HTML
            if (coverImage !== undefined) updateData.coverImage = coverImage; // รับ null ได้ ถ้าต้องการลบปก
            // --- แก้ไขส่วน Category ---
            if (categoryIdAsNumber !== undefined) {
                updateData.category = { // ใช้ชื่อ relation 'category'
                    connect: {
                        id: categoryIdAsNumber // สั่งให้เชื่อมกับ ID ใหม่
                    }
                };
            }
            // --- จบส่วน Category ---

            // --- ไม่ต้องใส่ images ใน updateData หลัก เราจะจัดการใน transaction ---


            // 4. ใช้ Transaction อัปเดต Article หลัก และจัดการ Images
            console.log(`Data prepared for main update (excluding image sync):`, updateData);
            const updatedArticle = await prisma.$transaction(async (tx) => {

                // 4.1 อัปเดตข้อมูลหลักก่อน (ถ้ามีข้อมูลให้อัปเดต)
                let articleBeingUpdated: Article; // ประกาศ Type
                if (Object.keys(updateData).length > 0) {
                     console.log(`Updating main article fields for ID: ${idAsNumber}`);
                     articleBeingUpdated = await tx.article.update({
                         where: { id: idAsNumber },
                         data: updateData,
                     });
                 } else {
                     // ถ้าไม่มี field อื่นๆ นอกจาก images ให้ดึงข้อมูลปัจจุบันมาใช้
                     console.log(`No main fields to update, fetching current article data for ID: ${idAsNumber}`);
                     const currentArticle = await tx.article.findUniqueOrThrow({ where: { id: idAsNumber } });
                     articleBeingUpdated = currentArticle; // ใช้ข้อมูลปัจจุบัน
                 }


                 // 4.2 จัดการ ArticleImage (ถ้ามีการส่ง imageUrls มา)
                 // (ใช้วิธี ลบของเก่า แล้วสร้างใหม่ ตาม imageUrls ที่ส่งมา)
                 if (imageUrls !== undefined) {
                      console.log(`Syncing images. Deleting old images for article ${idAsNumber}...`);
                      await tx.articleImage.deleteMany({
                          where: { articleId: idAsNumber }
                      });

                      if (imageUrls.length > 0) {
                          console.log(`Creating ${imageUrls.length} new images for article ${idAsNumber}...`);
                          await tx.articleImage.createMany({
                              data: imageUrls.map((url: string, index: number) => ({
                                  url: url,
                                  order: index + 1,
                                  articleId: idAsNumber,
                              })),
                          });
                      }
                      console.log(`Finished syncing images.`);
                 }

                 // 4.3 ดึงข้อมูล Article ล่าสุดทั้งหมด (รวม images ที่เพิ่งสร้าง) เพื่อส่งกลับ
                 console.log(`Workspaceing final updated article data for ID: ${idAsNumber}`);
                 const finalUpdatedArticle = await tx.article.findUniqueOrThrow({
                     where: { id: idAsNumber },
                      include: { images: { orderBy: { order: 'asc' } }, category: true }
                 });
                 return finalUpdatedArticle;
            });

            console.log(`Article ${idAsNumber} updated successfully.`);
            return res.status(200).json(updatedArticle); // ส่งข้อมูลล่าสุดกลับ

        } catch (error: any) {
            console.error(`Error updating article ${idAsNumber}:`, error);
            if (error.code === 'P2025') { // Record not found (อาจเกิดตอน update หรือ findUniqueOrThrow)
                return res.status(404).json({ error: 'Article not found.' });
            }
            return res.status(500).json({ error: 'Failed to update article.' });
        }

    } else if (req.method === 'DELETE') {
        // --- ลบ Article ---
         console.log(`Attempting to delete article ID: ${idAsNumber}`);
        try {
            // 1. ค้นหา Article และ Images เพื่อเอา URL มาลบไฟล์
             const articleToDelete = await prisma.article.findUnique({
                 where: { id: idAsNumber },
                 include: { images: true } // ดึง images มาด้วย
             });

             if (!articleToDelete) {
                 return res.status(404).json({ error: 'Article not found.' });
             }

            // 2. ลบไฟล์ Images ใน Azure
            console.log(`Deleting ${articleToDelete.images.length} associated blobs...`);
            const allowedContainers = [CONTAINER_NAME_ARTICLE_IMAGES, CONTAINER_NAME_IMAGES]; // รวม Container รูปปกด้วย (ถ้าใช้คนละอัน)
             const deleteBlobPromises = articleToDelete.images
                .map(img => deleteBlobIfExists(CONTAINER_NAME_ARTICLE_IMAGES, getBlobNameFromUrl(img.url, allowedContainers)));
             // ลบ Cover Image ด้วย (ถ้ามี และอาจจะอยู่ใน Container อื่น)
             if (articleToDelete.coverImage) {
                 deleteBlobPromises.push(deleteBlobIfExists(CONTAINER_NAME_IMAGES, getBlobNameFromUrl(articleToDelete.coverImage, allowedContainers)));
             }
             await Promise.all(deleteBlobPromises);
             console.log(`Finished attempting blob deletions for article ${idAsNumber}.`);


            // 3. ลบข้อมูลใน Database (ใช้ Transaction เพราะต้องลบ ArticleImage ก่อน)
             // Prisma จะลบ ArticleImage ให้เองถ้า Schema มี onDelete: Cascade
             // แต่ถ้าไม่มี ต้องลบเองใน Transaction
             console.log(`Deleting article ${idAsNumber} from database...`);
            // ไม่จำเป็นต้องใช้ $transaction ถ้ามี onDelete: Cascade ที่ ArticleImage -> Article
            await prisma.article.delete({
                where: { id: idAsNumber },
            });
             console.log(`Article ${idAsNumber} deleted successfully from DB.`);

            return res.status(204).end(); // สำเร็จ

        } catch (error: any) {
            console.error(`Error deleting article ${idAsNumber}:`, error);
             if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Article not found.' });
             }
             // Handle other potential errors (like foreign key if cascade not set)
            return res.status(500).json({ error: 'Failed to delete article.' });
        }

    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}