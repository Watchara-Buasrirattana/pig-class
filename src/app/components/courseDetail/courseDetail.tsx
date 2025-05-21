"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation"; // Import useParams สำหรับ App Router client component
import Image from "next/image";

import Link from "next/link"; // Import Link สำหรับบทเรียน
import styles from "./courseDetail.module.css"; // <-- ตรวจสอบ Path CSS Module

// --- Import Icons (ตรวจสอบ Path ให้ถูกต้อง) ---
import defaultCourseImage from "../../img/courseimg.png"; // รูป Default
import TimeIcon from "../../img/Time.png";
import WatchIcon from "../../img/Watch.png";
import LimitIcon from "../../img/Limit.png";
import PigIcon from "../../img/Pig.png"; // ตัวอย่าง Icon อื่นๆ ถ้าจะใช้จาก DB

// --- Types (ควร Import หรือกำหนดไว้ที่ส่วนกลางให้ตรงกับ API Response) ---
type LessonInfo = {
  id: number;
  title: string;
  lessonNumber: number;
};

type CourseDetailData = {
  id: number;
  courseNumber: string;
  courseName: string;
  description: string;
  category: string | null;
  teacher: string | null;
  level: string | null;
  price: number;
  courseImg: string | null;
  lessons: LessonInfo[]; // <-- ต้องมี Array ของ Lessons จาก API
  // --- Fields เพิ่มเติมที่อาจจะต้องดึงจาก DB ---
  // learningTimeEstimate?: string; // เช่น "20 hr."
  // courseDuration?: string; // เช่น "6 เดือน"
  // courseAccessPeriod?: string; // เช่น "1 ปี"
  // targetAudience?: string[]; // เช่น ["นักเรียน ม.1", "ผู้เตรียมสอบ"]
  // courseBenefits?: string[]; // เช่น ["เอกสาร PDF", "คลิปย้อนหลัง"]
};

