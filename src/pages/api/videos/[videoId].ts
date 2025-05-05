// pages/api/videos/[videoId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const prisma = new PrismaClient();

// --- ค่าคงที่และ Environment Variables (เหมือนเดิม) ---
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME_VIDEOS || 'coursevideos';

// --- ตรวจสอบ Environment Variables ---
if (!AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('Azure Storage Connection String is not configured.');
}

// Function to get Blob Name from URL (อาจจะต้องปรับตามโครงสร้าง URL ของคุณ)
function getBlobNameFromUrl(url: string): string | null {
    try {
        const urlParts = new URL(url);
        // สมมติ URL เป็น https://<account>.blob.core.windows.net/<container>/<blobName>
        // Pathname จะเป็น /<container>/<blobName>
        const pathSegments = urlParts.pathname.split('/');
        if (pathSegments.length > 2 && pathSegments[1] === CONTAINER_NAME) {
             // เอาตั้งแต่ segment ที่ 3 เป็นต้นไปมารวมกันเป็น blob name
             // เช่น /coursevideos/lessons/1/videos/uuid-filename.mp4 -> lessons/1/videos/uuid-filename.mp4
            return pathSegments.slice(2).join('/');
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
    const { videoId } = req.query;

    // --- Validation for videoId ---
    if (typeof videoId !== 'string' || isNaN(parseInt(videoId, 10))) {
        return res.status(400).json({ error: 'Invalid Video ID format.' });
    }
    const videoIdAsNumber = parseInt(videoId, 10);
    // --- End Validation ---

    // --- !!! เพิ่มการตรวจสอบสิทธิ์ ตรงนี้ !!! ---
    // เช่น เช็คว่าผู้ใช้มีสิทธิ์ลบ/แก้ไข videoId นี้หรือไม่


    if (req.method === 'DELETE') {
        // --- ลบวิดีโอ ---
        try {
            // 1. ค้นหาข้อมูลวิดีโอใน DB เพื่อเอา URL มาลบไฟล์ใน Azure
            const videoToDelete = await prisma.video.findUnique({
                where: { id: videoIdAsNumber },
            });

            if (!videoToDelete) {
                return res.status(404).json({ error: 'Video not found.' });
            }

            // 2. ลบไฟล์ออกจาก Azure Blob Storage
            const blobName = getBlobNameFromUrl(videoToDelete.url);
            if (blobName) {
                try {
                    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING!);
                    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    console.log(`Attempting to delete blob: ${blobName}`);
                    await blockBlobClient.deleteIfExists(); // ลบไฟล์ถ้ามีอยู่
                    console.log(`Successfully deleted blob: ${blobName}`);
                } catch (azureError) {
                    console.error(`Error deleting blob ${blobName} from Azure:`, azureError);
                    // อาจจะเลือกที่จะไม่ Fail ทั้งหมด แต่แค่ Log ไว้ หรือจะ Fail ก็ได้
                    // return res.status(500).json({ error: 'Failed to delete video file from storage.' });
                }
            } else {
                 console.warn(`Could not extract blob name from URL: ${videoToDelete.url}`);
                 // อาจจะ Log ไว้ แต่ยังดำเนินการลบข้อมูลใน DB ต่อไป
            }


            // 3. ลบข้อมูลออกจาก Database
            await prisma.video.delete({
                where: { id: videoIdAsNumber },
            });

            return res.status(204).end(); // สำเร็จ (No Content)

        } catch (error: any) {
            console.error("Error deleting video:", error);
             if (error.code === 'P2025') { // Record to delete not found (เผื่อกรณี race condition)
                return res.status(404).json({ error: 'Video not found.' });
             }
            return res.status(500).json({ error: 'Failed to delete video.' });
        }

    } else if (req.method === 'PUT') {
        // --- แก้ไขชื่อวิดีโอ ---
        try {
            const { title } = req.body; // รับเฉพาะ title ใหม่

            // --- Validation ---
            if (!title || typeof title !== 'string' || title.trim() === '') {
                return res.status(400).json({ error: 'New video title is required.' });
            }
            // --- End Validation ---

            // อัปเดตเฉพาะ title ใน Database
            const updatedVideo = await prisma.video.update({
                where: { id: videoIdAsNumber },
                data: { title: title.trim() },
            });

            return res.status(200).json(updatedVideo); // ส่งข้อมูลที่อัปเดตแล้วกลับไป

        } catch (error: any) {
            console.error("Error updating video title:", error);
            if (error.code === 'P2025') { // Record to update not found
               return res.status(404).json({ error: 'Video not found.' });
            }
            return res.status(500).json({ error: 'Failed to update video title.' });
        }

    } else {
        res.setHeader('Allow', ['DELETE', 'PUT']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}