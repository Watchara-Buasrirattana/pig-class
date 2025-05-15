// --- PATH: app/profile/page.tsx หรือ pages/profile.tsx ---
"use client";

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useRef,
} from "react"; // แก้ไข Import
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react"; // **แนะนำ:** Import useSession
import styles from "./profile.module.css"; // ตรวจสอบ Path
import Image from "next/image"; // Import Image

// --- Import Icons ---
import CourseIcon from "../img/Course-icon.png";
import InfoIcon from "../img/Profile-icon.png";
import PaymentIcon from "../img/Payment-icon.png";
import PigIcon from "../img/Pig-icon.png";
import LogoutIcon from "../img/Logout-icon.png";
import defaultAvatar from "../img/Pig-icon.png"; // ตัวอย่างรูป Avatar Default
import Link from "next/link";

// --- Types ---
type UserProfile = {
  id?: number | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  schoolName?: string | null;
  studyLine?: string | null;
  gradeLevel?: string | null;
  role?: string; // เพิ่ม role ถ้าต้องการแสดงผล
  profileImg?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  parentPhone?: string | null;
  point?: number;
};

// Type สำหรับ Form (เฉพาะ Field ที่แก้ไขได้)
type ProfileFormState = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  schoolName: string;
  studyLine: string;
  gradeLevel: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
};

type EnrolledCourseInfo = {
  // Type นี้ควรตรงกับ select ใน API /api/my-courses
  id: number;
  courseName: string;
  courseNumber: string;
  courseImg: string | null;
  description?: string; // Optional
  price?: number; // Optional
};
type OrderItemDetail = {
  id: number;
  courseId: number;
  quantity: number;
  price: number; // ราคา ณ ตอนซื้อ
  course: {
    id: number;
    courseName: string;
    courseImg: string | null;
    courseNumber: string;
  };
};
type PaymentInfo = {
  status: string;
  paymentDate: string | Date;
  totalAmount?: number; // Optional
};
type OrderHistoryItem = {
  id: number;
  orderNumber: string;
  orderDate: string | Date;
  totalPrice: number;
  status: string; // OrderStatus enum (PENDING, PAID, etc.)
  items: OrderItemDetail[];
  payments?: PaymentInfo[]; // Optional
};

function formatDate(dateString: string | Date): string {
  try {
    // สร้าง Date object จาก dateString
    const date = new Date(dateString);

    // ตรวจสอบว่าเป็น Date ที่ถูกต้องหรือไม่
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    // กำหนด Options สำหรับการแสดงผลวันที่และเวลา
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric", // ปีแบบเต็ม
      month: "short", // เดือนแบบย่อ (เช่น ม.ค., ก.พ.)
      day: "numeric", // วันที่
      hour: "2-digit", // ชั่วโมง (2 หลัก)
      minute: "2-digit", // นาที (2 หลัก)
      hour12: false, // (Optional) ใช้ระบบ 24 ชั่วโมง (ถ้าไม่ใส่ หรือ true จะเป็น AM/PM)
    };
    // ใช้ toLocaleDateString เพื่อจัดรูปแบบตาม Locale ไทย
    return date.toLocaleDateString("th-TH", options);
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid Date"; // คืนค่าถ้าเกิด Error
  }
}

