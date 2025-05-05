"use client"
import { useState } from 'react';
import styles from './article.module.css';
import Link from 'next/link';
import Image from 'next/image';
import article1 from '../img/article1.png';
import article2 from '../img/article2.png';
import article3 from '../img/article3.png';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const categories = ['คลังความรู้', 'Check List', 'โจทย์ข้อสอบ', 'อื่น ๆ'];

const articles = {
    'คลังความรู้': [...Array(30)].map((_, i) => ({ title: `คลังความรู้ ${i+1}`, image: article1, link: '#' })),
    'Check List': [...Array(25)].map((_, i) => ({ title: `Check List ${i+1}`, image: article3, link: '#' })),
    'โจทย์ข้อสอบ': [...Array(50)].map((_, i) => ({ title: `โจทย์ความรู้ ${i+1}`, image: article2, link: '#' })),
    'อื่น ๆ': [...Array(8)].map((_, i) => ({ title: `อื่น ๆ ${i+1}`, image: article1, link: '#' })),
};

const ArticleList: React.FC = () => {
    const [activeTab, setActiveTab] = useState('คลังความรู้');
    const [currentPage, setCurrentPage] = useState(1);

    const articlesPerPage = 16; 

    const currentArticles = articles[activeTab].slice(
        (currentPage - 1) * articlesPerPage,
        currentPage * articlesPerPage
    );

    const totalPages = Math.ceil(articles[activeTab].length / articlesPerPage);

    const handleTabClick = (tab: string) => {
        setActiveTab(tab);
        setCurrentPage(1); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนขึ้นบนเมื่อเปลี่ยน tab
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนขึ้นบนเมื่อเปลี่ยนหน้า
    };

    const emptySlots = Array.from({ length: articlesPerPage - currentArticles.length }, (_, i) => i);

    return (
        <main> 
            <Navbar />
            <section className={styles.articleTabSection}>
                <h2 className={styles.articleTitle}>บทความ</h2>

                {/* Tabs */}
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

                {/* Content */}
                <div className={styles.articleGrid}>
                {currentArticles.map((article, idx) => {
                    // สร้าง slug จากชื่อบทความ
                    const slug = encodeURIComponent(article.title.replace(/\s+/g, '-'));
                    return (
                        <div key={idx} className={styles.articleCard}>
                            <Link href={`/article/${slug}`} className={styles.articleImageLink}>
                                <Image src={article.image} alt={article.title} width={260} height={180} className={styles.articleImage} />
                                <p className={styles.articleName}>{article.title}</p>
                                <span className={styles.articleLink}>{activeTab}</span>
                            </Link>
                        </div>
                    );
                })}
                {emptySlots.map((_, idx) => (
                    <div key={`empty-${idx}`} className={styles.articleCardEmpty} />
                ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={styles.paginationWrapper}>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                className={`${styles.pageButton} ${currentPage === i + 1 ? styles.activePageButton : ''}`}
                                onClick={() => handlePageChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </section>
            <Footer />
        </main>
    );
};

export default ArticleList;
