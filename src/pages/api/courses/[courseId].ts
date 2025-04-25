// pages/api/courses/[courseId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace for Transaction
import { BlobServiceClient } from '@azure/storage-blob'; // Import Azure SDK

const prisma = new PrismaClient();

// --- Environment Variables (ควรมี Connection String และ Container Names) ---
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME_IMAGES = process.env.AZURE_STORAGE_CONTAINER_NAME || 'courseimages'; // ชื่อ Container รูป Course
const CONTAINER_NAME_DOCS = process.env.AZURE_STORAGE_CONTAINER_NAME_DOCS || 'coursedocuments'; // ชื่อ Container เอกสาร
const CONTAINER_NAME_VIDEOS = process.env.AZURE_STORAGE_CONTAINER_NAME_VIDEOS || 'coursevideos'; // ชื่อ Container วิดีโอ

if (!AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('Azure Storage Connection String is not configured.');
}
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

// --- Helper Function to delete blob (ปรับปรุงให้รับ container name) ---
async function deleteBlobIfExists(containerName: string, blobName: string | null) {
    if (!blobName) return; // ถ้าไม่มีชื่อ blob ก็ไม่ต้องทำอะไร
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        console.log(`Attempting to delete blob: ${containerName}/${blobName}`);
        await blockBlobClient.deleteIfExists();
        console.log(`Successfully deleted blob: ${containerName}/${blobName}`);
    } catch (error) {
        console.error(`Error deleting blob ${containerName}/${blobName} from Azure:`, error);
        // ไม่ throw error ออกไป ให้ดำเนินการลบข้อมูลใน DB ต่อ
    }
}

