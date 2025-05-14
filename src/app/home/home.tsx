"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./home.module.css";
import Image, { StaticImageData } from "next/image";
import banner from "../img/banner1.png";
import defaultCourseImage from "../img/recom-course.png";
import teacher from "../img/Teacher.png";
import hallOfFlame from "../img/hallOfFlame.png";
import benefit from "../img/benefit.png";
import line from "../img/line.png";
import facebook from "../img/facebook.png";
import ig from "../img/ig.png";
import tiktok from "../img/tiktok.png";
import youtube from "../img/youtube.png";
import article1 from "../img/article1.png";
import article2 from "../img/article2.png";
import article3 from "../img/article3.png";

type CourseFromAPI = {
  id: number;
  courseNumber: string;
  courseName: string;
  description: string;
  category: string | null;
  teacher: string | null;
  level: string | null;
  price: number;
  courseImg?: string | null;
};

const banners = [
  { id: 1, src: banner, alt: "คอร์สคณิตศาสตร์" },
  { id: 2, src: banner, alt: "อีกคอร์สหนึ่ง" },
  { id: 3, src: banner, alt: "คอร์สพิเศษ" },
];

const socials = [
  {
    name: "Line",
    label: "@pig class",
    icon: line,
    link: "https://line.me/ti/p/~pigclass",
  },
  {
    name: "Facebook",
    label: "pig class",
    icon: facebook,
    link: "https://facebook.com/pigclass",
  },
  {
    name: "Instagram",
    label: "pig class",
    icon: ig,
    link: "https://instagram.com/pigclass",
  },
  {
    name: "TikTok",
    label: "pig class",
    icon: tiktok,
    link: "https://tiktok.com/@pigclass",
  },
  {
    name: "YouTube",
    label: "pig class",
    icon: youtube,
    link: "https://youtube.com/@pigclass",
  },
];

const categories = ["คลังความรู้", "Check List", "โจทย์ข้อสอบ", "อื่น ๆ"];

const articles = {
  คลังความรู้: [
    { title: "คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2", image: article1, link: "#" },
    { title: "คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2", image: article1, link: "#" },
    { title: "คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2", image: article1, link: "#" },
    { title: "คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2", image: article1, link: "#" },
  ],
  "Check List": [
    { title: "Check List จำนวนจริง", image: article3, link: "#" },
    { title: "Check List จำนวนจริง", image: article3, link: "#" },
    { title: "Check List จำนวนจริง", image: article3, link: "#" },
    { title: "Check List จำนวนจริง", image: article3, link: "#" },
  ],
  โจทย์ข้อสอบ: [
    { title: "โจทย์ความรู้ สถิติ", image: article2, link: "#" },
    { title: "โจทย์ความรู้ สถิติ", image: article2, link: "#" },
    { title: "โจทย์ความรู้ สถิติ", image: article2, link: "#" },
    { title: "โจทย์ความรู้ สถิติ", image: article2, link: "#" },
  ],
  "อื่น ๆ": [
    { title: "คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2", image: article1, link: "#" },
    { title: "Check List จำนวนจริง", image: article3, link: "#" },
    { title: "โจทย์ความรู้ สถิติ", image: article2, link: "#" },
    { title: "คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2", image: article1, link: "#" },
  ],
};

