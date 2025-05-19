// src/app/admin/users/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import defaultAvatar from "../../img/Profile-icon.png";

type EnrolledCourseDetail = {
  courseId: number;
  course: {
    courseName: string;
    // id: number; // API ส่ง course.id มาด้วย
  };
};

type AdminUserView = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profileImg?: string | null;
  enrollments?: EnrolledCourseDetail[];
};

type CourseOption = {
  id: number;
  courseName: string;
};

type UserEditFormData = {
  role: string;
  firstName: string; // ทำให้เป็น non-optional ถ้า form บังคับกรอก
  lastName: string;  // ทำให้เป็น non-optional ถ้า form บังคับกรอก
  coursesToEnroll: number[];
  coursesToUnenroll: number[]; // สำหรับการยกเลิกคอร์ส (ถ้าต้องการ)
};

export default function AdminUserManagementPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserView | null>(null);
  const [editFormData, setEditFormData] = useState<UserEditFormData>({
    role: "user", // Default role เป็น USER
    firstName: "",
    lastName: "",
    coursesToEnroll: [],
    coursesToUnenroll: [],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const coursesFetchedRef = useRef(false);


  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || session.user?.role !== 'admin') { // ตรวจสอบ case ของ 'ADMIN'
      router.replace('/');
    }
  }, [authStatus, session, router]);

  const fetchUsersAndCourses = useCallback(async () => {
    if (authStatus !== 'authenticated' || session?.user?.role !== 'admin') { // ตรวจสอบ case ของ 'ADMIN'
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const usersRes = await fetch('/api/admin/users');
      if (!usersRes.ok) throw new Error(await usersRes.text() || 'Failed to fetch users');
      const usersData: AdminUserView[] = await usersRes.json();
      setUsers(usersData);

      if (!coursesFetchedRef.current) {
        const coursesRes = await fetch('/api/courses?all=true');
        if (!coursesRes.ok) throw new Error(await coursesRes.text() || 'Failed to fetch courses for dropdown');
        const coursesDataFromApi = await coursesRes.json();
        let coursesToSet: CourseOption[] = [];
        if (Array.isArray(coursesDataFromApi)) {
            coursesToSet = coursesDataFromApi as CourseOption[];
        } else if (coursesDataFromApi && Array.isArray(coursesDataFromApi.courses)) {
            coursesToSet = coursesDataFromApi.courses as CourseOption[];
        }
        setAllCourses(coursesToSet);
        coursesFetchedRef.current = true;
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Could not load data.");
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, session]);

  useEffect(() => {
    if (authStatus === 'authenticated' && session?.user?.role === 'admin') { // ตรวจสอบ case ของ 'ADMIN'
      fetchUsersAndCourses();
    }
  }, [authStatus, session, fetchUsersAndCourses]);

  const openEditModal = (user: AdminUserView) => {
    setEditingUser(user);
    setEditFormData({
      role: user.role || "USER", // Default เป็น USER ถ้า role ไม่มีค่า
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      coursesToEnroll: [],
      coursesToUnenroll: [], // ถ้าจะ implement การ unenroll
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // Handler สำหรับ Multi-select ของ coursesToEnroll
  const handleCoursesToEnrollChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                           .filter(id => !isNaN(id)); // กรอง NaN ออก
    setEditFormData(prev => ({ ...prev, coursesToEnroll: selectedIds }));
  };

  // (Optional) Handler สำหรับ Multi-select ของ coursesToUnenroll
  const handleCoursesToUnenrollChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                           .filter(id => !isNaN(id));
    setEditFormData(prev => ({ ...prev, coursesToUnenroll: selectedIds }));
  };


  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setFormError(null);

    const payload: any = {
        role: editFormData.role,
        firstName: editFormData.firstName.trim() || null, // ส่ง null ถ้าเป็น empty string
        lastName: editFormData.lastName.trim() || null,   // ส่ง null ถ้าเป็น empty string
    };

    // เพิ่มเฉพาะ course ID ที่ยังไม่ได้ enroll และถูกเลือกใหม่
    const currentEnrolledCourseIds = editingUser.enrollments?.map(enr => enr.courseId) || [];
    const newUniqueEnrollments = editFormData.coursesToEnroll.filter(
        courseId => !currentEnrolledCourseIds.includes(courseId)
    );

    if (newUniqueEnrollments.length > 0) {
        payload.courseIdsToEnroll = newUniqueEnrollments;
    }

    if (editFormData.coursesToUnenroll.length > 0) {
        payload.courseIdsToUnenroll = editFormData.coursesToUnenroll;
    }


    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({message: "An unknown error occurred during update."}));
        throw new Error(errorData.message || `Failed to update user: ${res.statusText}`);
      }
      alert('อัปเดตข้อมูลผู้ใช้สำเร็จ!');
      setIsEditModalOpen(false);
      fetchUsersAndCourses(); // โหลดข้อมูลใหม่
    } catch (err) {
      console.error("Error updating user:", err);
      setFormError(err instanceof Error ? err.message : "Could not update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`คุณต้องการลบผู้ใช้ "${userName}" (ID: ${userId}) จริงหรือไม่?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const errorData = await res.json().catch(() => ({message: "An unknown error occurred during delete."}));
        throw new Error(errorData.message || `Failed to delete user: ${res.statusText}`);
      }
      alert('ลบผู้ใช้สำเร็จ!');
      fetchUsersAndCourses();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert(`เกิดข้อผิดพลาดในการลบผู้ใช้: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (authStatus === 'loading') return <div className="p-6 text-center">กำลังโหลดข้อมูลผู้ใช้...</div>;
  if (authStatus !== 'authenticated' || session?.user?.role !== 'admin') { // ตรวจสอบ case 'ADMIN'
    return <div className="p-6 text-center text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }
  if (isLoading) return <div className="p-6 text-center">กำลังโหลดรายชื่อผู้ใช้และคอร์ส...</div>;
  if (error) return <div className="p-6 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">จัดการผู้ใช้งานระบบ</h1>
      </div>
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รูป</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">คอร์สที่ลงทะเบียน</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Image
                    src={user.profileImg || defaultAvatar.src}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={32} height={32} className="rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar.src; }}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' : // ตรวจสอบ case 'ADMIN'
                    user.role === 'user' ? 'bg-green-100 text-green-800' : // ตรวจสอบ case 'USER'
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.enrollments && user.enrollments.length > 0
                    ? user.enrollments.map(enr => enr.course.courseName).join(', ')
                    : <span className="italic">ยังไม่ลงทะเบียน</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900 mr-3">แก้ไข</button>
                  {session?.user?.id !== user.id.toString() && (
                     <button onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)} className="text-red-600 hover:text-red-900" disabled={isSubmitting}>ลบ</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (<tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูลผู้ใช้</td></tr>)}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-4 border-b pb-3">
              แก้ไขข้อมูล: {editingUser.firstName} {editingUser.lastName} (ID: {editingUser.id})
            </h3>
            <form onSubmit={handleUpdateUser}>
              {formError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{formError}</p>}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label htmlFor="edit-firstName" className="block text-sm font-medium text-gray-700">ชื่อ</label>
                  <input type="text" name="firstName" id="edit-firstName" value={editFormData.firstName} onChange={handleEditFormChange}
                    className="mt-1 block w-full input-class"/>
                </div>
                <div>
                  <label htmlFor="edit-lastName" className="block text-sm font-medium text-gray-700">นามสกุล</label>
                  <input type="text" name="lastName" id="edit-lastName" value={editFormData.lastName} onChange={handleEditFormChange}
                    className="mt-1 block w-full input-class"/>
                </div>
                <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">Role</label>
                  <select name="role" id="edit-role" value={editFormData.role} onChange={handleEditFormChange}
                    className="mt-1 block w-full input-class">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="pt-4 border-t mt-4">
                  <h4 className="text-md font-medium text-gray-800 mb-2">จัดการคอร์สเรียนของ <span className="font-semibold">{editingUser.firstName}</span></h4>
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">คอร์สที่ลงทะเบียนแล้ว:</p>
                    {editingUser.enrollments && editingUser.enrollments.length > 0 ? (
                      <ul className="list-disc list-inside pl-5 text-sm text-gray-700 max-h-28 overflow-y-auto custom-scrollbar border rounded p-2 mt-1">
                        {editingUser.enrollments.map(enr => (
                          <li key={enr.courseId} className="py-0.5">{enr.course.courseName}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic mt-1">ยังไม่ได้ลงทะเบียนคอร์สใดๆ</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="coursesToEnroll" className="block text-sm font-medium text-gray-700">
                      เพิ่มการลงทะเบียนคอร์ส:
                      <span className="text-xs text-gray-500 ml-1">(เลือกหลายรายการได้ด้วย Ctrl/Cmd + Click)</span>
                    </label>
                    <select
                      multiple
                      name="coursesToEnroll"
                      id="coursesToEnroll"
                      value={editFormData.coursesToEnroll.map(String)}
                      onChange={handleCoursesToEnrollChange} // ใช้ handler ที่สร้างขึ้น
                      disabled={isSubmitting}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-32 custom-scrollbar"
                    >
                      {allCourses
                        .filter(course => !editingUser.enrollments?.some(enr => enr.courseId === course.id))
                        .map(course => (
                          <option key={course.id} value={course.id.toString()}>
                            {course.courseName} (ID: {course.id})
                          </option>
                      ))}
                    </select>
                    {allCourses.filter(course => !editingUser.enrollments?.some(enr => enr.courseId === course.id)).length === 0 && (
                       <p className="text-xs text-gray-500 mt-1 italic">ไม่มีคอร์สอื่นให้เพิ่ม หรือผู้ใช้นี้ลงทะเบียนทุกคอร์สแล้ว</p>
                   )}
                  </div>

                  {/* (Optional) Section for Unenrolling Courses */}
                  {editingUser.enrollments && editingUser.enrollments.length > 0 && (
                    <div className="mt-3">
                      <label htmlFor="coursesToUnenroll" className="block text-sm font-medium text-gray-700">
                        ยกเลิกการลงทะเบียนคอร์ส:
                        <span className="text-xs text-gray-500 ml-1">(เลือกหลายรายการได้ด้วย Ctrl/Cmd + Click)</span>
                      </label>
                      <select
                        multiple
                        name="coursesToUnenroll"
                        id="coursesToUnenroll"
                        value={editFormData.coursesToUnenroll.map(String)}
                        onChange={handleCoursesToUnenrollChange} // ใช้ handler ที่สร้างขึ้น
                        disabled={isSubmitting}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-24 custom-scrollbar"
                      >
                        {editingUser.enrollments.map(enr => (
                          <option key={enr.courseId} value={enr.courseId.toString()}>
                            {enr.course.courseName} (ID: {enr.courseId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}
                  className="w-full sm:w-auto btn-secondary-admin">ยกเลิก</button>
                <button type="submit" disabled={isSubmitting}
                  className="w-full sm:w-auto btn-primary-admin">
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}