// Function to get Blob Name from URL (ปรับปรุงให้รับหลาย container)
function getBlobNameFromUrl(url: string | null | undefined, allowedContainerNames: string[]): string | null {
    if (!url) return null;
    try {
        const urlParts = new URL(url);
        const pathSegments = urlParts.pathname.split('/');
        // pathSegments[0] is empty, pathSegments[1] is container name
        if (pathSegments.length > 2 && allowedContainerNames.includes(pathSegments[1])) {
            return pathSegments.slice(2).join('/'); // Get path after container name
        }
        return null;
    } catch (e) {
        console.error("Error parsing blob URL:", e);
        return null;
    }
}


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { courseId } = req.query;

    // --- Validation for courseId ---
    if (typeof courseId !== 'string' || isNaN(parseInt(courseId, 10))) {
        return res.status(400).json({ error: 'Invalid Course ID format.' });
    }
    const idAsNumber = parseInt(courseId, 10);
    // --- End Validation ---

    // --- !!! เพิ่มการตรวจสอบสิทธิ์ของผู้ใช้ ว่าเป็น Admin หรือไม่ !!! ---


    if (req.method === 'GET') {
        // ... (โค้ด GET เหมือนเดิม) ...
         try {
            const course = await prisma.course.findUnique({ where: { id: idAsNumber } });
            if (!course) return res.status(404).json({ error: 'Course not found' });
            return res.status(200).json(course);
        } catch (error) { /* ... */ }

    } else if (req.method === 'PUT') {
        // ... (โค้ด PUT เหมือนเดิม) ...
        try {
             const { /* data */ } = req.body;
             const updateData: any = { /* ... */};
             const updatedCourse = await prisma.course.update({ where: { id: idAsNumber }, data: updateData });
             return res.status(200).json(updatedCourse);
        } catch (error: any) { /* ... */ }

    } else if (req.method === 'DELETE') {
        // --- ลบ Course ---
        console.log(`Attempting to delete course with ID: ${idAsNumber}`);

        try {
            // 1. ตรวจสอบข้อมูลที่เกี่ยวข้องที่ *ไม่ควร* ลบ (Blocking Relationships)
            const relatedEnrollments = await prisma.enrollment.findFirst({ where: { courseId: idAsNumber } });
            const relatedOrders = await prisma.order.findFirst({ where: { courseId: idAsNumber } });
            // เพิ่มการตรวจสอบอื่นๆ ที่ไม่ต้องการให้ลบได้ตามต้องการ

            if (relatedEnrollments) {
                console.warn(`Cannot delete course ${idAsNumber}: Found related enrollments.`);
                return res.status(409).json({ error: 'Cannot delete course because it has active enrollments.' }); // 409 Conflict
            }
            if (relatedOrders) {
                 console.warn(`Cannot delete course ${idAsNumber}: Found related orders.`);
                return res.status(409).json({ error: 'Cannot delete course because it has related orders.' }); // 409 Conflict
            }

            // 2. ค้นหาข้อมูล Course และข้อมูลลูกทั้งหมดที่จะลบ (เพื่อเอา URL ไปลบไฟล์)
            const courseToDelete = await prisma.course.findUnique({
                where: { id: idAsNumber },
                include: {
                    lessons: { include: { videos: true } }, // เอา Video ที่ผูกกับ Lesson
                    documents: true,
                    // ไม่ต้อง include CartItem เพราะจะลบใน transaction
                }
            });

            if (!courseToDelete) {
                return res.status(404).json({ error: 'Course not found.' });
            }

            // 3. เตรียมรายการไฟล์ที่จะลบใน Azure
            const blobsToDelete: { containerName: string, blobName: string | null }[] = [];

            // - รูป Course หลัก
            blobsToDelete.push({
                containerName: CONTAINER_NAME_IMAGES,
                blobName: getBlobNameFromUrl(courseToDelete.courseImg, [CONTAINER_NAME_IMAGES])
            });
            // - เอกสารทั้งหมด
            courseToDelete.documents.forEach(doc => {
                blobsToDelete.push({
                    containerName: CONTAINER_NAME_DOCS,
                    blobName: getBlobNameFromUrl(doc.fileUrl, [CONTAINER_NAME_DOCS])
                });
            });
            // - วิดีโอทั้งหมด (ผ่าน Lessons)
            courseToDelete.lessons.forEach(lesson => {
                lesson.videos.forEach(video => {
                    blobsToDelete.push({
                        containerName: CONTAINER_NAME_VIDEOS,
                        blobName: getBlobNameFromUrl(video.url, [CONTAINER_NAME_VIDEOS])
                    });
                });
            });

            // 4. ลบไฟล์ใน Azure (ทำก่อนลบ DB เผื่อกรณี DB ลบสำเร็จแต่ไฟล์ยังอยู่)
            console.log("Deleting associated blobs from Azure...");
            const deletePromises = blobsToDelete
                .filter(b => b.blobName !== null) // กรองเอาเฉพาะที่มี blobName จริงๆ
                .map(b => deleteBlobIfExists(b.containerName, b.blobName));
            await Promise.all(deletePromises); // รอให้การลบไฟล์ (ที่ทำได้) เสร็จสิ้น
            console.log("Finished attempting blob deletions.");


            // 5. ลบข้อมูลใน Database (ใช้ Transaction)
             console.log("Deleting database records via transaction...");
            await prisma.$transaction(async (tx) => {
                // - ลบ CartItems ที่อ้างถึง Course นี้ก่อน (ถ้ามี)
                await tx.cartItem.deleteMany({ where: { courseId: idAsNumber } });

                // - ลบ Videos ที่ผูกกับ Lessons ของ Course นี้
                const lessonIds = courseToDelete.lessons.map(l => l.id);
                if (lessonIds.length > 0) {
                    await tx.video.deleteMany({ where: { lessonId: { in: lessonIds } } });
                }

                // - ลบ Documents ที่ผูกกับ Course นี้
                await tx.document.deleteMany({ where: { courseId: idAsNumber } });

                // - ลบ Lessons ที่ผูกกับ Course นี้
                await tx.lesson.deleteMany({ where: { courseId: idAsNumber } });

                // - สุดท้าย ลบ Course เอง
                await tx.course.delete({ where: { id: idAsNumber } });
            });
             console.log(`Successfully deleted course ${idAsNumber} and associated data from DB.`);

            return res.status(204).end(); // สำเร็จ

        } catch (error: any) {
            console.error(`Error deleting course ${idAsNumber}:`, error);
            if (error.code === 'P2025') { // Record to delete not found by Prisma (อาจเกิดตอน $transaction)
               return res.status(404).json({ error: 'Course not found during deletion process.' });
            }
            return res.status(500).json({ error: 'Failed to delete course.' });
        }

    } else {
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}