"use client"
import { useState } from 'react';
import styles from './home.module.css';
import Image from 'next/image';
import banner from '../img/banner1.png';
import course from '../img/recom-course.png';
import teacher from '../img/Teacher.png';
import hallOfFlame from '../img/hallOfFlame.png';
import guide from '../img/guide.png';
import benefit from '../img/benefit.png';
import line from '../img/line.png';
import facebook from '../img/facebook.png';
import ig from '../img/ig.png';
import tiktok from '../img/tiktok.png';
import youtube from '../img/youtube.png';
import article1 from '../img/article1.png';
import article2 from '../img/article2.png';
import article3 from '../img/article3.png';

const banners = [
    { id: 1, src: banner, alt: 'คอร์สคณิตศาสตร์' },
    { id: 2, src: banner, alt: 'อีกคอร์สหนึ่ง' },
    { id: 3, src: banner, alt: 'คอร์สพิเศษ' },
];

const allCourses = [
    { id: 'M01', title: 'คอร์สพื้นฐาน ม.1', price: '999 บาท', image: course },
    { id: 'M02', title: 'คอร์สพื้นฐาน ม.2', price: '999 บาท', image: course },
    { id: 'M03', title: 'คอร์สพื้นฐาน ม.3', price: '999 บาท', image: course },
    { id: 'M04', title: 'คอร์สพื้นฐาน ม.4', price: '999 บาท', image: course },
    { id: 'M05', title: 'คอร์สพื้นฐาน ม.5', price: '999 บาท', image: course },
    { id: 'M06', title: 'คอร์สพื้นฐาน ม.6', price: '999 บาท', image: course },
];

const socials = [
    {
        name: 'Line',
        label: '@pig class',
        icon: line,
        link: 'https://line.me/ti/p/~pigclass'
    },
    {
        name: 'Facebook',
        label: 'pig class',
        icon: facebook,
        link: 'https://facebook.com/pigclass'
    },
    {
        name: 'Instagram',
        label: 'pig class',
        icon: ig,
        link: 'https://instagram.com/pigclass'
    },
    {
        name: 'TikTok',
        label: 'pig class',
        icon: tiktok,
        link: 'https://tiktok.com/@pigclass'
    },
    {
        name: 'YouTube',
        label: 'pig class',
        icon: youtube,
        link: 'https://youtube.com/@pigclass'
    },
];

const categories = ['คลังความรู้', 'Check List', 'โจทย์ข้อสอบ', 'อื่น ๆ'];

const articles = {
    'คลังความรู้': [
        { title: 'คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2', image: article1, link: '#' },
        { title: 'คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2', image: article1, link: '#' },
        { title: 'คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2', image: article1, link: '#' },
        { title: 'คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2', image: article1, link: '#' },
    ],
    'Check List': [
        { title: 'Check List จำนวนจริง', image: article3, link: '#' },
        { title: 'Check List จำนวนจริง', image: article3, link: '#' },
        { title: 'Check List จำนวนจริง', image: article3, link: '#' },
        { title: 'Check List จำนวนจริง', image: article3, link: '#' },
    ],
    'โจทย์ข้อสอบ': [
        { title: 'โจทย์ความรู้ สถิติ', image: article2, link: '#' },
        { title: 'โจทย์ความรู้ สถิติ', image: article2, link: '#' },
        { title: 'โจทย์ความรู้ สถิติ', image: article2, link: '#' },
        { title: 'โจทย์ความรู้ สถิติ', image: article2, link: '#' },
    ],
    'อื่น ๆ': [
        { title: 'คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2', image: article1, link: '#' },
        { title: 'Check List จำนวนจริง', image: article3, link: '#' },
        { title: 'โจทย์ความรู้ สถิติ', image: article2, link: '#' },
        { title: 'คลังความรู้ ครั้งที่ 1 พฤษภาคม ม.2', image: article1, link: '#' },
    ],
};


// CourseCard Components
function CourseCard({ course }: { course: any }) {
    return (
        <div className={styles.courseCard}>
            <div className={styles.imageWrapper}>
                <Image src={course.image} alt={course.title} width={180} height={240} />
            </div>
            <p className={styles.price}>{course.price}</p>
            <p className={styles.courseTitle}>{course.title}</p>
            <p className={styles.code}>รหัส {course.id}</p>
            <div className={styles.actions}>
                <span className={styles.cart}>🛒</span>
                <button className={styles.detailBtn}>รายละเอียด</button>
            </div>
        </div>
    );
}

