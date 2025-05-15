// ในไฟล์ AchievementList component ของคุณ (เช่น app/achievements/page.tsx)
"use client";
import { useState, useEffect, useMemo } from 'react';
import styles from './achievement.module.css'; // <<-- ตรวจสอบ Path CSS Module
// import Link from 'next/link'; // อาจจะไม่ต้องใช้ถ้าแค่แสดงรูป
import Image, { StaticImageData } from 'next/image';
import defaultAchievementImage from '../../img/achivement1.png'; // <<-- สร้างรูป Placeholder

// --- Type สำหรับ Achievement ที่ได้จาก API (ควรตรงกับ Prisma Schema และ select ใน API) ---
type AchievementFromAPI = {
    id: number;
    image: string; // URL ของรูปภาพ
};

// --- Categories (ถ้าจะยังใช้ Tab หรือเปลี่ยนเป็น Filter อื่น) ---
// จากโค้ดคุณมีแค่ "มหาวิทยาลัย" ถ้า Achievement มีหลายประเภท อาจจะต้องดึง Category มาจาก DB หรือกำหนดใหม่
const categories = ["มหาวิทยาลัย"]; // หรือ ['ทั้งหมด'] ถ้าไม่มีการแบ่งประเภทแล้ว

export default function AchievementList() { // หรือชื่อ Component ของคุณ
    const [activeTab, setActiveTab] = useState<string>(categories[0]); // Tab เริ่มต้น (ถ้ายังใช้)
    const [currentPage, setCurrentPage] = useState(1);

    // --- State สำหรับข้อมูล Achievement จาก API ---
    const [allDbAchievements, setAllDbAchievements] = useState<AchievementFromAPI[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const itemsPerPage = 32; // จำนวน Achievement ต่อหน้า (ปรับได้)

    // --- Fetch ข้อมูล Achievement ทั้งหมด ---
    useEffect(() => {
        const fetchAllAchievements = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/achievements'); // เรียก GET /api/achievements
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `Failed to fetch achievements (status: ${res.status})`);
                }
                const data: AchievementFromAPI[] = await res.json();
                setAllDbAchievements(data);
                console.log("Fetched Achievements:", data);
            } catch (err) {
                console.error("Error fetching achievements:", err);
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllAchievements();
    }, []); // ทำงานครั้งเดียวตอนโหลด Component

    // --- กรอง Achievement (ถ้ามี Tab หรือ Filter อื่นๆ) ---
    // ถ้าไม่มีการ Filter ตาม Tab แล้ว สามารถใช้ allDbAchievements ได้เลย
    const achievementsForCurrentDisplay = useMemo(() => {
        // ตัวอย่าง: ถ้า activeTab ไม่ได้ใช้ filter จริงจัง ก็ return allDbAchievements
        // หรือถ้า achievements ของคุณมี "ประเภท" ที่ตรงกับ activeTab ก็ filter ได้
        // ในที่นี้จะสมมติว่า activeTab "มหาวิทยาลัย" คือการแสดงทั้งหมดไปก่อน
        if (activeTab === "มหาวิทยาลัย") { // หรือ if (activeTab === "ทั้งหมด")
            return allDbAchievements;
        }
        // ถ้ามี field category ใน Achievement model ก็ filter แบบนี้:
        // return allDbAchievements.filter(ach => ach.categoryName === activeTab);
        return allDbAchievements; // แสดงทั้งหมดถ้า Tab ไม่ตรง หรือไม่มี Logic Filter
    }, [allDbAchievements, activeTab]);


    // --- แบ่งหน้าสำหรับ Achievement ที่จะแสดง ---
    const currentDisplayAchievements = useMemo(() => {
        return achievementsForCurrentDisplay.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [achievementsForCurrentDisplay, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        if (achievementsForCurrentDisplay.length === 0) return 0;
        return Math.ceil(achievementsForCurrentDisplay.length / itemsPerPage);
    }, [achievementsForCurrentDisplay, itemsPerPage]);

    // --- Handlers ---
    const handleTabClick = (tab: string) => {
        setActiveTab(tab);
        setCurrentPage(1);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Render ---
    if (isLoading) return <main className="p-6 text-center">Loading achievements...</main>;
    if (error) return <main className="p-6 text-center text-red-600">Error: {error}</main>;

    return (
        <main>
            {/* <Navbar /> */}
            <section className={styles.achievementTabSection}> {/* ใช้ CSS จาก achievement.module.css */}
                <h2 className={styles.achievementTitle}>ความสำเร็จ</h2>

                {/* Tabs (ถ้ายังต้องการใช้) */}
                {categories.length > 1 && ( // แสดง Tabs ถ้ามีมากกว่า 1 Category
                    <div className={styles.tabList}>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`${styles.tabItem} ${activeTab === cat ? styles.activeTab : ''}`}
                                onClick={() => handleTabClick(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Grid */}
                {currentDisplayAchievements.length > 0 ? (
                    <div className={styles.achievementGrid}>
                        {currentDisplayAchievements.map((achieve) => (
                            <div key={achieve.id} className={styles.achievementCard}>
                                {/* อาจจะไม่ต้องมี Link ถ้าแค่แสดงรูป */}
                                <div className={styles.achievementImageWrapper}> {/* <<-- Div ครอบรูป */}
                                    <Image
                                        src={achieve.image || defaultAchievementImage.src}
                                        alt={`Achievement ${achieve.id}`} // ควรมี alt text ที่ดีกว่านี้ถ้า Achievement มี name
                                        fill
                                        style={{ objectFit: 'contain' }} // หรือ 'cover' แล้วแต่ Design
                                        className={styles.achievementImage}
                                        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw" // ปรับ sizes
                                        onError={(e) => { (e.target as HTMLImageElement).src = defaultAchievementImage.src; }}
                                    />
                                </div>
                                {/* ถ้ามีชื่อหรือรายละเอียดอื่นๆ ก็ใส่ตรงนี้ */}
                                {/* <p className={styles.achievementName}>{achieve.name || ''}</p> */}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="col-span-full text-center text-gray-500 py-10">
                        ไม่พบข้อมูลความสำเร็จ {activeTab !== categories[0] ? `ในหมวดหมู่ "${activeTab}"` : ""}
                    </p>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={styles.paginationWrapper}>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                className={`${styles.pageButton} ${currentPage === i + 1 ? styles.activePageButton : ''}`}
                                onClick={() => handlePageChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </section>
            {/* <Footer /> */}
        </main>
    );
};

// export default AchievementList; // ถ้าแยกไฟล์