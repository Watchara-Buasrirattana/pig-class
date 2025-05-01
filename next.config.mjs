/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // หรือ config อื่นๆ ที่คุณมีอยู่แล้ว
  images: {
    remotePatterns: [
      {
        protocol: "https", // โปรโตคอลที่ใช้ (ปกติคือ https)
        hostname: "pigclass.blob.core.windows.net", // <<-- ใส่ Hostname ของ Azure Storage Account ของคุณตรงนี้
        port: "", // ปกติเว้นว่างไว้สำหรับ https (port 443)
        pathname: "/**", // อนุญาตทุก Path ภายใต้ Hostname นี้ (เช่น /courseimages/**, /coursedocuments/**)
      },
      // ถ้ามี Hostname อื่นๆ ที่ต้องการอนุญาต ก็เพิ่ม object เข้าไปใน array นี้ได้อีก
      // เช่น { protocol: 'https', hostname: 'example.com', ... }
    ],
  },
};

export default nextConfig;
