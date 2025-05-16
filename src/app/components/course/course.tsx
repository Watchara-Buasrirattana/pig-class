"use client";
import { useState, useEffect, useMemo } from "react"; // เพิ่ม useEffect, useMemo
import styles from "./course.module.css"; // <-- ตรวจสอบ Path CSS Module
import Image, { StaticImageData } from "next/image";
import defaultCourseImage from "../../img/recom-course.png"; // <-- รูป Default
import Link from "next/link";
// --- Type สำหรับ Course ที่ได้จาก API (ควร Import หรือกำหนดไว้ที่ส่วนกลาง) ---
type CourseFromAPI = {
  id: number; // <-- ID เป็นตัวเลข
  courseNumber: string;
  courseName: string;
  description: string;
  category: string | null;
  teacher: string | null;
  level: string | null;
  price: number;
  courseImg?: string | null;
  stripePriceId?: string | null;
};

// --- CourseCard Component (ควร Import หรือวางไว้ที่เดียวกัน) ---
// ใช้ตัวเดียวกับหน้า Home ที่รับ Prop เป็น CourseFromAPI
function CourseCard({ course }: { course: CourseFromAPI }) {
  const imageUrl = course.courseImg || defaultCourseImage.src;
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // --- ฟังก์ชันสำหรับเพิ่มลงตะกร้า ---
  const handleAddToCart = async (courseId: number) => {
    setIsAddingToCart(true);
    try {
      console.log(`Adding course ${courseId} to cart...`);
      const res = await fetch("/api/cart/items", {
        // เรียก API ที่เราสร้างไว้
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
          quantity: 1, // ปกติคอร์สซื้อทีละ 1
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || `Failed to add to cart (status: ${res.status})`
        );
      }

      console.log("Add to cart response:", data);
      alert(`เพิ่ม "${course.courseName}" ลงตะกร้าสำเร็จ!`);
      // TODO: (Optional) อาจจะอัปเดต UI อื่นๆ เช่น จำนวนของในตะกร้าบน Navbar
      // หรือถ้า API คืนค่า Cart มา ก็อัปเดต State ของ Cart ใน Context/Global State
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert(
        `เกิดข้อผิดพลาดในการเพิ่มลงตะกร้า: ${err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsAddingToCart(false);
    }
  };
  // --- จบฟังก์ชันเพิ่มลงตะกร้า ---

  return (
    <div className={styles.courseCard}>
      {" "}
      {/* ตรวจสอบว่ามี style นี้ใน course.module.css */}
      <div className={styles.imageWrapper}>
        {" "}
        {/* ตรวจสอบ style นี้ */}
        <Image
          src={imageUrl}
          alt={course.courseName}
          width={180}
          height={240} // หรือใช้ fill ถ้า container มีขนาด
          style={{ objectFit: "cover" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultCourseImage.src;
          }}
        />
      </div>
      <p className={styles.price}>{course.price.toLocaleString()} บาท</p>{" "}
      {/* ตรวจสอบ style นี้ */}
      <p className={styles.courseTitle}>{course.courseName}</p>{" "}
      {/* ตรวจสอบ style นี้ */}
      <p className={styles.code}>รหัส {course.courseNumber}</p>{" "}
      {/* ตรวจสอบ style นี้ */}
      <div className={styles.actions}>
        {" "}
        {/* ตรวจสอบ style นี้ */}
        {/* --- แก้ไขปุ่มตะกร้า --- */}
        <button
          onClick={() => handleAddToCart(course.id)}
          disabled={isAddingToCart}
          className={`${styles.cartButton} ${isAddingToCart ? "opacity-50 cursor-wait" : ""
            }`} // เพิ่ม Style และ Disable ตอน Loading
          title="หยิบใส่ตะกร้า"
        >
          <span className={styles.cartIcon}>🛒</span>{" "}
          {/* อาจจะใช้ styles.cartIcon ถ้ามี */}
          {isAddingToCart ? "กำลังเพิ่ม..." : ""}{" "}
          {/* แสดง Text ตอน Loading (Optional) */}
        </button>
        <Link
          href={`/course/${course.id}`} // <-- กำหนด Path ไปยังหน้า Detail พร้อม ID
          className={styles.detailBtn} // <-- ใช้ Style เดิมของปุ่ม
        >
          รายละเอียด
        </Link>{" "}
        {/* ตรวจสอบ style นี้ */}
      </div>
    </div>
  );
}

// --- Filter Options (Hardcoded - อาจจะดึงจาก API หรือ DB ในอนาคต) ---
const levels = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
// **สำคัญ:** ค่าใน types นี้ ต้องตรงกับค่าที่เป็นไปได้ใน field `category` ของ Course ใน DB
const types = ["กลางภาค", "ปลายภาค", "พื้นฐาน", "ตะลุยโจทย์", "ทดลองเรียน"];

export default function CoursePage() {
  // --- State สำหรับ Filter ---
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // --- State สำหรับข้อมูล Course จาก API ---
  const [allDbCourses, setAllDbCourses] = useState<CourseFromAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- Fetch ข้อมูล Course ทั้งหมด ---
  useEffect(() => {
    const fetchAllCourses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/courses"); // เรียก GET /api/courses
        if (!res.ok) {
          throw new Error(`Failed to fetch courses (status: ${res.status})`);
        }
        const data: CourseFromAPI[] = await res.json();
        setAllDbCourses(data); // เก็บข้อมูลทั้งหมดที่ได้ใน State
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllCourses();
  }, []); // ทำงานครั้งเดียวตอนโหลด Component

  // --- Filter Handlers (เหมือนเดิม) ---
  const handleLevelChange = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleTypeChange = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // --- กรองข้อมูลจาก State ที่ดึงมาจาก DB ---
  // ใช้ useMemo เพื่อให้คำนวณใหม่เฉพาะตอนที่ allDbCourses หรือ filter เปลี่ยน
  const filteredCourses = useMemo(() => {
    return allDbCourses.filter((course) => {
      const levelMatch =
        selectedLevels.length === 0 || (course.level && selectedLevels.includes(course.level));
      const typeMatch =
        selectedTypes.length === 0 || (course.category && selectedTypes.includes(course.category));
      const searchMatch =
        searchQuery === "" || course.courseName.toLowerCase().includes(searchQuery.toLowerCase());
      return levelMatch && typeMatch && searchMatch;
    });
  }, [allDbCourses, selectedLevels, selectedTypes, searchQuery]);



  return (
    // อาจจะต้องมี Layout หลักครอบ (เช่น Navbar, Footer)
    <main className={styles.pageWrapper}>
      {" "}
      {/* ตรวจสอบ style นี้ */}
      {/* Sidebar สำหรับ Filter */}
      <aside className={styles.sidebar}>
        {" "}
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="ค้นหาคอร์สเรียน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.group}>
          <div className={styles.category}>
            <h3 className={styles.sidebarTitle}>ระดับชั้น</h3>
            {levels.map((level) => (
              <label key={level} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level)}
                  onChange={() => handleLevelChange(level)}
                />
                {level}
              </label>
            ))}
          </div>
          <div className={styles.category}>
            <h3 className={styles.sidebarTitle}>ประเภทคอร์ส</h3>
            {types.map((type) => (
              <label key={type} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => handleTypeChange(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>
      </aside>
      {/* Main Content แสดงคอร์สที่ Filter แล้ว */}
      <section className={styles.mainContent}>
        {" "}
        {/* ตรวจสอบ style นี้ */}
        <h2 className={styles.pageTitle}>คอร์สเรียน</h2>{" "}
        {/* ตรวจสอบ style นี้ */}
        {isLoading && <p className="text-center py-5">Loading courses...</p>}
        {error && (
          <p className="text-center py-5 text-red-600">Error: {error}</p>
        )}
        {!isLoading && !error && (
          <div className={styles.courseList}>
            {" "}
            {/* ตรวจสอบ style นี้ */}
            {filteredCourses.length > 0 ? (
              // ใช้ filteredCourses และ key={course.id} (ตัวเลข)
              filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} /> // <<-- ใช้ ID ตัวเลขจาก DB
              ))
            ) : (
              <p className="col-span-full text-center text-gray-500 py-10">
                ไม่พบคอร์สเรียนตามเงื่อนไขที่เลือก
              </p> // เพิ่มข้อความเมื่อไม่เจอ
            )}
          </div>
        )}
      </section>
    </main>
  );
}
