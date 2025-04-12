"use client"
import { useEffect, useState } from "react"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    schoolName: "",
    studyLine: "",
    gradeLevel: ""
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
          gradeLevel: data.gradeLevel || "",
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
    <div className="max-w-3xl mx-auto mt-10 space-y-4">
      <h1 className="text-2xl font-bold">ข้อมูลส่วนตัว</h1>

      <div className="grid grid-cols-2 gap-4">
        <input name="firstName" value={form.firstName} onChange={handleChange} disabled={!editMode} placeholder="ชื่อ" />
        <input name="lastName" value={form.lastName} onChange={handleChange} disabled={!editMode} placeholder="นามสกุล" />
        <input value={user.email} disabled placeholder="E-mail" />
        <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} disabled={!editMode} placeholder="เบอร์โทรศัพท์" />
        <input name="schoolName" value={form.schoolName} onChange={handleChange} disabled={!editMode} placeholder="โรงเรียน" />
        <input name="studyLine" value={form.studyLine} onChange={handleChange} disabled={!editMode} placeholder="สายการเรียน" />
        <input name="gradeLevel" value={form.gradeLevel} onChange={handleChange} disabled={!editMode} placeholder="ระดับชั้น" />
      </div>

      {editMode ? (
        <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">บันทึก</button>
      ) : (
        <button onClick={() => setEditMode(true)} className="border px-4 py-2 rounded">แก้ไข</button>
      )}
    </div>
  )
}
