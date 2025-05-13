"use client"
import { useState } from "react";
import Image from 'next/image';
import styles from "./learn.module.css";
import Course from "../img/courseimg.png"
import Time from "../img/Time.png"
import Limit from "../img/Limit.png"
import PDF from "../img/pdf.png"

const lessons = [
    { id: 1, title: "บทที่ 1 สถิติ", parts: ["ตอนที่ 1", "ตอนที่ 2"] },
    { id: 2, title: "บทที่ 2 การนำเข้ากราฟประการ", parts: ["ตอนที่ 1"] },
    { id: 3, title: "บทที่ 3 เส้นขนาน", parts: ["ตอนที่ 1"] },
    { id: 4, title: "บทที่ 4 การให้เหตุผลทางเรขาคณิต", parts: ["ตอนที่ 1", "ตอนที่ 2"] },
    { id: 5, title: "บทที่ 5 การแยกตัวประกอบของพหุนามดีกรี", parts: ["ตอนที่ 1", "ตอนที่ 2"] },
];

const courseDetails = {
    title: "คณิตศาสตร์ ม. ก่อนเปิดภาคเรียน 2",
    code: "MT015",
    price: "฿990",
    stats: [
        { icon: Time.src, label: "เวลาเรียนรวม", value: "20 hr." },
        { icon: Limit.src, label: "อายุคอร์ส", value: "20 hr." }
    ],
    lessons: [
        { title: 'บทที่ 1 สถิติ', link: '/lesson/1' },
        { title: 'บทที่ 2 การนำค่ากลับมาประกาศ', link: '/lesson/2' },
        { title: 'บทที่ 3 เส้นขนาน', link: '/lesson/3' },
        { title: 'บทที่ 4 การให้เหตุผลทางคณิตศาสตร์', link: '/lesson/4' },
        { title: 'บทที่ 5 การแยกตัวประกอบของพหุนามดีกรี', link: '/lesson/5' }
    ],
    details: [
        {
            title: "รายละเอียด",
            items: [
                "คอร์สเรียนพิเศษเตรียมความพร้อมก่อนเปิดเทอม 1",
                "คอร์สเรียนพื้นฐานสอบเข้าม.4",
                "ตัวอย่าง แบบออนไลน์สด",
                "เนื้อหา และ ทริค ครบจบในคอร์สเดียว"
            ]
        },
        {
            title: "เหมาะสำหรับ",
            items: [
                "น้องที่เตรียมสอบความพร้อมก่อนเปิดเทอม"
            ]
        },
        {
            title: "สิ่งที่ได้รับ",
            items: [
                "ไฟล์เอกสารประกอบการเรียน",
                "ไฟล์เฉลยละเอียด",
                "ไลฟ์ VIP ถามได้ตลอดเวลาไม่เข้าใจ",
                "คลิปย้อนหลัง ไม่มีหมดอายุ"
            ]
        }
    ]
};

