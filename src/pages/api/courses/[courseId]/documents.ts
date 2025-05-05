// pages/api/courses/[courseId]/documents.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { BlobServiceClient } from '@azure/storage-blob';
import { formidable } from 'formidable'; // ใช้ formidable จัดการ multipart/form-data
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'; // สำหรับอ่านไฟล์ชั่วคราว

const prisma = new PrismaClient();
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME_DOCS || 'coursedocuments'; // <<-- Container สำหรับ PDF

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Azure Storage Connection String is not configured.');
}

// --- สำคัญ: ปิด bodyParser ของ Next.js เพื่อให้ formidable ทำงาน ---
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { courseId } = req.query;

  if (typeof courseId !== 'string' || isNaN(parseInt(courseId, 10))) {
    return res.status(400).json({ error: 'Invalid Course ID format.' });
  }
  const courseIdAsNumber = parseInt(courseId, 10);

  // --- !!! เพิ่มการตรวจสอบสิทธิ์ !!! ---

  if (req.method === 'GET') {
    // --- ดึงรายการเอกสาร ---
    try {
      const documents = await prisma.document.findMany({
        where: { courseId: courseIdAsNumber },
        orderBy: { title: 'asc' }, // หรือ createdAt
      });
      return res.status(200).json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

  } else if (req.method === 'POST') {
    // --- เพิ่มเอกสารใหม่ (อัปโหลดไฟล์ PDF) ---
    try {
      const form = formidable({}); // Initialize formidable
      const [fields, files] = await form.parse(req);

      // --- ดึงข้อมูลจาก Form Data ---
      const titleField = fields.title;
      const fileField = files.file;

      // --- Validation ---
      if (!titleField || typeof titleField[0] !== 'string' || titleField[0].trim() === '') {
         return res.status(400).json({ error: 'Document title is required.' });
      }
      const title = titleField[0].trim();

      if (!fileField || fileField.length === 0 || !fileField[0]) {
         return res.status(400).json({ error: 'PDF file is required.' });
      }
      const file = fileField[0];

      // ตรวจสอบว่าเป็น PDF (Optional but recommended)
       if (file.mimetype !== 'application/pdf') {
           // อย่าลืมลบไฟล์ชั่วคราวที่ formidable สร้างขึ้น
           await fs.promises.unlink(file.filepath);
           return res.status(400).json({ error: 'Invalid file type. Only PDF is allowed.' });
       }
      // --- End Validation ---

      // --- อัปโหลดไป Azure Blob Storage ---
      const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING!);
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
      // สร้าง Container ถ้ายังไม่มี (อาจจะทำครั้งเดียวตอน Setup)
      // await containerClient.createIfNotExists({ access: 'blob' });

      const uniqueBlobName = `courses/<span class="math-inline">\{courseIdAsNumber\}/documents/</span>{uuidv4()}-${file.originalFilename || 'document.pdf'}`;
      const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

      // อ่านไฟล์ชั่วคราวที่ formidable สร้าง แล้วอัปโหลด
      const fileStream = fs.createReadStream(file.filepath);
      await blockBlobClient.uploadStream(fileStream, undefined, undefined, {
         blobHTTPHeaders: { blobContentType: 'application/pdf' } // ระบุ content type เป็น PDF
      });

      // ลบไฟล์ชั่วคราวหลังอัปโหลดเสร็จ
      await fs.promises.unlink(file.filepath);

      const fileUrl = blockBlobClient.url; // URL ของไฟล์ใน Azure
      const fileSize = file.size; // ขนาดไฟล์เป็น Bytes

      // --- บันทึกข้อมูลลง Database ---
      const newDocument = await prisma.document.create({
          data: {
              title: title,
              fileUrl: fileUrl,
              fileSize: fileSize,
              courseId: courseIdAsNumber,
          },
      });

      return res.status(201).json(newDocument);

    } catch (error) {
        console.error("Error uploading document:", error);
         // อาจจะต้องจัดการเรื่องลบไฟล์ชั่วคราวใน catch ด้วยถ้าจำเป็น
        return res.status(500).json({ error: 'Failed to upload document.' });
    }

  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}