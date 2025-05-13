"use client";
import { useState } from "react";
import styles from "./achievement.module.css";
import Link from "next/link";
import Image from "next/image";
import img1 from "../../img/achivement1.png";
import img2 from "../../img/achivement2.png";


const categories = ["มหาวิทยาลัย", "ม.4", "คะแนนสอบ"];

const achievements = {
    "มหาวิทยาลัย": [...Array(40)].map((_, i) => ({image: img1, link: "#" })),
    "ม.4": [...Array(16)].map((_, i) => ({image: img2, link: "#" })),
    "คะแนนสอบ": [...Array(16)].map((_, i) => ({ image: img2, link: "#" })),
};

const AchievementList: React.FC = () => {
    const [activeTab, setActiveTab] = useState("มหาวิทยาลัย");
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 32;
    const currentAchievements = achievements[activeTab].slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(achievements[activeTab].length / itemsPerPage);

    const handleTabClick = (tab: string) => {
        setActiveTab(tab);
        setCurrentPage(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <main>
            <section className={styles.achievementTabSection}>
                <h2 className={styles.achievementTitle}>ความสำเร็จ</h2>

                {/* Tabs */}
                <div className={styles.tabList}>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            className={`${styles.tabItem} ${activeTab === cat ? styles.activeTab : ""}`}
                            onClick={() => handleTabClick(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className={styles.achievementGrid}>
                    {currentAchievements.map((achieve, idx) => (
                        <div key={idx} className={styles.achievementCard}>
                            <Image src={achieve.image} alt={achieve.name} width={260} height={180} className={styles.achievementImage} />
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={styles.paginationWrapper}>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                className={`${styles.pageButton} ${currentPage === i + 1 ? styles.activePageButton : ""}`}
                                onClick={() => handlePageChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default AchievementList;
