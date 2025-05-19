// src/pages/api/scheduled-sessions/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma"; // ตรวจสอบ path prisma ให้ถูกต้อง
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // ตรวจสอบ path authOptions ให้ถูกต้อง

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (req.method === "GET") {
    try {
      const scheduledSessionsFromDb = await prisma.scheduledSession.findMany({
        include: {
          course: {
            // Include ข้อมูล course ที่เกี่ยวข้องโดยตรง
            select: {
              id: true,
              courseName: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      });

      let userEnrolledCourseIds: Set<number> = new Set();

      if (session?.user?.id) {
        const userIdAsInt = parseInt(session.user.id as string);
        if (!isNaN(userIdAsInt)) {
          const enrollments = await prisma.enrollment.findMany({
            where: {
              userId: userIdAsInt,
            },
            select: {
              courseId: true,
            },
          });
          userEnrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
        }
      }

      const processedSessions = scheduledSessionsFromDb.map((schSession) => {
        // --- การตรวจสอบที่สำคัญ ---
        const courseNameFromPrisma =
          schSession.course?.courseName || "คอร์สไม่ระบุชื่อ"; // ถ้า course หรือ courseName ไม่มี ให้ใช้ค่า default
          
        const sessionTitle = schSession.title || courseNameFromPrisma;

        const isEnrolled = userEnrolledCourseIds.has(schSession.courseId);
        // ในหน้า admin อาจจะไม่จำเป็นต้องเช็ค isEnrolled หรือ isAdmin ถ้า admin เห็นได้หมด
        // แต่ถ้า admin calendar มี logic การแสดงผลต่างกัน ก็คง isEnrolled และ isAdmin ไว้
        const isAdmin = session?.user?.role === "admin";
        const courseDataForApi = schSession.course
          ? {
              id: schSession.course.id,
              courseName: courseNameFromPrisma, // ใช้ courseName ที่ตรวจสอบแล้ว
            }
          : {
              id: schSession.courseId, // fallback to courseId if course object is somehow missing
              courseName: "คอร์สไม่ระบุชื่อ",
            };
        const baseSessionData = {
          id: schSession.id,
          title: sessionTitle,
          description: schSession.description,
          startTime: schSession.startTime.toISOString(),
          endTime: schSession.endTime.toISOString(),
          courseId: schSession.courseId,
          course: courseDataForApi, // ใช้ courseName ที่ตรวจสอบแล้ว
        };

        // สำหรับหน้า Admin Calendar, Admin ควรจะเห็นข้อมูลทั้งหมดเสมอ
        // ไม่จำเป็นต้องจำกัด location หรือ meetingLink
        // ดังนั้นเราจะ return ข้อมูลเต็มสำหรับ Admin เสมอ
        // ส่วน isRestricted อาจจะไม่จำเป็นสำหรับ Admin View
        return {
          ...baseSessionData,
          location: schSession.location,
          
          // meetingLink: schSession.meetingLink, // ถ้ามี field นี้
          isRestricted: !(isEnrolled || isAdmin), // Restricted ถ้าไม่ enrolled และไม่ใช่ admin (ปรับตาม logic admin)
          // หรือสำหรับหน้า admin อาจจะ isRestricted: false เสมอ
        };
      });

      res.status(200).json(processedSessions);
    } catch (error) {
      console.error(
        "API Error (Admin Calendar) - Failed to fetch scheduled sessions:",
        error
      );
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown server error occurred";
      res
        .status(500)
        .json({
          message: "Failed to fetch scheduled sessions",
          error: errorMessage,
        });
    }
  } else if (req.method === "POST") {
    if (!session || session.user?.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required for this action." });
    }
    try {
      const { courseId, title, description, startTime, endTime, location } =
        req.body;

      if (!courseId || !startTime || !endTime) {
        return res
          .status(400)
          .json({
            message: "Missing required fields: courseId, startTime, endTime",
          });
      }
      const courseExists = await prisma.course.findUnique({
        where: { id: parseInt(courseId) },
      });
      if (!courseExists) {
        return res
          .status(404)
          .json({ message: `Course with ID ${courseId} not found.` });
      }
      const newSession = await prisma.scheduledSession.create({
        data: {
          courseId: parseInt(courseId),
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location,
        },
      });
      res.status(201).json(newSession);
    } catch (error) {
      console.error(
        "API Error (Admin Calendar) - Failed to create scheduled session:",
        error
      );
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown server error occurred";
      res
        .status(500)
        .json({
          message: "Failed to create scheduled session",
          error: errorMessage,
        });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
