"use client"
import { useEffect, useState } from "react"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState<"student" | "parent">("student")
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    schoolName: "",
    studyLine: "",
    gradeLevel: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
  })

  useEffect(() => {
    fetch("/api/user")
      .then(res => res.json())
      .then(data => {
        setUser(data)
        setForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phoneNumber: data.phoneNumber || "",
          schoolName: data.schoolName || "",
          studyLine: data.studyLine || "",
          gradeLevel: data.gradeLevel ||"",
          parentName: data.parentName || "",
          parentEmail: data.parentEmail || "",
          parentPhone: data.parentPhone || "",
        })
      })
  }, [])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      const updated = await res.json()
      setUser(updated)
      setEditMode(false)
    }
  }

  if (!user) return <p>Loading...</p>

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded shadow space-y-6">
      <h1 className="text-xl font-bold">ข้อมูลส่วนตัว</h1>

      <div className="flex border-b">
        <button
          className={`px-6 py-2 font-medium ${
            activeTab === "student" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("student")}
        >
          นักเรียน
        </button>
        <button
          className={`px-6 py-2 font-medium ${
            activeTab === "parent" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("parent")}
        >
          ผู้ปกครอง
        </button>
      </div>

      {activeTab === "student" && (
        <div className="grid grid-cols-2 gap-4">
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="ชื่อ"
            className="border p-2 rounded"
          />
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="นามสกุล"
            className="border p-2 rounded"
          />
          <input
            value={user.email}
            disabled
            placeholder="E-mail"
            className="border p-2 rounded col-span-1"
          />
          <input
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="เบอร์โทรศัพท์"
            className="border p-2 rounded"
          />
          <input
            name="schoolName"
            value={form.schoolName}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="โรงเรียน"
            className="border p-2 rounded"
          />
          <input
            name="studyLine"
            value={form.studyLine}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="สายการเรียน"
            className="border p-2 rounded"
          />
          <input
            name="gradeLevel"
            value={form.gradeLevel}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="ระดับชั้น"
            className="border p-2 rounded"
          />
        </div>
      )}
      {activeTab === "parent" && (
        <div className="grid grid-cols-2 gap-4">
          <input
            name="parentName"
            value={form.parentName}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="ชื่อ"
            className="border p-2 rounded"
          />
          <input
            name="parentPhone"
            value={form.parentPhone}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="เบอร์โทรศัพท์"
            className="border p-2 rounded"
          />
          <input
            name="parentEmail"
            value={form.parentEmail}
            onChange={handleChange}
            disabled={!editMode}
            placeholder="E-mail"
            className="border p-2 rounded"
          />
        </div>
      )}
      {/* ส่วนของปุ่ม */}
      <div className="flex justify-end">
        {editMode ? (
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700"
          >
            บันทึก
          </button>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="border border-blue-600 text-blue-600 px-6 py-2 rounded-full hover:bg-blue-50"
          >
            แก้ไข
          </button>
        )}
      </div>
    </div>
  )
}
