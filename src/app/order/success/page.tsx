// app/order/success/page.tsx (หรือ pages/order/success.tsx)
"use client";

import { useEffect, useState, Suspense } from 'react'; // <<--- เพิ่ม Suspense
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ... (Type OrderSummary เหมือนเดิม) ...
type OrderSummary = {
    id: number;
    orderNumber: string;
    totalPrice: number;
    status: string;
};


// --- สร้าง Component ลูกสำหรับอ่าน searchParams ---
// --- เพราะ useSearchParams() ต้องใช้ใน Client Component และ Suspense ---
function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams(); // Hook สำหรับดึง Query Params

    // --- แก้ไขตรงนี้: ใช้ Optional Chaining ---
    const stripeSessionId = searchParams?.get('session_id'); // <<-- ใช้ ?.
    // ----------------------------------------

    const [order, setOrder] = useState<OrderSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (stripeSessionId) { // ตรวจสอบว่ามี stripeSessionId ก่อน
            setIsLoading(true);
            setError(null);
            console.log("Fetching order details for Stripe session ID:", stripeSessionId);

            fetch(`/api/orders/by-stripe-session/${stripeSessionId}`)
                .then(async (res) => {
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || `Failed to fetch order (status ${res.status})`);
                    }
                    return res.json();
                })
                .then((data: OrderSummary) => {
                    console.log("Order data received for success page:", data);
                    setOrder(data);
                })
                .catch(err => {
                    console.error("Error fetching order on success page:", err);
                    setError(err.message || "Could not load order details.");
                })
                .finally(() => setIsLoading(false));
        } else {
            // ถ้าไม่มี stripeSessionId ใน URL อาจจะเกิดจากผู้ใช้เข้ามาหน้านี้ตรงๆ
             console.warn("Stripe session ID not found in URL on success page.");
             setError("Order confirmation details are missing. Please check your email or contact support if payment was made.");
            setIsLoading(false);
        }
    }, [stripeSessionId]); // ทำงานใหม่เมื่อ stripeSessionId เปลี่ยน


    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">Verifying your order...</div>;
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-center px-4"> {/* Added text-center and padding */}
                <h2 className="text-2xl font-semibold text-red-600 mb-3">Order Confirmation Issue</h2>
                <p className="text-red-500 mb-6">{error}</p>
                <Link href="/" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Go to Homepage
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 text-center min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-green-600 mb-4">Thank you for your order!</h1>
            <p className="text-lg mb-2">Your payment was successful.</p>
            {order && (
                <div className="mt-4 p-4 border rounded-md bg-gray-50 max-w-md text-left"> {/* text-left for order details */}
                    <p><strong>Order Number:</strong> {order.orderNumber}</p>
                    <p><strong>Total Amount:</strong> ฿{order.totalPrice?.toLocaleString()}</p>
                    <p><strong>Status:</strong> <span className={`font-semibold ${order.status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>{order.status}</span></p>
                </div>
            )}
            <p className="mt-6 text-sm text-gray-600 max-w-lg">
                You will receive an email confirmation shortly. Your course access will be granted once the payment is fully processed and confirmed by our system (via webhook).
            </p>
            <Link href="/my-courses" className="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                Go to My Courses
            </Link>
        </div>
    );
}


// --- Component หลักของหน้า Success ---
// ใช้ Suspense ครอบ Content ที่ต้องใช้ useSearchParams
export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading page...</div>}>
            <SuccessContent />
        </Suspense>
    );
}