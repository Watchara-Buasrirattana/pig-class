// components/LessonModal.tsx
"use client";
import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import VideoManagementModal from "./VideoManagementModal";

// กำหนด Type ของ Course และ Lesson (อาจจะ import จากที่อื่น หรือปรับตาม Schema จริง)
type Course = { id: number; courseName: string /* ... other fields */ };
// ควรจะมี id, title, lessonNumber เป็นอย่างน้อย
type Lesson = {
  id: number;
  title: string;
  lessonNumber: number;
  courseId: number /* ... other fields */;
};

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
}

export default function LessonModal({
  isOpen,
  onClose,
  course,
}: LessonModalProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // วิดีโอ
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedLessonForVideos, setSelectedLessonForVideos] =
    useState<Lesson | null>(null);
  // State สำหรับฟอร์มเพิ่มบทเรียนใหม่
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonNumber, setNewLessonNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- State สำหรับแก้ไขบทเรียน ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lessonToEdit, setLessonToEdit] = useState<Lesson | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState("");
  const [editLessonNumber, setEditLessonNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false); // Loading state for update

  // Fetch lessons when modal opens or course changes
  useEffect(() => {
    if (isOpen && course?.id) {
      const fetchLessons = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // ใช้ API ที่รองรับ GET /api/courses/[courseId]/lessons
          const res = await fetch(`/api/courses/${course.id}/lessons`);
          if (!res.ok) {
            // พยายามอ่าน error message จาก JSON response ถ้ามี
            const errorData = await res.json().catch(() => ({})); // ใส่ catch เผื่อ response ไม่ใช่ JSON
            throw new Error(
              errorData.error ||
                `Failed to fetch lessons (status: ${res.status})`
            );
          }
          const data: Lesson[] = await res.json();
          // เรียงลำดับก่อน set state
          setLessons(data.sort((a, b) => a.lessonNumber - b.lessonNumber));
        } catch (err) {
          const errorMsg =
            err instanceof Error
              ? err.message
              : "An unknown error occurred while fetching lessons";
          setError(errorMsg);
          console.error("Fetch Lessons Error:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLessons();
    } else {
      // Reset state when modal is closed or no course
      setLessons([]);
      setError(null);
      setNewLessonTitle("");
      setNewLessonNumber("");
      // Reset edit state too
      setIsEditModalOpen(false);
      setLessonToEdit(null);
    }
  }, [isOpen, course]); // Dependency array

  // Function to open Video Modal
  const handleOpenVideoModal = (lesson: Lesson) => {
    setSelectedLessonForVideos(lesson);
    setIsVideoModalOpen(true);
  };
  // Function to close Video Modal
  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    // ไม่ต้อง clear selectedLessonForVideos ที่นี่ เพราะ VideoModal จะอ่านจาก state นี้ตอนเปิด
  };
  // Function to handle adding a new lesson
  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course?.id || !newLessonTitle.trim() || !newLessonNumber) {
      alert("กรุณากรอกชื่อและลำดับบทเรียน");
      return;
    }
    const number = parseInt(newLessonNumber, 10);
    if (isNaN(number) || number <= 0) {
      alert("ลำดับบทเรียนต้องเป็นตัวเลขจำนวนเต็มบวก");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // ใช้ API ที่รองรับ POST /api/courses/[courseId]/lessons
      const res = await fetch(`/api/courses/${course.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLessonTitle.trim(),
          lessonNumber: number,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to add lesson (status: ${res.status})`
        );
      }

      const addedLesson: Lesson = await res.json();
      setLessons((prevLessons) =>
        [...prevLessons, addedLesson].sort(
          (a, b) => a.lessonNumber - b.lessonNumber
        )
      );
      setNewLessonTitle("");
      setNewLessonNumber("");
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while adding lesson";
      setError(errorMsg); // แสดง error ใต้ฟอร์มได้
      console.error("Add Lesson Error:", err);
      alert(`เกิดข้อผิดพลาดในการเพิ่มบทเรียน: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ฟังก์ชันสำหรับลบบทเรียน ---
  const handleDeleteLesson = async (lessonId: number) => {
    if (
      !window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบทเรียน ID: ${lessonId}?`)
    ) {
      return;
    }
    // ใช้ API ที่รองรับ DELETE /api/lessons/[lessonId]
    // หรือ DELETE /api/courses/[courseId]/lessons?lessonId=[lessonId] ตามที่คุณสร้าง API ไว้
    // *** แก้ไข URL ตรงนี้ตาม API ที่คุณสร้าง ***
    const apiUrl = `/api/courses/${course?.id}/lessons?lessonId=${lessonId}`; // <-- หรือใช้แบบมี query param ถ้า API รวมไฟล์กัน
    // const apiUrl = `/api/courses/${course?.id}/lessons?lessonId=${lessonId}`;

    setError(null); // Clear previous errors
    try {
      const res = await fetch(apiUrl, { method: "DELETE" });

      if (res.status === 204) {
        // Successfully deleted
        setLessons((prevLessons) =>
          prevLessons.filter((lesson) => lesson.id !== lessonId)
        );
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete lesson (status: ${res.status})`
        );
      } else {
        setLessons((prevLessons) =>
          prevLessons.filter((lesson) => lesson.id !== lessonId)
        );
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during deletion";
      setError(errorMsg);
      console.error("Delete Lesson Error:", err);
      alert(`เกิดข้อผิดพลาดในการลบ: ${errorMsg}`);
    }
  };

  // --- ฟังก์ชันสำหรับเปิด/ปิด และจัดการ Edit Modal ---
  const handleOpenEditModal = (lesson: Lesson) => {
    setLessonToEdit(lesson);
    setEditLessonTitle(lesson.title);
    setEditLessonNumber(lesson.lessonNumber.toString());
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setLessonToEdit(null); // Clear selected lesson
    setError(null); // Clear errors specific to edit modal
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonToEdit) return;

    if (!editLessonTitle.trim()) {
      alert("กรุณากรอกชื่อบทเรียน");
      return;
    }
    const number = parseInt(editLessonNumber, 10);
    if (isNaN(number) || number <= 0) {
      alert("ลำดับบทเรียนต้องเป็นตัวเลขจำนวนเต็มบวก");
      return;
    }
    let changes: { title?: string; lessonNumber?: number } = {};
    if (editLessonTitle.trim() !== lessonToEdit.title) {
      changes.title = editLessonTitle.trim();
    }
    if (number !== lessonToEdit.lessonNumber) {
      changes.lessonNumber = number;
    }
    if (Object.keys(changes).length === 0) {
      handleCloseEditModal();
      return;
    }
    setIsUpdating(true);
    setError(null);

    try {
      // ใช้ API ที่รองรับ PUT /api/lessons/[lessonId]
      // หรือ PUT /api/courses/[courseId]/lessons ตามที่คุณสร้าง API ไว้
      // *** แก้ไข URL และ Body ตรงนี้ตาม API ที่คุณสร้าง ***
      const apiUrl = `/api/courses/${course?.id}/lessons`;
      // const apiUrl = `/api/courses/${course?.id}/lessons`; // ถ้า API รวมไฟล์กัน
      // const body = { lessonId: lessonToEdit.id, ...changes }; // ถ้า API รวมไฟล์กัน ต้องส่ง lessonId ใน body
      const body = { lessonId: lessonToEdit.id, ...changes }; // ถ้า API แยกไฟล์

      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to update lesson (status: ${res.status})`
        );
      }

      const updatedLesson: Lesson = await res.json();
      setLessons((prevLessons) =>
        prevLessons
          .map((l) => (l.id === updatedLesson.id ? updatedLesson : l))
          .sort((a, b) => a.lessonNumber - b.lessonNumber)
      );
      handleCloseEditModal();
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during update";
      setError(errorMsg); // อาจจะแสดง error ใน Edit Modal
      console.error("Update Lesson Error:", err);
      alert(`เกิดข้อผิดพลาดในการแก้ไข: ${errorMsg}`);
    } finally {
      setIsUpdating(false);
    }
  };
  // --- สิ้นสุดฟังก์ชันสำหรับ Edit/Delete ---

  if (!course) return null;

  return (
    <>
      {" "}
      {/* ใช้ Fragment ครอบ Dialog ทั้งสอง */}
      {/* --- Main Lesson Management Modal --- */}
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="fixed inset-0 z-40 overflow-y-auto"
      >
        {" "}
        {/* ลด z-index ลงเล็กน้อย */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <Dialog.Title className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
              จัดการบทเรียนสำหรับ: {course.courseName}
            </Dialog.Title>

            {/* Section for Adding New Lesson */}
            <div className="mb-6 border-b pb-4">
              <h3 className="text-lg font-medium mb-2">เพิ่มบทเรียนใหม่</h3>
              <form
                onSubmit={handleAddLesson}
                className="flex flex-col sm:flex-row gap-3 items-end"
              >
                {/* Input fields for Add */}
                <div className="flex-grow">
                  <label
                    htmlFor={`add-lessonTitle-${course.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ชื่อบทเรียน
                  </label>
                  <input
                    id={`add-lessonTitle-${course.id}`} // Unique ID
                    type="text"
                    required
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="บทที่ 1: ..."
                    disabled={isSubmitting}
                  />
                </div>
                <div className="w-full sm:w-28">
                  <label
                    htmlFor={`add-lessonNumber-${course.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ลำดับที่
                  </label>
                  <input
                    id={`add-lessonNumber-${course.id}`} // Unique ID
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={newLessonNumber}
                    onChange={(e) => setNewLessonNumber(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="1"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "กำลังเพิ่ม..." : "+ เพิ่ม"}
                </button>
              </form>
              {/* Display Add form error */}
              {error && isSubmitting && (
                <p className="text-red-500 text-sm mt-2">Error: {error}</p>
              )}
            </div>

            {/* Section for Displaying Existing Lessons */}
            <div className="flex-grow overflow-y-auto">
              <h3 className="text-lg font-medium mb-2">รายการบทเรียน</h3>
              {isLoading ? (
                <p>Loading lessons...</p>
              ) : lessons.length === 0 ? (
                <p className="text-gray-500">ยังไม่มีบทเรียนสำหรับคอร์สนี้</p>
              ) : (
                <ul className="space-y-2">
                  {" "}
                  {/* Removed list-decimal */}
                  {lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="p-2 border rounded bg-gray-50 flex justify-between items-center gap-2"
                    >
                      <span className="flex-grow">
                        {lesson.lessonNumber}. {lesson.title}
                      </span>
                      <div className="space-x-2 flex-shrink-0">
                        {/* --- ปุ่มใหม่ --- */}
                        <button
                          onClick={() => handleOpenVideoModal(lesson)}
                          className="text-purple-600 hover:text-purple-800 text-xs font-medium px-1"
                        >
                          วิดีโอ
                        </button>
                        {/* --- ปุ่มเดิม --- */}
                        <button
                          onClick={() => handleOpenEditModal(lesson)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium px-1"
                        >
                          ลบ
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {/* Display general fetch error */}
              {error && !isSubmitting && !isUpdating && (
                <p className="text-red-500 text-sm mt-2">Error: {error}</p>
              )}
            </div>

            {/* Close Button for Main Modal */}
            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                ปิด
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
      {/* --- Edit Lesson Modal --- */}
      {lessonToEdit && ( // Render only when lessonToEdit is not null
        <Dialog
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          className="relative z-50"
        >
          {" "}
          {/* Higher z-index */}
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />{" "}
          {/* Darker overlay */}
          {/* Panel */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4 text-gray-800">
                แก้ไขบทเรียน
              </Dialog.Title>
              <form onSubmit={handleUpdateLesson}>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor={`edit-lessonTitle-${lessonToEdit.id}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      ชื่อบทเรียน
                    </label>
                    <input
                      id={`edit-lessonTitle-${lessonToEdit.id}`} // Unique ID
                      type="text"
                      required
                      value={editLessonTitle}
                      onChange={(e) => setEditLessonTitle(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={isUpdating}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-lessonNumber-${lessonToEdit.id}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      ลำดับที่
                    </label>
                    <input
                      id={`edit-lessonNumber-${lessonToEdit.id}`} // Unique ID
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={editLessonNumber}
                      onChange={(e) => setEditLessonNumber(e.target.value)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={isUpdating}
                    />
                  </div>
                </div>
                {/* Display Edit form error */}
                {error && !isUpdating && (
                  <p className="text-red-500 text-sm mt-2">Error: {error}</p>
                )}
                <div className="flex justify-end mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="mr-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                    disabled={isUpdating}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
      <VideoManagementModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        lesson={selectedLessonForVideos} // ส่ง lesson ที่เลือกไปให้
      />
      {/* --- End Edit Lesson Modal --- */}
    </>
  );
}
