// pages/api/documents/[documentId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { BlobServiceClient } from '@azure/storage-blob';

const prisma = new PrismaClient();
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
// *** สำคัญ: ต้องรู้ Container Name ที่ใช้เก็บไฟล์ PDF ***
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME_DOCS || 'coursedocs';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Azure Storage Connection String is not configured.');
}

// Function to get Blob Name from URL (เหมือนเดิม อาจจะต้องปรับ)
function getBlobNameFromUrl(url: string): string | null {
     try {
        const urlParts = new URL(url);
        const pathSegments = urlParts.pathname.split('/');
        if (pathSegments.length > 2 && pathSegments[1] === CONTAINER_NAME) {
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
    const { documentId } = req.query;

    if (typeof documentId !== 'string' || isNaN(parseInt(documentId, 10))) {
        return res.status(400).json({ error: 'Invalid Document ID format.' });
    }
    const documentIdAsNumber = parseInt(documentId, 10);

    // --- !!! เพิ่มการตรวจสอบสิทธิ์ !!! ---

    if (req.method === 'DELETE') {
         // --- ลบเอกสาร ---
        try {
            // 1. ค้นหาข้อมูลเอกสารใน DB
            const docToDelete = await prisma.document.findUnique({
                where: { id: documentIdAsNumber },
            });

            if (!docToDelete) {
                return res.status(404).json({ error: 'Document not found.' });
            }

            // 2. ลบไฟล์ออกจาก Azure Blob Storage
            const blobName = getBlobNameFromUrl(docToDelete.fileUrl);
             if (blobName) {
                try {
                    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING!);
                    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    console.log(`Attempting to delete blob: ${blobName}`);
                    await blockBlobClient.deleteIfExists();
                    console.log(`Successfully deleted blob: ${blobName}`);
                } catch (azureError) {
                     console.error(`Error deleting blob ${blobName} from Azure:`, azureError);
                    // Consider if deletion failure should stop DB deletion
                }
            } else {
                 console.warn(`Could not extract blob name from URL: ${docToDelete.fileUrl}`);
            }

             // 3. ลบข้อมูลออกจาก Database
            await prisma.document.delete({
                where: { id: documentIdAsNumber },
            });

            return res.status(204).end(); // สำเร็จ

        } catch (error: any) {
             console.error("Error deleting document:", error);
             if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Document not found.' });
             }
            return res.status(500).json({ error: 'Failed to delete document.' });
        }

    } else {
        res.setHeader('Allow', ['DELETE']); // สามารถเพิ่ม PUT ทีหลังได้ถ้าต้องการ
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}