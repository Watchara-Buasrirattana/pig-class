"use client"
import React, { useState } from "react"
import "./Authentication.css"
import Image from "next/image"
import Logo from "../img/Logo.png"

export default function Authentication() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    acceptTerms: false,
  })
  const [message, setMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")

    if (formData.password !== formData.confirmPassword) {
      setMessage("❌ รหัสผ่านไม่ตรงกัน")
      return
    }

    if (!formData.acceptTerms) {
      setMessage("❌ กรุณายอมรับเงื่อนไขก่อนสมัครสมาชิก")
      return
    }

    const { confirmPassword, ...submitData } = formData

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage("✅ สมัครสมาชิกสำเร็จ!")
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          firstName: "",
          lastName: "",
          phoneNumber: "",
          acceptTerms: false,
        })
      } else {
        setMessage(`❌ ${data.message || "เกิดข้อผิดพลาด"}`)
      }
    } catch (error) {
      setMessage("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้")
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("✅ (Mock) เข้าสู่ระบบสำเร็จ") // รอ API
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <Image src={Logo} alt="PIG-CLASS" className="auth-logo" />
        <h2 className="auth-title">{isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h2>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          style={{ display: isLogin ? "block" : "none" }}
        >
          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={formData.email}
              placeholder="E-mail"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <label>
            รหัสผ่าน
            <input
              type="password"
              name="password"
              value={formData.password}
              placeholder="รหัสผ่าน"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <button type="submit" className="auth-button">
            เข้าสู่ระบบ
          </button>
        </form>

        {/* Register Form */}
        <form
          onSubmit={handleRegister}
          style={{ display: isLogin ? "none" : "block" }}
        >
          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={formData.email}
              placeholder="E-mail"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <label>
            ชื่อ
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              placeholder="ชื่อ"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <label>
            นามสกุล
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              placeholder="นามสกุล"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <label>
            รหัสผ่าน
            <input
              type="password"
              name="password"
              value={formData.password}
              placeholder="รหัสผ่าน"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <label>
            ยืนยันรหัสผ่าน
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              placeholder="ยืนยันรหัสผ่าน"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <label>
            เบอร์โทรศัพท์
            <input
              type="text"
              name="phoneNumber"
              value={formData.phoneNumber}
              placeholder="เบอร์โทร"
              onChange={handleChange}
              className="auth-input"
              required
            />
          </label>

          <div className="terms">
            <label>
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
              />{" "}
              ยอมรับเงื่อนไขในการใช้งานและการเปิดเผยข้อมูลตามนโยบายเว็บไซต์
            </label>
          </div>

          <button type="submit" className="auth-button">
            สมัครสมาชิก
          </button>
        </form>

        {/* Shared Message */}
        {message && <p className="auth-message">{message}</p>}

        {/* Switch Link */}
        <div className="switch-link">
          {isLogin ? (
            <>
              ยังไม่มีบัญชี?{" "}
              <a href="#" onClick={() => setIsLogin(false)}>
                สมัครสมาชิก
              </a>
            </>
          ) : (
            <>
              มีบัญชีแล้ว?{" "}
              <a href="#" onClick={() => setIsLogin(true)}>
                เข้าสู่ระบบ
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
