// pages/api/lessons/[lessonId]/generate-upload-url.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

// --- ค่าคงที่และ Environment Variables ---
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME_VIDEOS || 'coursevideos'; // <<-- ใช้ container สำหรับวิดีโอโดยเฉพาะ หรือชื่ออื่น
const ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME; // ต้องมี Account Name ด้วยสำหรับ SAS credential

// --- ตรวจสอบ Environment Variables ---
if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Azure Storage Connection String is not configured.');
}
if (!ACCOUNT_NAME) {
    // สามารถดึง account name จาก connection string ได้ ถ้าจำเป็น
    const match = AZURE_STORAGE_CONNECTION_STRING.match(/AccountName=([^;]+)/);
    if (!match) throw new Error('Cannot extract Account Name from Connection String. Please set AZURE_STORAGE_ACCOUNT_NAME env var.');
    // accountName = match[1]; // ถ้าจะดึงจาก connection string
     throw new Error('Azure Storage Account Name is not configured in AZURE_STORAGE_ACCOUNT_NAME env var.');
}
 // ดึง Account Key จาก Connection String (จำเป็นสำหรับ StorageSharedKeyCredential)
const keyMatch = AZURE_STORAGE_CONNECTION_STRING.match(/AccountKey=([^;]+)/);
if (!keyMatch) {
    throw new Error('Cannot extract Account Key from Connection String.');
}
const ACCOUNT_KEY = keyMatch[1];


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { lessonId } = req.query;
  const { filename, contentType } = req.body; // รับชื่อไฟล์และ content type จาก frontend

  // --- Validation ---
  if (typeof lessonId !== 'string' || isNaN(parseInt(lessonId, 10))) {
    return res.status(400).json({ error: 'Invalid Lesson ID.' });
  }
   if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required.' });
  }
  if (!contentType || typeof contentType !== 'string') {
     return res.status(400).json({ error: 'Content type is required.' });
  }
  // --- !!! เพิ่มการตรวจสอบสิทธิ์ของผู้ใช้ ตรงนี้ !!! ---
  // เช่น เช็คว่าผู้ใช้ที่ login อยู่ มีสิทธิ์อัปโหลดวิดีโอสำหรับ lessonId นี้หรือไม่
  // const session = await getServerSession(req, res, authOptions); // ตัวอย่างถ้าใช้ NextAuth.js
  // if (!session || !userHasPermission(session.user, lessonId)) {
  //    return res.status(403).json({ error: 'Forbidden' });
  // }
  // ---

  try {
    // สร้างชื่อไฟล์ที่ไม่ซ้ำกันใน Blob Storage
    const uniqueBlobName = `lessons/<span class="math-inline">\{lessonId\}/videos/</span>{uuidv4()}-${filename}`;

    // สร้าง SAS Token
    const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT_NAME!, ACCOUNT_KEY);
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING!); // ใช้แค่หา URL container
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);
    // สร้าง SAS URL สำหรับ Blob นั้นๆ โดยเฉพาะ
     const sasOptions = {
        containerName: CONTAINER_NAME,
        blobName: uniqueBlobName,
        permissions: BlobSASPermissions.parse("racw"), // Read, Add, Create, Write
        startsOn: new Date(), // เริ่มใช้งานได้ทันที
        expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000), // ให้เวลา 15 นาทีในการอัปโหลด
        contentType: contentType // ระบุ Content Type
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    const baseUrl = blockBlobClient.url;
    const sasUrl = `${baseUrl}?${sasToken}`;
    if (!sasUrl || !baseUrl || !sasToken || !sasUrl.includes('?sv=')) { // เช็คว่ามี ?sv= (ส่วนหนึ่งของ SAS) ไหม
      console.error("DEBUG BE: Failed to generate valid SAS/Base URL components after fix", { baseUrl, sasTokenExists: !!sasToken, sasUrl });
      return res.status(500).json({ error: 'Internal error generating valid SAS URL.' });
 }
    // ส่ง SAS URL และ URL ปกติกลับไปให้ Frontend
    res.status(200).json({
      sasUrl: sasUrl,    // ส่ง sasUrl ที่ถูกต้อง
      blobUrl: baseUrl   // ส่ง baseUrl ที่ถูกต้อง
    });

  } catch (error) {
    console.error('Error generating SAS URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL.' });
  }
}