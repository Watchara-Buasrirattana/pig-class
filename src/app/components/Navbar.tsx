'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; 
import Logo from "../img/Logo.png";
import Cart from "../img/Cart.png";
import './Navbar.css';

const Navbar: React.FC = () => {
  const pathname = usePathname();

  const menuItems = [
    { label: "คอร์สเรียน", href: "/course" },
    { label: "โจทย์เกม", href: "/games" },
    { label: "บทความ", href: "/article" },
    { label: "ความสำเร็จ", href: "/achievement" },
  ];

  return (
    <div className="navbar-wrapper">
      <div className="navbar-topline"></div>

      <div className="navbar-topbar">
        <div className="navbar-container">

          <div className="navbar-left">
          <Link href="/" >
            <Image src={Logo} alt="PIG-CLASS" className="navbar-logo-img" />
          </Link>
          </div>

          <ul className="navbar-menu">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={pathname === item.href ? 'active' : ''}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="navbar-right">
            <Link href="/cart" className="navbar-cart-icon">
              <Image src={Cart} alt="Cart" />
            </Link>
            <Link href="/login">
              <button className="navbar-btn login">เข้าสู่ระบบ</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