export default function Home() {
    const [current, setCurrent] = useState(0);
    const [showAll, setShowAll] = useState(false);
    const [activeTab, setActiveTab] = useState('คลังความรู้');

    const nextSlide = () => setCurrent((prev) => (prev + 1) % banners.length);
    const prevSlide = () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

    const firstCourses = allCourses.slice(0, 4);
    const moreCourses = allCourses.slice(4);

    return (
        <main>
            {/* Banner */}
            <div className={styles.sliderWrapper}>
                <div className={styles.slider}>
                    {banners.map((banner, index) => (
                        <div key={banner.id} className={index === current ? styles.slideActive : styles.slide}>
                            {index === current && (
                                <Image
                                    src={banner.src}
                                    alt={banner.alt}
                                    width={0}
                                    height={0}
                                    style={{ width: '100%', height: '100%' }}
                                    className={styles.image}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={prevSlide} className={styles.prev}>❮</button>
                <button onClick={nextSlide} className={styles.next}>❯</button>
            </div>

            {/* Courses */}
            <section className={styles.recommendSection}>
                <h2 className={styles.title}>คอร์สเรียนแนะนำ</h2>

                {/* First 4 */}
                <div className={styles.courseList}>
                    {firstCourses.map((course, idx) => (
                        <CourseCard key={idx} course={course} />
                    ))}
                </div>

                {/* More (toggle) */}
                {showAll && (
                    <div className={styles.courseList}>
                        {moreCourses.map((course, idx) => (
                            <CourseCard key={idx} course={course} />
                        ))}
                    </div>
                )}

                {!showAll && (
                    <p className={styles.viewAll} onClick={() => setShowAll(true)}>
                        ดูคอร์สเรียนทั้งหมด
                    </p>
                )}
            </section>

            <section className={styles.doctorPigSection}>
                <div className={styles.imageContainer}>
                    <Image src={teacher.src} alt="ครูหมู" fill className={styles.imageFull} />
                </div>
            </section>

            <section className={styles.hallOfFrameSection}>
                <div className={styles.hallOfFrameHeader}>
                    <h2 className={styles.hallOfFrameTitle}></h2>
                    <h2 className={styles.hallOfFrameTitle}>ความสำเร็จ</h2>
                    <a href="/hallOfFrame" className={styles.viewAll}>ดูทั้งหมด</a>
                </div>

                <div className={styles.hallOfFrameGrid}>
                    {[...Array(8)].map((_, idx) => (
                        <div key={idx} className={styles.hallOfFrameCard}>
                            <Image src={hallOfFlame.src} alt={`ความสำเร็จ ${idx + 1}`} width={260} height={140} />
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.articleTabSection}>
                <h2 className={styles.articleTitle}>บทความ</h2>

                {/* Tabs */}
                <div className={styles.tabList}>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            className={`${styles.tabItem} ${activeTab === cat ? styles.activeTab : ''}`}
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
                                <Image src={article.image} alt={article.title} width={260} height={180} className={styles.articleImage} />
                                <p className={styles.articleName}>{article.title}</p>
                                <a className={styles.articleLink}>{activeTab}</a>
                            </a>
                        </div>
                    ))}
                </div>

                <div className={styles.articleButtonWrapper}>
                    <a href="/articles" className={styles.viewAllBtn}>ดูทั้งหมด</a>
                </div>
            </section>

            <section className={styles.doctorPigSection}>
                <div className={styles.imageContainer}>
                    <Image src={guide.src} alt="ครูหมู" fill className={styles.imageFull} />
                </div>
            </section>

            <section className={styles.doctorPigSection2}>
                <div className={styles.imageContainer2}>
                    <Image src={benefit.src} alt="ครูหมู" fill className={styles.imageFull} />
                </div>
            </section>

            <section className={styles.socialSection}>
                <h2 className={styles.socialTitle}>ช่องทางการติดตาม</h2>
                <div className={styles.socialGrid}>
                    {socials.map((social, idx) => (
                        <a key={idx} href={social.link} className={styles.socialItem} target="_blank" rel="noopener noreferrer">
                            <Image src={social.icon} alt={social.name} width={60} height={60} />
                            <p className={styles.socialLabel}>{social.label}</p>
                        </a>
                    ))}
                </div>
            </section>
        </main>
    );
}
