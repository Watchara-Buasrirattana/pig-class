// --- PATH EXAMPLE: app/learn/[courseId]/page.tsx ---
// หรือ app/learn/[courseId]/lesson/[lessonId]/page.tsx (ต้องปรับการรับ params)
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation"; // สำหรับ App Router
import Image from "next/image";
import Link from "next/link"; // ถ้าต้องการ Link
import styles from "./learn.module.css"; // <<-- ตรวจสอบ Path CSS Module

// --- Import Icons ---
import defaultCourseImage from "../../img/courseimg.png";
import TimeIcon from "../../img/Time.png";
import LimitIcon from "../../img/Limit.png";
import PDFIcon from "../../img/pdf.png"; // ไอคอน PDF

// --- Types ---
type VideoInfo = {
  id: number;
  title: string;
  url: string;
  order?: number | null /* ... fields อื่นๆ ของ Video ... */;
};
type LessonInfoForLearnPage = {
  id: number;
  title: string;
  lessonNumber: number;
  videos: VideoInfo[]; // แต่ละ Lesson มี Videos array
  // description?: string; // อาจจะมีคำอธิบายบทเรียน
};
type DocumentInfo = {
  id: number;
  title: string;
  fileUrl: string;
  fileSize?: number;
};

type CourseLearnData = {
  // ข้อมูล Course ที่จำเป็นสำหรับหน้าเรียน
  id: number;
  courseName: string;
  courseNumber: string;
  courseImg: string | null;
  lessons: LessonInfoForLearnPage[];
  documents: DocumentInfo[]; // เอกสารของคอร์ส
  // ... fields อื่นๆ ของ Course ที่อาจจะจำเป็น ...
};

