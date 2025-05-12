// ตัวอย่าง Path: app/cart/page.tsx หรือ pages/cart.tsx
"use client";

import { useState, useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation"; // หรือ 'next/router'
import Image from 'next/image';// <-- สร้างรูป Placeholder ไว้ด้วย
import Link from "next/link";
// --- Type สำหรับ Cart Item ที่มาจาก API (ต้องตรงกับ select ใน Backend) ---
type CartItemFromAPI = {
    id: number;
    courseId: number;
    quantity: number;
    course: {
        id: number; // เพิ่ม ID ของ Course
        courseName: string;
        price: number;
        courseImg: string | null;
        courseNumber: string; // เพิ่ม courseNumber ถ้าต้องการแสดง
    };
};

// --- Type สำหรับ Cart ที่มาจาก API ---
type CartDataFromAPI = {
    id: number | null; // Cart ID อาจเป็น null ถ้ายังไม่มี Cart
    userId: number;
    items: CartItemFromAPI[];
};


// --- โหลด Stripe instance ---
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
    if (!stripePromise) {
        const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (key) {
             stripePromise = loadStripe(key);
        } else {
             console.error("Stripe Publishable Key is not set in environment variables.");
        }
    }
    return stripePromise;
};


export default function CartPage() {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartItemFromAPI[]>([]); // <<-- ใช้ Type ใหม่
    const [isLoadingCart, setIsLoadingCart] = useState(true);
    const [cartError, setCartError] = useState<string | null>(null);

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    // --- useEffect ดึงข้อมูล Cart จาก API ---
    useEffect(() => {
        const fetchCart = async () => {
            setIsLoadingCart(true);
            setCartError(null);
            try {
                // --- เรียก API /api/cart เพื่อดึงข้อมูลตะกร้า ---
                const res = await fetch('/api/cart');
                if (!res.ok) {
                     const errorData = await res.json().catch(() => ({}));
                     throw new Error(errorData.error || `Failed to load cart (status: ${res.status})`);
                }
                const data: CartDataFromAPI = await res.json();
                setCartItems(data.items || []); // ใช้ data.items ที่ได้จาก API
                console.log("Cart data fetched:", data);

            } catch (err) {
                 setCartError(err instanceof Error ? err.message : 'Could not load cart');
                 console.error("Error fetching cart:", err);
            } finally {
                setIsLoadingCart(false);
            }
        };
        fetchCart();
    }, []); // ทำงานครั้งเดียวตอนโหลด Component

    // --- คำนวณยอดรวม ---
    const totalPrice = cartItems.reduce(
        (sum, item) => sum + (item.course?.price || 0) * item.quantity,
        0
    );

    // --- Function สำหรับกดปุ่ม Checkout (เหมือนเดิม) ---
    const handleCheckout = async () => {
      console.log("handleCheckout triggered. Cart items count:", cartItems.length); // <<-- Log ที่ 1
      if (cartItems.length === 0) {
          alert("ตะกร้าสินค้าของคุณว่างเปล่า"); // <<-- เพิ่ม Alert ให้ชัดเจน
          return;
      }
  
      setIsCheckingOut(true);
      setCheckoutError(null);
  
      try {
          console.log("Calling API: POST /api/checkout_sessions");
          const res = await fetch('/api/checkout_sessions', { method: 'POST' });
          console.log("API response status:", res.status); // <<-- Log ที่ 2
  
          const data = await res.json();
          console.log("API response data:", data); // <<-- Log ที่ 3
  
          if (!res.ok) {
              throw new Error(data.error || `Failed to create checkout session (status: ${res.status})`);
          }
          if (!data.sessionId) {
               throw new Error('Session ID not received from server.');
          }
  
          const sessionId = data.sessionId;
          console.log("Received Session ID:", sessionId); // <<-- Log ที่ 4
  
          const stripe = await getStripe();
          if (!stripe) {
               console.error("Stripe.js failed to load. Check Publishable Key.");
               throw new Error("Stripe.js failed to load. Check Publishable Key.");
          }
          console.log("Stripe instance loaded. Redirecting to Checkout..."); // <<-- Log ที่ 5
  
          const { error } = await stripe.redirectToCheckout({ sessionId });
  
          if (error) {
              console.error("Stripe redirectToCheckout error:", error);
              throw new Error(error.message || 'Failed to redirect to Stripe.');
          }
      } catch (err: any) {
          // ... (ส่วน catch เดิม) ...
      }
      // ไม่ต้อง setIsCheckingOut(false) ถ้า Redirect สำเร็จ
  };

    // --- Function สำหรับลบ Item ออกจากตะกร้า (ตัวอย่าง) ---
    const handleRemoveItem = async (cartItemId: number) => {
        if (!window.confirm("คุณต้องการลบสินค้านี้ออกจากตะกร้าใช่หรือไม่?")) return;

        // อาจจะ Set Loading state สำหรับ Item นั้นๆ
        try {
            // **ต้องมี API DELETE /api/cart/items/[cartItemId]**
            const res = await fetch(`/api/cart/items/${cartItemId}`, { method: 'DELETE' });
             if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to remove item (status: ${res.status})`);
            }
            // ลบ Item ออกจาก State หรือ Fetch ใหม่
            setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
            alert('ลบสินค้าออกจากตะกร้าแล้ว');

        } catch (err) {
            console.error("Error removing item from cart:", err);
            alert(`เกิดข้อผิดพลาดในการลบ: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };


    // --- Render ---
    if (isLoadingCart) return <div className="p-6 text-center">Loading cart...</div>;
    if (cartError) return <div className="p-6 text-center text-red-600">Error loading cart: {cartError}</div>;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">ตะกร้าสินค้า</h1>

            {cartItems.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-600 mb-4">ตะกร้าของคุณว่างเปล่า</p>
                    <Link href="/course" className="text-blue-600 hover:text-blue-800 font-semibold">
                        เลือกซื้อคอร์สเรียนต่อ &rarr;
                    </Link>
                </div>
            ) : (
                <div className="md:flex md:gap-8">
                    {/* รายการสินค้า */}
                    <div className="md:w-2/3 space-y-3 mb-6 md:mb-0">
                         <div className="bg-blue-600 text-white p-3 rounded-t-md grid grid-cols-5 gap-2 text-sm font-semibold items-center"> {/* เพิ่ม cols */}
                             <div className="col-span-2">รายการ</div>
                             <div className="text-center">จำนวน</div>
                             <div className="text-right">ราคา</div>
                             <div className="text-center">ลบ</div> {/* เพิ่มคอลัมน์ลบ */}
                         </div>
                        {cartItems.map((item) => (
                            <div key={item.id} className="grid grid-cols-5 gap-2 items-center border rounded p-3 bg-white text-sm"> {/* ใช้ grid */}
                                <div className="col-span-2 flex items-center gap-3">
                                    {item.course?.courseImg ? (
                                        <Image
                                            src={item.course.courseImg}
                                            alt={item.course.courseName}
                                            width={48} height={48}
                                            className="rounded object-cover flex-shrink-0"

                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0"></div>
                                    )}
                                    <span className="line-clamp-2">{item.course?.courseName || `Course ID: ${item.courseId}`}</span>
                                </div>
                                <div className="text-center">{item.quantity}</div>
                                <div className="text-right font-semibold">฿{(item.course?.price || 0).toLocaleString()}</div>
                                <div className="text-center">
                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="text-red-500 hover:text-red-700 text-xs font-medium p-1"
                                        title="ลบออกจากตะกร้า"
                                    >
                                        &times; {/* หรือใช้ Icon ถังขยะ */}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* สรุปยอดและปุ่ม Checkout */}
                    <div className="md:w-1/3 border rounded p-4 bg-white shadow-sm h-fit sticky top-4">
                        {/* ... (ส่วนสรุปยอดเหมือนเดิม) ... */}
                         <h2 className="text-lg font-semibold mb-3 border-b pb-2">ยอดรวม</h2>
                         {/* ... ยอดรวมสินค้า ... */}
                         <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
                             <span>รวมทั้งสิ้น</span>
                             <span className="text-blue-600">฿{totalPrice.toLocaleString()}</span>
                         </div>
                         {checkoutError && ( <p className="text-red-600 my-3 text-sm bg-red-50 p-2 rounded">Error: {checkoutError}</p> )}
                         <button
                            onClick={handleCheckout}
                            disabled={isCheckingOut || cartItems.length === 0} // Disable ถ้าตะกร้าว่างด้วย
                            className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg shadow font-semibold hover:bg-blue-700 transition duration-150 disabled:opacity-50 disabled:cursor-wait"
                         >
                             {isCheckingOut ? 'กำลังดำเนินการ...' : 'ชำระเงิน'}
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
}