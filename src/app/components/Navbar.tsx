'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '../img/Logo.png';
import Cart from '../img/Cart.png';
import './Navbar.css';
import DefaultUserProfileImage from '../img/Profile-icon.png';

export interface UserProfile {
  id?: number | string;
  profileImg?: string | null; // << สำคัญ
  name?: string | null;
}
interface NavbarProps {
  isLoggedIn?: boolean;
  userProfile?: UserProfile | null;
  onLogout?: () => void; // Optional: สำหรับฟังก์ชัน Logout
}
const Navbar: React.FC<NavbarProps> = ({
  isLoggedIn = false, // ค่าเริ่มต้น (ควรมาจากระบบ auth จริง)
  userProfile = null, // ค่าเริ่มต้น
  onLogout,
}) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

    useEffect(() => {
    if (isMenuOpen) {
      // ปิดเมนูเมื่อ path เปลี่ยนไป หรือเมื่อ isMenuOpen เป็น true และ path เปลี่ยน
      // เพื่อป้องกันการปิดทันทีเมื่อเพิ่งเปิดเมนูจากการคลิก toggle
      const handleRouteChange = () => {
        setIsMenuOpen(false);
      };
      // หากต้องการปิดเมื่อ path เปลี่ยน ให้ใช้งาน event listener ของ router (ถ้ามี)
      // หรือในที่นี้จะปิดเมื่อ pathname ใน dependency array เปลี่ยนไปตอน isMenuOpen เป็น true
    }
  }, [pathname, isMenuOpen]);
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      console.log("Logout function not provided.");
      // ตัวอย่าง: signOut(); (ถ้าใช้ next-auth)
    }
    if (isMenuOpen) {
      toggleMenu();
    }
    // redirect to home or login page
  };

  // กำหนด URL รูปโปรไฟล์ที่จะใช้ (จริงหรือ default)
  const profileImageSrc = userProfile?.profileImg || DefaultUserProfileImage;
  const menuItems = [
    { label: 'คอร์สเรียน', href: '/course' },
    { label: 'ปฏิทินเรียน', href: '/calendar' },
    { label: 'บทความ', href: '/article' },
    { label: 'ความสำเร็จ', href: '/achievement' },
  ];

  return (
    <div className='navbar-wrapper'>
      <div className='navbar-topline'></div>

      <div className='navbar-topbar-desktop'>
        <div className='navbar-container'>

          <div className='navbar-left'>
            <Link href='/' >
              <Image src={Logo} alt='PIG-CLASS' className='navbar-logo-img' />
            </Link>
          </div>

          <ul className={'navbar-menu'}>
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={pathname === item.href ? 'active' : ''}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className='navbar-right'>
            <Link href='/cart' className='navbar-cart-icon'>
              <Image src={Cart} alt='Cart' />
            </Link>
                        {/* === START: Conditional Rendering for Desktop === */}
            {isLoggedIn && userProfile ? (
              <div className="navbar-profile-section">
                <Link href='/profile' className='navbar-profile-link'>
                  <Image
                    src={profileImageSrc} // <<< ใช้ profileImageSrc
                    alt={userProfile.name || 'User Profile'}
                    width={30}
                    height={30}
                    className='navbar-profile-img'
                    onError={(e) => { (e.target as HTMLImageElement).src = DefaultUserProfileImage.src; }} // Fallback อีกชั้น
                  />
                </Link>
                {/* Optional: Desktop Logout Button or Dropdown Trigger */}
                {/* <button onClick={handleLogout} className='navbar-btn logout desktop'>ออกจากระบบ</button> */}
              </div>
            ) : (
              <Link href='/login'>
                <button className='navbar-btn login'>เข้าสู่ระบบ</button>
              </Link>
            )}
            {/* === END: Conditional Rendering for Desktop === */}
          </div>
        </div>
      </div>

      <div className={`navbar-overlay ${isMenuOpen ? 'show' : ''}`} onClick={toggleMenu}></div>

      <button className={`navbar-toggle ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
        <span className='bar bar1'></span>
        <span className='bar bar2'></span>
        <span className='bar bar3'></span>
      </button>

      <ul className={`navbar-mobile-menu ${isMenuOpen ? 'show' : ''}`}>
        <li>
          <Link href='/' className={pathname === '/' ? 'active' : ''} onClick={toggleMenu}>
            หน้าแรก
          </Link>
        </li>
        {menuItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={pathname === item.href ? 'active' : ''} onClick={toggleMenu}>
              {item.label}
            </Link>
          </li>
        ))}
        <li>
           <Link href='/cart' className={pathname === '/cart' ? 'active' : ''} onClick={toggleMenu}>
            ตะกร้า
          </Link>
        </li>
                {/* === START: Conditional Rendering for Mobile Menu === */}
        {isLoggedIn && userProfile ? (
          <li>
            <Link href='/profile' className={`navbar-profile-link-mobile ${pathname === '/profile' ? 'active' : ''}`} onClick={toggleMenu}>
              <Image
                src={profileImageSrc} // <<< ใช้ profileImageSrc
                alt={userProfile.name || 'User Profile'}
                width={28}
                height={28}
                className='navbar-profile-img-mobile'
                onError={(e) => { (e.target as HTMLImageElement).src = DefaultUserProfileImage.src; }} // Fallback อีกชั้น
              />
              <span className="navbar-mobile-menu-text">โปรไฟล์</span>
            </Link>
          </li>
        ) : (
          <li>
            <Link href='/login' onClick={toggleMenu} className='navbar-mobile-login-link'>
              <button className='navbar-btn login mobile'>เข้าสู่ระบบ</button>
            </Link>
          </li>
        )}
        {/* === END: Conditional Rendering for Mobile Menu === */}

        {isLoggedIn && (
            <li>
                <button
                    className='navbar-btn logout mobile'
                    onClick={handleLogout}
                >
                    ออกจากระบบ
                </button>
            </li>
        )}
      </ul>
    </div>
  );
};

export default Navbar;
