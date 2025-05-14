"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./article.module.css"; // ตรวจสอบ Path CSS Module
import Link from "next/link";
import Image, { StaticImageData } from "next/image";
import defaultArticleImage from "../img/article1.png"; // <<-- สร้างรูป Placeholder หรือใช้รูปเดิม

// --- Types (ควร Import หรือกำหนดให้ตรงกับ API Response และ Prisma Schema) ---
type CategoryInfoFromDB = {
  // Type สำหรับ Category ที่มาจาก DB (ถ้า API ส่งมา)
  id: number;
  name: string;
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

// --- Fixed Categories สำหรับ Tabs (ชื่อต้องตรงกับ Category.name ใน DB) ---
const fixedCategoryTabs: string[] = [
  "คลังความรู้",
  "Checklist",
  "โจทย์ข้อสอบ",
  "อื่นๆ",
];

export default function ArticleList() {
  const [activeTab, setActiveTab] = useState<string>(fixedCategoryTabs[0]); // Tab เริ่มต้น
  const [currentPage, setCurrentPage] = useState(1);

  // --- State สำหรับข้อมูล Article จาก API ---
  const [allDbArticles, setAllDbArticles] = useState<ArticleFromAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const articlesPerPage = 16; // จำนวนบทความต่อหน้า

  // --- Fetch ข้อมูล Article ทั้งหมด ---
  useEffect(() => {
    const fetchAllArticles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Backend API ควรจะ include category มาด้วย
        const res = await fetch("/api/articles"); // เรียก GET /api/articles
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch articles (status: ${res.status})`
          );
        }
        const data: ArticleFromAPI[] = await res.json();
        setAllDbArticles(data);
        console.log("Fetched Articles:", data);
      } catch (err) {
        console.error("Error fetching articles:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllArticles();
  }, []); // ทำงานครั้งเดียวตอนโหลด Component

  // --- กรองบทความตาม Tab (Category Name) ที่เลือก ---
  const articlesForCurrentTab = useMemo(() => {
    if (!activeTab || allDbArticles.length === 0) return [];
    return allDbArticles.filter(
      (article) => article.category?.name === activeTab
    );
  }, [allDbArticles, activeTab]);

  // --- แบ่งหน้าสำหรับบทความใน Tab ปัจจุบัน ---
  const currentDisplayArticles = useMemo(() => {
    return articlesForCurrentTab.slice(
      (currentPage - 1) * articlesPerPage,
      currentPage * articlesPerPage
    );
  }, [articlesForCurrentTab, currentPage, articlesPerPage]);

  const totalPages = useMemo(() => {
    if (articlesForCurrentTab.length === 0) return 0;
    return Math.ceil(articlesForCurrentTab.length / articlesPerPage);
  }, [articlesForCurrentTab, articlesPerPage]);

  // --- Handlers ---
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset ไปหน้า 1 เมื่อเปลี่ยน Tab
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // คำนวณช่องว่างสำหรับเติม Grid (ถ้าต้องการให้เต็มแถวเสมอ)
  const emptySlotsCount = useMemo(() => {
    if (currentDisplayArticles.length === 0) return 0;
    const itemsPerRow = 4; // สมมติว่า Grid แสดง 4 รายการต่อแถว (ปรับตาม CSS Grid ของคุณ)
    const itemsInLastRow = currentDisplayArticles.length % itemsPerRow;
    return itemsInLastRow === 0 ? 0 : itemsPerRow - itemsInLastRow;
  }, [currentDisplayArticles]);
  const emptySlots = Array.from({ length: emptySlotsCount });

  // --- Render ---
  if (isLoading)
    return <main className="p-6 text-center">Loading articles...</main>;
  if (error)
    return <main className="p-6 text-center text-red-600">Error: {error}</main>;

  return (
    <main>
      {" "}
      {/* ควรมี Layout หลัก (Navbar, Footer) ครอบ Component นี้ */}
      {/* <Navbar /> */}
      <section className={styles.articleTabSection}>
        <h2 className={styles.articleTitle}>บทความ</h2>

        {/* Tabs */}
        <div className={styles.tabList}>
          {fixedCategoryTabs.map((catName) => (
            <button
              key={catName}
              className={`${styles.tabItem} ${
                activeTab === catName ? styles.activeTab : ""
              }`}
              onClick={() => handleTabClick(catName)}
            >
              {catName}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {currentDisplayArticles.length > 0 ? (
          <div className={styles.articleGrid}>
            {currentDisplayArticles.map((article) => {
              // สร้าง slug จาก title หรือใช้ article.id ถ้าต้องการ
              const slug = encodeURIComponent(
                article.title.replace(/\s+/g, "-").toLowerCase()
              );
              // เลือกรูปภาพ: ใช้ coverImage หรือรูปแรกใน images array หรือรูป default
              const imageUrl =
                article.coverImage ||
                article.images?.[0]?.url ||
                defaultArticleImage.src;

              return (
                <div key={article.id} className={styles.articleCard}>
                  {/* ใช้ ID ของ Article จริงๆ เป็น Key */}
                  <Link
                    href={`/article/${article.id}`}
                    className={styles.articleImageLink}
                  >
                    {" "}
                    {/* <<-- ใช้ ID ของ Article หรือ Slug ที่ Unique */}
                    <div className={styles.articleImageContainer}>
                      {" "}
                      {/* <<-- สำคัญมาก */}
                      <Image
                        src={imageUrl} // imageUrl มาจาก article.coverImage || article.images?.[0]?.url || defaultArticleImage.src
                        alt={article.title}
                        fill // <<-- ถ้าใช้ fill, .articleImageContainer ต้องมี position: relative และขนาด
                        style={{ objectFit: "cover" }}
                        className={styles.articleImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            defaultArticleImage.src;
                        }}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" // ปรับตาม Grid
                      />
                    </div>
                    <p className={styles.articleName}>{article.title}</p>
                    {/* แสดงชื่อ Category จากข้อมูลจริง */}
                    <span className={styles.articleLink}>
                      {article.category?.name || "N/A"}
                    </span>
                  </Link>
                </div>
              );
            })}
            {/* เติมช่องว่าง (ถ้าต้องการ) */}
            {emptySlots.map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className={styles.articleCardEmpty}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <p className="col-span-full text-center text-gray-500 py-10">
            ไม่พบบทความในหมวดหมู่ "{activeTab}"
          </p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.paginationWrapper}>
            {/* ปุ่ม Previous */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`${styles.pageButton} ${
                currentPage === 1 ? styles.disabledPageButton : ""
              }`}
            >
              &lt;
            </button>

            {/* แสดงหมายเลขหน้า (อาจจะทำแบบย่อถ้าหน้าเยอะมาก) */}
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`${styles.pageButton} ${
                  currentPage === i + 1 ? styles.activePageButton : ""
                }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            {/* ปุ่ม Next */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`${styles.pageButton} ${
                currentPage === totalPages ? styles.disabledPageButton : ""
              }`}
            >
              &gt;
            </button>
          </div>
        )}
      </section>
      {/* <Footer /> */}
    </main>
  );
}