// --- Component หลัก ---
export default function LearnPage() {
  const router = useRouter();
  const params = useParams();
  const searchParamsHook = useSearchParams(); // สำหรับ Query Params เช่น ?part=...

  const courseId = params?.courseId as string | undefined;
  // --- การจัดการ Lesson ID และ Video/Part ID ที่กำลังดู ---
  // อาจจะมาจาก Path (เช่น /learn/[cid]/lesson/[lid]) หรือ Query Param
  const initialLessonId = params?.lessonId as string | undefined; // ถ้ามีใน Path
  const initialVideoId = searchParamsHook?.get("videoId") as string | undefined; // หรือ ?part=...

  const [courseData, setCourseData] = useState<CourseLearnData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"details" | "learn">("learn"); // เริ่มที่ Tab เรียน
  const [selectedLesson, setSelectedLesson] =
    useState<LessonInfoForLearnPage | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);

  // --- Fetch Course Data (including Lessons, Videos, Documents) ---
  useEffect(() => {
    if (courseId) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/courses/${courseId}/learn-details`) // <<-- เรียก API ใหม่นี้
        .then(async (res) => {
          if (!res.ok)
            throw new Error(
              `Failed to fetch course data (status: ${res.status})`
            );
          return res.json();
        })
        .then((data: CourseLearnData) => {
          setCourseData(data);
          // --- Set initial selected lesson/video based on URL if needed ---
          if (data.lessons && data.lessons.length > 0) {
            let initialL: LessonInfoForLearnPage | undefined = undefined;
            if (initialLessonId) {
              initialL = data.lessons.find(
                (l) => l.id === parseInt(initialLessonId)
              );
            }
            if (!initialL) initialL = data.lessons[0]; // ถ้าไม่ระบุ ให้เลือกบทแรก

            if (initialL) {
              setSelectedLesson(initialL);
              if (initialL.videos && initialL.videos.length > 0) {
                let initialV: VideoInfo | undefined = undefined;
                if (initialVideoId) {
                  initialV = initialL.videos.find(
                    (v) => v.id === parseInt(initialVideoId)
                  );
                }
                if (!initialV) initialV = initialL.videos[0]; // วิดีโอแรกของบท
                setSelectedVideo(initialV);
              } else {
                setSelectedVideo(null); // บทเรียนนี้ไม่มีวิดีโอ
              }
            }
          }
        })
        .catch((err) => {
          setError(err.message);
          console.error(err);
        })
        .finally(() => setIsLoading(false));
    } else {
      setError("Course ID not provided.");
      setIsLoading(false);
    }
  }, [courseId, initialLessonId, initialVideoId]); // ทำงานเมื่อ ID เปลี่ยน

  // --- Handlers ---
  const handleSelectLesson = (lesson: LessonInfoForLearnPage) => {
    setSelectedLesson(lesson);
    // เมื่อเลือกบทเรียนใหม่ ให้เลือกวิดีโอแรกของบทนั้น (ถ้ามี)
    if (lesson.videos && lesson.videos.length > 0) {
      setSelectedVideo(lesson.videos[0]);
      // Optional: Update URL with router.push(...) to reflect current lesson/video
    } else {
      setSelectedVideo(null); // บทเรียนนี้ไม่มีวิดีโอ
    }
    setActiveTab("learn"); // สลับไป Tab เรียนเสมอเมื่อเลือกบท
  };

  const handleSelectVideo = (video: VideoInfo) => {
    setSelectedVideo(video);
    // Optional: Update URL
  };

  const goToNextVideo = () => {
    if (!selectedLesson || !selectedVideo || !courseData?.lessons) return;

    const currentLessonIndex = courseData.lessons.findIndex(
      (l) => l.id === selectedLesson.id
    );
    const currentVideoIndex = selectedLesson.videos.findIndex(
      (v) => v.id === selectedVideo.id
    );

    if (currentVideoIndex < selectedLesson.videos.length - 1) {
      // ไปวิดีโอถัดไปในบทเดียวกัน
      setSelectedVideo(selectedLesson.videos[currentVideoIndex + 1]);
    } else {
      // ไปบทถัดไป (ถ้ามี) และเลือกวิดีโอแรกของบทนั้น
      const nextLessonIndex = currentLessonIndex + 1;
      if (nextLessonIndex < courseData.lessons.length) {
        const nextLesson = courseData.lessons[nextLessonIndex];
        setSelectedLesson(nextLesson);
        if (nextLesson.videos && nextLesson.videos.length > 0) {
          setSelectedVideo(nextLesson.videos[0]);
        } else {
          setSelectedVideo(null);
        }
      } else {
        alert("ยินดีด้วย! คุณเรียนจบคอร์สนี้แล้ว");
        // อาจจะทำอย่างอื่น เช่น Redirect หรือแสดง Completion Status
      }
    }
  };

  // --- Render States ---
  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading learning page...
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-500">
        <p>Error: {error}</p>
        <button onClick={() => router.back()} className="mt-4">
          Go Back
        </button>
      </div>
    );
  if (!courseData)
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        Course data not found.
      </div>
    );

  function convertToEmbedUrl(url: string): string {
    let videoId = "";
    if (url.includes("youtube.com/watch?v=")) {
      videoId = new URL(url).searchParams.get("v") || "";
    } else if (url.includes("youtu.be/")) {
      videoId = new URL(url).pathname.substring(1);
    }
    // เพิ่มเงื่อนไขสำหรับ URL รูปแบบอื่นๆ ถ้ามี
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`; // เพิ่ม autoplay=1 ถ้าต้องการ
    }
    return url; // ถ้าไม่ใช่ YouTube URL ก็คืน URL เดิม
  }

  return (
    <main className={styles.background}>
      {" "}
      {/* Class สำหรับพื้นหลังสีเทา */}
      {/* <Navbar /> */}
      <div className={styles.learnPageContainer}>
        {" "}
        {/* Container หลัก จำกัดความกว้าง */}
        <button
          onClick={() => router.push(`/course/${courseId}`)}
          className={styles.backToCourseBtn}
        >
          &lt; กลับไปหน้าข้อมูลคอร์ส
        </button>
        <h1 className={styles.courseLearnTitle}>{courseData.courseName}</h1>
        {selectedLesson && (
          <p className={styles.currentLessonTitle}>
            บทที่ {selectedLesson.lessonNumber}: {selectedLesson.title}
          </p>
        )}
        {selectedVideo && (
          <p className={styles.currentVideoTitle}>ตอน: {selectedVideo.title}</p>
        )}
        <div className={styles.learnLayoutWrapper}>
          {" "}
          {/* Wrapper สำหรับ Sidebar และ Content */}
          {/* --- Sidebar แสดงรายการบทเรียน/เอกสาร --- */}
          <aside className={styles.learnSidebar}>
            <div className={styles.tabButtons}>
              <button
                className={`${styles.tabBtn} ${
                  activeTab === "learn" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab("learn")}
              >
                บทเรียน
              </button>
              <button
                className={`${styles.tabBtn} ${
                  activeTab === "details" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab("details")}
              >
                เอกสารประกอบ
              </button>
            </div>

            {activeTab === "learn" && (
              <ul className={styles.lessonListSidebar}>
                {courseData.lessons
                  ?.sort((a, b) => a.lessonNumber - b.lessonNumber)
                  .map((lesson) => (
                    <li
                      key={lesson.id}
                      className={`${styles.lessonItemSidebar} ${
                        selectedLesson?.id === lesson.id
                          ? styles.activeLessonSidebar
                          : ""
                      }`}
                    >
                      <div
                        onClick={() => handleSelectLesson(lesson)}
                        className={styles.lessonTitleClickable}
                      >
                        {lesson.lessonNumber}. {lesson.title}
                      </div>
                      {/* แสดง "ตอน" ย่อยๆ ถ้าบทเรียนนั้นถูกเลือก */}
                      {selectedLesson?.id === lesson.id &&
                        lesson.videos &&
                        lesson.videos.length > 0 && (
                          <ul className={styles.partListSidebar}>
                            {lesson.videos
                              .sort(
                                (a, b) => (a.order ?? a.id) - (b.order ?? b.id)
                              )
                              .map((video) => (
                                <li
                                  key={video.id}
                                  className={`${styles.partItemSidebar} ${
                                    selectedVideo?.id === video.id
                                      ? styles.activePartSidebar
                                      : ""
                                  }`}
                                  onClick={() => handleSelectVideo(video)}
                                >
                                  - {video.title}
                                </li>
                              ))}
                          </ul>
                        )}
                    </li>
                  ))}
              </ul>
            )}

            {activeTab === "details" && (
              <div className={styles.documentDownloadSection}>
                <h2 className={styles.sidebarSectionTitle}>
                  เอกสารประกอบการเรียน
                </h2>
                {courseData.documents && courseData.documents.length > 0 ? (
                  <div className={styles.documentList}>
                    {courseData.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl} // URL จาก DB
                        target="_blank" // เปิดใน Tab ใหม่
                        rel="noopener noreferrer"
                        download // บอกให้ Browser Download (ถ้า Server อนุญาต)
                        className={styles.documentItemClickable}
                      >
                        <Image
                          src={PDFIcon.src}
                          alt="PDF"
                          className={styles.documentIcon}
                          width={24}
                          height={24}
                        />
                        <div className={styles.documentInfo}>
                          <span className={styles.documentTitle}>
                            {doc.title}
                          </span>
                          {doc.fileSize && (
                            <span className={styles.documentSize}>
                              ({(doc.fileSize / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 p-3">
                    ไม่มีเอกสารสำหรับคอร์สนี้
                  </p>
                )}
              </div>
            )}
          </aside>
          {/* --- Content Area (Video Player / รายละเอียด) --- */}
          <div className={styles.learnMainContent}>
            {/* --- Video Player Area --- */}
            {selectedVideo ? (
              <div className={styles.videoPlayerWrapper}>
                {/* --- ควรใช้ Video Player Component ที่ดีกว่านี้ --- */}
                {/* ตัวอย่างง่ายๆ ใช้ iframe สำหรับ YouTube หรือ Video tag สำหรับ direct URL */}
                {selectedVideo.url.includes("youtube.com/") ||
                selectedVideo.url.includes("youtu.be/") ? ( // <<-- ควรเช็ค YouTube URL ให้ดีกว่านี้
                  <iframe
                    width="100%"
                    height="100%" // <<-- อาจจะทำให้ iframe สูงเท่า .videoPlayerWrapper
                    src={convertToEmbedUrl(selectedVideo.url)} // <<-- สร้างฟังก์ชันแปลง URL
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className={styles.videoIframe}
                  ></iframe>
                ) : (
                  <video
                    width="100%"
                    height="auto"
                    controls
                    src={selectedVideo.url}
                    className={styles.videoElement}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                {/* ---------------------------------------------- */}
              </div>
            ) : (
              <div className={styles.noVideoSelected}>
                {selectedLesson
                  ? "กรุณาเลือกตอนเพื่อเริ่มเรียน"
                  : "กรุณาเลือกบทเรียน"}
              </div>
            )}

            {/* Next Button */}
            {selectedVideo && ( // แสดงปุ่มถัดไปเมื่อมี Video ที่เลือกอยู่
              <div className="mt-6 flex justify-end">
                <button
                  className={styles.nextLessonBtn}
                  onClick={goToNextVideo}
                >
                  บทเรียนถัดไป &rarr;
                </button>
              </div>
            )}
          </div>{" "}
          {/* End learnMainContent */}
        </div>{" "}
        {/* End learnLayoutWrapper */}
      </div>{" "}
      {/* End learnPageContainer */}
      {/* <Footer /> */}
    </main>
  );
}
