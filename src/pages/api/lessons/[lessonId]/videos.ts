// pages/api/lessons/[lessonId]/videos.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { lessonId } = req.query;

  if (typeof lessonId !== 'string' || isNaN(parseInt(lessonId, 10))) {
    return res.status(400).json({ error: 'Invalid Lesson ID format.' });
  }
  const lessonIdAsNumber = parseInt(lessonId, 10);


  if (req.method === 'POST') {
    // บันทึกข้อมูล Video Metadata หลังอัปโหลดเสร็จ
    try {
      const { title, url } = req.body; // รับ title และ url ที่ Frontend ส่งมา

      // --- Validation ---
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Video title is required.' });
      }
      if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
         return res.status(400).json({ error: 'Valid video URL is required.' });
      }
      // --- End Validation ---

      // Optional: Check if Lesson ID exists
      const lessonExists = await prisma.lesson.findUnique({ where: { id: lessonIdAsNumber } });
      if (!lessonExists) {
          return res.status(404).json({ error: 'Lesson not found.' });
      }

      // สร้าง Record Video ใน Database
      const newVideo = await prisma.video.create({
        data: {
          title: title.trim(),
          url: url, // URL จาก Azure Blob Storage
          lessonId: lessonIdAsNumber, // เชื่อมกับ Lesson
        },
      });
      return res.status(201).json(newVideo);

    } catch (error) {
      console.error("Error saving video metadata:", error);
      return res.status(500).json({ error: 'Failed to save video metadata' });
    }

  } else if (req.method === 'GET') {
     // ดึงรายการวิดีโอของบทเรียนนี้
     try {
         const videos = await prisma.video.findMany({
             where: {
                 lessonId: lessonIdAsNumber,
             },
             // orderBy: { createdAt: 'asc' }, // อาจจะเรียงตามวันที่สร้าง หรือ title
         });
         return res.status(200).json(videos);
     } catch (error) {
         console.error("Error fetching videos for lesson:", error);
         return res.status(500).json({ error: 'Failed to fetch videos' });
     }

  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}