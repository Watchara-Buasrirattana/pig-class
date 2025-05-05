// app/admin/layout.tsx
"use client"; // Layout ที่มี State หรือ Hook ต้องเป็น Client Component

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react'; // สำหรับปุ่ม Logout

// --- ข้อมูลสำหรับ Sidebar Menu ---
const sidebarLinks = [
    { label: "Dashboard", path: "/admin/dashboard", key: "dashboard" },
    { label: "ผู้ใช้งาน user", path: "/admin/users", key: "users" },
    { label: "คอร์สเรียน", path: "/admin", key: "courses" }, // Link ไปหน้าแสดงคอร์ส
    { label: "บทความ", path: "/admin/articles", key: "articles" }, // Link ไปหน้าบทความ
    { label: "ความสำเร็จ", path: "/admin/achievements", key: "achievements" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname(); // Hook ดึง Path ปัจจุบัน

  return (
    <div className="flex h-screen bg-gray-100"> {/* ให้ Layout คุม h-screen */}
      {/* Sidebar */}
      <aside className="w-64 bg-blue-700 text-white p-6 flex flex-col flex-shrink-0"> {/* ใช้ flex-shrink-0 */}
        <div className="text-2xl font-bold mb-8">Admin</div>
        <nav className="space-y-2 flex-1">
          {sidebarLinks.map((link) => {
            const currentPath = pathname || "";
            const isActive = (link.path === '/admin' && currentPath === '/admin') ||
                            (link.path !== '/admin' && currentPath.startsWith(link.path));

            return (
              <Link
                key={link.key}
                href={link.path}
                className={`block px-4 py-2 rounded cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? "bg-blue-900 font-semibold"
                    : "hover:bg-blue-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {/* ปุ่ม Logout */}
        <button
             onClick={() => { if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) { signOut({ callbackUrl: '/login' }); } }}
             className="block w-full text-left px-4 py-2 mt-4 rounded cursor-pointer text-red-300 hover:bg-red-600 hover:text-white transition-colors duration-150"
         >
             ออกจากระบบ
         </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto"> {/* ให้ main scroll ได้ */}
        {children} {/* <<-- เนื้อหาของ Page จะถูกแสดงผลตรงนี้ */}
      </main>
    </div>
  );
}