export default function LearnPage() {
    const [tab, setTab] = useState<"details" | "learn">("details");
    const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
    const [selectedPart, setSelectedPart] = useState<number | null>(null);

    const goToNextPart = () => {
    if (selectedLesson === null || selectedPart === null) return;

    const currentLesson = lessons[selectedLesson];
    const currentParts = currentLesson.parts;

    if (selectedPart < currentParts.length - 1) {
        // ไปตอนถัดไปในบทเดียวกัน
        setSelectedPart(selectedPart + 1);
    } else {
        // ไปบทถัดไป ตอนที่ 0
        const nextLessonIndex = selectedLesson + 1;
        if (nextLessonIndex < lessons.length) {
            const nextLesson = lessons[nextLessonIndex];
            if (nextLesson.parts.length > 0) {
                setSelectedLesson(nextLessonIndex);
                setSelectedPart(0);
            } else {
                // ถ้าบทถัดไปไม่มี part ให้แค่เลือกบท
                setSelectedLesson(nextLessonIndex);
                setSelectedPart(null);
            }
        }
    }
};



    return (
        <main className={styles.background}>
            <div className={styles.container}>
                <button className={styles.backBtn}>
                    &lt; ย้อนกลับ
                </button>
                <h1 className={styles.title}>{courseDetails.title}</h1>
                <p className={styles.code}>{courseDetails.code}</p>
                <div className={styles.learnPageWrapper}>
                    <aside className={styles.sidebar}>
                        <div className={styles.tabButtons}>
                            <button
                                className={`${styles.tabBtn} ${tab === "details" ? styles.activeTab : ""}`}
                                onClick={() => setTab("details")}
                            >
                                รายละเอียด
                            </button>
                            <button
                                className={`${styles.tabBtn} ${tab === "learn" ? styles.activeTab : ""}`}
                                onClick={() => setTab("learn")}
                            >
                                เข้าเรียน
                            </button>
                        </div>

                        {tab === "details" && (
                            <section className={styles.topSection}>
                                <div className={styles.imageBox}>
                                    <Image
                                        src={Course.src}
                                        alt="course book"
                                        fill
                                        className={styles.coverImage}
                                    />
                                </div>

                                <div className={styles.courseInfo}>
                                    <div className={styles.stats}>
                                        {courseDetails.stats.map((stat, index) => (
                                            <div key={index}>
                                                <Image src={stat.icon} alt={stat.label} height={50} width={50} />
                                                <p className={styles.statLabel}>{stat.label}</p>
                                                <p className={styles.statValue}>{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <p className={styles.price}>{courseDetails.price}</p>
                                </div>
                            </section>
                        )}

                        {tab === "learn" && (
                            <ul className={styles.lessonList}>
                                <li
                                    className={`${styles.lessonItem} ${selectedLesson === null && selectedPart === null ? styles.activeLesson : ""}`}
                                    onClick={() => { setSelectedLesson(null); setSelectedPart(null); }}
                                >
                                    ดาวน์โหลดเอกสาร
                                </li>

                                {lessons.map((lesson, index) => (
                                    <li
                                        key={lesson.id}
                                        className={`${styles.lessonItem} ${selectedLesson === index ? styles.activeLesson : ""}`}
                                    >
                                        <div onClick={() => { setSelectedLesson(index); setSelectedPart(null); }}>
                                            {lesson.title}
                                        </div>
                                        {selectedLesson === index && (
                                            <ul className={styles.partList}>
                                                {lesson.parts.map((part, partIndex) => (
                                                    <li
                                                        key={partIndex}
                                                        className={`${styles.partItem} ${selectedPart === partIndex ? styles.activePart : ""}`}
                                                        onClick={() => setSelectedPart(partIndex)}
                                                    >
                                                        {part}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}

                            </ul>
                        )}
                    </aside>

                    {tab === "details" && (
                        <div className={styles.learnContent}>
                            {courseDetails.details.map((detail, index) => (
                                <section key={index} className={styles.detailsSection}>
                                    <h3>{detail.title}</h3>
                                    {detail.items.map((item, idx) => (
                                        <p key={idx}>{item}</p>
                                    ))}
                                    <div className={styles.separator}></div>
                                </section>
                            ))}

                            {/* ตารางบทเรียน */}
                            <section className={styles.lessonSection}>
                                <h3 className={styles.lessonHeader}>บทเรียน</h3>
                                <div className={styles.lessonTable}>
                                    {courseDetails.lessons.map((lesson, index) => (
                                        <button
                                            key={index}
                                            className={styles.lessonButton}
                                            onClick={() => window.location.href = lesson.link}
                                        >
                                            {lesson.title}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {tab === "learn" && (
                        <div className={styles.learnContent}>
                            {selectedLesson === null && selectedPart === null && (
                                <div className={styles.documentDownloadSection}>
                                    <h2 className={styles.titleContent}>ดาวน์โหลดเอกสารการเรียน</h2>
                                    <div className={styles.documentList}>
                                        {[1, 2, 3, 4, 5].map((doc) => (
                                            <a
                                                key={doc}
                                                href={`/documents/file${doc}.pdf`}
                                                download
                                                className={styles.documentItemClickable}
                                            >
                                                <img src={PDF.src} alt="PDF" className={styles.documentIcon} />
                                                <div className={styles.documentInfo}>
                                                    <span className={styles.documentTitle}>เอกสารการเรียนรวม</span>
                                                    <span className={styles.documentSize}>2.53 MB</span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedLesson !== null && selectedPart === null && (
                                <div className={styles.lessonContent}>
                                    <h2 className={styles.titleContent}>{lessons[selectedLesson].title}</h2>
                                    <ul className={styles.partList}>
                                        {lessons[selectedLesson].parts.map((part, partIndex) => (
                                            <li
                                                key={partIndex}
                                                className={styles.partItemContent}
                                                onClick={() => setSelectedPart(partIndex)}
                                            >
                                                {part}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {selectedLesson !== null && selectedPart !== null && (
                                <div className={styles.videoContent}>
                                    <h2 className={styles.titleContent}>{lessons[selectedLesson].title} - {lessons[selectedLesson].parts[selectedPart]}</h2>
                                    <div className={styles.videoPlayer}>Video Player</div>
                                    <button className={styles.nextBtn} onClick={goToNextPart}>ถัดไป</button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}