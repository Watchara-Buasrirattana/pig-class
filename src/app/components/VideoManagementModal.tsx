// components/VideoManagementModal.tsx
"use client";
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { Dialog } from "@headlessui/react";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob"; // Import Azure SDK

// --- Types ---
// ควรจะ import มาจากที่เดียวกับ LessonModal หรือไฟล์กลาง
type Lesson = {
  id: number;
  title: string;
  courseId: number;
  lessonNumber: number /* ... other fields */;
};
type Video = {
  id: number;
  title: string;
  url: string;
  lessonId: number /* ... other fields */;
};
interface VideoManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
}

export default function VideoManagementModal({
  isOpen,
  onClose,
  lesson,
}: VideoManagementModalProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditVideoModalOpen, setIsEditVideoModalOpen] = useState(false);
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  // State สำหรับ Upload Form
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // --- Fetch existing videos ---
  useEffect(() => {
    if (isOpen && lesson?.id) {
      const fetchVideos = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // ใช้ API GET /api/lessons/[lessonId]/videos ที่เราสร้างไว้
          const res = await fetch(`/api/lessons/${lesson.id}/videos`);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                `Failed to fetch videos (status: ${res.status})`
            );
          }
          const data: Video[] = await res.json();
          setVideos(data);
        } catch (err) {
          const errorMsg =
            err instanceof Error
              ? err.message
              : "An unknown error occurred while fetching videos";
          setError(errorMsg);
          console.error("Fetch Videos Error:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchVideos();
    } else {
      // Reset state when closed or no lesson
      setVideos([]);
      setVideoFile(null);
      setVideoTitle("");
      setIsUploading(false);
      setUploadProgress(0);
      setError(null);
    }
  }, [isOpen, lesson]);
  const handleOpenEditVideoModal = (video: Video) => {
    setVideoToEdit(video);
    setEditVideoTitle(video.title);
    setIsEditVideoModalOpen(true);
    setError(null);
  };

  const handleCloseEditVideoModal = () => {
    setIsEditVideoModalOpen(false);
    setVideoToEdit(null);
  };

  const handleUpdateVideoTitle = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoToEdit || !editVideoTitle.trim()) {
      alert("กรุณาใส่ชื่อวิดีโอใหม่");
      return;
    }
    if (editVideoTitle.trim() === videoToEdit.title) {
      handleCloseEditVideoModal(); // No changes
      return;
    }

    setIsUpdatingTitle(true);
    setError(null);

    try {
      // ใช้ API PUT /api/videos/[videoId]
      const res = await fetch(`/api/videos/${videoToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editVideoTitle.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to update video title (status: ${res.status})`
        );
      }

      const updatedVideo: Video = await res.json();

      // Update local state
      setVideos((prevVideos) =>
        prevVideos.map((v) => (v.id === updatedVideo.id ? updatedVideo : v))
      );
      handleCloseEditVideoModal();
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred while updating title";
      setError(errorMsg); // Show error maybe inside edit modal?
      console.error("Update Title Error:", err);
      alert(`เกิดข้อผิดพลาดในการแก้ไขชื่อ: ${errorMsg}`);
    } finally {
      setIsUpdatingTitle(false);
    }
  };
  const handleDeleteVideo = async (videoId: number) => {
    if (
      !window.confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบวิดีโอ ID: ${videoId}? การกระทำนี้จะลบไฟล์ออกจากระบบอย่างถาวร`
      )
    ) {
      return;
    }

    setError(null);
    // อาจจะเพิ่ม State isDeleting สำหรับปุ่ม
    try {
      // ใช้ API DELETE /api/videos/[videoId]
      const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });

      if (res.status === 204) {
        // Successfully deleted
        setVideos((prevVideos) =>
          prevVideos.filter((video) => video.id !== videoId)
        );
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete video (status: ${res.status})`
        );
      } else {
        setVideos((prevVideos) =>
          prevVideos.filter((video) => video.id !== videoId)
        ); // Assume success if OK but not 204
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during video deletion";
      setError(errorMsg);
      console.error("Delete Video Error:", err);
      alert(`เกิดข้อผิดพลาดในการลบวิดีโอ: ${errorMsg}`);
    } finally {
      // setIsDeleting(false);
    }
  };
  // --- Handle File Selection ---
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      // Auto-fill title with filename (optional)
      if (!videoTitle) {
        setVideoTitle(e.target.files[0].name.split(".").slice(0, -1).join(".")); // Remove extension
      }
    } else {
      setVideoFile(null);
    }
  };

  // --- Handle Video Upload (SAS Token Flow) ---
  const handleUploadVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoFile || !videoTitle.trim() || !lesson?.id) {
      alert("กรุณาเลือกไฟล์วิดีโอและใส่ชื่อวิดีโอ");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    let sasUrl = "";
    let blobUrl = ""; // The final URL without SAS

    try {
      // --- Step 1: Get SAS URL from Backend ---
      console.log("Requesting SAS URL...");
      const sasRes = await fetch(
        `/api/lessons/${lesson.id}/generate-upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: videoFile.name,
            contentType: videoFile.type,
          }),
        }
      );

      if (!sasRes.ok) {
        const errorData = await sasRes.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to get SAS URL (status: ${sasRes.status})`
        );
      }

      const sasData = await sasRes.json();
      sasUrl = sasData.sasUrl;
      blobUrl = sasData.blobUrl; // Get the final blob URL
      console.log("SAS URL received:", sasUrl);
      console.log("Final Blob URL:", blobUrl);

      // --- Step 2: Upload directly to Azure using SAS URL ---
      console.log("Uploading to Azure...");
      // Note: For large files, consider using BlobServiceClient and uploadBrowserData for better progress & cancellation
      const blockBlobClient = new BlockBlobClient(sasUrl); // Use BlockBlobClient with SAS URL

      await blockBlobClient.uploadData(videoFile, {
        blobHTTPHeaders: { blobContentType: videoFile.type },
        onProgress: (progress) => {
          const percent = Math.round(
            (progress.loadedBytes / videoFile.size) * 100
          );
          console.log(`Upload progress: ${percent}%`);
          setUploadProgress(percent);
        },
        // For very large files, consider maxSingleShotSize to force chunking if needed by SDK
      });
      console.log("Azure upload complete.");
      setUploadProgress(100); // Mark as complete

      // --- Step 3: Save Video Metadata to our DB ---
      console.log("Saving metadata to database...");
      const metaRes = await fetch(`/api/lessons/${lesson.id}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: videoTitle.trim(),
          url: blobUrl, // Send the final, permanent URL
        }),
      });

      if (!metaRes.ok) {
        const errorData = await metaRes.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to save video metadata (status: ${metaRes.status})`
        );
      }

      const savedVideo: Video = await metaRes.json();
      console.log("Metadata saved:", savedVideo);

      // --- Step 4: Update UI ---
      setVideos((prevVideos) => [...prevVideos, savedVideo]); // Add to list
      setVideoFile(null); // Clear file input
      setVideoTitle(""); // Clear title input
      // Optionally clear file input visually: e.target.reset() if using form ref
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during upload";
      setError(errorMsg);
      console.error("Upload Video Error:", err);
      alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${errorMsg}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0); // Reset progress
    }
  };

  if (!lesson) return null; // Should not happen if isOpen is true

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {" "}
      {/* Higher z-index */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
            aria-label="Close"
            disabled={isUploading} // Disable close during upload
          >
            &times;
          </button>
          <Dialog.Title className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
            จัดการวิดีโอ: {lesson.lessonNumber}. {lesson.title}
          </Dialog.Title>

          {/* Upload New Video Section */}
          <div className="mb-6 border-b pb-4">
            <h3 className="text-lg font-medium mb-2">อัปโหลดวิดีโอใหม่</h3>
            <form onSubmit={handleUploadVideo}>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={`video-title-${lesson.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ชื่อวิดีโอ
                  </label>
                  <input
                    id={`video-title-${lesson.id}`}
                    type="text"
                    required
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="ตั้งชื่อวิดีโอที่สื่อความหมาย"
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`video-file-${lesson.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    เลือกไฟล์วิดีโอ
                  </label>
                  <input
                    id={`video-file-${lesson.id}`}
                    type="file"
                    required
                    accept="video/*" // Allow any video format
                    onChange={handleFileChange} // Assuming similar handler exists
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50" // Styled file input
                    disabled={isUploading}
                  />
                  {videoFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {videoFile.name} (
                      {(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                {/* Progress Bar */}
                {isUploading && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                    <p className="text-xs text-center mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                )}
                <div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    disabled={isUploading || !videoFile || !videoTitle.trim()}
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
                        กำลังอัปโหลด... ({uploadProgress}%)
                      </>
                    ) : (
                      "อัปโหลดวิดีโอ"
                    )}
                  </button>
                </div>
                {/* Display Upload Error */}
                {error && (
                  <p className="text-red-500 text-sm mt-2">Error: {error}</p>
                )}
              </div>
            </form>
          </div>

          {/* Display Existing Videos Section */}
          <div className="flex-grow overflow-y-auto">
            <h3 className="text-lg font-medium mb-2">วิดีโอที่มีอยู่</h3>
            {isLoading ? (
              <p>Loading videos...</p>
            ) : videos.length === 0 ? (
              <p className="text-gray-500">ยังไม่มีวิดีโอสำหรับบทเรียนนี้</p>
            ) : (
              <ul className="space-y-2">
                {videos.map((video) => (
                  <li
                    key={video.id}
                    className="p-2 border rounded bg-gray-50 flex justify-between items-center gap-2"
                  >
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate flex-grow"
                    >
                      {video.title}
                    </a>
                    <div className="space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditVideoModal(video)} // <-- ปุ่มแก้ไข
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1"
                      >
                        แก้ไขชื่อ
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(video.id)} // <-- ปุ่มลบ
                        className="text-red-500 hover:text-red-700 text-xs font-medium px-1"
                      >
                        ลบวิดีโอ
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/* Display Fetch Error */}
            {error && !isUploading && (
              <p className="text-red-500 text-sm mt-2">
                Error fetching videos: {error}
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
      {/* --- Edit Video Title Modal --- */}
      {videoToEdit && (
        <Dialog
          open={isEditVideoModalOpen}
          onClose={handleCloseEditVideoModal}
          className="relative z-60"
        >
          {" "}
          {/* Higher z-index than video modal */}
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4 text-gray-800">
                แก้ไขชื่อวิดีโอ
              </Dialog.Title>
              <p className="text-sm text-gray-600 mb-1">ID: {videoToEdit.id}</p>
              <p
                className="text-sm text-gray-600 mb-4 truncate"
                title={videoToEdit.url}
              >
                URL: {videoToEdit.url}
              </p>
              <form onSubmit={handleUpdateVideoTitle}>
                <div>
                  <label
                    htmlFor={`edit-video-title-${videoToEdit.id}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ชื่อวิดีโอใหม่
                  </label>
                  <input
                    id={`edit-video-title-${videoToEdit.id}`}
                    type="text"
                    required
                    value={editVideoTitle}
                    onChange={(e) => setEditVideoTitle(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={isUpdatingTitle}
                  />
                </div>
                {/* Display Edit Title Error */}
                {error && isUpdatingTitle && (
                  <p className="text-red-500 text-sm mt-2">Error: {error}</p>
                )}
                <div className="flex justify-end mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseEditVideoModal}
                    className="mr-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                    disabled={isUpdatingTitle}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUpdatingTitle}
                  >
                    {isUpdatingTitle ? "กำลังบันทึก..." : "บันทึกชื่อ"}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
      {/* --- End Edit Video Title Modal --- */}
    </Dialog>
  );
}