// --- Component หลัก ---
export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams(); // Hook สำหรับดึง Route Params ใน App Router Client Component
  const courseId = params?.courseId as string | undefined; // ดึง courseId ออกมา

  const [courseData, setCourseData] = useState<CourseDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  // --- Fetch Course Data by ID ---
  useEffect(() => {
    if (courseId) {
      // ตรวจสอบว่ามี courseId ก่อน Fetch
      setIsLoading(true);
      setError(null);
      console.log(`Workspaceing course details for ID: ${courseId}`);
      fetch(`/api/courses/${courseId}`) // เรียก API GET /api/courses/[id]
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                `Failed to fetch course (status: ${res.status})`
            );
          }
          return res.json();
        })
        .then((data: CourseDetailData) => {
          console.log("Course data received:", data);
          setCourseData(data);
        })
        .catch((err) => {
          console.error("Fetch Course Detail Error:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // กรณีไม่มี courseId (ไม่ควรเกิดถ้า Route ถูกต้อง)
      setError("Invalid Course ID.");
      setIsLoading(false);
    }
  }, [courseId]); // ทำงานใหม่เมื่อ courseId เปลี่ยน

  // --- Placeholder Handlers ---
  const handleAddToCart = async () => {
    // ไม่ต้องรับ courseId เป็น parameter แล้ว
    if (!courseData) {
      // ตรวจสอบว่า courseData มีค่าหรือไม่
      alert("ไม่สามารถเพิ่มลงตะกร้าได้: ข้อมูลคอร์สไม่พร้อมใช้งาน");
      return;
    }

    setIsAddingToCart(true);
    try {
      console.log(`Adding course ${courseData.id} to cart...`); // << ใช้ courseData.id
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseData.id, // << ใช้ courseData.id
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || `Failed to add to cart (status: ${res.status})`
        );
      }

      console.log("Add to cart response:", data);
      alert(`เพิ่ม "${courseData.courseName}" ลงตะกร้าสำเร็จ!`); // << ใช้ courseData.courseName
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert(
        `เกิดข้อผิดพลาดในการเพิ่มลงตะกร้า: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!courseData) return;
    alert(`(ยังไม่ได้ Implement) สั่งซื้อ "${courseData.courseName}"`);
    // เพิ่ม Logic เรียก API สร้าง Checkout Session
  };

  // --- Render Loading State ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading course details...
      </div>
    );
  }

  // --- Render Error State ---
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-600">
        <p>Error loading course:</p>
        <p>{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ย้อนกลับ
        </button>
      </div>
    );
  }

  // --- Render Not Found State ---
  if (!courseData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-gray-600">
        <p>ไม่พบคอร์สเรียนที่ต้องการ</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ย้อนกลับ
        </button>
      </div>
    );
  }

  // --- Render Course Details ---
  const imageUrl = courseData.courseImg || defaultCourseImage.src;

  return (
    <main className={styles.container}>
      {" "}
      {/* ตรวจสอบ styles.container */}
      <button onClick={() => router.back()} className={styles.backBtn}>
        {" "}
        {/* ทำให้ปุ่ม back ทำงาน */}
        &lt; ย้อนกลับ
      </button>
      <section className={styles.topSection}>
        {/* Course Image */}
        <div className={styles.imageBox}>
          <Image
            src={imageUrl}
            alt={courseData.courseName || "Course image"}
            fill
            sizes="(max-width: 768px) 100vw, 50vw" // Adjust sizes as needed
            className={styles.coverImage} // ตรวจสอบ style นี้
            style={{ objectFit: "contain" }} // อาจจะใช้ contain หรือ cover
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultCourseImage.src;
            }}
          />
        </div>

        {/* Course Info */}
        <div className={styles.courseInfo}>
          <h1 className={styles.title}>{courseData.courseName}</h1>
          <p className={styles.code}>{courseData.courseNumber}</p>
          {/* --- Stats Section (ยังใช้ข้อมูล Hardcode/รอปรับ) --- */}
          <div className={styles.stats}>
            {/* ตัวอย่าง ถ้าจะดึงจาก DB อาจจะต้องแก้ Model/API */}
            <div /* key={'learningTime'} */>
              <Image
                src={TimeIcon.src}
                alt="เวลาเรียน"
                height={40}
                width={40}
              />
              <p className={styles.statLabel}>เวลาเรียนรวม</p>
              <p className={styles.statValue}>
                {/* courseData.learningTimeEstimate || */ "8 ชม."}{" "}
              </p>
            </div>
            <div /* key={'accessPeriod'} */>
              <Image
                src={LimitIcon.src}
                alt="อายุคอร์ส"
                height={40}
                width={40}
              />
              <p className={styles.statLabel}>อายุคอร์ส</p>
              <p className={styles.statValue}>
                {/* courseData.courseAccessPeriod || */ "6 เดือน"}
              </p>
            </div>
            {/* เพิ่ม Stat อื่นๆ ถ้ามีข้อมูลใน DB */}
          </div>
          {/* --- จบ Stats Section --- */}
          <p className={styles.price}>
            ฿{courseData.price.toLocaleString()}
          </p>{" "}
          {/* แสดงราคาจาก DB */}
          <div className={styles.actions}>
            <button
              onClick={handleAddToCart}
              className={styles.cart}
              disabled={isAddingToCart || !courseData}
            >
              {" "}
              {/* ไม่ต้องส่ง course.id เข้าไป และอาจจะ disable ปุ่มถ้า courseData ไม่มี */}
              {isAddingToCart ? "กำลังเพิ่ม..." : "เพิ่มลงรถเข็น"}
            </button>
          </div>
        </div>
      </section>
      <div className={styles.separator}></div>
      {/* --- รายละเอียด (ควรดึงจาก courseData.description) --- */}
      <section className={styles.detailsSection}>
        <h3>รายละเอียด</h3>
        {/* ใช้ description จาก DB (อาจจะต้อง Render HTML ถ้าเก็บเป็น HTML) */}
        <div
          className={styles.descriptionContent}
          dangerouslySetInnerHTML={{ __html: courseData.description || "" }}
        ></div>
        {/* หรือถ้าเป็น Text ธรรมดา */}
        {/* <p>{courseData.description || '-'}</p> */}
        <div className={styles.separator}></div>
      </section>
      {/* --- ส่วน เหมาะสำหรับ / สิ่งที่ได้รับ (ยัง Hardcode - รอปรับ) --- */}
      <section className={styles.detailsSection}>
        <h3>เหมาะสำหรับ</h3>
        {/* ควรดึงข้อมูลจาก DB Field เช่น courseData.targetAudience */}
        <ul>
          <li>น้องที่เตรียมสอบความพร้อมก่อนเปิดเทอม</li>
        </ul>
        <div className={styles.separator}></div>
      </section>
      <section className={styles.detailsSection}>
        <h3>สิ่งที่ได้รับ</h3>
        {/* ควรดึงข้อมูลจาก DB Field เช่น courseData.courseBenefits */}
        <ul>
          <li>ไฟล์เอกสารประกอบการเรียน</li>
          <li>ไฟล์เฉลยละเอียด</li>
          <li>ไลฟ์ VIP</li>
          <li>คลิปย้อนหลัง</li>
        </ul>
        <div className={styles.separator}></div>
      </section>
      {/* --- จบส่วน Hardcode --- */}
      {/* --- ตารางบทเรียน (ดึงจาก courseData.lessons) --- */}
      <section className={styles.lessonSection}>
        <h3 className={styles.lessonHeader}>
          บทเรียน ({courseData.lessons?.length || 0} บท)
        </h3>
        <div className={styles.lessonTable}>
          {courseData.lessons && courseData.lessons.length > 0 ? (
            courseData.lessons
              .sort((a, b) => a.lessonNumber - b.lessonNumber) // เรียงตาม lessonNumber
              .map((lesson) => (
                // ใช้ Link ของ Next.js
                <div key={lesson.id} className={styles.lessonButton}>
                  {lesson.lessonNumber}. {lesson.title}
                </div>
              ))
          ) : (
            <p className="text-gray-500 italic">
              ยังไม่มีบทเรียนสำหรับคอร์สนี้
            </p>
          )}
        </div>
      </section>
      {/* --- Section พิเศษ (เหมือนเดิม) --- */}
      <section className={styles.specialSection}>
        <h3>เรียนกับ PIG CLASS ได้อะไรบ้าง</h3>
        <div className={styles.specialImageWrapper}>
          <Image
            src={PigIcon.src}
            alt="เรียนกับ PIG CLASS ได้อะไรบ้าง"
            width={800}
            height={200}
          />
        </div>
      </section>
    </main>
  );
}
