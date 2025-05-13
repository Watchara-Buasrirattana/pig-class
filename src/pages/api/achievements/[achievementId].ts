// pages/api/achievements/[achievementId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../auth/[...nextauth]"; // ปรับ Path
import { BlobServiceClient } from '@azure/storage-blob';

const prisma = new PrismaClient();
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME_ACHIEVEMENTS = process.env.AZURE_STORAGE_CONTAINER_NAME_ACHIEVEMENTS || 'achievementsimages'; // <<-- ชื่อ Container

const blobServiceClient = AZURE_STORAGE_CONNECTION_STRING
    ? BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
    : null;

async function deleteBlobIfExists(containerName: string, blobName: string | null) {
    if (!blobName || !blobServiceClient) return;
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.deleteIfExists();
        console.log(`Blob ${containerName}/${blobName} deleted.`);
    } catch (error) {
        console.error(`Error deleting blob ${containerName}/${blobName}:`, error);
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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { achievementId } = req.query;
    if (typeof achievementId !== 'string' || isNaN(parseInt(achievementId, 10))) {
        return res.status(400).json({ error: 'Invalid Achievement ID format.' });
    }
    const idAsNumber = parseInt(achievementId, 10);

    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    if (req.method === 'PUT') {
        try {
            const { image: newImageUrl } = req.body; // รับ URL รูปใหม่

            if (newImageUrl === undefined) {
                 return res.status(400).json({ error: 'New image URL is required for update.' });
            }
             if (newImageUrl !== null && (typeof newImageUrl !== 'string' || !newImageUrl.startsWith('https://'))) {
                return res.status(400).json({ error: 'New image URL must be a valid URL or null (to effectively remove image, though schema requires it).' });
            }
             if (newImageUrl === null) { // Schema ไม่อนุญาตให้ image เป็น null
                  return res.status(400).json({ error: 'Image URL cannot be null for an achievement.' });
             }


            const oldAchievement = await prisma.achievement.findUnique({ where: { id: idAsNumber } });
            if (!oldAchievement) {
                return res.status(404).json({ error: 'Achievement not found.' });
            }

            // ลบรูปเก่า ถ้ามีการส่งรูปใหม่มาและรูปเก่าไม่เหมือนรูปใหม่
            if (oldAchievement.image && oldAchievement.image !== newImageUrl) {
                const blobNameToDelete = getBlobNameFromUrl(oldAchievement.image, [CONTAINER_NAME_ACHIEVEMENTS]);
                await deleteBlobIfExists(CONTAINER_NAME_ACHIEVEMENTS, blobNameToDelete);
            }

            const updatedAchievement = await prisma.achievement.update({
                where: { id: idAsNumber },
                data: { image: newImageUrl },
            });
            return res.status(200).json(updatedAchievement);

        } catch (error: any) { /* ... error handling ... */ }

    } else if (req.method === 'DELETE') {
        try {
            const achievementToDelete = await prisma.achievement.findUnique({ where: { id: idAsNumber } });
            if (!achievementToDelete) {
                return res.status(404).json({ error: 'Achievement not found.' });
            }

            // ลบรูปใน Azure ก่อน
            const blobNameToDelete = getBlobNameFromUrl(achievementToDelete.image, [CONTAINER_NAME_ACHIEVEMENTS]);
            await deleteBlobIfExists(CONTAINER_NAME_ACHIEVEMENTS, blobNameToDelete);

            // ลบจาก DB
            await prisma.achievement.delete({ where: { id: idAsNumber } });
            return res.status(204).end();
        } catch (error: any) { /* ... error handling ... */ }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE', 'GET']); // อาจจะเพิ่ม GET ทีหลังถ้าต้องการ
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}