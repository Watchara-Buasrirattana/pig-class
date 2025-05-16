// src/app/ClientLayout.tsx
"use client"; // <<--- ยังคงจำเป็น

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useSession } from 'next-auth/react'; // ไม่ต้อง import SessionProvider

// ... (Interface UserProfile, NavbarProps เหมือนเดิม) ...

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "";
    const { data: session, status } = useSession(); // ตอนนี้ useSession() ควรทำงานได้ถูกต้อง
    const isLoadingAuth = status === 'loading';

    const hideNavbarFooterPaths = ["/login", "/register"];
    const hideNavbarFooterStartsWith: string[] = [];

    const shouldHide =
        hideNavbarFooterPaths.includes(pathname) ||
        hideNavbarFooterStartsWith.some((path) => pathname.startsWith(path));

    const userProfileData = session?.user ? {
        id: session.user.id as string, // ตรวจสอบ type ให้แน่ใจ หรือจัดการ type ใน next-auth.d.ts
        name: session.user.name || "User", // ควรแก้ไข type ของ name ใน Navbar.tsx ให้เป็น optional
        profileImg: session.user.image,
    } : null;

    // if (isLoadingAuth) {
    //     // Optional: แสดง UI ขณะโหลด session
    //     return (
    //         <>
    //             <Navbar isLoggedIn={false} userProfile={null} />
    //             <main><div>Loading session...</div></main>
    //             {!shouldHide && <Footer />}
    //         </>
    //     );
    // }

    return (
        <>
            {/* ไม่ต้องมี SessionProvider ที่นี่แล้ว */}
            {!shouldHide && (
                <Navbar
                    isLoggedIn={!!session}
                    userProfile={userProfileData}
                    // onLogout={() => signOut()} // ถ้าต้องการฟังก์ชัน logout
                />
            )}
            <main>{children}</main>
            {!shouldHide && <Footer />}
        </>
    );
}