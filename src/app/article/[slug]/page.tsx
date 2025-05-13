// --- PATH EXAMPLE: app/article/[slug]/page.tsx ---
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './articleDetail.module.css'; // <<-- CSS Module ของหน้านี้
import defaultArticleImage from '../../img/article1.png'; // รูป Placeholder

// --- Import Carousel ---
import "react-responsive-carousel/lib/styles/carousel.min.css"; // Requires a loader
import { Carousel } from 'react-responsive-carousel';

// --- Types (ควร Import หรือกำหนดให้ตรงกับ API Response) ---
type ArticleImageInfo = {
    id: number;
    url: string;
    order?: number | null;
    altText?: string | null;
};
type CategoryInfo = { id: number; name: string; };
type ArticleDetailData = {
    id: number;
    title: string;
    description: string; // เนื้อหาหลัก (อาจเป็น HTML)
    coverImage: string | null; // อาจจะไม่ใช้แล้วถ้ามี images array
    images: ArticleImageInfo[]; // <<-- Array ของรูปภาพทั้งหมด
    publishedAt: string | Date;
    categoryId: number;
    category?: CategoryInfo;
};

// --- Helper Function ---
function formatDate(dateString: string | Date): string {
    try {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (e) { return 'Invalid Date'; }
}

// --- Mock data สำหรับ "บทความอื่นๆ" (ควรดึงจาก API จริง) ---
const relatedArticlesMock = [
    { id: 101, title: 'บทความเกี่ยวข้อง 1', coverImage: defaultArticleImage.src, category: { name: 'คลังความรู้' }, slug: 'related-1' },
    { id: 102, title: 'บทความเกี่ยวข้อง 2', coverImage: defaultArticleImage.src, category: { name: 'Check List' }, slug: 'related-2' },
    { id: 103, title: 'บทความเกี่ยวข้อง 3', coverImage: defaultArticleImage.src, category: { name: 'โจทย์ข้อสอบ' }, slug: 'related-3' },
    { id: 104, title: 'บทความเกี่ยวข้อง 4', coverImage: defaultArticleImage.src, category: { name: 'อื่นๆ' }, slug: 'related-4' },
];


export default function ArticleDetailPage() {
    const router = useRouter();
    const params = useParams();
    const articleIdentifier = params?.slug as string || params?.id as string || undefined;

    const [articleData, setArticleData] = useState<ArticleDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (articleIdentifier) {
            setIsLoading(true);
            setError(null);
            fetch(`/api/articles/${articleIdentifier}`) // API ดึงบทความเดียว (ต้อง include images, category)
                .then(async (res) => {
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.error || `Failed to fetch article (status: ${res.status})`);
                    }
                    return res.json();
                })
                .then((data: ArticleDetailData) => {
                    setArticleData(data);
                })
                .catch((err) => {
                    setError(err instanceof Error ? err.message : "Unknown error loading article.");
                    console.error("Fetch Article Detail Error:", err);
                })
                .finally(() => setIsLoading(false));
        } else {
            setError("Article identifier not found in URL.");
            setIsLoading(false);
        }
    }, [articleIdentifier]);

    if (isLoading) return <div className="flex justify-center items-center min-h-screen">Loading article...</div>;
    if (error) return <div className="flex flex-col justify-center items-center min-h-screen text-red-500"><p>Error: {error}</p><button onClick={() => router.back()} className="mt-4">Go Back</button></div>;
    if (!articleData) return <div className="flex flex-col justify-center items-center min-h-screen">Article not found.</div>;

    // เรียงรูปภาพตาม order ถ้ามี, หรือตาม id
    const sortedImages = articleData.images?.sort((a, b) => (a.order ?? a.id) - (b.order ?? b.id)) || [];

    return (
        <> {/* หรือ <Layout> Component ของคุณ */}
            {/* <Navbar /> */}
            <main className={styles.pageContainer}> {/* Class ใหม่สำหรับควบคุม Layout ทั้งหน้า */}
                <div className={styles.articleDetailContainer}> {/* Container หลักของเนื้อหาบทความ */}
                    <div className={styles.backLink}>
                        <Link href="/article">← กลับไปหน้ารวมบทความ</Link>
                    </div>

                    <h1 className={styles.articleTitleDetail}>{articleData.title}</h1>
                    <div className={styles.metaInfo}>
                        <span>เผยแพร่เมื่อ: {formatDate(articleData.publishedAt)}</span>
                        {articleData.category && <span>หมวดหมู่: {articleData.category.name}</span>}
                    </div>

                    {/* --- Image Carousel --- */}
                    {sortedImages.length > 0 ? (
                        <div className={styles.carouselWrapper}>
                            <Carousel
                                showArrows={true}
                                showThumbs={sortedImages.length > 1} // แสดง Thumbs ถ้ามีมากกว่า 1 รูป
                                showStatus={false}
                                infiniteLoop={sortedImages.length > 1}
                                useKeyboardArrows
                                className={styles.mainCarousel}
                            >
                                {sortedImages.map((image) => (
                                    <div key={image.id} className={styles.carouselSlide}>
                                        <Image
                                            src={image.url}
                                            alt={image.altText || articleData.title || `Image ${image.id}`}
                                            width={600} // กำหนด Width/Height ที่เหมาะสมสำหรับรูปใหญ่
                                            height={450}
                                            style={{ objectFit: 'contain' }} // contain เพื่อให้เห็นทั้งรูป
                                            onError={(e) => { (e.target as HTMLImageElement).src = defaultArticleImage.src; }}
                                        />
                                        {/* <p className="legend">{image.altText || `Image ${image.order}`}</p> */}
                                    </div>
                                ))}
                            </Carousel>
                        </div>
                    ) : articleData.coverImage ? ( // ถ้าไม่มี images array แต่มี coverImage
                         <div className={styles.articleCoverImageWrapper}>
                             <Image
                                 src={articleData.coverImage}
                                 alt={articleData.title}
                                 fill
                                 style={{ objectFit: 'cover' }}
                                 className={styles.articleCoverImage}
                                 sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 600px"
                                 priority
                                 onError={(e) => { (e.target as HTMLImageElement).src = defaultArticleImage.src; }}
                             />
                         </div>
                    ) : (
                        <div className={styles.articleCoverImagePlaceholder}>ไม่มีรูปภาพประกอบ</div>
                    )}
                    {/* --- End Image Carousel --- */}

                    <div
                        className={styles.articleContentBody} // Class ใหม่สำหรับเนื้อหา
                        dangerouslySetInnerHTML={{ __html: articleData.description || '' }}
                    />
                </div>

                {/* --- บทความอื่น ๆ (ยังใช้ Mock data - ควรดึงจาก API) --- */}
                <section className={styles.relatedArticlesSection}>
                    <h2 className={styles.relatedHeader}>บทความที่เกี่ยวข้อง</h2>
                    <div className={styles.relatedGrid}>
                        {relatedArticlesMock.map((relatedArticle) => (
                            <Link href={`/article/${relatedArticle.slug}`} key={relatedArticle.id} className={styles.relatedCard}>
                                <div className={styles.relatedImageContainer}>
                                    <Image
                                        src={relatedArticle.coverImage}
                                        alt={relatedArticle.title}
                                        fill
                                        style={{objectFit: 'cover'}}
                                        className={styles.relatedImage}
                                        onError={(e) => { (e.target as HTMLImageElement).src = defaultArticleImage.src; }}
                                    />
                                </div>
                                <p className={styles.relatedTitle}>{relatedArticle.title}</p>
                                <span className={styles.relatedCategory}>{relatedArticle.category.name}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
            {/* <Footer /> */}
        </>
    );
}