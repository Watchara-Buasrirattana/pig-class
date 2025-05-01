"use client";
import { useState } from 'react';
import styles from './course.module.css';
import Image from 'next/image';
import course from '../img/recom-course.png';

const courses = [
    { id: 'M01', title: 'ตะลุยโจทย์สอบเข้า', price: '999 บาท', level: 'ม.1', type: 'พื้นฐาน', image: course },
    { id: 'M02', title: 'ตะลุยโจทย์สอบเข้า', price: '999 บาท', level: 'ม.2', type: 'ตะลุยโจทย์', image: course },
    { id: 'M03', title: 'ตะลุยโจทย์สอบเข้า', price: '999 บาท', level: 'ม.3', type: 'กลางภาค', image: course },
    { id: 'M03', title: 'ตะลุยโจทย์สอบเข้า', price: '999 บาท', level: 'ม.3', type: 'กลางภาค', image: course },
];

const levels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
const types = ['กลางภาค', 'ปลายภาค', 'พื้นฐาน', 'ตะลุยโจทย์'];

export default function CoursePage() {
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

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

    const filteredCourses = courses.filter((course) => {
        const levelMatch = selectedLevels.length === 0 || selectedLevels.includes(course.level);
        const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(course.type);
        return levelMatch && typeMatch;
    });

    return (
        <main className={styles.pageWrapper}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
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
            </aside>

            {/* Main Content */}
            <section className={styles.mainContent}>
                <h2 className={styles.pageTitle}>คอร์สเรียน</h2>

                <div className={styles.courseList}>
                    {filteredCourses.map((course) => (
                        <div key={course.id} className={styles.courseCard}>
                            <div className={styles.imageWrapper}>
                                <Image src={course.image} alt={course.title} width={180} height={240} />
                            </div>
                            <p className={styles.courseTitle}>{course.title}</p>
                            <p className={styles.price}>{course.price}</p>
                            <p className={styles.code}>รหัส {course.id}</p>
                            <div className={styles.actions}>
                                <span className={styles.cart}>🛒</span>
                                <button className={styles.detailBtn}>รายละเอียด</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}