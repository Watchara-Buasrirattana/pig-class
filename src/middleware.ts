// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // --- Path สำหรับ Admin Pages ---
  const adminPagePaths = ['/admin'];

  // --- Path สำหรับ Admin-Only APIs ---
  // (ปรับแก้ตาม API ของคุณ)
  const adminOnlyApiPaths = [
    '/api/courses', // POST, PUT, DELETE จะถูกเช็คสิทธิ์ใน Handler เอง แต่ GET อาจจะต้องเปิด Public
    '/api/lessons', // GET อาจจะ Public, POST/PUT/DELETE ต้อง Admin
    '/api/documents',
    '/api/videos',
    '/api/upload-image',
    '/api/articles', // POST, PUT, DELETE จะถูกเช็คสิทธิ์ใน Handler เอง แต่ GET อาจจะ Public
  ];

  // --- Path สำหรับ User-Logged-In-Only APIs (ที่ไม่ใช่ Admin) ---
  const userOnlyApiPaths = [
      '/api/cart',
      '/api/checkout_sessions',
      '/api/profile/me', // API ดึง/แก้ Profile
      '/api/orders/by-stripe-session'
      // เพิ่ม API อื่นๆ ที่ต้อง Login
  ];

  // ตรวจสอบ Admin Pages
  if (adminPagePaths.some(path => pathname.startsWith(path))) {
    if (!token || token.role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = !token ? '/login' : '/unauthorized';
      if(!token) url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  // ตรวจสอบ Admin-Only APIs
  // (สำคัญ: ถ้า API เดียวกันมีทั้ง GET (Public) และ POST (Admin) การป้องกันที่ Middleware อาจไม่เหมาะ
  // ควรไปเช็ค Role ใน Handler ของ API นั้นๆ แทนสำหรับ Method ที่ต้องการป้องกัน)
  // ตัวอย่างนี้จะสมมติว่า API เหล่านี้ถ้าเข้าถึงได้คือ Admin เท่านั้น (ต้องปรับปรุง matcher หรือ handler)
  if (adminOnlyApiPaths.some(path => pathname.startsWith(path))) {
      // สำหรับ API ที่ Method GET อาจจะอนุญาตให้ Public เข้าได้
      // แต่ POST, PUT, DELETE ต้องเป็น Admin
      // การเช็ค Method ใน Middleware จะซับซ้อนขึ้น อาจจะต้องเช็คใน API Handler เอง
      if (req.method !== 'GET') { // สมมติว่า GET อนุญาต Public แต่ Method อื่นต้อง Admin
          if (!token || token.role !== 'admin') {
              console.log(`Middleware: Admin API ${req.method} ${pathname} blocked.`);
              return new NextResponse(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' }});
          }
      }
  }

  // ตรวจสอบ User-Logged-In-Only APIs
  if (userOnlyApiPaths.some(path => pathname.startsWith(path))) {
    if (!token) {
      console.log(`Middleware: User API ${pathname} blocked (not logged in).`);
      // สำหรับ API ให้ตอบกลับเป็น JSON Error แทนการ Redirect
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: Please log in' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
  }

  return NextResponse.next();
}

// --- Config Matcher ---
export const config = {
  matcher: [
    // ใส่ Path ที่ต้องการให้ Middleware ทำงาน
    // ควรจะครอบคลุม Admin pages และ API ที่ต้องการป้องกัน
    // แต่ต้องระวังไม่ไป Block API ที่ควรจะเป็น Public เช่น GET /api/courses
    '/admin/:path*',
    '/profile/:path*', // ถ้าหน้า Profile ต้อง Login
    '/cart/:path*',    // ถ้าหน้า Cart ต้อง Login
    '/order/success/:path*', // ถ้าหน้า Success ต้อง Login
    // API Paths
    '/api/courses/:path*', // จะครอบคลุม GET, POST, PUT, DELETE ที่ /api/courses/[id]
    '/api/courses',        // สำหรับ GET (all) และ POST (create)
    '/api/lessons/:path*',
    '/api/documents/:path*',
    '/api/videos/:path*',
    '/api/articles/:path*',// จะครอบคลุม GET, POST, PUT, DELETE ที่ /api/articles/[id]
    '/api/articles',       // สำหรับ GET (all) และ POST (create)
    '/api/upload-image',
    '/api/cart/:path*',
    '/api/checkout_sessions',
    '/api/profile/me',
    '/api/orders/by-stripe-session/:path*',
    '/api/webhooks/stripe', // Webhook อาจจะต้องมีวิธีป้องกันแบบอื่น หรือ Exclude จาก CSRF ถ้าจำเป็น
    // Exclude NextAuth API routes and static assets
    // '/((?!api/auth|_next/static|_next/image|favicon.ico|login|unauthorized).*)'
  ],
};