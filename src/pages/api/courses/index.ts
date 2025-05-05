// pages/api/courses/index.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from "../../../lib/prisma"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const courses = await prisma.course.findMany()
    res.status(200).json(courses)
  } else if (req.method === 'POST') {
    const { courseNumber, courseName, description, price, courseImg, category ,teacher,level } = req.body
    const course = await prisma.course.create({
      data: { courseNumber, courseName, description, price: parseFloat(price), courseImg,category ,teacher,level },
    })
    res.status(201).json(course)
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}