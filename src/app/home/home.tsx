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

type ArticleImageFromAPI = {
  id?: number; // อาจจะมีหรือไม่มี ID จาก DB
  url: string;
  order?: number | null;
};
type ArticleFromAPI = {
  id: number;
  title: string;
  // description?: string; // หน้า List อาจจะไม่ต้องใช้ Description เต็ม
  coverImage?: string | null; // URL รูปหน้าปก
  images?: ArticleImageFromAPI[]; // Array ของรูปภาพ (ถ้า API ส่งมา)
  publishedAt: string | Date;
  categoryId: number;
  category?: { name: string }; // <<-- Category object ที่ include มา
  // user?: { firstName?: string; lastName?: string }; // ถ้าต้องการแสดงผู้เขียน
};

type AchievementFromAPI = {
    id: number;
    image: string; // URL ของรูปภาพ
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

const categoriesTab = ["คลังความรู้", "Checklist", "โจทย์ข้อสอบ", "อื่นๆ"];

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
  const [allDbArticles, setAllDbArticles] = useState<ArticleFromAPI[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true); // <<< เปลี่ยนชื่อ state
  const [errorArticles, setErrorArticles] = useState<string | null>(null);   // <<< เปลี่ยนชื่อ state
  const [allDbAchievements, setAllDbAchievements] = useState<AchievementFromAPI[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true); // <<< ปรับชื่อ State
  const [errorAchievements, setErrorAchievements] = useState<string | null>(null); 
  const nextSlide = () => setCurrent((prev) => (prev + 1) % banners.length);
  const prevSlide = () =>
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

  const firstCourses = fetchedCourses.slice(0, 4);
  const achievementsToDisplay = allDbAchievements.slice(0, 8);
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


  useEffect(() => {
    const fetchAllArticles = async () => {
      setIsLoadingArticles(true); // <<< ใช้ state ที่ถูกต้อง
      setErrorArticles(null);   // <<< ใช้ state ที่ถูกต้อง
      try {
        const res = await fetch("/api/articles");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch articles (status: ${res.status})`);
        }
        const data: ArticleFromAPI[] = await res.json();
        setAllDbArticles(data);
      } catch (err) {
        console.error("Error fetching articles:", err);
        setErrorArticles(err instanceof Error ? err.message : "An unknown error occurred"); // <<< ใช้ state ที่ถูกต้อง
      } finally {
        setIsLoadingArticles(false); // <<< ใช้ state ที่ถูกต้อง
      }
    };
    fetchAllArticles();
  }, []);

  useEffect(() => {
    const fetchAllAchievements = async () => {
      setIsLoadingAchievements(true); // <<< ใช้ State ที่ถูกต้อง
      setErrorAchievements(null);   // <<< ใช้ State ที่ถูกต้อง
      try {
        const res = await fetch('/api/achievements');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch achievements (status: ${res.status})`);
        }
        const data: AchievementFromAPI[] = await res.json();
        setAllDbAchievements(data);
      } catch (err) {
        console.error("Error fetching achievements:", err);
        setErrorAchievements(err instanceof Error ? err.message : "An unknown error occurred"); // <<< ใช้ State ที่ถูกต้อง
      } finally {
        setIsLoadingAchievements(false); // <<< ใช้ State ที่ถูกต้อง
      }
    };
    fetchAllAchievements();
  }, []);
    const articlesForDisplay = allDbArticles
    .filter((article) => article.category?.name === activeTab)
    .slice(0, 4);


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
          <h2 className={styles.title}></h2> {/* อาจจะมี title อื่นๆ ถ้าต้องการ */}
          <h2 className={styles.title}>ความสำเร็จ</h2>
          <a href="/achievement" className={styles.viewAll}>ดูทั้งหมด</a>
        </div>

        {/* แสดงสถานะ Loading หรือ Error สำหรับ Achievements */}
        {isLoadingAchievements && <p className="text-center py-4">Loading achievements...</p>}
        {errorAchievements && <p className="text-center py-4 text-red-600">Error loading achievements: {errorAchievements}</p>}

        {/* แสดง Grid ของ Achievements เมื่อโหลดเสร็จและไม่มี Error */}
        {!isLoadingAchievements && !errorAchievements && (
          <>
            {achievementsToDisplay.length > 0 ? (
              <div className={styles.hallOfFrameGrid}>
                {achievementsToDisplay.map((achievement, index) => {
                  const imageUrl = achievement.image || hallOfFlame.src;
                  return (
                    <div key={achievement.id} className={`${styles.hallOfFrameCard} ${styles.achievementImageWrapper || ""}`}>
                      <Image
                        src={imageUrl}
                        alt={`ความสำเร็จ ${index + 1}`} // หรือ achievement.title ถ้ามี
                        fill // ใช้ fill เพื่อให้เต็ม .hallOfFrameCard
                        style={{ objectFit: "contain" }} // ให้รูปภาพ cover พื้นที่ card
                        sizes="(max-width: 450px) 50vw, (max-width: 834px) 25vw, 20vw" // ปรับ sizes ตาม layout
                        onError={(e) => { (e.target as HTMLImageElement).src = hallOfFlame.src; }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">ยังไม่มีข้อมูลความสำเร็จในขณะนี้</p>
            )}
             {allDbAchievements.length === 0 && !isLoadingAchievements && !errorAchievements && (
                 <p className="text-center text-gray-500 py-4">
                    ยังไม่มีข้อมูลความสำเร็จในระบบ
                 </p>
            )}
            {/* อาจจะมีปุ่ม "ดูทั้งหมด" อีกอัน ถ้า achievementsToDisplay น้อยกว่า allDbAchievements.length */}
            {allDbAchievements.length > 8 && achievementsToDisplay.length === 8 && (
                 <div className="text-center mt-8"> {/* เพิ่ม mt-8 หรือค่าที่เหมาะสม */}
                    <Link href="/achievement" className={styles.viewAllBtn}>
                        ดูความสำเร็จทั้งหมด
                    </Link>
                 </div>
            )}
          </>
        )}
      </section>

      {/* --- Article Section --- */}
      <section className={styles.articleTabSection}>
        <h2 className={styles.title}>บทความ</h2>
        <div className={styles.tabList}>
          {categoriesTab.map((cat) => ( // <<< ใช้ categoriesTab
            <button
              key={cat}
              className={`${styles.tabItem} ${activeTab === cat ? styles.activeTab : ""}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* --- แสดงสถานะ Loading หรือ Error สำหรับบทความ --- */}
        {isLoadingArticles && <p className="text-center py-4">Loading articles...</p>}
        {errorArticles && <p className="text-center py-4 text-red-500">Error loading articles: {errorArticles}</p>}

        {/* --- แสดงบทความเมื่อโหลดเสร็จและไม่มี Error --- */}
        {!isLoadingArticles && !errorArticles && (
          <>
            {articlesForDisplay.length > 0 ? (
              <div className={styles.articleGrid}>
                {articlesForDisplay.map((article) => {
                  const imageUrl = article.coverImage || article1.src; // <<< ใช้ .src สำหรับ StaticImageData
                  return (
                    <div key={article.id} className={styles.articleCard}>
                      <Link href={`/article/${article.id}`} className={styles.articleImageLink}>
                        <div className={styles.articleImageWrapper}>
                          <Image
                            src={imageUrl}
                            alt={article.title}
                            fill
                            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                            style={{ objectFit: "cover" }}
                            onError={(e) => { (e.target as HTMLImageElement).src = article1.src; }}
                          />
                        </div>
                        <p className={styles.articleName}>{article.title}</p>
                        <p className={styles.articleLink}>{article.category?.name || "ไม่ระบุหมวดหมู่"}</p>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                {allDbArticles.length > 0 ? `ยังไม่มีบทความในหมวดหมู่ "${activeTab}"` : "ยังไม่มีบทความใดๆ ในระบบ"}
              </p>
            )}
            {allDbArticles.filter(art => art.category?.name === activeTab).length > 4 && (
              <div className={styles.articleButtonWrapper}>
                <Link href={`/article?category=${encodeURIComponent(activeTab)}`} className={styles.viewAllBtn}>
                  ดูบทความหมวด {activeTab} ทั้งหมด
                </Link>
              </div>
            )}
          </>
        )}
        {!isLoadingArticles && !errorArticles && allDbArticles.length > 0 && (
          <div className={styles.articleButtonWrapper} style={{ marginTop: "20px" }}>
            <Link href="/article" className={styles.viewAllBtn}>ดูบทความทั้งหมด</Link>
          </div>
        )}
      </section>

      {/* --- Courses ทดลองเรียน --- */}
      <section className={styles.recommendSection}>
        <h2 className={styles.title}>คอร์สทดลองเรียน</h2>
        {isLoadingCourses && <p className="text-center py-4">Loading trial courses...</p>}
        {errorCourses && <p className="text-center py-4 text-red-600">Error loading trial courses: {errorCourses}</p>}
        {!isLoadingCourses && !errorCourses && (
          <>
            {fetchedCourses.length > 0 ? ( // ควรมีการ filter คอร์สทดลองเรียน
              <div className={styles.courseList}>
                {firstCourses.map((course) => <CourseCard key={course.id} course={course} />)}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">ยังไม่มีคอร์สทดลองเรียนในขณะนี้</p>
            )}
            {fetchedCourses.length > 4 && ( // ควรเช็คจำนวนคอร์สทดลองเรียนจริงๆ
              <div className="text-center mt-4">
                <Link href="/course?trial=true" className={styles.viewAll}>ดูคอร์สเรียนทั้งหมด</Link>
              </div>
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
