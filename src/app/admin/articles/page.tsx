// --- PATH EXAMPLE: app/admin/articles/page.tsx ---
// ถ้าใช้ Pages Router ให้เอาบรรทัด "use client" ออก แล้วอาจจะต้องปรับการ import/hook เล็กน้อย
"use client";

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
  useMemo,
} from "react";
import { useRouter } from "next/navigation"; // หรือ 'next/router' สำหรับ Pages Router
import { Dialog } from "@headlessui/react";
import Image from "next/image";

// --- Types (ควร Import หรือกำหนดไว้ที่ส่วนกลาง) ---
// Import จาก Prisma Client โดยตรง ถ้า Setup ถูกต้อง
// import type { Article, Category, User, ArticleImage } from '@prisma/client';

// หรือกำหนด Type คร่าวๆ ที่นี่
type CategoryInfo = { id: number; name: string };
type ArticleImageInfo = { id: number; url: string; order?: number | null };

// Type สำหรับข้อมูลที่แสดงในตาราง
type ArticleSummary = {
  id: number;
  title: string;
  coverImage: string | null;
  publishedAt: string | Date;
  categoryId: number;
  category?: { name: string };
};

// Type สำหรับข้อมูลเต็มตอน Edit (รวม Description และ Images)
type ArticleDetail = ArticleSummary & {
  description: string;
  images?: ArticleImageInfo[];
};

// Type สำหรับข้อมูลในฟอร์ม
type ArticleFormData = {
  title: string;
  description: string;
  categoryId: string;
};

// --- Fixed Categories (ID ต้องตรงกับใน DB) ---
const fixedCategories: CategoryInfo[] = [
  { id: 1, name: "คลังความรู้" },
  { id: 2, name: "Checklist" },
  { id: 3, name: "โจทย์ข้อสอบ" },
  { id: 4, name: "อื่นๆ" },
];

// --- Helper Function ---
function formatDate(dateString: string | Date): string {
  try {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Invalid Date";
  }
}

