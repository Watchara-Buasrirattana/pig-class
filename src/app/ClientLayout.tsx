"use client";

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "";

    const hideNavbarFooter = ["/login"];
    const shouldHide = hideNavbarFooter.includes(pathname);

    return (
        <>
            {!shouldHide && <Navbar />}
            <main>{children}</main>
            {!shouldHide && <Footer />}
        </>
    );
}