// CourseCard Components
function CourseCard({ course }: { course: CourseFromAPI }) {
  const imageUrl = course.courseImg || defaultCourseImage.src;

  return (
    <div className={styles.courseCard}>
      <div className={styles.imageWrapper}>
        <Image
          src={imageUrl}
          alt={course.courseName}
          fill
          style={{ objectFit: "cover" }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // ตัวอย่าง sizes
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultCourseImage.src;
          }}
        />
        {/* ----------------- */}
      </div>
      <p className={styles.price}>{course.price.toLocaleString()} บาท</p>
      <p className={styles.courseTitle}>{course.courseName}</p>
      <p className={styles.code}>รหัส {course.courseNumber}</p>
      <div className={styles.actions}>
        <span className={styles.cart}>🛒</span>
        <button className={styles.detailBtn}>รายละเอียด</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [current, setCurrent] = useState(0);
  const [activeTab, setActiveTab] = useState("คลังความรู้");
  const [fetchedCourses, setFetchedCourses] = useState<CourseFromAPI[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true); // สถานะ Loading
  const [errorCourses, setErrorCourses] = useState<string | null>(null); // สถานะ Error

  const nextSlide = () => setCurrent((prev) => (prev + 1) % banners.length);
  const prevSlide = () =>
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

  const firstCourses = fetchedCourses.slice(0, 4);

  useEffect(() => {
    const fetchCoursesFromApi = async () => {
      setIsLoadingCourses(true);
      setErrorCourses(null);
      try {
        const res = await fetch("/api/courses"); // เรียก API GET
        if (!res.ok) {
          throw new Error(`Failed to fetch courses (status: ${res.status})`);
        }
        const data: CourseFromAPI[] = await res.json();
        setFetchedCourses(data); // เก็บข้อมูลที่ได้ใน State
      } catch (error) {
        console.error("Error fetching courses:", error);
        setErrorCourses(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      } finally {
        setIsLoadingCourses(false); // เสร็จสิ้นการโหลด (ไม่ว่าจะสำเร็จหรือ Error)
      }
    };

    fetchCoursesFromApi();
  }, []);
  return (
    <main>
      {/* Banner */}
      <div className={styles.sliderWrapper}>
        <div className={styles.slider}>
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={index === current ? styles.slideActive : styles.slide}
            >
              {index === current && (
                <Image
                  src={banner.src}
                  alt={banner.alt}
                  width={0}
                  height={0}
                  style={{ width: "100%", height: "100%" }}
                  className={styles.image}
                />
              )}
            </div>
          ))}
        </div>
        <button onClick={prevSlide} className={styles.prev}>
          ❮
        </button>
        <button onClick={nextSlide} className={styles.next}>
          ❯
        </button>
      </div>

      {/* --- Courses --- */}
      <section className={styles.recommendSection}>
        <h2 className={styles.title}>คอร์สเรียนแนะนำ</h2>

        {/* --- แสดงสถานะ Loading หรือ Error --- */}
        {isLoadingCourses && (
          <p className="text-center py-4">Loading courses...</p>
        )}
        {errorCourses && (
          <p className="text-center py-4 text-red-600">
            Error loading courses: {errorCourses}
          </p>
        )}

        {/* --- แสดงคอร์สเมื่อโหลดเสร็จและไม่มี Error --- */}
        {!isLoadingCourses && !errorCourses && (
          <>
            {/* First 4 */}
            <div className={styles.courseList}>
              {/* ใช้ fetchedCourses ที่ได้จาก API */}
              {firstCourses.map((course) => (
                <CourseCard key={course.id} course={course} /> // ส่ง course object ทั้งหมดไปเลย
              ))}
            </div>
            {/* ปุ่ม ดูทั้งหมด (แสดงเมื่อมีคอร์สมากกว่า 4 และยังไม่ได้กดดูทั้งหมด) */}
            {fetchedCourses.length > 4 && (
              <div className="text-center mt-4">
                {" "}
                {/* อาจจะจัดสไตล์ให้เหมือนปุ่ม */}
                <Link href="/course" className={styles.viewAll}>
                  {" "}
                  {/* <<-- ใช้ Link และ href */}
                  ดูคอร์สเรียนทั้งหมด
                </Link>
              </div>
            )}
            {fetchedCourses.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                ยังไม่มีคอร์สเรียนในขณะนี้
              </p>
            )}
          </>
        )}
      </section>

      <section className={styles.doctorPigSection}>
        <div className={styles.imageContainer}>
          <Image
            src={teacher.src}
            alt="ครูหมู"
            fill
            className={styles.imageFull}
          />
        </div>
      </section>

      <section className={styles.hallOfFrameSection}>
        <div className={styles.hallOfFrameHeader}>
          <h2 className={styles.title}></h2>
          <h2 className={styles.title}>ความสำเร็จ</h2>
          <a href="/hallOfFrame" className={styles.viewAll}>
            ดูทั้งหมด
          </a>
        </div>

        <div className={styles.hallOfFrameGrid}>
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className={styles.hallOfFrameCard}>
              <Image
                src={hallOfFlame.src}
                alt={`ความสำเร็จ ${idx + 1}`}
                width={260}
                height={140}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.articleTabSection}>
        <h2 className={styles.title}>บทความ</h2>

        {/* Tabs */}
        <div className={styles.tabList}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.tabItem} ${
                activeTab === cat ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.articleGrid}>
          {articles[activeTab].slice(0, 4).map((article, idx) => (
            <div key={idx} className={styles.articleCard}>
              <a href={article.link} className={styles.articleImageLink}>
                {" "}
                {/* Link หลัก */}
                <Image src={article.image} /* ... */ alt={""} /* ... */ />
                <p className={styles.articleName}>{article.title}</p>
                {/* แก้เป็น p หรือ span */}
                <p className={styles.articleLink}>{activeTab}</p>
              </a>
            </div>
          ))}
        </div>

        <div className={styles.articleButtonWrapper}>
          <a href="/articles" className={styles.viewAllBtn}>
            ดูทั้งหมด
          </a>
        </div>
      </section>

      {/* --- Courses --- */}
      <section className={styles.recommendSection}>
        <h2 className={styles.title}>คอร์สทดลองเรียน</h2>

        {/* --- แสดงสถานะ Loading หรือ Error --- */}
        {isLoadingCourses && (
          <p className="text-center py-4">Loading courses...</p>
        )}
        {errorCourses && (
          <p className="text-center py-4 text-red-600">
            Error loading courses: {errorCourses}
          </p>
        )}

        {/* --- แสดงคอร์สเมื่อโหลดเสร็จและไม่มี Error --- */}
        {!isLoadingCourses && !errorCourses && (
          <>
            {/* First 4 */}
            <div className={styles.courseList}>
              {/* ใช้ fetchedCourses ที่ได้จาก API */}
              {firstCourses.map((course) => (
                <CourseCard key={course.id} course={course} /> // ส่ง course object ทั้งหมดไปเลย
              ))}
            </div>
            {/* ปุ่ม ดูทั้งหมด (แสดงเมื่อมีคอร์สมากกว่า 4 และยังไม่ได้กดดูทั้งหมด) */}
            {fetchedCourses.length > 4 && (
              <div className="text-center mt-4">
                {" "}
                {/* อาจจะจัดสไตล์ให้เหมือนปุ่ม */}
                <Link href="/course" className={styles.viewAll}>
                  {" "}
                  {/* <<-- ใช้ Link และ href */}
                  ดูคอร์สเรียนทั้งหมด
                </Link>
              </div>
            )}
            {fetchedCourses.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                ยังไม่มีคอร์สทดลองเรียนในขณะนี้
              </p>
            )}
          </>
        )}
      </section>

      <section className={styles.doctorPigSection2}>
        <div className={styles.imageContainer2}>
          <Image
            src={benefit.src}
            alt="ครูหมู"
            fill
            className={styles.imageFull}
          />
        </div>
      </section>

      <section className={styles.socialSection}>
        <h2 className={styles.title}>ช่องทางการติดตาม</h2>
        <div className={styles.socialGrid}>
          {socials.map((social, idx) => (
            <a
              key={idx}
              href={social.link}
              className={styles.socialItem}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={social.icon}
                alt={social.name}
                width={60}
                height={60}
                className={styles.socialImage}
              />
              <p className={styles.socialLabel}>{social.label}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
