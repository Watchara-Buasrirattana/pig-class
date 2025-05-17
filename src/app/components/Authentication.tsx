"use client"
import React, {useState, useEffect } from "react"
import "./Authentication.css"
import Image from "next/image"
import Logo from "../img/Logo.png"
import { signIn } from "next-auth/react" 
import { useRouter } from "next/navigation";


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
  const router = useRouter();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }
    useEffect(() => {
    if (status === "authenticated") {
      router.push("/"); // หรือหน้าที่คุณต้องการให้ไปหลัง login
    }
  }, [router]);
  // API Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
  
    const res = await signIn("credentials", {
      redirect: false,
      email: formData.email,
      password: formData.password,
    })
  
    if (res?.error) {
      setMessage(`❌ ${res.error}`)
    } else {
      setMessage("✅ เข้าสู่ระบบสำเร็จ")
      // หรือ redirect ไปหน้าอื่น
      router.push("/")
    }
  }

  const handleForgetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("⚠️ (Mock) ลืมรหัสผ่าน")
  }

  //API Register
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
        setIsLogin(true);
        setFormData({
          email: submitData.email,
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
          <label className="auth-label">
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

          <label className="auth-label">
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

          <div className="forgot-password">
            <button type="button" onClick={(handleForgetPassword)}>
              ลืมรหัส
            </button>
          </div>


          <button type="submit" className="auth-button">
            เข้าสู่ระบบ
          </button>
        </form>

        {/* Register Form */}
        <form
          onSubmit={handleRegister}
          style={{ display: isLogin ? "none" : "block" }}
        >
          <label className="auth-label">
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

          <label className="auth-label">
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

          <label className="auth-label">
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

          <label className="auth-label">
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

          <label className="auth-label">
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

          <label className="auth-label">
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
            <label className="auth-label">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
              />{" "}
              ฉันยอมรับเงื่อนไขในการลงทะเบียนและนโยบายส่วนบุคคล
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
