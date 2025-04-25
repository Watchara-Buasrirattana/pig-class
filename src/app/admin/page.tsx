"use client";
import { useEffect, useState, ChangeEvent, FormEvent } from "react"; // <-- เพิ่ม import types
import { Dialog } from "@headlessui/react";
import LessonModal from "../components/LessonModal"; // <-- ตรวจสอบ Path
import DocumentManagementModal from "../components/DocumentManagementModal"; // <-- ตรวจสอบ Path

type Course = {
  id: number;
  courseNumber: string;
  courseName: string;
  description: string;
  category: string | null;
  teacher: string | null;
  level: string | null;
  price: number;
  courseImg?: string | null;
};

// Type สำหรับข้อมูลในฟอร์ม (อาจจะเหมือน Course แต่ไม่มี id)
type CourseFormData = Omit<Course, "id">;

export default function AdminPage() {
  // --- State เดิม ---
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isOpen, setIsOpen] = useState(false); // State ควบคุมการเปิด/ปิด Modal หลัก
  const [isProcessing, setIsProcessing] = useState(false); // เปลี่ยนชื่อ isUploading เป็น isProcessing (ใช้ทั้ง Add/Edit)
  const [newCourse, setNewCourse] = useState<CourseFormData>({
    // State สำหรับข้อมูลในฟอร์ม
    courseName: "",
    courseNumber: "",
    description: "",
    category: "กลางภาค",
    teacher: "",
    level: "ม.1",
    price: 0,
    courseImg: "",
  });

  // --- State ใหม่สำหรับ Edit ---
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  // --- State และ Handlers สำหรับ Modals อื่นๆ (เหมือนเดิม) ---
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedCourseForDocuments, setSelectedCourseForDocuments] =
    useState<Course | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedCourseForLessons, setSelectedCourseForLessons] =
    useState<Course | null>(null);

  const handleDeleteCourse = async (courseId: number, courseName: string) => {
    // --- Confirmation ---
    if (
      !window.confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบ "${courseName}" (ID: ${courseId})?\nการกระทำนี้จะลบข้อมูลบทเรียน, เอกสาร, และวิดีโอทั้งหมดของคอร์สนี้อย่างถาวร!`
      )
    ) {
      return;
    }

    // --- Call API ---
    setIsProcessing(true); // ใช้ State เดิมเพื่อแสดง Loading/Disable ปุ่ม
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });

      if (res.status === 204) {
        // Successfully deleted
        // Update local state
        setCourses((prevCourses) =>
          prevCourses.filter((course) => course.id !== courseId)
        );
        alert(`ลบคอร์ส "${courseName}" สำเร็จ`);
      } else if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({
            error: `Server responded with status ${res.status}`,
          }));
        throw new Error(
          errorData.error || `Failed to delete course (status: ${res.status})`
        );
      } else {
        // Should not happen for 204, but handle just in case
        setCourses((prevCourses) =>
          prevCourses.filter((course) => course.id !== courseId)
        );
      }
    } catch (err) {
      console.error("Delete Course Error:", err);
      alert(
        `เกิดข้อผิดพลาดในการลบคอร์ส: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDocumentModal = (course: Course) => {
    setSelectedCourseForDocuments(course);
    setIsDocumentModalOpen(true);
  };
  const handleCloseDocumentModal = () => {
    setIsDocumentModalOpen(false);
    // ไม่ต้อง clear selectedCourse เพราะ Modal จะอ่านจาก state ตอนเปิด
  };
  const handleOpenLessonModal = (course: Course) => {
    setSelectedCourseForLessons(course);
    setIsLessonModalOpen(true);
  };
  const handleCloseLessonModal = () => {
    setIsLessonModalOpen(false);
    setSelectedCourseForLessons(null);
  };
  // --- จบ State และ Handlers สำหรับ Modals อื่นๆ ---

  // --- Fetch Courses (เหมือนเดิม) ---
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("/api/courses");
        if (!res.ok) throw new Error("Failed to fetch courses");
        const data = await res.json();
        setCourses(data);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchCourses();
  }, []);

  // --- Handle Image Change (เหมือนเดิม) ---
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const currentPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(currentPreviewUrl);
    } else {
      setImageFile(null);
      setPreviewUrl(newCourse.courseImg || null); // ถ้าไม่มีไฟล์ใหม่ ให้กลับไปแสดงรูปเดิม (ถ้ามี)
    }
  };

  // --- Functions for Opening Add/Edit Modal ---
  const handleOpenAddModal = () => {
    setModalMode("add");
    setCourseToEdit(null);
    setNewCourse({
      // Reset form
      courseName: "",
      courseNumber: "",
      description: "",
      category: "กลางภาค",
      teacher: "",
      level: "ม.1",
      price: 0,
      courseImg: "",
    });
    setImageFile(null);
    setPreviewUrl(null);
    setIsOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setModalMode("edit");
    setCourseToEdit(course); // เก็บ course ที่จะแก้
    setNewCourse({
      // เติมข้อมูลเดิมลงฟอร์ม
      courseName: course.courseName,
      courseNumber: course.courseNumber,
      description: course.description,
      category: course.category || "กลางภาค",
      teacher: course.teacher || "",
      level: course.level || "ม.1",
      price: course.price,
      courseImg: course.courseImg || "", // ใช้ URL รูปเดิม
    });
    setImageFile(null); // ยังไม่ได้เลือกรูปใหม่
    setPreviewUrl(course.courseImg || null); // แสดงรูปเดิม
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    // อาจจะเคลียร์ courseToEdit ตอนปิดก็ได้
    // setCourseToEdit(null);
  };

  // --- Function for Submitting Add/Edit ---
  const handleCourseSubmit = async (e: FormEvent) => {
    // รับ event สำหรับ preventDefault
    e.preventDefault(); // ป้องกัน form submit แบบปกติ
    setIsProcessing(true); // Start loading

    let uploadedImageUrl: string | null | undefined = undefined; // undefined = ไม่ต้อง update field นี้

    // 1. Upload รูปใหม่ (ถ้ามีการเลือกไฟล์)
    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);
      try {
        console.log("Uploading new image...");
        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Image upload failed (status: ${uploadRes.status})`
          );
        }
        const uploadResult = await uploadRes.json();
        uploadedImageUrl = uploadResult.url;
        console.log("New image uploaded:", uploadedImageUrl);

        // --- (Optional - Advanced) Logic ลบรูปเก่าถ้าต้องการ ---
        // if (modalMode === 'edit' && courseToEdit?.courseImg) {
        //   console.log("Need to delete old image:", courseToEdit.courseImg);
        //   // await fetch(`/api/delete-image?imageUrl=${encodeURIComponent(courseToEdit.courseImg)}`, { method: 'DELETE'});
        // }
      } catch (error) {
        console.error("Image upload error:", error);
        alert(
          `เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        setIsProcessing(false);
        return;
      }
    }

    // 2. เตรียมข้อมูลที่จะส่งไป API (Add หรือ Edit)
    let dataToSend: Partial<CourseFormData> = { ...newCourse }; // ใช้ Partial เพราะตอน Edit อาจส่งแค่บาง field
    if (uploadedImageUrl !== undefined) {
      dataToSend.courseImg = uploadedImageUrl; // ใส่ URL รูปใหม่ถ้ามีการอัปโหลด
    } else if (modalMode === "edit") {
      // ถ้า Edit แต่ไม่ได้เลือกรูปใหม่ ให้ใช้ URL เดิม หรือถ้า URL ในฟอร์มถูกลบ ให้ส่ง null
      // แต่ถ้าไม่ต้องการให้ Backend อัปเดต field นี้เลยถ้าไม่มีรูปใหม่ ให้ลบออกจาก dataToSend
      if (newCourse.courseImg === courseToEdit?.courseImg) {
        // รูปไม่เปลี่ยน ไม่ต้องส่งไปก็ได้
        delete dataToSend.courseImg;
      } else {
        // รูปเปลี่ยน (อาจจะถูกลบในฟอร์ม หรือค่าต่างจากเดิมด้วยเหตุผลอื่น)
        dataToSend.courseImg = newCourse.courseImg || null; // ส่งค่าจากฟอร์ม (อาจเป็น null)
      }
    }
    // แปลง price เป็น number เสมอ
    dataToSend.price = Number(newCourse.price);

    // 3. เรียก API (POST หรือ PUT)
    try {
      let response: Response;
      let resultCourse: Course;

      if (modalMode === "edit" && courseToEdit) {
        // --- EDIT MODE ---
        console.log(
          `Sending PUT request to /api/courses/${courseToEdit.id} with data:`,
          dataToSend
        );
        response = await fetch(`/api/courses/${courseToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to update course (status: ${response.status})`
          );
        }
        resultCourse = await response.json();
        // อัปเดต State courses
        setCourses((prevCourses) =>
          prevCourses.map((c) => (c.id === resultCourse.id ? resultCourse : c))
        );
        alert("แก้ไขข้อมูลคอร์สสำเร็จ!");
      } else {
        // --- ADD MODE ---
        console.log(
          "Sending POST request to /api/courses with data:",
          dataToSend
        );
        response = await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // สำหรับ Add Mode, courseImg จะเป็น URL ที่อัปโหลดใหม่ หรือ "" ถ้าไม่มีรูป
          body: JSON.stringify({
            ...dataToSend, // ส่งข้อมูลทั้งหมดจากฟอร์ม (รวม courseImg ถ้ามี)
            courseImg: uploadedImageUrl ?? null, // ใช้ URL ที่เพิ่งอัปโหลด หรือ null
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to add course (status: ${response.status})`
          );
        }
        resultCourse = await response.json();
        setCourses((prev) => [...prev, resultCourse]);
        alert("เพิ่มคอร์สใหม่สำเร็จ!");
      }

      handleCloseModal(); // ปิด Modal
    } catch (error) {
      console.error(
        `Error ${modalMode === "edit" ? "updating" : "adding"} course:`,
        error
      );
      alert(
        `เกิดข้อผิดพลาดในการ${modalMode === "edit" ? "แก้ไข" : "เพิ่ม"}คอร์ส: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsProcessing(false); // Stop loading indicator
      // เคลียร์ไฟล์ที่เลือกไว้เสมอหลัง submit เสร็จ
      setImageFile(null);
      // ไม่ต้องเคลียร์ previewUrl ที่นี่ เพราะ handleOpenEditModal/AddModal จะจัดการ
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-700 text-white p-6 flex flex-col">
        {/* ... Sidebar Items ... */}
        <div className="text-2xl font-bold mb-8">Admin</div>
        <nav className="space-y-4 flex-1">
          <SidebarItem label="Dashboard" />
          <SidebarItem label="ผู้ใช้งาน user" />
          <SidebarItem label="คอร์สเรียน" active />
          <SidebarItem label="บทความ" />
          <SidebarItem label="ความสำเร็จ" />
        </nav>
        <SidebarItem label="ออกจากระบบ" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">คอร์สเรียน</h1>
          {/* --- ปุ่ม Add เรียกใช้ handleOpenAddModal --- */}
          <button
            onClick={handleOpenAddModal} // <-- เปลี่ยน onClick
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isProcessing}
          >
            + Add
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse bg-white shadow-md rounded">
            <thead>
              {/* ... Table Headers ... */}
              <tr className="bg-gray-200 text-left">
                <th className="p-2">Course Name</th>
                <th className="p-2">Code</th>
                <th className="p-2">Description</th>
                <th className="p-2">Level</th>
                <th className="p-2">Category</th>
                <th className="p-2">Teacher</th>
                <th className="p-2">Price</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className="border-t hover:bg-gray-50">
                  {/* ... Table Cells for course data ... */}
                  <td className="p-2 flex items-center gap-2">
                    {course.courseImg ? (
                      <img
                        src={course.courseImg}
                        alt={course.courseName}
                        className="w-16 h-10 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-gray-200 rounded flex-shrink-0"></div>
                    )}
                    <span className="truncate">{course.courseName}</span>
                  </td>
                  <td className="p-2">{course.courseNumber}</td>
                  <td className="p-2">
                    <span title={course.description}>
                      {course.description.slice(0, 30)}
                      {course.description.length > 30 ? "..." : ""}
                    </span>
                  </td>
                  <td className="p-2">{course.level}</td>
                  <td className="p-2">{course.category}</td>
                  <td className="p-2">{course.teacher}</td>
                  <td className="p-2">{course.price}</td>
                  {/* --- Actions Column --- */}
                  <td className="p-2 whitespace-nowrap">
                    {" "}
                    {/* Added whitespace-nowrap */}
                    {/* --- ปุ่ม Edit เรียกใช้ handleOpenEditModal --- */}
                    <button
                      onClick={() => handleOpenEditModal(course)} // <-- เปลี่ยน onClick
                      className="bg-yellow-400 text-white px-2 py-1 mr-2 rounded text-sm hover:bg-yellow-500"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleOpenLessonModal(course)}
                      className="bg-green-500 text-white px-2 py-1 mr-2 rounded text-sm hover:bg-green-600"
                    >
                      บทเรียน
                    </button>
                    <button
                      onClick={() => handleOpenDocumentModal(course)}
                      className="bg-purple-500 text-white px-2 py-1 mr-2 rounded text-sm hover:bg-purple-600"
                    >
                      เอกสาร
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteCourse(course.id, course.courseName)
                      } // <-- เรียกฟังก์ชันใหม่
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                      disabled={isProcessing} // อาจจะ disable ปุ่มตอนกำลังทำงานอื่นอยู่
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- Modal Add/Edit Course --- */}
        <Dialog
          open={isOpen}
          onClose={handleCloseModal} // <-- เปลี่ยน onClose
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={handleCloseModal} // <-- เปลี่ยน onClick
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
                aria-label="Close"
                disabled={isProcessing}
              >
                &times;
              </button>
              {/* --- เปลี่ยน Title ตาม Mode --- */}
              <Dialog.Title className="text-xl font-semibold mb-6 text-gray-800">
                {modalMode === "add"
                  ? "เพิ่มคอร์สเรียนใหม่"
                  : `แก้ไขคอร์ส: ${courseToEdit?.courseName}`}
              </Dialog.Title>

              {/* --- Form ใช้ handleCourseSubmit --- */}
              <form onSubmit={handleCourseSubmit}>
                {" "}
                {/* <-- เปลี่ยน onSubmit */}
                <div className="space-y-4">
                  {/* ชื่อคอร์ส */}
                  <div>
                    <label
                      htmlFor="courseName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      ชื่อคอร์ส
                    </label>
                    <input
                      id="courseName"
                      type="text"
                      required
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="ชื่อคอร์ส"
                      value={newCourse.courseName} // <-- ผูกกับ State เดิม
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          courseName: e.target.value,
                        })
                      }
                      disabled={isProcessing}
                    />
                  </div>
                  {/* --- Input Fields อื่นๆ (เหมือนเดิม ผูกกับ newCourse state) --- */}
                  {/* รายละเอียด */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      รายละเอียด
                    </label>
                    <textarea
                      id="description"
                      required
                      rows={3}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="รายละเอียดคอร์ส"
                      value={newCourse.description}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          description: e.target.value,
                        })
                      }
                      disabled={isProcessing}
                    />
                  </div>
                  {/* ระดับชั้น & ประเภท */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="level"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        ระดับชั้น
                      </label>
                      <select
                        id="level"
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2"
                        value={newCourse.level ?? ""}
                        onChange={(e) =>
                          setNewCourse({ ...newCourse, level: e.target.value })
                        }
                        disabled={isProcessing}
                      >
                        <option value="ม.1">ม.1</option>
                        <option value="ม.2">ม.2</option>
                        <option value="ม.3">ม.3</option>
                        <option value="ม.4">ม.4</option>
                        <option value="ม.5">ม.5</option>
                        <option value="ม.6">ม.6</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="category"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        ประเภทคอร์ส
                      </label>
                      <select
                        id="category"
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2"
                        value={newCourse.category ?? ""}
                        onChange={(e) =>
                          setNewCourse({
                            ...newCourse,
                            category: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      >
                        <option value="กลางภาค">กลางภาค</option>
                        <option value="ปลายภาค">ปลายภาค</option>
                        <option value="พื้นฐาน">พื้นฐาน</option>
                      </select>
                    </div>
                  </div>
                  {/* รหัสคอร์ส & Teacher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="courseNumber"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        รหัสคอร์ส
                      </label>
                      <input
                        id="courseNumber"
                        type="text"
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="เช่น MTH101"
                        value={newCourse.courseNumber}
                        onChange={(e) =>
                          setNewCourse({
                            ...newCourse,
                            courseNumber: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="teacher"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        ครูผู้สอน
                      </label>
                      <input
                        id="teacher"
                        type="text"
                        required
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="ชื่อครูผู้สอน"
                        value={newCourse.teacher ?? ""}
                        onChange={(e) =>
                          setNewCourse({
                            ...newCourse,
                            teacher: e.target.value,
                          })
                        }
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  {/* ราคา */}
                  <div>
                    <label
                      htmlFor="price"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      ราคา (บาท)
                    </label>
                    <input
                      id="price"
                      type="number"
                      required
                      min="0"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0.00"
                      value={newCourse.price}
                      onChange={(e) =>
                        setNewCourse({
                          ...newCourse,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={isProcessing}
                    />
                  </div>
                  {/* รูปภาพคอร์ส */}
                  <div>
                    <label
                      htmlFor="courseImage"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {modalMode === "edit"
                        ? "เปลี่ยนรูปภาพ (ถ้าต้องการ)"
                        : "รูปภาพคอร์ส (ถ้ามี)"}
                    </label>
                    <input
                      id="courseImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                      disabled={isProcessing}
                      // อาจจะต้อง reset key ถ้าต้องการให้เลือกไฟล์เดิมซ้ำได้หลังกด cancel edit
                      // key={imageFile ? 'file-selected' : 'no-file'}
                    />
                    {/* Preview Image */}
                    {previewUrl && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-md border border-gray-200"
                        />
                        {modalMode === "edit" &&
                          !imageFile && ( // Show remove button only in edit mode if preview is shown but no NEW file selected
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewUrl(null);
                                setNewCourse({ ...newCourse, courseImg: null });
                              }}
                              className="text-xs text-red-600 hover:underline mt-1"
                            >
                              ลบรูปภาพนี้
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Submit Button */}
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal} // <-- ใช้ handleCloseModal
                    className="mr-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    ยกเลิก
                  </button>
                  {/* --- เปลี่ยน Text ตาม Mode --- */}
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" /* ... */
                        >
                          <circle /* ... */></circle>
                          <path /* ... */></path>
                        </svg>
                        กำลังบันทึก...
                      </>
                    ) : modalMode === "add" ? (
                      "เพิ่มคอร์ส"
                    ) : (
                      "บันทึกการแก้ไข"
                    ) // <-- เปลี่ยน Text
                    }
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* --- Lesson and Document Modals (เหมือนเดิม) --- */}
        <LessonModal
          isOpen={isLessonModalOpen}
          onClose={handleCloseLessonModal}
          course={selectedCourseForLessons}
        />
        <DocumentManagementModal
          isOpen={isDocumentModalOpen}
          onClose={handleCloseDocumentModal}
          course={selectedCourseForDocuments}
        />
      </main>
    </div>
  );
}

// --- SidebarItem (เหมือนเดิม) ---
function SidebarItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={`px-4 py-2 rounded cursor-pointer ${
        active ? "bg-blue-900" : "hover:bg-blue-600"
      }`}
    >
      {label}
    </div>
  );
}
