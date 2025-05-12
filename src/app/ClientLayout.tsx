"use client";

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { SessionProvider } from 'next-auth/react'
export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "";

    const hideNavbarFooter = ["/login"];
    const shouldHide = hideNavbarFooter.includes(pathname);

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
