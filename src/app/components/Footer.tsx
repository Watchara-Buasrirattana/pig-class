import React from 'react';
import './Footer.css';
import Image from 'next/image';
import Link from 'next/link';
import Logo from '../img/Logowhite.png';
import Facebook from '../img/facebook.png';
import Ig from '../img/ig.png';
import Line from '../img/line.png';
import Youtube from '../img/youtube.png';
import Tiktok from '../img/tiktok.png';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* ซ้าย: โลโก้ + คำอธิบาย */}
        <div className="footer-left">
          <Image src={Logo} alt="PIG-CLASS" className="auth-logo" />
          <p className="footer-desc">
            "คอร์สวิชา ให้ความรู้ทางด้านคณิตศาสตร์ทุกระดับชั้น<br />
            รับสอนตั้งแต่พื้นฐาน สอบรายย่อย กลุ่มเล็ก กลุ่มใหญ่<br />
            สอนโดยติวเตอร์ผู้จบจาก ป.ตรี และ ป.โท คณิตศาสตร์ โดยเฉพาะ
          </p>
        </div>

        {/* กลาง: เมนู 4 คอลัมน์ */}
        <div className="footer-center">
          <div className="footer-subcol">
            <p className="footer-title">คอร์สเรียน</p>
            <ul>
              <li><Link href="/course">กลางภาค</Link></li>
              <li><Link href="/course">ปลายภาค</Link></li>
              <li><Link href="/course">พื้นฐาน</Link></li>
              <li><Link href="/course">ตะลุยโจทย์</Link></li>
            </ul>
          </div>

          <div className="footer-subcol">
            <p className="footer-title">ปฏิทินเรียน</p>
            <ul>
              <li><Link href="/calendar">ปฏิทิน</Link></li>
            </ul>
          </div>

          <div className="footer-subcol">
            <p className="footer-title">บทความ</p>
            <ul>
            <li><Link href="/article?category=คลังความรู้">คลังความรู้</Link></li>
            <li><Link href="/article?category=Check List">Check List</Link></li>
            <li><Link href="/article?category=โจทย์ข้อสอบ">โจทย์ข้อสอบ</Link></li>
            <li><Link href="/article?category=อื่น ๆ">อื่น ๆ</Link></li>
            </ul>
          </div>

          <div className="footer-subcol">
            <p className="footer-title">ความสำเร็จ</p>
            <ul>
              <li><Link href="/achievement">ความสำเร็จ</Link></li>
            </ul>
          </div>
        </div>

        {/* ขวา: ติดต่อสอบถาม */}
        <div className="footer-right">
          <p className="footer-title">ติดต่อสอบถาม</p>
          <ul>
            <li>086-856-6555</li>
          </ul>
          <p className="footer-title">เปิดทำการ</p>
          <ul>
            <li>ทุกวัน 09:00 - 22:00 น.</li>
          </ul>  
          <p className="footer-title">ที่อยู่</p>        
          <ul>
            <li> 55/55 มบ.สินทวี ซอย 8 แขวงบางมด เขตจอมทอง
            กรุงเทพมหานคร 10140</li>
          </ul> 
        </div>
      </div>

      {/* Social Icons */}
      <div className="footer-social">
        <div className="social-icons">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <Image src={Facebook} alt="Facebook" className="social-icon" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <Image src={Ig} alt="Instagram" className="social-icon" />
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
            <Image src={Tiktok} alt="Tiktok" className="social-icon" />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
            <Image src={Youtube} alt="Youtube" className="social-icon" />
          </a>
          <a href="https://line.me" target="_blank" rel="noopener noreferrer">
            <Image src={Line} alt="Line" className="social-icon" />
          </a>
        </div>
        <p className="auth-icons">Pig class</p>
      </div>
    </footer>
  );
};

export default Footer;
