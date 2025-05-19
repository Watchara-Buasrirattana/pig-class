// src/pages/api/admin/users/[userId].ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../lib/prisma"; // << ปรับ path ให้ถูกต้อง
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]"; // << ปรับ path ให้ถูกต้อง

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user?.role !== "admin") {
    // ตรวจสอบ role ให้ตรงกับค่าใน DB
    return res
      .status(403)
      .json({ message: "Forbidden: Admin access required." });
  }

  const { userId } = req.query; // userId จะมาจาก path parameter

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "User ID parameter is required." });
  }

  const id = parseInt(userId);
  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid User ID format." });
  }

  if (req.method === "GET") {
    // --- GET /api/admin/users/[userId] (Get single user) ---
    try {
      const user = await prisma.user.findUnique({
        where: { id: id },
        select: {
          // ไม่ส่ง hashedPassword
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          schoolName: true,
          studyLine: true,
          gradeLevel: true,
          role: true,
          profileImg: true,
          parentName: true,
          parentEmail: true,
          parentPhone: true,
          point: true,
          enrollments: {
            // <<< เพิ่มการ include enrollments
            select: {
              courseId: true,
              course: {
                select: {
                  courseName: true,
                },
              },
            },
          },
        },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error(`API GET /admin/users/${id} Error:`, error);
      res
        .status(500)
        .json({
          message: "Failed to fetch user",
          error: (error as Error).message,
        });
    }
  } else if (req.method === "PUT") {
    // --- PUT /api/admin/users/[userId] (Update user) ---
    try {
      const { role, firstName, lastName,courseIdsToEnroll,courseIdsToUnenroll, } =
        req.body;
      const updateData: any = {};
      if (role !== undefined) updateData.role = role;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      // เพิ่ม fields อื่นๆ ที่อนุญาตให้ Admin แก้ไข
        const result = await prisma.$transaction(async (tx) => {
        // 1. Update user's own fields (role, name, etc.)
        let updatedUserPrisma;
        if (Object.keys(updateData).length > 0) {
          updatedUserPrisma = await tx.user.update({
            where: { id: id },
            data: updateData,
          });
        } else {
          // If no direct user fields to update, fetch the user to return later
          updatedUserPrisma = await tx.user.findUnique({ where: { id: id } });
        }

        if (!updatedUserPrisma) {
          throw new Error(`User with ID ${id} not found for update.`);
        }

        // 2. Handle course enrollments
        if (Array.isArray(courseIdsToEnroll) && courseIdsToEnroll.length > 0) {
          const enrollOps = courseIdsToEnroll.map((courseId: number) =>
            tx.enrollment.upsert({ // ใช้ upsert เพื่อป้องกันการสร้าง record ซ้ำ
              where: { userId_courseId: { userId: id, courseId: courseId } },
              update: {}, // ไม่ต้อง update อะไรถ้ามีอยู่แล้ว
              create: { userId: id, courseId: courseId },
            })
          );
          await Promise.all(enrollOps);
        }

        // 3. Handle course unenrollments (ถ้าต้องการ implement)
        if (Array.isArray(courseIdsToUnenroll) && courseIdsToUnenroll.length > 0) {
          await tx.enrollment.deleteMany({
            where: {
              userId: id,
              courseId: { in: courseIdsToUnenroll.map((cid: number) => cid) },
            },
          });
        }
        return updatedUserPrisma; // Return the user object (without enrollments for this specific return)
      });


      // Fetch the complete user data with enrollments to return
      const finalUserData = await prisma.user.findUnique({
          where: {id: result.id},
          select: {
              id: true, email: true, firstName: true, lastName: true, role: true, profileImg: true,
              // Include other fields you want to return
              enrollments: {
                  select: { courseId: true, course: {select: {courseName: true}} }
              }
          }
      });
      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "No fields to update provided." });
      }

      // ป้องกันการอัปเดต email หรือ hashedPassword โดยตรงผ่าน API นี้ถ้าไม่ต้องการ
      if ("email" in updateData || "hashedPassword" in updateData) {
        return res
          .status(400)
          .json({
            message: "Cannot update email or password via this endpoint.",
          });
      }

      const updatedUser = await prisma.user.update({
        where: { id: id },
        data: updateData,
        select: {
          // ส่งข้อมูลที่อัปเดตแล้วกลับไป
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          profileImg: true,
        },
      });
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(`API PUT /admin/users/${id} Error:`, error);
      if ((error as any).code === "P2025") {
        return res
          .status(404)
          .json({ message: `User with ID ${id} not found.` });
      }
      res
        .status(500)
        .json({
          message: "Failed to update user",
          error: (error as Error).message,
        });
    }
  } else if (req.method === "DELETE") {
    // --- DELETE /api/admin/users/[userId] (Delete user) ---
    try {
      // ตรวจสอบว่า Admin ไม่ได้พยายามลบตัวเอง (ถ้า session.user.id เป็น string)
      if (session.user?.id === userId) {
        return res
          .status(400)
          .json({ message: "Admin cannot delete their own account." });
      }

      await prisma.user.delete({
        where: { id: id },
      });
      res.status(204).end(); // No Content, successful delete
    } catch (error) {
      console.error(`API DELETE /admin/users/${id} Error:`, error);
      if ((error as any).code === "P2025") {
        return res
          .status(404)
          .json({ message: `User with ID ${id} not found.` });
      }
      // จัดการ P2003: Foreign key constraint failed (ถ้า user นี้มี relation ที่ป้องกันการลบ)
      if ((error as any).code === "P2003") {
        return res
          .status(409)
          .json({
            message:
              "Cannot delete user due to existing related records (e.g., enrollments, orders). Please remove related data first.",
          });
      }
      res
        .status(500)
        .json({
          message: "Failed to delete user",
          error: (error as Error).message,
        });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
