// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- กำหนด Path ที่ต้องการให้ Admin เข้าถึงเท่านั้น ---
  const adminOnlyPaths = [
      '/admin', // หน้า Admin หลัก
      // เพิ่ม Path อื่นๆ ที่ต้องการป้องกัน เช่น '/admin/users', '/admin/settings'
  ];
  const adminOnlyApiPaths = [
      '/api/courses', // สมมติว่า GET ทั้งหมดไม่ต้อง admin แต่ POST, PUT, DELETE ต้อง admin
      '/api/lessons', // API เกี่ยวกับบทเรียนและวิดีโอ
      '/api/documents',// API เกี่ยวกับเอกสาร
      '/api/videos',   // API เกี่ยวกับวิดีโอ (ถ้าสร้างแยก)
      '/api/upload-image', // API อัปโหลดรูป
      // ควรระบุ Path ให้ชัดเจน หรือใช้ pattern เช่น '/api/admin-only/:path*'
  ];

  // ตรวจสอบว่า Path ปัจจุบันต้องการสิทธิ์ Admin หรือไม่
  const requiresAdmin = adminOnlyPaths.some(path => pathname.startsWith(path)) ||
                        adminOnlyApiPaths.some(path => pathname.startsWith(path));

  // ถ้า Path นี้ต้องการ Admin เท่านั้น
  if (requiresAdmin) {
    // ดึง Token ของผู้ใช้ (ต้องมี NEXTAUTH_SECRET ใน .env)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    // console.log('Middleware Token:', token); // สำหรับ Debug

    // ตรวจสอบว่า Login หรือยัง และมี Role เป็น 'admin' หรือไม่
    if (!token || token.role !== 'admin') {
      console.log(`Middleware: Unauthorized access attempt to ${pathname} by user:`, token?.email || 'Not logged in');

      // สร้าง URL สำหรับ Redirect
      const url = req.nextUrl.clone();

      if (!token) {
        // ถ้ายังไม่ Login: Redirect ไปหน้า Login พร้อมจำ URL เดิมไว้
        url.pathname = '/login'; // <<-- แก้เป็น Path หน้า Login ของคุณ
        url.searchParams.set('callbackUrl', pathname); // ให้ Login เสร็จแล้วกลับมาหน้านี้
        return NextResponse.redirect(url);
      } else {
        // ถ้า Login แล้ว แต่ไม่ใช่ Admin: Redirect ไปหน้า Unauthorized หรือหน้าหลัก
        url.pathname = '/unauthorized'; // <<-- สร้างหน้านี้ หรือแก้เป็น '/' (หน้าแรก)
        return NextResponse.redirect(url);
      }
    }
    // ถ้าเป็น Admin: อนุญาตให้เข้าถึง Path นั้นได้
    // console.log('Middleware: Admin access granted.');
  }

  // ถ้าไม่ใช่ Path ที่ต้องป้องกัน หรือเป็น Admin อยู่แล้ว: ให้ Request ดำเนินการต่อไป
  return NextResponse.next();
}

// --- Config: ระบุว่า Middleware นี้จะทำงานกับ Path ไหนบ้าง ---
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - unauthorized (unauthorized page)
     * - / (public homepage, if applicable)
     * Adjust this based on your public pages/APIs
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|unauthorized|$).*)', // $ for exact root match
    // หรือจะระบุเฉพาะ Path ที่ต้องการป้องกันก็ได้ เช่น:
    // '/admin/:path*',
    // '/api/courses/:path*',
    // '/api/lessons/:path*',
    // '/api/documents/:path*',
    // '/api/videos/:path*',
    // '/api/upload-image',
  ],
}