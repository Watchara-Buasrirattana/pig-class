// app/admin/achievements/page.tsx
"use client";
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Dialog } from "@headlessui/react";
import Image from "next/image"; // สำหรับแสดงรูป
import defaultPlaceholderImage from "../../../public/placeholder-image.png"; // <<-- สร้างรูปนี้ไว้ใน public

// --- Types ---
type AchievementData = {
  id: number;
  image: string; // URL
};

// FormData อาจจะไม่จำเป็นถ้ามีแค่รูปอย่างเดียว หรือใช้ imageFile state ตรงๆ
// type AchievementFormData = { image: string; };

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Error สำหรับ Table

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [achievementToEdit, setAchievementToEdit] =
    useState<AchievementData | null>(null);
  // ไม่ต้องมี formData state ถ้ามีแค่รูป
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // สำหรับรูปใหม่
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // Error ใน Modal

  // --- Fetch Achievements ---
  const fetchAchievements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const data = await res.json();
      setAchievements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchAchievements();
  }, []);

  // --- Modal & Form Handlers ---
  const handleOpenAddModal = () => {
    setModalMode("add");
    setAchievementToEdit(null);
    setImageFile(null);
    setPreviewUrl(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ach: AchievementData) => {
    setModalMode("edit");
    setAchievementToEdit(ach);
    setImageFile(null);
    setPreviewUrl(ach.image); // แสดงรูปเดิมเป็น Preview
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPreviewUrl(null); // Cleanup preview
    setImageFile(null);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl); // Cleanup old preview
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setPreviewUrl(
        modalMode === "edit" && achievementToEdit
          ? achievementToEdit.image
          : null
      );
    }
  };
  useEffect(() => {
    // Cleanup previewUrl
    const currentPreview = previewUrl;
    return () => {
      if (currentPreview && currentPreview.startsWith("blob:"))
        URL.revokeObjectURL(currentPreview);
    };
  }, [previewUrl]);

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    let finalImageUrl =
      modalMode === "edit" && achievementToEdit ? achievementToEdit.image : "";

    if (imageFile) {
      // ถ้ามีการเลือกรูปใหม่
      const uploadFormData = new FormData();
      uploadFormData.append("file", imageFile);
      try {
        const resUpload = await fetch("/api/upload-image", {
          method: "POST",
          body: uploadFormData,
        });
        if (!resUpload.ok) {
          const errData = await resUpload.json().catch(() => ({}));
          throw new Error(errData.error || "Image upload failed");
        }
        const uploadResult = await resUpload.json();
        finalImageUrl = uploadResult.url;
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Image upload error");
        setIsSubmitting(false);
        return;
      }
    } else if (modalMode === "add" && !imageFile) {
      alert("กรุณาเลือกรูปภาพสำหรับ Achievement");
      setIsSubmitting(false);
      return;
    }
    if (!finalImageUrl) {
      // ถ้า Edit แล้วลบรูป แต่ Schema บังคับให้มีรูป
      alert("ต้องมีรูปภาพสำหรับ Achievement");
      setIsSubmitting(false);
      return;
    }

    const dataToSend = { image: finalImageUrl };

    try {
      let response;
      if (modalMode === "add") {
        response = await fetch("/api/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });
      } else if (achievementToEdit) {
        response = await fetch(`/api/achievements/${achievementToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });
      } else {
        throw new Error("Invalid mode or missing data for edit.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save achievement`);
      }
      alert(`บันทึก Achievement สำเร็จ!`);
      handleCloseModal();
      fetchAchievements();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unknown error saving achievement"
      );
      console.error("Submit Achievement Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAchievement = async (id: number) => {
    if (!window.confirm(`ต้องการลบ Achievement ID: ${id} จริงหรือไม่?`)) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/achievements/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete achievement`);
      }
      alert("ลบ Achievement สำเร็จ");
      fetchAchievements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error deleting");
      setIsLoading(false); // Only set to false on error, fetchAchievements will handle it on success
      console.error("Delete Achievement Error:", err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold">จัดการ Achievements</h1>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + เพิ่ม Achievement
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="mb-4 bg-red-100 ...">{error}</div>
      )}

      <div className="-mx-4 mt-8 overflow-hidden shadow sm:-mx-6 md:mx-0 md:rounded-lg">
        {isLoading ? (
          <p className="p-10 text-center">Loading...</p>
        ) : achievements.length === 0 ? (
          <p className="p-10 text-center">No achievements found.</p>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="w-1/4 px-3 py-3.5 text-center text-sm font-semibold text-gray-900"
                >
                  {" "}
                  {/* ตัวอย่าง: กว้าง 1/4 */}
                  Image
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {achievements.map((ach) => (
                <tr key={ach.id}>
                  <td className="px-3 py-2 text-sm text-gray-500 text-center">
                    {" "}
                    {/* <<-- เพิ่ม text-center */}
                    {ach.image && (
                      <div className="inline-block">
                        {" "}
                        {/* <<-- ครอบด้วย div เพื่อให้จัดกลางได้ง่าย */}
                        <Image
                          src={ach.image}
                          alt={`Achievement ${ach.id}`}
                          width={100} // หรือขนาดที่ต้องการ
                          height={100}
                          className="object-contain rounded"
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-4 pl-3 pr-4 text-right ...">
                    <button
                      onClick={() => handleOpenEditModal(ach)}
                      className="text-indigo-600 ..."
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAchievement(ach.id)}
                      className="text-red-600 ... ml-4"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- Add/Edit Achievement Modal --- */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-3 mb-5">
              <Dialog.Title
                as="h3"
                className="text-lg font-semibold leading-6 text-gray-900"
              >
                {modalMode === "add"
                  ? "เพิ่ม Achievement ใหม่"
                  : `แก้ไข Achievement (ID: ${achievementToEdit?.id})`}
              </Dialog.Title>
              <button
                type="button"
                onClick={handleCloseModal}
                className="ml-3 rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isSubmitting}
              >
                <span className="sr-only">Close</span>&times;
              </button>
            </div>

            {/* Form Area */}
            <form
              id="achievementForm"
              onSubmit={handleFormSubmit}
              className="mt-2 space-y-4 overflow-y-auto flex-grow px-1 pr-2 sm:pr-4"
            >
              {formError && (
                <div className="rounded-md bg-red-50 p-3 mb-4">
                  <div className="flex">
                    <div className="ml-2">
                      <h3 className="text-sm font-medium text-red-800">
                        เกิดข้อผิดพลาด:
                      </h3>
                      <div className="mt-1 text-sm text-red-700">
                        <p>{formError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label
                  htmlFor="achImage"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  {modalMode === "add"
                    ? "รูปภาพ Achievement"
                    : "เปลี่ยนรูปภาพ (ถ้าต้องการ)"}
                </label>
                <input
                  id="achImage"
                  name="achImage"
                  type="file"
                  accept="image/*"
                  required={modalMode === "add" && !imageFile && !previewUrl} // บังคับเลือกถ้าเป็น Add Mode และยังไม่มีรูป
                  onChange={handleImageChange}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                  disabled={isSubmitting}
                />
              </div>

              {/* Preview Image */}
              {previewUrl && (
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {modalMode === "edit" && imageFile
                      ? "รูปภาพใหม่:"
                      : modalMode === "edit"
                      ? "รูปภาพปัจจุบัน:"
                      : "Preview:"}
                  </p>
                  <div className="relative inline-block border rounded-md overflow-hidden">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={150}
                      height={150}
                      className="object-contain rounded" // ใช้ contain เพื่อให้เห็นทั้งรูป
                    />
                    {/* ปุ่มลบรูปที่ Preview (ถ้าเป็นรูปใหม่ที่เพิ่งเลือก) */}
                    {imageFile && ( // แสดงปุ่มลบเฉพาะเมื่อ imageFile (ไฟล์ใหม่) มีค่า
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(
                            modalMode === "edit" && achievementToEdit
                              ? achievementToEdit.image
                              : null
                          ); // กลับไปแสดงรูปเดิมถ้า Edit
                          const fileInput = document.getElementById(
                            "achImage"
                          ) as HTMLInputElement;
                          if (fileInput) fileInput.value = ""; // เคลียร์ค่าใน input file
                        }}
                        disabled={isSubmitting}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0 w-5 h-5 flex items-center justify-center text-xs leading-none opacity-80 hover:opacity-100 disabled:opacity-50"
                        aria-label="Remove selected image"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer Buttons */}
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3 border-t border-gray-200 pt-5">
              <button
                type="submit"
                form="achievementForm" // เชื่อมกับ Form ด้านบน
                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || (modalMode === "add" && !imageFile)}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : modalMode === "add" ? (
                  "สร้าง Achievement"
                ) : (
                  "บันทึกการแก้ไข"
                )}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 disabled:opacity-50"
                onClick={handleCloseModal}
                disabled={isSubmitting}
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
