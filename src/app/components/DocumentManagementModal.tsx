// components/DocumentManagementModal.tsx
"use client";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Dialog } from "@headlessui/react";

// --- Types ---
// ควรจะ import หรือกำหนดไว้ที่ส่วนกลาง
type Course = { id: number; courseName: string /* ... other fields */ };
type Document = {
  id: number;
  title: string;
  fileUrl: string;
  fileSize: number;
  courseId: number /* ... other fields */;
};

interface DocumentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
}

// Helper function to format file size
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function DocumentManagementModal({
  isOpen,
  onClose,
  course,
}: DocumentManagementModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State สำหรับ Upload Form
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // --- Fetch existing documents ---
  useEffect(() => {
    if (isOpen && course?.id) {
      const fetchDocuments = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // ใช้ API GET /api/courses/[courseId]/documents
          const res = await fetch(`/api/courses/${course.id}/documents`);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                `Failed to fetch documents (status: ${res.status})`
            );
          }
          const data: Document[] = await res.json();
          setDocuments(data);
        } catch (err) {
          const errorMsg =
            err instanceof Error
              ? err.message
              : "An unknown error occurred while fetching documents";
          setError(errorMsg);
          console.error("Fetch Documents Error:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDocuments();
    } else {
      // Reset state when closed or no course
      setDocuments([]);
      setNewDocumentFile(null);
      setNewDocumentTitle("");
      setIsUploading(false);
      setError(null);
    }
  }, [isOpen, course]);

  // --- Handle File Selection ---
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Basic check for PDF type on client side
      if (e.target.files[0].type !== "application/pdf") {
        alert("กรุณาเลือกไฟล์ PDF เท่านั้น");
        e.target.value = ""; // Clear the input
        setNewDocumentFile(null);
        return;
      }
      setNewDocumentFile(e.target.files[0]);
      // Auto-fill title (optional)
      if (!newDocumentTitle) {
        setNewDocumentTitle(e.target.files[0].name.replace(".pdf", "")); // Remove .pdf extension
      }
    } else {
      setNewDocumentFile(null);
    }
  };

  // --- Handle Document Upload ---
  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDocumentFile || !newDocumentTitle.trim() || !course?.id) {
      alert("กรุณาเลือกไฟล์ PDF และใส่ชื่อเอกสาร");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("title", newDocumentTitle.trim());
    formData.append("file", newDocumentFile); // 'file' ต้องตรงกับที่ Backend (formidable) คาดหวัง

    try {
      // ใช้ API POST /api/courses/[courseId]/documents
      const res = await fetch(`/api/courses/${course.id}/documents`, {
        method: "POST",
        body: formData, // ส่ง FormData (ไม่ต้องใส่ Content-Type header, browser จัดการเอง)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to upload document (status: ${res.status})`
        );
      }

      const uploadedDocument: Document = await res.json();

      // Update UI
      setDocuments((prevDocs) =>
        [...prevDocs, uploadedDocument].sort((a, b) =>
          a.title.localeCompare(b.title)
        )
      ); // Add and sort by title
      setNewDocumentFile(null);
      setNewDocumentTitle("");
      // Clear file input visually if needed (e.g., using a form ref)
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during upload";
      setError(errorMsg);
      console.error("Upload Document Error:", err);
      alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // --- Handle Document Deletion ---
  const handleDeleteDocument = async (documentId: number) => {
    if (
      !window.confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร ID: ${documentId}? การกระทำนี้จะลบไฟล์ออกจากระบบอย่างถาวร`
      )
    ) {
      return;
    }

    setError(null);
    // อาจเพิ่ม isDeleting state
    try {
      // ใช้ API DELETE /api/documents/[documentId]
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (res.status === 204) {
        // Successfully deleted
        setDocuments((prevDocs) =>
          prevDocs.filter((doc) => doc.id !== documentId)
        );
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete document (status: ${res.status})`
        );
      } else {
        setDocuments((prevDocs) =>
          prevDocs.filter((doc) => doc.id !== documentId)
        );
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during deletion";
      setError(errorMsg);
      console.error("Delete Document Error:", err);
      alert(`เกิดข้อผิดพลาดในการลบเอกสาร: ${errorMsg}`);
    } finally {
      // setIsDeleting(false);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
            aria-label="Close"
            disabled={isUploading}
          >
            &times;
          </button>
          <Dialog.Title className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
            จัดการเอกสารสำหรับ: {course.courseName}
          </Dialog.Title>

          {/* Upload New Document Section */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-lg font-medium mb-2">
              อัปโหลดเอกสารใหม่ (PDF)
            </h3>
            <form onSubmit={handleUploadDocument}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <label
                    htmlFor={`doc-title-${course.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ชื่อเอกสาร
                  </label>
                  <input
                    id={`doc-title-${course.id}`}
                    type="text"
                    required
                    value={newDocumentTitle}
                    onChange={(e) => setNewDocumentTitle(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="เช่น Sheet สรุปบทที่ 1"
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`doc-file-${course.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    เลือกไฟล์ PDF
                  </label>
                  <input
                    id={`doc-file-${course.id}`}
                    type="file"
                    required
                    accept=".pdf,application/pdf" // Allow PDF only
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50" // Styled file input
                    disabled={isUploading}
                    //key={newDocumentFile ? "file-selected" : "no-file"} // Help reset file input if needed
                  />
                  {newDocumentFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {newDocumentFile.name} (
                      {formatBytes(newDocumentFile.size)})
                    </p>
                  )}
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={
                    isUploading || !newDocumentFile || !newDocumentTitle.trim()
                  }
                >
                  {isUploading ? (
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
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    "อัปโหลดเอกสาร"
                  )}
                </button>
              </div>
              {/* Display Upload Error */}
              {error && isUploading && (
                <p className="text-red-500 text-sm mt-2">Error: {error}</p>
              )}
            </form>
          </div>

          {/* Display Existing Documents Section */}
          <div className="flex-grow overflow-y-auto">
            <h3 className="text-lg font-medium mb-2">เอกสารที่มีอยู่</h3>
            {isLoading ? (
              <p>Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-gray-500">ยังไม่มีเอกสารสำหรับคอร์สนี้</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="p-3 border rounded bg-gray-50 flex justify-between items-center gap-2"
                  >
                    <div className="flex-grow overflow-hidden">
                      {" "}
                      {/* Added overflow hidden */}
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium block truncate"
                        title={doc.title}
                      >
                        {doc.title}
                      </a>
                      <span className="text-xs text-gray-500">
                        {formatBytes(doc.fileSize)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 flex-shrink-0" // Added padding
                    >
                      ลบ
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* Display Fetch Error */}
            {error && !isUploading && (
              <p className="text-red-500 text-sm mt-2">
                Error fetching documents: {error}
              </p>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              disabled={isUploading}
            >
              ปิด
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