export default function ProfilePage() {
  // **แนะนำ:** ใช้ useSession แทน fetch('/api/user')
  const { data: session, status: sessionStatus, update } = useSession();
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseInfo[]>(
    []
  );
  const [isLoadingEnrolledCourses, setIsLoadingEnrolledCourses] =
    useState(true);
  const [errorEnrolledCourses, setErrorEnrolledCourses] = useState<
    string | null
  >(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [isLoadingOrderHistory, setIsLoadingOrderHistory] = useState(true);
  const [errorOrderHistory, setErrorOrderHistory] = useState<string | null>(
    null
  );
  const [activeMenu, setActiveMenu] = useState("info"); // เริ่มที่ info
  const [tab, setTab] = useState("student");
  const [isEditMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // สำหรับ Loading ข้อมูล Profile
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    schoolName: "",
    studyLine: "",
    gradeLevel: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
  });
  const [originalData, setOriginalData] = useState<ProfileFormState>(form);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(
    null
  );
  const [isUploadingProfileImg, setIsUploadingProfileImg] = useState(false);
  const [profileImgUpdateError, setProfileImgUpdateError] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerFileInput = () => {
    fileInputRef.current?.click(); // สั่งให้ input ที่ซ่อนไว้ .click()
  };

  // --- Fetch User Profile Data using session ---
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.id) {
      setIsLoading(true);
      setError(null);
      // ใช้ API endpoint ที่ดึงข้อมูล Profile ของผู้ใช้ที่ login อยู่
      fetch("/api/user") // <<-- แนะนำให้สร้าง API นี้
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                `Failed to fetch profile data (status: ${res.status})`
            );
          }
          return res.json();
        })
        .then((data: UserProfile) => {
          const profileData: ProfileFormState = {
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            phoneNumber: data.phoneNumber || "",
            schoolName: data.schoolName || "",
            studyLine: data.studyLine || "",
            gradeLevel: data.gradeLevel || "",
            parentName: data.parentName || "",
            parentEmail: data.parentEmail || "",
            parentPhone: data.parentPhone || "",
          };
          setForm(profileData);
          setOriginalData(profileData);
          if (data.profileImg) {
            setProfilePreviewUrl(data.profileImg);
          } else {
            setProfilePreviewUrl(PigIcon.src); // หรือ defaultAvatar.src
          }
        })
        .catch((err) => {
          console.error("Fetch Profile Error:", err);
          setError(
            err instanceof Error ? err.message : "Could not load profile data."
          );
        })
        .finally(() => setIsLoading(false));
    } else if (sessionStatus === "unauthenticated") {
      router.push("/login"); // Redirect ถ้ายังไม่ Login
    }
    // ถ้า status เป็น 'loading' จะแสดง Loading ข้างล่าง
  }, [sessionStatus, session, router]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.id) {
      const fetchEnrolledCourses = async () => {
        setIsLoadingEnrolledCourses(true);
        setErrorEnrolledCourses(null);
        try {
          const res = await fetch("/api/my-courses");
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                `Failed to fetch enrolled courses (status: ${res.status})`
            );
          }
          const data: EnrolledCourseInfo[] = await res.json();
          setEnrolledCourses(data);
          console.log("Enrolled courses fetched:", data);
        } catch (err) {
          console.error("Fetch Enrolled Courses Error:", err);
          setErrorEnrolledCourses(
            err instanceof Error
              ? err.message
              : "Could not load enrolled courses."
          );
        } finally {
          setIsLoadingEnrolledCourses(false);
        }
      };
      fetchEnrolledCourses();
    }
  }, [sessionStatus, session]);
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.id) {
      if (activeMenu === "orders") {
        // Fetch เฉพาะเมื่อ Tab "ประวัติการสั่งซื้อ" ถูกเลือก
        const fetchOrderHistory = async () => {
          setIsLoadingOrderHistory(true);
          setErrorOrderHistory(null);
          try {
            const res = await fetch("/api/orders/my-history");
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(
                errorData.error ||
                  `Failed to fetch order history (status: ${res.status})`
              );
            }
            const data: OrderHistoryItem[] = await res.json();
            setOrderHistory(data);
            console.log("Order history fetched:", data);
          } catch (err) {
            console.error("Fetch Order History Error:", err);
            setErrorOrderHistory(
              err instanceof Error
                ? err.message
                : "Could not load order history."
            );
          } finally {
            setIsLoadingOrderHistory(false);
          }
        };
        fetchOrderHistory();
      }
    }
  }, [sessionStatus, session, activeMenu]);

  // --- Handlers ---
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true); // หรือ isSaving state
    setError(null);
    try {
      const res = await fetch("/api/user", {
        // <<-- API สำหรับ Update
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update profile (status: ${res.status})`
        );
      }
      const updatedProfile: UserProfile = await res.json();
      // อัปเดต Form และ Original Data ด้วยข้อมูลใหม่
      const updatedFormData: ProfileFormState = {
        firstName: updatedProfile.firstName || "",
        lastName: updatedProfile.lastName || "",
        phoneNumber: updatedProfile.phoneNumber || "",
        schoolName: updatedProfile.schoolName || "",
        studyLine: updatedProfile.studyLine || "",
        gradeLevel: updatedProfile.gradeLevel || "",
        parentName: updatedProfile.parentName || "",
        parentEmail: updatedProfile.parentEmail || "",
        parentPhone: updatedProfile.parentPhone || "",
      };
      setForm(updatedFormData);
      setOriginalData(updatedFormData);
      setEditMode(false);
      alert("บันทึกข้อมูลสำเร็จ!");
      // ควรจะอัปเดต session ด้วย session.update() ถ้าต้องการให้ชื่อใน sidebar เปลี่ยนทันที
    } catch (err) {
      console.error("Save Profile Error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`บันทึกข้อมูลไม่สำเร็จ: ${errorMsg}`);
      // ไม่ต้อง alert เพราะจะแสดง error ใน UI
    } finally {
      setIsLoading(false);
    }
  };
  const handleProfileImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Optional: Client-side validation (type, size)
      if (file.size > 2 * 1024 * 1024) {
        // เช่น ไม่เกิน 2MB
        alert("ขนาดไฟล์รูปภาพต้องไม่เกิน 2MB");
        e.target.value = ""; // เคลียร์ input
        return;
      }
      setProfileImageFile(file);
      if (profilePreviewUrl && profilePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePreviewUrl); // Cleanup URL เก่าที่เป็น blob
      }
      setProfilePreviewUrl(URL.createObjectURL(file));
      setProfileImgUpdateError(null); // เคลียร์ Error เก่า
    }
  };
  const handleCancelEdit = () => {
    setForm(originalData);
    setEditMode(false);
    setError(null); // Clear error on cancel
  };
  useEffect(() => {
    const currentPreview = profilePreviewUrl;
    return () => {
      if (currentPreview && currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, [profilePreviewUrl]);
  const handleProfileImageUploadAndSave = async () => {
    if (!profileImageFile) {
      alert("กรุณาเลือกรูปภาพใหม่ก่อน");
      return;
    }
    if (!session?.user?.id) {
      alert("ไม่พบข้อมูลผู้ใช้ กรุณา Login ใหม่");
      return;
    }

    setIsUploadingProfileImg(true);
    setProfileImgUpdateError(null);
    let newImageUrl = "";

    // 1. อัปโหลดรูปภาพใหม่
    const imgFormData = new FormData();
    imgFormData.append("file", profileImageFile);
    try {
      console.log("Uploading new profile image...");
      const uploadRes = await fetch("/api/upload-image", {
        // ใช้ API Upload เดิม
        method: "POST",
        body: imgFormData,
      });
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Image upload failed (status: ${uploadRes.status})`
        );
      }
      const uploadResult = await uploadRes.json();
      newImageUrl = uploadResult.url;
      console.log("New profile image URL:", newImageUrl);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown image upload error";
      setProfileImgUpdateError(`อัปโหลดรูปไม่สำเร็จ: ${errorMsg}`);
      setIsUploadingProfileImg(false);
      return;
    }

    // 2. อัปเดต User Profile ด้วย URL รูปใหม่
    try {
      console.log(
        `Updating profile for user ${session.user.id} with image: ${newImageUrl}`
      );
      const res = await fetch(`/api/user`, {
        // API อัปเดต Profile
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImg: newImageUrl }), // ส่งแค่ field ที่เปลี่ยน
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to update profile image (status: ${res.status})`
        );
      }
      const updatedUser: UserProfile = await res.json();
      alert("เปลี่ยนรูปโปรไฟล์สำเร็จ!");
      setProfileImageFile(null); // เคลียร์ไฟล์ที่เลือก
      // อัปเดต session เพื่อให้รูปใหม่แสดงผลทันที (สำคัญ!)
      if (session) {
        // ตรวจสอบว่า session มีค่าก่อน
        await update({
          // เรียกใช้ฟังก์ชัน update ที่ได้จาก useSession
          ...session, // ส่ง session object เดิมเข้าไปด้วย
          user: {
            ...session.user,
            image: updatedUser.profileImg, // อัปเดตเฉพาะ image ใน user object
          },
        });
        console.log("Session updated with new profile image.");
      }
      // setProfilePreviewUrl(updatedUser.profileImg || defaultAvatar.src); // อัปเดต Preview เป็นรูปใหม่จาก DB
      // หรือให้ useEffect ที่ดึง Profile ทำงานใหม่ โดยการ reload หรือเปลี่ยน dependency
      // window.location.reload(); // วิธีง่ายสุด แต่ไม่ดีเท่า updateSession
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error updating profile";
      setProfileImgUpdateError(`บันทึกรูปโปรไฟล์ไม่สำเร็จ: ${errorMsg}`);
    } finally {
      setIsUploadingProfileImg(false);
    }
  };
  // --- Loading / Unauthenticated Check ---
  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }
  // useEffect จะจัดการ redirect ถ้า unauthenticated
  if (!session?.user) {
    return (
      <div className="flex justify-center items-center h-screen">
        Please log in.
      </div>
    );
  }

  // --- JSX Structure (แก้ไขให้ถูกต้อง) ---
  return (
    <div className={styles.container}>
      {/* --- Sidebar (Rendered Once) --- */}
      <aside className={styles.sidebar}>
        <div
          className={`${styles.avatarBox} ${styles.clickableProfileImage}`}
          onClick={triggerFileInput}
          title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
        >
          <Image
            src={profilePreviewUrl || session.user.image || defaultAvatar.src} // แสดง Preview ถ้ามี หรือรูปจาก session หรือ default
            alt="avatar"
            width={80}
            height={80}
            className={styles.avatar}
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultAvatar.src;
            }}
          />

          <div className="font-semibold mt-2">
            {" "}
            {/* เพิ่ม margin top */}
            {/* ใช้ชื่อจาก session (ถ้ามี) หรือจาก form/user state */}
            {session.user.name ||
              `${form.firstName} ${form.lastName}`.trim() ||
              session.user.email}
            {session.user.role && (
              <span className="block text-xs text-gray-300 capitalize mt-1">
                ({session.user.role})
              </span>
            )}
          </div>
        </div>
        <input
          type="file"
          id="profileImageInputHidden" // เปลี่ยน ID ไม่ให้ซ้ำกับ Label ถ้ามี
          accept="image/*"
          ref={fileInputRef} // <<-- ผูก Ref
          onChange={handleProfileImageChange}
          className={styles.hiddenFileInput} // <<-- Class สำหรับซ่อน
          style={{ display: 'none' }} // หรือซ่อนด้วย Style โดยตรง
        />
        <ul className={styles.sidebarMenu}>
          {[
            { key: "courses", icon: CourseIcon, label: "คอร์สของฉัน" },
            { key: "info", icon: InfoIcon, label: "ข้อมูลส่วนตัว" },
            { key: "orders", icon: PaymentIcon, label: "ประวัติการสั่งซื้อ" },
            { key: "points", icon: PigIcon, label: "แต้มการสะสม" },
          ].map(({ key, icon, label }) => (
            <li
              key={key}
              onClick={() => {
                if (!isEditMode) setActiveMenu(key);
                else alert("กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนเปลี่ยนเมนู");
              }}
              className={`${styles.menuItem} ${
                activeMenu === key ? styles.active : ""
              } ${
                isEditMode ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2">
                <Image
                  src={icon}
                  alt={`icon-${key}`}
                  width={25}
                  height={25}
                  className={`${styles.menuIcon} ${
                    activeMenu === key ? "" : "grayscale"
                  }`}
                />
                {label}
              </div>
            </li>
          ))}
          {/* Logout Button */}
          <li
            onClick={() => {
              if (isEditMode) {
                alert("กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนออกจากระบบ");
                return;
              }
              if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
                signOut({ callbackUrl: "/login" }); // ไปหน้า Login หลัง Logout
              }
            }}
            className={`${
              styles.menuItem
            } text-red-400 hover:bg-red-600 hover:text-white mt-4 ${
              isEditMode ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`}
          >
            <Image
              src={LogoutIcon}
              alt="logout icon"
              width={25}
              height={25}
              className={styles.menuIcon}
            />
            <span className="ml-2">ออกจากระบบ</span>
          </li>
        </ul>
      </aside>
      {/* --- Content Area (Rendered Once) --- */}
      <div className={styles.content}>
        {/* --- ส่วนแสดง Error ทั่วไปของหน้านี้ --- */}
        {error && (
          <div
            className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* --- Conditional Rendering based on activeMenu --- */}
        {activeMenu === "courses" && (
          <div>
            <h2 className={styles.titleWithBar}>
              <span className={styles.blueBar}></span>คอร์สของฉัน
            </h2>
            {isLoadingEnrolledCourses && (
              <p className="text-gray-500">กำลังโหลดคอร์สของคุณ...</p>
            )}
            {errorEnrolledCourses && (
              <p className="text-red-500">Error: {errorEnrolledCourses}</p>
            )}

            {!isLoadingEnrolledCourses &&
              !errorEnrolledCourses &&
              (enrolledCourses.length > 0 ? (
                <div className={styles.courseListGrid}>
                  {" "}
                  {/* สร้าง Class นี้ใน CSS เพื่อจัดเรียง Card */}
                  {enrolledCourses.map((course) => (
                    // --- ใช้ CourseCard Component ที่เรามี (ต้องแน่ใจว่า Prop เข้ากันได้) ---
                    // --- หรือสร้าง Component ใหม่สำหรับแสดง Enrolled Course Card ---
                    <div
                      key={course.id}
                      className={styles.courseCardItem}
                      style={{ width: "16rem" }}
                    >
                      {" "}
                      {/* Style สำหรับแต่ละ Card */}
                      <Image
                        src={course.courseImg || defaultAvatar.src} // ใช้ defaultAvatar ถ้า courseImg ไม่มี
                        alt={course.courseName || "Course Image"}
                        width={250} // ปรับขนาดตามต้องการ
                        height={150}
                        className="rounded-md object-cover w-full" // ให้เต็มความกว้างของ Card
                      />
                      <h3
                        className="font-medium mb-1"
                        title={course.courseName}
                      >
                        {course.courseName}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">
                        รหัส {course.courseNumber}
                      </p>
                      <p className="text-right text-gray-400 mb-3">
                        {course.price} บาท
                      </p>
                      {/* อาจจะเพิ่ม Description สั้นๆ */}
                      {/* <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p> */}
                      <Link
                        href={`/learn/${course.id}`} // <<-- Path ไปยังหน้าเรียนของคอร์สนั้น
                        className="mt-3 block w-full text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        เข้าเรียน
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  คุณยังไม่ได้ลงทะเบียนคอร์สเรียนใดๆ
                </p>
              ))}
          </div>
        )}

        {activeMenu === "info" && (
          <div>
            <h2 className={styles.titleWithBar}>
              <span className={styles.blueBar}></span>ข้อมูลส่วนตัว
            </h2>
            <div className={styles.tabBar}>
              <div
                className={`${styles.tab} ${
                  tab === "student" ? styles.active : ""
                }`}
                onClick={() => setTab("student")}
              >
                นักเรียน
              </div>
              <div
                className={`${styles.tab} ${
                  tab === "parent" ? styles.active : ""
                }`}
                onClick={() => setTab("parent")}
              >
                ผู้ปกครอง
              </div>
            </div>
            {/* ใช้ Form ครอบเพื่อใหปุ่ม Save/Cancel ทำงานกับ form ได้ */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
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
                        value={session.user.email!}
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
                        value={form.phoneNumber || ""}
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
                        value={form.schoolName || ""}
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
                        value={form.studyLine || ""}
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
                        value={form.gradeLevel || ""}
                        onChange={handleChange}
                        disabled={!isEditMode}
                      />
                    </div>
                  </>
                ) : (
                  // Parent Tab
                  <>
                    <div>
                      <label className={styles.label}>ชื่อผู้ปกครอง</label>
                      <input
                        className={styles.input}
                        type="text"
                        placeholder="ชื่อ - นามสกุล"
                        name="parentName"
                        value={form.parentName || ""}
                        onChange={handleChange}
                        disabled={!isEditMode}
                      />
                    </div>
                    <div>
                      <label className={styles.label}>E-mail ผู้ปกครอง</label>
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
                      <label className={styles.label}>
                        เบอร์โทรศัพท์ผู้ปกครอง
                      </label>
                      <input
                        className={styles.input}
                        type="tel"
                        placeholder="เบอร์โทรศัพท์"
                        name="parentPhone"
                        value={form.parentPhone || ""}
                        onChange={handleChange}
                        disabled={!isEditMode}
                      />
                    </div>
                  </>
                )}
              </div>
              {/* Edit/Save/Cancel Buttons */}
              <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                {isEditMode ? (
                  <>
                    <button
                      type="button"
                      className={styles.buttonOutline}
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      ยกเลิก
                    </button>
                    {/* ปุ่ม Save อยู่ใน form ใช้ type="submit" ได้ */}
                    <button
                      type="submit"
                      className={styles.button}
                      disabled={isLoading}
                    >
                      {isLoading ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => {
                      setOriginalData(form);
                      setEditMode(true);
                    }}
                    disabled={isLoading}
                  >
                    แก้ไข
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* --- Order History Section --- */}
        {activeMenu === "orders" && (
          <div>
            <h2 className={styles.titleWithBar}>
              <span className={styles.blueBar}></span>ประวัติการสั่งซื้อ
            </h2>
            {isLoadingOrderHistory && (
              <p className="text-gray-500">กำลังโหลดประวัติการสั่งซื้อ...</p>
            )}
            {errorOrderHistory && (
              <p className="text-red-500">Error: {errorOrderHistory}</p>
            )}

            {!isLoadingOrderHistory &&
              !errorOrderHistory &&
              (orderHistory.length > 0 ? (
                <div className="space-y-6">
                  {orderHistory.map((order) => (
                    <div
                      key={order.id}
                      className={`${styles.card} p-4 shadow-lg`}
                    >
                      <div className="flex justify-between items-start mb-3 pb-3 border-b">
                        <div>
                          <p className="text-sm text-gray-500">
                            Order Number:{" "}
                            <span className="font-medium text-gray-700">
                              {order.orderNumber}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            Date:{" "}
                            <span className="font-medium text-gray-700">
                              {formatDate(order.orderDate)}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            ฿{order.totalPrice.toLocaleString()}
                          </p>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : order.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-md font-semibold mb-2">
                        รายการในคำสั่งซื้อ:
                      </h4>
                      <ul className="space-y-2">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-3 p-2 border-b border-gray-100 last:border-b-0"
                          >
                            <Image
                              src={item.course.courseImg || defaultAvatar.src}
                              alt={item.course.courseName}
                              width={48}
                              height={32} // สัดส่วนอาจจะปรับ
                              className="rounded object-cover"
                            />
                            <div className="flex-grow">
                              <p className="text-sm font-medium text-gray-800">
                                {item.course.courseName}
                              </p>
                              <p className="text-xs text-gray-500">
                                รหัส: {item.course.courseNumber}
                              </p>
                            </div>
                            <div className="text-sm text-gray-700 text-right">
                              <p>จำนวน: {item.quantity}</p>
                              <p>ราคา: ฿{item.price.toLocaleString()}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {/* (Optional) แสดงข้อมูล Payment */}
                      {order.payments && order.payments.length > 0 && (
                        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                          Payment: {order.payments[0].status} on{" "}
                          {formatDate(order.payments[0].paymentDate)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  คุณยังไม่มีประวัติการสั่งซื้อ
                </p>
              ))}
          </div>
        )}

        {activeMenu === "points" && (
          <div>
            <h2 className={styles.titleWithBar}>
              <span className={styles.blueBar}></span>แต้มการสะสม
            </h2>
            <p>(ส่วนแสดงแต้ม ยังไม่ได้ Implement)</p>
            <div className={styles.pointsCard}>
              <p>เหรียญ pig</p>
              <Image
                src="/pig-coin.png"
                alt="pig coin"
                width={40}
                height={40}
                className="mx-auto my-2"
              />
              {/* ควรใช้ Point จาก User state ที่ fetch มา */}
              <p className="text-2xl font-bold">{/* user?.point ?? 0 */ 5}</p>
            </div>
          </div>
        )}
      </div>{" "}
      {/* End Content Area */}
    </div> // End Container
  );
}
