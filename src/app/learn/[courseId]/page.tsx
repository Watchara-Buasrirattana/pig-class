"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import styles from "./learn.module.css";
import defaultCourseImage from "../../img/courseimg.png";
import TimeIcon from "../../img/Time.png";
import LimitIcon from "../../img/Limit.png";
import PDFIcon from "../../img/pdf.png";

// --- Types ---
type VideoInfo = {
  id: number;
  title: string;
  url: string;
  order?: number | null;
};
type LessonInfo = {
  id: number;
  title: string;
  lessonNumber: number;
  videos: VideoInfo[];
};
type DocumentInfo = {
  id: number;
  title: string;
  fileUrl: string;
  fileSize?: number;
};
type CourseLearnData = {
  id: number;
  courseName: string;
  courseNumber: string;
  courseImg: string | null;
  lessons: LessonInfo[];
  documents: DocumentInfo[];
};

export default function LearnPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const courseId = params?.courseId as string | undefined;
  const initialLessonId = params?.lessonId as string | undefined;
  const initialVideoId = searchParams?.get("videoId") as string | undefined;

  const [courseData, setCourseData] = useState<CourseLearnData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"details" | "learn">("details");
  const [selectedLesson, setSelectedLesson] = useState<LessonInfo | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);


  useEffect(() => {
    if (courseId) {
      fetch(`/api/courses/${courseId}/learn-details`)
        .then(res => {
          if (!res.ok) throw new Error(`Fetch error ${res.status}`);
          return res.json();
        })
        .then((data: CourseLearnData) => {
          setCourseData(data);

          const initialL = data.lessons.find(l => l.id === parseInt(initialLessonId || "")) || data.lessons[0];
          const initialV = initialL?.videos.find(v => v.id === parseInt(initialVideoId || "")) || initialL?.videos[0] || null;

          setSelectedLesson(initialL);
          setSelectedVideo(initialV);
        })
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [courseId, initialLessonId, initialVideoId]);

  const goToNext = () => {
    if (!courseData || !selectedLesson || !selectedVideo) return;

    const currentLessonIndex = courseData.lessons.findIndex(l => l.id === selectedLesson.id);
    const currentVideoIndex = selectedLesson.videos.findIndex(v => v.id === selectedVideo.id);

    if (currentVideoIndex < selectedLesson.videos.length - 1) {
      setSelectedVideo(selectedLesson.videos[currentVideoIndex + 1]);
    } else if (currentLessonIndex < courseData.lessons.length - 1) {
      const nextLesson = courseData.lessons[currentLessonIndex + 1];
      setSelectedLesson(nextLesson);
      setSelectedVideo(nextLesson.videos[0] || null);
    } else {
      alert("เรียนจบแล้ว");
    }
  };

  const convertToEmbedUrl = (url: string): string => {
    let id = "";
    if (url.includes("youtube.com/watch?v=")) {
      id = new URL(url).searchParams.get("v") || "";
    } else if (url.includes("youtu.be/")) {
      id = new URL(url).pathname.slice(1);
    }
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
  };

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error || !courseData) return <div className="p-4 text-red-600">{error || "ไม่พบข้อมูลคอร์ส"}</div>;

  return (
    <main className={styles.background}>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => router.push(`/course/${courseId}`)}>&lt; ย้อนกลับ</button>

        <h1 className={styles.title}>{courseData.courseName}</h1>
        <p className={styles.code}>{courseData.courseNumber}</p>
        {selectedLesson && (
          <p className={styles.currentLessonTitle}>
            บทที่ {selectedLesson.lessonNumber}: {selectedLesson.title}
          </p>
        )}

        <div className={styles.learnPageWrapper}>
          <aside className={styles.sidebar}>
            <div className={styles.tabButtons}>
              <button className={`${styles.tabBtn} ${tab === "details" ? styles.activeTab : ""}`} onClick={() => { setTab("details"); setSelectedLesson(null); setSelectedVideo(null); }}>เอกสาร</button>
              <button className={`${styles.tabBtn} ${tab === "learn" ? styles.activeTab : ""}`} onClick={() => {
                if (courseData?.lessons?.length > 0) {
                  const firstLesson = courseData.lessons[0];
                  const firstVideo = firstLesson.videos[0] || null;
                  setSelectedLesson(firstLesson);
                  setSelectedVideo(firstVideo);
                }
                setTab("learn");
              }}>เข้าเรียน</button>
            </div>

            {tab === "details" && (
              <section className={styles.topSection}>
                <div className={styles.imageBox}>
                  <Image src={courseData.courseImg || defaultCourseImage} alt="Course Image" fill className={styles.coverImage} />
                </div>
              </section>
            )}

            {tab === "learn" && (
              <ul className={styles.lessonList}>
                {courseData.lessons.map((lesson) => (
                  <li key={lesson.id} className={`${styles.lessonItem} ${selectedLesson?.id === lesson.id ? styles.activeLesson : ""}`}>
                    <div onClick={() => { setSelectedLesson(lesson); setSelectedVideo(null); }}>{lesson.title}</div>
                    {selectedLesson?.id === lesson.id && (
                      <ul className={styles.partList}>
                        {lesson.videos.map((video) => (
                          <li key={video.id} className={`${styles.partItem} ${selectedVideo?.id === video.id ? styles.activePart : ""}`} onClick={() => setSelectedVideo(video)}>
                            {video.title}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className={styles.learnContent}>
            {tab === "details" && (
              <>
                <div className={styles.documentDownloadSection}>
                  <h2 className={styles.titleContent}>ดาวน์โหลดเอกสารการเรียน</h2>
                  {courseData.documents && courseData.documents.length > 0 ? (
                    <div className={styles.documentList}>
                      {courseData.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          className={styles.documentItemClickable}
                          download
                        >
                          <Image
                            src={PDFIcon}
                            alt="PDF"
                            className={styles.documentIcon}
                            width={40}
                            height={52}
                          />
                          <div className={styles.documentInfo}>
                            <span className={styles.documentTitle}>{doc.title}</span>
                            {doc.fileSize && (
                              <span className={styles.documentSize}>
                                {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xl text-gray-500 p-3">
                      ไม่มีเอกสารสำหรับคอร์สนี้
                    </p>
                  )}
                </div>

                <section className={styles.lessonSection}>
                  <h3 className={styles.lessonHeader}>{courseData.courseName}</h3>
                  <div className={styles.lessonTable}>
                    {courseData.lessons.map((lesson) => (
                      <button key={lesson.id} className={styles.lessonButton} onClick={() => { setSelectedLesson(lesson); setTab("learn"); }}>
                        {lesson.title}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {tab === "learn" && selectedLesson && !selectedVideo && (
              <div className={styles.lessonContent}>
                <h2 className={styles.titleContent}>{selectedLesson.title}</h2>
                <ul className={styles.partList}>
                  {selectedLesson.videos.map((video) => (
                    <li key={video.id} className={styles.partItemContent} onClick={() => setSelectedVideo(video)}>
                      {video.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "learn" && selectedLesson && (
              <div className={styles.videoContent}>
                {selectedLesson.videos.length === 0 ? (
                  <div className={styles.noVideoSelected}>
                    <p>บทเรียนนี้ยังไม่มีวิดีโอ</p>
                  </div>
                ) : selectedVideo ? (
                  selectedVideo.url.includes("youtube") ? (
                    <div className={styles.videoPlayer}>
                      <iframe
                        width="100%"
                        height="100%"
                        src={convertToEmbedUrl(selectedVideo.url)}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        className={styles.videoElement}
                      />
                    </div>
                  ) : (
                    <video width="100%" controls src={selectedVideo.url} className={styles.videoPlayer} />
                  )
                ) : (
                  <div className={styles.noVideoSelected}>
                    <p></p>
                  </div>
                )}

                {selectedVideo && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button className={styles.nextBtn} onClick={goToNext}>ถัดไป</button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}