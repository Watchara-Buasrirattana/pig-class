// GET = ดึงข้อมูล, PUT = อัปเดตข้อมูล
import { prisma } from "../../lib/prisma"
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userEmail = session.user?.email;

  if (req.method === "GET") {
    const user = await prisma.user.findUnique({
      where: { email: userEmail! },
    });

    return res.status(200).json(user);
  }

  if (req.method === "PUT") {
    const {
      firstName,
      lastName,
      phoneNumber,
      schoolName,
      studyLine,
      gradeLevel,
      parentName,
      parentEmail,
      parentPhone,
    } = req.body;

    const updated = await prisma.user.update({
      where: { email: userEmail! },
      data: {
        firstName,
        lastName,
        phoneNumber,
        schoolName,
        studyLine,
        gradeLevel,
        parentName,
        parentEmail,
        parentPhone,
      },
    });

    return res.status(200).json(updated);
  }

  res.status(405).json({ message: "Method not allowed" });
}
