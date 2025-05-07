"use client";
import Image from 'next/image';
import styles from './courseDetail.module.css';
import Course from "../../img/courseimg.png"
import Time from "../../img/Time.png"
import Watch from "../../img/Watch.png"
import Limit from "../../img/Limit.png"
import QA from "../../img/QA.png"
import Worksheet from "../../img/Worksheet.png"
import Hourglass from "../../img/Hourglass.png"
import Pig from "../../img/Pig.png"

const courseDetails = {
    title: "คณิตศาสตร์ ม. ก่อนเปิดภาคเรียน 2",
    code: "MT015",
    price: "฿990",
    stats: [
        { icon: Time.src, label: "เวลาที่เรียนได้", value: "20 hr." },
        { icon: Watch.src, label: "ระยะเวลา", value: "20 hr." },
        { icon: Limit.src, label: "อายุคอร์ส", value: "20 hr." }
    ],
    lessons: [
        { title: 'คณิตศาสตร์ ม. ก่อนเปิดภาคเรียน 2', link: '/lesson/intro' },
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

export default function CourseDetail() {

    return (
        <main className={styles.container}>

            <button className={styles.backBtn}>
                &lt; ย้อนกลับ
            </button>

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
                    <h1 className={styles.title}>{courseDetails.title}</h1>
                    <p className={styles.code}>{courseDetails.code}</p>

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

                    <div className={styles.actions}>
                        <button className={styles.cart}>เพิ่มลงรถเข็น</button>
                        <button className={styles.buy}>สั่งซื้อ</button>
                    </div>
                </div>
            </section>

            <div className={styles.separator}></div>

            {/* รายละเอียด */}
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

            {/* Section พิเศษ */}
            <section className={styles.specialSection}>
                <h3>เรียนกับ PIG CLASS ได้อะไรบ้าง</h3>
                <div className={styles.specialImageWrapper}>
                    <Image src={Pig.src} alt="เรียนกับ PIG CLASS ได้อะไรบ้าง" width={800} height={200} />
                </div>
            </section>

        </main>
    );
}