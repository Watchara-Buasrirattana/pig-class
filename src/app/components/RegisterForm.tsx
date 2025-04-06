"use client"
import React from "react"
import { useState } from "react"

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  })

  const [message, setMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")

    if (formData.password !== formData.confirmPassword) {
      setMessage("❌ รหัสผ่านไม่ตรงกัน")
      return
    }

    const { confirmPassword, ...submitData } = formData

    try {
      const res = await fetch("api/register", {
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
        })
      } else {
        setMessage(`❌ ${data.message || "เกิดข้อผิดพลาด"}`)
      }
    } catch (error) {
      setMessage("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white shadow rounded space-y-4">
      <h2 className="text-xl font-bold">สมัครสมาชิก</h2>

      <input
        type="email"
        name="email"
        placeholder="อีเมล"
        value={formData.email}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
        required
      />

      <input
        type="password"
        name="password"
        placeholder="รหัสผ่าน"
        value={formData.password}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
        required
      />

      <input
        type="password"
        name="confirmPassword"
        placeholder="ยืนยันรหัสผ่าน"
        value={formData.confirmPassword}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
        required
      />

      <input
        type="text"
        name="firstName"
        placeholder="ชื่อ"
        value={formData.firstName}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
        required
      />

      <input
        type="text"
        name="lastName"
        placeholder="นามสกุล"
        value={formData.lastName}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
        required
      />

      <input
        type="text"
        name="phoneNumber"
        placeholder="เบอร์โทร"
        value={formData.phoneNumber}
        onChange={handleChange}
        className="w-full border px-3 py-2 rounded"
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        สมัครสมาชิก
      </button>

      {message && <p className="mt-2 text-center text-sm">{message}</p>}
    </form>
  )
}
