"use client"
import { useEffect, useState } from "react"
import styles from './profile.module.css'
import CourseIcon from '../img/Course-icon.png'
import InfoIcon from '../img/Profile-icon.png'
import PaymentIcon from '../img/Payment-icon.png'
import PigIcon from '../img/Pig-icon.png'
import LogoutIcon from '../img/Logout-icon.png'

export default function ProfilePage() {
    const [activeMenu, setActiveMenu] = useState("courses")
    const [tab, setTab] = useState("student")
    const [isEditMode, setEditMode] = useState(false)
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        schoolName: "",
        studyLine: "",
        gradeLevel: "",
        parentFirstName: "",
        parentLastName: "",
        parentEmail: "",
        parentPhoneNumber: ""
    })
    const [originalData, setOriginalData] = useState(form)
    const [user, setUser] = useState < any > (null)

    useEffect(() => {
        fetch("/api/user")
            .then(res => res.json())
            .then(data => {
                setUser(data)
                setForm({
                    firstName: data.firstName || "",
                    lastName: data.lastName || "",
                    phoneNumber: data.phoneNumber || "",
                    schoolName: data.schoolName || "",
                    studyLine: data.studyLine || "",
                    gradeLevel: data.gradeLevel || "",
                    parentFirstName: data.parentFirstName || "",
                    parentLastName: data.parentLastName || "",
                    parentEmail: data.parentEmail || "",
                    parentPhoneNumber: data.parentPhoneNumber || ""
                })
            })
    }, [])

    const handleChange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSave = async () => {
        const res = await fetch("/api/user", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        })
        if (res.ok) {
            const updated = await res.json()
            setUser(updated)
            setEditMode(false)
        }
    }

    if (!user) return <p>Loading...</p>


    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.avatarBox}>
                    <img src={PigIcon.src} alt="avatar" className={styles.avatar} />
                    <div className="font-semibold">ชื่อ นามสกุล</div>
                </div>
                <ul className={styles.sidebarMenu}>
                    {[
                        { key: "courses", icon: CourseIcon, label: "คอร์สของฉัน" },
                        { key: "info", icon: InfoIcon, label: "ข้อมูลส่วนตัว" },
                        { key: "orders", icon: PaymentIcon, label: "ประวัติการสั่งซื้อ" },
                        { key: "points", icon: PigIcon, label: "แต้มการสะสม" }
                    ].map(({ key, icon, label }) => (
                        <li
                            key={key}
                            onClick={() => setActiveMenu(key)}
                            className={`${styles.menuItem} ${activeMenu === key ? styles.active : ""}`}
                        >
                            <div className="flex items-center gap-2">
                                <img
                                    src={icon.src}
                                    alt={`icon-${key}`}
                                    width={25}
                                    height={25}
                                    className={`${styles.menuIcon} ${activeMenu === key ? "" : "grayscale"}`}
                                />
                                {label}
                            </div>
                        </li>
                    ))}
                    <li onClick={() => alert("ออกจากระบบ")} className={`${styles.menuItem} text-red-600 hover:underline mt-4`}>
                        <img src={LogoutIcon.src} alt="icon" width={25} height={25} className={styles.menuIcon} /> <span className="ml-2">ออกจากระบบ</span>
                    </li>
                </ul>
            </aside>

            {/* Content Area */}
            <div className={styles.content}>
                {activeMenu === "courses" && (
                    <div>
                        <h2 className={styles.titleWithBar}>
                            <span className={styles.blueBar}></span>
                            คอร์สของฉัน
                        </h2>
                        <div className={styles.card} style={{ width: '16rem' }}>
                            <p className="font-medium mb-1">คณิตศาสตร์ ม.2 ก่อนเปิดภาคเรียนที่ 1</p>
                            <p className="text-sm text-gray-400 mb-2">รหัส M05</p>
                            <img src="/course-cover.png" alt="course" className="mb-2" />
                            <p className="text-right text-gray-600 mb-3">999 บาท</p>
                            <button className="bg-blue-600 text-white w-full py-2 rounded">เข้าเรียน</button>
                        </div>
                    </div>
                )}

                {activeMenu === "info" && (
                    <div>
                        <h2 className={styles.titleWithBar}>
                            <span className={styles.blueBar}></span>
                            ข้อมูลส่วนตัว
                        </h2>

                        <div className={styles.tabBar}>
                            <div
                                className={`${styles.tab} ${tab === "student" ? styles.active : ""}`}
                                onClick={() => setTab("student")}
                            >
                                นักเรียน
                            </div>
                            <div
                                className={`${styles.tab} ${tab === "parent" ? styles.active : ""}`}
                                onClick={() => setTab("parent")}
                            >
                                ผู้ปกครอง
                            </div>
                        </div>
                        <div className={styles.formGrid}>
                            {tab === "student" ? (
                                <>
                                    <div>
                                        <label className={styles.label}>ชื่อ</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="ชื่อ"
                                            name="firstName"
                                            value={form.firstName}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>นามสกุล</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="นามสกุล"
                                            name="lastName"
                                            value={form.lastName}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>E-mail</label>
                                        <input
                                            className={styles.input}
                                            type="email"
                                            value="example@email.com"
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>เบอร์โทรศัพท์</label>
                                        <input
                                            className={styles.input}
                                            type="tel"
                                            placeholder="เบอร์โทรศัพท์"
                                            name="phoneNumber"
                                            value={form.phoneNumber}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>โรงเรียน</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="โรงเรียน"
                                            name="schoolName"
                                            value={form.schoolName}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>สายการเรียน</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="สายการเรียน"
                                            name="studyLine"
                                            value={form.studyLine}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>ระดับชั้น</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="ระดับชั้น"
                                            name="gradeLevel"
                                            value={form.gradeLevel}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className={styles.label}>ชื่อ</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="ชื่อ"
                                            name="parentFirstName"
                                            value={form.parentFirstName || ""}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>นามสกุล</label>
                                        <input
                                            className={styles.input}
                                            type="text"
                                            placeholder="นามสกุล"
                                            name="parentLastName"
                                            value={form.parentLastName || ""}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>E-mail</label>
                                        <input
                                            className={styles.input}
                                            type="email"
                                            placeholder="E-mail"
                                            name="parentEmail"
                                            value={form.parentEmail || ""}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>เบอร์โทรศัพท์</label>
                                        <input
                                            className={styles.input}
                                            type="tel"
                                            placeholder="เบอร์โทรศัพท์"
                                            name="parentPhoneNumber"
                                            value={form.parentPhoneNumber || ""}
                                            onChange={handleChange}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className='flex justify-end gap-4'>
                            {isEditMode ? (
                                <>
                                    <button
                                        className={styles.button}
                                        onClick={() => {
                                            setForm(originalData)
                                            setEditMode(false)
                                        }}
                                        style={{ borderColor: '#DC2626', color: '#DC2626' }}
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        className={styles.button}
                                        onClick={() => {
                                            setOriginalData(form)
                                            setEditMode(false)
                                        }}
                                    >
                                        บันทึก
                                    </button>
                                </>
                            ) : (
                                <button
                                    className={styles.button}
                                    onClick={() => {
                                        setOriginalData(form)
                                        setEditMode(true)
                                    }}
                                >
                                    แก้ไข
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeMenu === "orders" && (
                    <div>
                        <h2 className={styles.titleWithBar}>
                            <span className={styles.blueBar}></span>
                            ประวัติการสั่งซื้อ
                        </h2>
                        <div className={`${styles.card} flex items-center gap-4 max-w-3xl`}>
                            <img src="/course-cover.png" alt="order" className="w-24 h-auto rounded" />
                            <div className="flex-1">
                                <p className="font-medium">คณิตศาสตร์ ม.2 ก่อนเปิดภาคเรียนที่ 1</p>
                                <p className="text-sm text-gray-500 mt-1">สั่งซื้อเมื่อ: 12 กันยา 2568</p>
                                <p className="text-sm text-gray-500">เลขที่คำสั่งซื้อ: 2225566</p>
                            </div>
                            <div className="text-right text-lg text-gray-600">฿999</div>
                        </div>
                    </div>
                )}

                {activeMenu === "points" && (
                    <div>
                        <h2 className={styles.titleWithBar}>
                            <span className={styles.blueBar}></span>
                            แต้มการสะสม
                        </h2>
                        <div className={styles.pointsCard}>
                            <p className="text-lg font-semibold">เหรียญ pig</p>
                            <img src="/pig-coin.png" alt="pig coin" className="w-10 h-10 mx-auto my-2" />
                            <p className="text-2xl font-bold">5</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}