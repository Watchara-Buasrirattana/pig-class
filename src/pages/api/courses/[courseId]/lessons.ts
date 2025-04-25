import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client'; // หรือ import จาก path ที่ถูกต้อง

const prisma = new PrismaClient(); // หรือ import prisma instance ที่สร้างไว้แล้ว

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { courseId } = req.query; // ดึง courseId จาก URL path

  // ตรวจสอบว่า courseId เป็น string และแปลงเป็นตัวเลข
  if (typeof courseId !== 'string') {
    return res.status(400).json({ error: 'Invalid course ID format.' });
  }
  const idAsNumber = parseInt(courseId, 10);
  if (isNaN(idAsNumber)) {
    return res.status(400).json({ error: 'Course ID must be a number.' });
  }

  // --- จัดการ Method ต่างๆ ---
  if (req.method === 'GET') {
    // --- ดึงข้อมูลบทเรียนทั้งหมดของคอร์สนี้ (เหมือนเดิม) ---
    try {
      const lessons = await prisma.lesson.findMany({
        where: {
          courseId: idAsNumber,
        },
        orderBy: {
          lessonNumber: 'asc', // เรียงตามลำดับบทเรียน
        },
      });
      return res.status(200).json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      return res.status(500).json({ error: 'Failed to fetch lessons' });
    }

  } else if (req.method === 'POST') {
    // --- เพิ่มบทเรียนใหม่ (เหมือนเดิม) ---
    try {
      const { title, lessonNumber } = req.body;

      // --- Basic Validation ---
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Lesson title is required.' });
      }
      const number = parseInt(lessonNumber, 10);
      if (isNaN(number) || number <= 0) {
        return res.status(400).json({ error: 'Lesson number must be a positive integer.' });
      }
      // Optional: Check if lessonNumber already exists for this courseId

      // สร้าง Lesson ใหม่ใน Database
      const newLesson = await prisma.lesson.create({
        data: {
          title: title.trim(),
          lessonNumber: number,
          courseId: idAsNumber,
        },
      });
      return res.status(201).json(newLesson);

    } catch (error) {
      console.error("Error creating lesson:", error);
      return res.status(500).json({ error: 'Failed to create lesson' });
    }

  } else if (req.method === 'PUT') {
    // --- แก้ไขบทเรียน ---
    try {
      const { lessonId, title, lessonNumber } = req.body; // รับ lessonId จาก body

      // --- Validation for lessonId ---
      const lessonIdAsNumber = parseInt(lessonId, 10);
      if (isNaN(lessonIdAsNumber)) {
         return res.status(400).json({ error: 'Lesson ID for update must be a valid number.' });
      }
      // --- End Validation for lessonId ---

      // --- Validation for updated data ---
      let updateData: { title?: string; lessonNumber?: number } = {};
      if (title !== undefined) {
          if (typeof title !== 'string' || title.trim() === '') {
             return res.status(400).json({ error: 'Lesson title cannot be empty.' });
          }
          updateData.title = title.trim();
      }
      if (lessonNumber !== undefined) {
           const number = parseInt(lessonNumber, 10);
           if (isNaN(number) || number <= 0) {
               return res.status(400).json({ error: 'Lesson number must be a positive integer.' });
           }
           updateData.lessonNumber = number;
      }
      if (Object.keys(updateData).length === 0) {
           return res.status(400).json({ error: 'No valid fields provided for update.' });
      }
      // --- End Validation for updated data ---

      // อัปเดตข้อมูลใน Database
      const updatedLesson = await prisma.lesson.update({
        where: {
             // ใช้ lessonId ที่ส่งมาใน body เพื่อระบุว่าจะอัปเดตตัวไหน
             // อาจเพิ่มเงื่อนไข courseId ด้วยเพื่อความปลอดภัยก็ได้ (optional)
             // where: { id: lessonIdAsNumber, courseId: idAsNumber },
             id: lessonIdAsNumber
            },
        data: updateData, // ใส่ข้อมูลใหม่เฉพาะ field ที่ต้องการแก้
      });
      return res.status(200).json(updatedLesson); // ส่งข้อมูลที่อัปเดตแล้วกลับไป

    } catch (error: any) {
      console.error("Error updating lesson:", error);
      if (error.code === 'P2025') { // Prisma error code for 'Record to update not found'
         return res.status(404).json({ error: 'Lesson not found or does not belong to this course.' });
      }
      return res.status(500).json({ error: 'Failed to update lesson' });
    }

  } else if (req.method === 'DELETE') {
    // --- ลบบทเรียน ---
    // รับ lessonId จาก query parameter (เช่น ?lessonId=5)
    const { lessonId } = req.query;

    // --- Validation for lessonId ---
    if (typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'Lesson ID must be provided as a query parameter for deletion.' });
    }
    const lessonIdAsNumber = parseInt(lessonId, 10);
    if (isNaN(lessonIdAsNumber)) {
        return res.status(400).json({ error: 'Lesson ID must be a number.' });
    }
    // --- End Validation for lessonId ---

    try {
      // ลบข้อมูลออกจาก Database
      await prisma.lesson.delete({
        where: {
            // ใช้ lessonId ที่ส่งมาใน query parameter เพื่อระบุว่าจะลบตัวไหน
            // อาจเพิ่มเงื่อนไข courseId ด้วยเพื่อความปลอดภัย (optional)
            // where: { id: lessonIdAsNumber, courseId: idAsNumber },
            id: lessonIdAsNumber
            },
      });
      return res.status(204).end(); // สำเร็จ: ส่ง status 204 No Content

    } catch (error: any) {
      console.error("Error deleting lesson:", error);
       if (error.code === 'P2025') { // Prisma error code for 'Record to delete not found'
         return res.status(404).json({ error: 'Lesson not found or does not belong to this course.' });
      }
      return res.status(500).json({ error: 'Failed to delete lesson' });
    }

  } else {
    // Method อื่นๆ ที่ไม่รองรับ
    // อัปเดต Allow header ให้รวม PUT และ DELETE ด้วย
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}