// --- Component หลัก ---
export default function AdminArticlesPage() {
  const router = useRouter();

  // State: Article List & Table
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  // State: Modal Add/Edit Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [articleToEdit, setArticleToEdit] = useState<ArticleDetail | null>(
    null
  );

  // State: Form Data inside Modal
  const [formData, setFormData] = useState<ArticleFormData>({
    title: "",
    description: "",
    categoryId: fixedCategories[0]?.id.toString() || "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Multiple files
  const [previewUrls, setPreviewUrls] = useState<string[]>([]); // Multiple previews
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]); // URLs from articleToEdit
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading for Submit button
  const [formError, setFormError] = useState<string | null>(null); // Error inside Modal
  const [uploadProgress, setUploadProgress] = useState<number>(0); // Upload progress

  // --- Fetch Articles for Table ---
  const fetchArticles = async () => {
    setIsLoadingArticles(true);
    setTableError(null);
    try {
      const res = await fetch("/api/articles"); // GET /api/articles (Backend needs include category/user)
      if (!res.ok)
        throw new Error(`Failed to fetch articles (status: ${res.status})`);
      const data: ArticleSummary[] = await res.json();
      setArticles(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setTableError(`ไม่สามารถโหลดรายการบทความได้: ${errorMsg}`);
      console.error("Fetch Articles Error:", err);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []); // Fetch on initial load

  // --- Cleanup Object URLs ---
  useEffect(() => {
    // This cleans up URLs created for previews when the component unmounts
    // or when previewUrls state is updated with new URLs.
    const urlsToRevoke = [...previewUrls];
    return () => {
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // --- Modal Control Handlers ---
  const removeExistingImage = (urlToRemove: string) => {
    // แสดงการยืนยันก่อนลบ (เผื่อกดผิด)
    if (window.confirm(`คุณต้องการนำรูปภาพนี้ออกจากบทความใช่หรือไม่?\n(ไฟล์ในระบบจะยังไม่ถูกลบ จนกว่าจะกดบันทึกการแก้ไข)`)) {
         console.log("Removing existing image URL:", urlToRemove);
         setExistingImageUrls(prevUrls => prevUrls.filter(url => url !== urlToRemove));
    }
};
  const handleOpenAddModal = () => {
    setModalMode("add");
    setArticleToEdit(null);
    setFormData({
      title: "",
      description: "",
      categoryId: fixedCategories[0]?.id.toString() || "",
    });
    setImageFiles([]);
    setPreviewUrls([]);
    setExistingImageUrls([]);
    setFormError(null);
    setIsSubmitting(false);
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (articleSummary: ArticleSummary) => {
    setModalMode("edit");
    setIsModalOpen(true);
    setArticleToEdit(null); // Set to null initially while fetching full data
    setFormData({
      title: "Loading...",
      description: "Loading...",
      categoryId: "",
    }); // Show loading state
    setImageFiles([]);
    setPreviewUrls([]);
    setExistingImageUrls([]);
    setFormError(null);
    setIsSubmitting(false);
    setUploadProgress(0);

    try {
      console.log(`Workspaceing details for article ID: ${articleSummary.id}`);
      const res = await fetch(`/api/articles/${articleSummary.id}`); // <<-- Need GET /api/articles/[id]
      if (!res.ok)
        throw new Error(
          `Failed to fetch article details (status: ${res.status})`
        );
      const fullArticleData: ArticleDetail = await res.json();
      console.log("Full article data received:", fullArticleData);

      setArticleToEdit(fullArticleData);
      setFormData({
        title: fullArticleData.title,
        description: fullArticleData.description,
        categoryId: fullArticleData.categoryId.toString(),
      });
      setExistingImageUrls(fullArticleData.images?.map((img) => img.url) || []);
    } catch (err) {
      console.error("Error fetching article details for edit:", err);
      setFormError(
        `ไม่สามารถโหลดข้อมูลบทความได้: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      // Optionally close modal or keep it open with error message
      // handleCloseModal();
    }
  };
  

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // No need to reset states here, useEffect handles it when isOpen changes to false
  };

  // --- Form Input Handlers ---
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files); // ไฟล์ใหม่ที่เพิ่งเลือก
      if (newFiles.length === 0) return; // ถ้าไม่ได้เลือกอะไร ก็ไม่ต้องทำอะไร

      console.log(
        "Adding new files:",
        newFiles.map((f) => f.name)
      );

      // สร้าง Preview URL สำหรับไฟล์ใหม่เท่านั้น
      const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file));

      // --- อัปเดต State โดยการต่อ Array (Append) ---
      setImageFiles((prevFiles) => [...prevFiles, ...newFiles]); // เอาไฟล์ใหม่ต่อท้ายไฟล์เดิม
      setPreviewUrls((prevUrls) => {
        // ไม่ต้อง revoke url เก่าที่นี่ เพราะ useEffect จะทำตอน unmount
        // หรือจะ revoke ตอนกดลบ (removeImage) ก็ได้
        return [...prevUrls, ...newPreviewUrls]; // เอา URL ใหม่ต่อท้าย URL เดิม
      });

      // --- สำคัญ: เคลียร์ค่าของ input element ---
      // เพื่อให้ onChange ทำงานได้ แม้จะเลือกไฟล์เดิมซ้ำในครั้งถัดไป
      e.target.value = "";
    }
  };

  const removeNewImage = (indexToRemove: number) => {
    // --- Revoke Object URL ก่อนลบออกจาก State ---
    if (previewUrls[indexToRemove]) {
      console.log("Revoking URL:", previewUrls[indexToRemove]);
      URL.revokeObjectURL(previewUrls[indexToRemove]);
    }
    // ------------------------------------------
    setImageFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
    setPreviewUrls((prevUrls) =>
      prevUrls.filter((_, index) => index !== indexToRemove)
    );
    // ไม่ต้อง reset input value ที่นี่ เพราะการลบไม่ได้เกิดจาก input โดยตรง
  };
  // Note: removeExistingImage logic is complex, needs state and backend coordination. Omitted for now.

  // --- Form Submission (Add/Edit Article) ---
  const handleArticleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (modalMode === "add" && imageFiles.length === 0) {
      alert("กรุณาเลือกรูปภาพประกอบอย่างน้อย 1 รูป");
      return;
    }
    if (!formData.categoryId) {
      alert("กรุณาเลือกหมวดหมู่");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setUploadProgress(0);
    const totalFilesToUpload = imageFiles.length;
    let uploadedCount = 0;
    const uploadedImageUrls: string[] = [];

    try {
      // --- 1. Upload NEW Images ---
      if (totalFilesToUpload > 0) {
        console.log(`Starting upload for ${totalFilesToUpload} new images...`);
        // Use Promise.all for potentially parallel uploads (better performance)
        const uploadPromises = imageFiles.map(async (file) => {
          const imgFormData = new FormData();
          imgFormData.append("file", file);
          const uploadRes = await fetch("/api/upload-image", {
            method: "POST",
            body: imgFormData,
          });
          if (!uploadRes.ok) {
            const errorData = await uploadRes.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Upload failed for ${file.name}`
            );
          }
          const uploadResult = await uploadRes.json();
          if (!uploadResult.url)
            throw new Error(`No URL returned for ${file.name}`);
          // Note: Can't reliably update progress for parallel uploads easily here without more complex state
          // setUploadProgress(...); // Update progress differently if using Promise.all
          return uploadResult.url;
        });

        const results = await Promise.all(uploadPromises);
        uploadedImageUrls.push(...results);
        console.log("All new images uploaded. URLs:", uploadedImageUrls);
        setUploadProgress(100); // Mark as complete
      }

      // --- 2. Prepare data for API ---
      let finalData: any;
      let apiUrl: string;
      let method: string;

      if (modalMode === "edit" && articleToEdit) {
        apiUrl = `/api/articles/${articleToEdit.id}`; // PUT API
        method = "PUT";
        // Combine existing URLs (that were not marked for deletion - complex part omitted)
        // with newly uploaded URLs
        const finalImageUrls = [...existingImageUrls, ...uploadedImageUrls];
        finalData = {
          ...formData,
          categoryId: parseInt(formData.categoryId, 10),
          imageUrls: finalImageUrls, // Send combined list (Backend needs to handle sync)
          // coverImage: finalImageUrls[0] ?? null,
        };
        console.log(`Sending PUT to ${apiUrl}`, finalData);
      } else {
        apiUrl = "/api/articles"; // POST API
        method = "POST";
        finalData = {
          ...formData,
          categoryId: parseInt(formData.categoryId, 10),
          imageUrls: uploadedImageUrls, // Send only new URLs
          // coverImage: uploadedImageUrls[0] ?? null
        };
        console.log(`Sending POST to ${apiUrl}`, finalData);
      }

      // --- 3. Call API (POST or PUT) ---
      const res = await fetch(apiUrl, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${modalMode} article`);
      }

      alert(`บันทึกบทความสำเร็จ!`);
      handleCloseModal(); // Close modal on success
      await fetchArticles(); // Refresh the article list in the background table
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : `Unknown error during ${modalMode}`;
      setFormError(errorMsg); // Show error in modal
      console.error(`${modalMode} Article Error:`, err);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      // Do NOT clear files here on error, user might want to retry
    }
  };

  // --- Delete Handler ---
  const handleDeleteArticle = async (articleId: number, title: string) => {
    if (
      !window.confirm(
        `ต้องการลบบทความ "${title}" (ID: ${articleId}) จริงหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`
      )
    )
      return;
    // Consider setting a specific deleting state for the row?
    setIsLoadingArticles(true); // Reuse main loading indicator for simplicity
    setTableError(null);
    try {
      // Needs API DELETE /api/articles/[articleId]
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });
      if (res.status === 204 || res.ok) {
        // Fetch the updated list instead of just filtering client-side
        await fetchArticles();
        alert("ลบบทความสำเร็จ");
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete article (status: ${res.status})`
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Delete Article Error:", err);
      alert(`เกิดข้อผิดพลาดในการลบ: ${errorMsg}`);
      setTableError(`เกิดข้อผิดพลาดในการลบ: ${errorMsg}`);
      setIsLoadingArticles(false); // Reset loading on error
    }
    // fetchArticles() handles setIsLoadingArticles(false) on success
  };

  // --- JSX Render ---
  return (
    // Use a container for better layout control
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">
          จัดการบทความ
        </h1>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            + เพิ่มบทความใหม่
          </button>
        </div>
      </div>
      {/* Display Table Error */}
      {tableError && (
        <div
          className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4"
          role="alert"
        >
          <p className="font-bold">เกิดข้อผิดพลาด</p>
          <p>{tableError}</p>
        </div>
      )}
      {/* --- Article Table --- */}
      <div className="overflow-x-auto">
        {isLoadingArticles ? (
          <p className="text-center p-10 text-gray-500">กำลังโหลดบทความ...</p>
        ) : articles.length === 0 ? (
          <p className="text-center p-10 text-gray-500">ยังไม่มีบทความในระบบ</p>
        ) : (
          <table className="w-full min-w-[800px] border-collapse bg-white shadow-md rounded">
            <thead>
              <tr className="bg-gray-200 text-left">
                {/* --- เพิ่ม TH สำหรับรูปภาพ --- */}
                <th
                  scope="col"
                  className="p-2"
                >
                  Image
                </th>
                {/* -------------------------- */}
                <th
                  scope="col"
                  className="p-2"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="p-2"
                >
                  Category
                </th>
                {/* <th scope="col" className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 sm:table-cell">Author</th> */}
                <th
                  scope="col"
                  className="p-2"
                >
                  Published
                </th>
                <th scope="col" className="p-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {articles.map((article) => (
                <tr key={article.id}>
                  {/* TD ที่ 1: รูปภาพ */}
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {article.coverImage ? (
                      <Image
                        src={article.coverImage}
                        alt={article.title || "Cover image"}
                        width={64}
                        height={40} // ขนาดที่ต้องการ
                        className="object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder-image.png";
                        }} // Fallback
                      />
                    ) : (
                      <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 italic">
                        No img
                      </div>
                    )}
                  </td>
                  {/* TD ที่ 2: Title */}
                  <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {article.title}
                    {/* ส่วน dl สำหรับ Mobile อาจจะต้องปรับถ้าต้องการให้แสดง Category ใต้ Title */}
                    <dl className="font-normal lg:hidden">
                      <dt className="sr-only">Category</dt>
                      <dd className="mt-1 truncate text-gray-700">
                        {article.category?.name ||
                          `Cat ID: ${article.categoryId}`}
                      </dd>
                    </dl>
                  </td>
                  {/* TD ที่ 3: Category (ซ่อนในจอเล็ก) */}
                  <td className="hidden px-3 py-4 text-sm text-gray-500 lg:table-cell">
                    {article.category?.name || `Cat ID: ${article.categoryId}`}
                  </td>
                  {/* TD ที่ 4: Published Date */}
                  <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(article.publishedAt)}
                  </td>
                  {/* TD ที่ 5: Actions */}
                  <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEditModal(article)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit<span className="sr-only">, {article.title}</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteArticle(article.id, article.title)
                      }
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      Delete<span className="sr-only">, {article.title}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>{" "}
      {/* End table wrapper */}
      {/* --- Add/Edit Article Modal --- */}
      {/* ควบคุมการเปิด/ปิดด้วย State 'isModalOpen', ปิดด้วย 'handleCloseModal' */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        className="relative z-50"
      >
        {/* Background Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3 mb-5">
              <Dialog.Title
                as="h3"
                className="text-lg font-semibold leading-6 text-gray-900"
              >
                {/* เปลี่ยน Title ตาม Mode */}
                {modalMode === "add"
                  ? "เพิ่มบทความใหม่"
                  : `แก้ไขบทความ: ${articleToEdit?.title || "..."}`}
              </Dialog.Title>
              {/* ปุ่มปิด Modal */}
              <button
                type="button"
                onClick={handleCloseModal} // <-- เรียกใช้ handleCloseModal
                className="ml-3 rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isSubmitting} // Disable ตอนกำลัง Submit
              >
                <span className="sr-only">Close</span>&times;{" "}
                {/* เครื่องหมายกากบาท */}
              </button>
            </div>
            {/* Scrollable Form Area */}
            {/* Form เชื่อมกับ handleArticleSubmit */}
            <form
              id="articleForm"
              onSubmit={handleArticleSubmit}
              className="space-y-5 overflow-y-auto flex-grow px-1 pr-2 sm:pr-4"
            >
              {/* แสดง Error ของ Form (ถ้ามี) */}
              {formError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        เกิดข้อผิดพลาด
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{formError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  ชื่อบทความ (Title)
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title} // <-- ผูกกับ State
                  onChange={handleInputChange} // <-- เรียก Handler
                  disabled={isSubmitting}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>

              {/* Description Textarea */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  เนื้อหา (Description)
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={10} // <-- ปรับจำนวนแถวตามต้องการ
                  value={formData.description} // <-- ผูกกับ State
                  onChange={handleInputChange} // <-- เรียก Handler
                  disabled={isSubmitting}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="ใส่เนื้อหาบทความ (แนะนำให้ใช้ Rich Text Editor แทนในอนาคต)"
                />
              </div>

              {/* Category Select */}
              <div>
                <label
                  htmlFor="categoryId"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  หมวดหมู่ (Category)
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  required
                  value={formData.categoryId} // <-- ผูกกับ State
                  onChange={handleInputChange} // <-- เรียก Handler
                  disabled={isSubmitting}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50 disabled:bg-gray-100"
                >
                  <option value="" disabled>
                    -- เลือกหมวดหมู่ --
                  </option>
                  {/* Map จาก fixedCategories */}
                  {fixedCategories.map((cat) => (
                    <option key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multiple Image Input */}
              <div>
                <label
                  htmlFor="articleImages"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  {modalMode === "add"
                    ? "รูปภาพประกอบ (เลือกได้หลายรูป)"
                    : "เพิ่ม/เปลี่ยนรูปภาพประกอบ"}
                </label>
                <input
                  id="articleImages"
                  name="articleImages"
                  type="file"
                  multiple // <-- รับหลายไฟล์
                  required={modalMode === "add" && imageFiles.length === 0} // บังคับเลือกถ้าเป็นโหมด Add
                  accept="image/*"
                  onChange={handleImageChange} // <-- เรียก Handler
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>

              {/* Image Previews */}
              {/* เงื่อนไขแสดงผล: มีรูปเดิม (ตอน Edit) หรือ มีรูปใหม่ที่เลือก */}
              {(existingImageUrls.length > 0 || previewUrls.length > 0) && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    รูปภาพ ({existingImageUrls.length + previewUrls.length}{" "}
                    รูป):
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {/* --- แสดงรูปภาพเดิม (เฉพาะตอน Edit) --- */}
                    {modalMode === "edit" &&
                      existingImageUrls.map((url, index) => (
                        <div
                          key={`existing-${url}-${index}`}
                          className="relative group border rounded-md overflow-hidden aspect-square bg-gray-100"
                        >
                          <Image
                            src={url}
                            alt={`Existing ${index + 1}`}
                            fill
                            style={{ objectFit: "cover" }}
                          />
                          {/* --- !!! ต้องเพิ่ม Logic และปุ่มสำหรับลบรูปเดิม ถ้าต้องการ !!! --- */}
                          <button type="button" onClick={() => removeExistingImage(url)} className="absolute top-1 right-1 ...">&times;</button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center p-0.5">
                            เดิม
                          </div>
                        </div>
                      ))}
                    {/* --- แสดง Preview รูปภาพใหม่ที่เลือก --- */}
                    {previewUrls.map((url, index) => (
                      <div
                        key={url}
                        className="relative group border rounded-md overflow-hidden aspect-square bg-gray-100"
                      >
                        <Image
                          src={url}
                          alt={`Preview ${index + 1}`}
                          fill
                          style={{ objectFit: "cover" }}
                        />
                        {/* ปุ่มลบ Preview รูปใหม่ */}
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)} // <-- เรียก Handler ลบรูป
                          disabled={isSubmitting}
                          className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0 w-5 h-5 flex items-center justify-center text-xs leading-none opacity-80 group-hover:opacity-100 disabled:opacity-50"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress (ถ้ามีไฟล์ใหม่กำลังอัปโหลด) */}
              {isSubmitting &&
                imageFiles.length > 0 &&
                uploadProgress < 100 && (
                  <div className="pt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-center mt-1 text-gray-600">
                      กำลังอัปโหลดรูปภาพ... {uploadProgress}%
                    </p>
                  </div>
                )}
            </form>{" "}
            {/* End Form */}
            {/* Modal Footer Buttons */}
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3 border-t pt-5">
              {/* ปุ่ม Submit จะอยู่นอก Form แต่ใช้ form="articleForm" เพื่อให้ทำงานได้ */}
              <button
                type="submit"
                form="articleForm" // <-- เชื่อมกับ Form ด้านบน
                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  isSubmitting ||
                  (modalMode === "add" && imageFiles.length === 0)
                } // Disable ถ้าไม่มีรูปตอน Add
              >
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : modalMode === "add"
                  ? "สร้างบทความ"
                  : "บันทึกการแก้ไข"}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 disabled:opacity-50"
                onClick={handleCloseModal} // <-- เรียก Handler ปิด Modal
                disabled={isSubmitting} // Disable ตอนกำลัง Submit
              >
                ยกเลิก
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
