'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '../img/Logo.png';
import Cart from '../img/Cart.png';
import './Navbar.css';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuItems = [
    { label: 'คอร์สเรียน', href: '/course' },
    { label: 'Calendar', href: '/calendar' },
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
            <Link href='/login'>
              <button className='navbar-btn login'>เข้าสู่ระบบ</button>
            </Link>
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
        <li>
          <Link href='/login'>
            <button className='navbar-btn login'>เข้าสู่ระบบ</button>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Navbar;
