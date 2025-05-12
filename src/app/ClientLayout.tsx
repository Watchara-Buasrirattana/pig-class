"use client";

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { SessionProvider } from 'next-auth/react'
export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "";

    const hideNavbarFooterPaths = ["/login", "/register"]; // เฉพาะ path นี้
    const hideNavbarFooterStartsWith = []; // ตั้งแต่ path นี้เป็นต้นไป

    const shouldHide = 
    hideNavbarFooterPaths.includes(pathname) ||
    hideNavbarFooterStartsWith.some((path) => pathname.startsWith(path));

    return (
        <>
        <SessionProvider>
            {!shouldHide && <Navbar />}
            <main>{children}</main>
            {!shouldHide && <Footer />}
        </SessionProvider>
        </>
    );
}
