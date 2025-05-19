// --- PATH EXAMPLE: app/admin/calendar/page.tsx ---
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  FormEvent,
  ChangeEvent,
} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import type {
  EventInput,
  EventApi,
  DateSelectArg, // <<-- ใช้ DateSelectArg แทน DateClickArg (ถ้าคลิกเลือกช่วงวัน) หรือใช้ EventClickArg แยก
  EventClickArg, // <<-- Import แยกแบบนี้
  EventDropArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg as FullCalendarEventResizeDoneArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import thLocale from "@fullcalendar/core/locales/th"; // ภาษาไทย
import { Dialog } from "@headlessui/react";

// --- Types ---
type CourseInfo = {
  id: number;
  courseName: string;
};

type ScheduledSessionFromAPI = {
  // ควรตรงกับที่ API ส่งกลับมา
  id: number;
  courseId: number;
  title: string | null;
  description: string | null;
  startTime: string; // ISO String Date
  endTime: string; // ISO String Date
  location: string | null;
  course: {
    id: number;
    courseName: string;
  };
  isRestricted: boolean;
};

type SessionFormData = {
  courseId: string;
  title: string;
  description: string;
  startTime: string; // Format: YYYY-MM-DDTHH:mm
  endTime: string; // Format: YYYY-MM-DDTHH:mm
  location: string;
};

// Function to format Date to YYYY-MM-DDTHH:mm for datetime-local input
const formatDateTimeLocal = (
  date: Date | string | null | undefined
): string => {
  if (!date) return "";
  try {
    const d = new Date(date);
    // Adjust for timezone offset if necessary to display local time correctly
    const tzOffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(d.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  } catch (e) {
    return "";
  }
};

export default function AdminCalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null); // Error สำหรับทั้งหน้า

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    courseId: "",
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
  });
  const [formError, setFormError] = useState<string | null>(null); // Error ใน Modal
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Fetch initial data (Courses and Scheduled Sessions) ---
  const fetchData = async (fetchInfo?: {
    startStr?: string;
    endStr?: string;
  }) => {
    setIsLoading(true);
    setPageError(null);
    let coursesData: CourseInfo[] = courses; // Keep existing courses if already fetched
    if (courses.length === 0) {
      // Fetch courses only once or if needed
      try {
        const coursesRes = await fetch("/api/courses?all=true"); // ส่ง query param all=true เพื่อดึงทั้งหมด (ถ้า API รองรับ)
        if (!coursesRes.ok) throw new Error("Failed to fetch courses");
        const coursesJson = await coursesRes.json();
        coursesData = Array.isArray(coursesJson)
          ? coursesJson
          : coursesJson.courses || [];
        setCourses(coursesData);
        if (coursesData.length > 0 && formData.courseId === "") {
          // Set default courseId for new events
          setFormData((prev) => ({
            ...prev,
            courseId: coursesData[0].id.toString(),
          }));
        }
      } catch (err) {
        console.error("Error fetching courses:", err);
        setPageError(
          err instanceof Error ? err.message : "Failed to load courses"
        );
        // ไม่ต้อง return ถ้าโหลด Session ต่อได้
      }
    }

    try {
      let sessionApiUrl = "/api/scheduled-sessions";
      if (fetchInfo?.startStr && fetchInfo?.endStr) {
        sessionApiUrl += `?start=${fetchInfo.startStr}&end=${fetchInfo.endStr}`;
      }
      const sessionsRes = await fetch(sessionApiUrl);
      if (!sessionsRes.ok)
        throw new Error("Failed to fetch scheduled sessions");
      const sessionsData: ScheduledSessionFromAPI[] = await sessionsRes.json();

      const calendarEvents = sessionsData.map((session) => ({
        id: session.id.toString(),
        title: `${session.course.courseName}${
          session.title ? ` - ${session.title}` : ""
        }`,
        start: new Date(session.startTime),
        end: new Date(session.endTime),
        allDay: false, // สมมติว่าไม่ใช่ all day event
        extendedProps: {
          courseId: session.courseId,
          description: session.description,
          location: session.location,
          originalTitle: session.title, // เก็บ title ของ session แยก
        },
      }));
      setEvents(calendarEvents);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setPageError((prev) =>
        prev
          ? `${prev}; ${
              err instanceof Error ? err.message : "Failed to load sessions"
            }`
          : err instanceof Error
          ? err.message
          : "Failed to load sessions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Initial fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ดึง courses ครั้งเดียว, events ครั้งเดียว (ถ้าไม่ใช้ fetchInfo)

  // --- Calendar Event Handlers ---
  const handleDateClick = (arg: DateClickArg) => {
    setModalMode("add");
    setSelectedEventId(null);
    setFormError(null);
    setFormData({
      courseId: courses[0]?.id.toString() || "",
      title: "",
      description: "",
      startTime: formatDateTimeLocal(arg.dateStr), // Format ให้ตรงกับ input type="datetime-local"
      endTime: formatDateTimeLocal(
        new Date(arg.date.getTime() + 60 * 60 * 1000)
      ), // Default 1 hour duration
      location: "",
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    setModalMode("edit");
    setSelectedEventId(clickInfo.event.id);
    setFormError(null);
    const props = clickInfo.event.extendedProps;
    setFormData({
      courseId: props.courseId?.toString() || "",
      title: props.originalTitle || "",
      description: props.description || "",
      startTime: formatDateTimeLocal(clickInfo.event.start),
      endTime: formatDateTimeLocal(
        clickInfo.event.end || clickInfo.event.start
      ),
      location: props.location || "",
    });
    setIsModalOpen(true);
  };

  const handleEventChange = async (
    changeInfo: EventDropArg | FullCalendarEventResizeDoneArg
  ) => {
    if (
      !window.confirm(
        `คุณต้องการย้าย/ปรับขนาด "${changeInfo.event.title}" ใช่หรือไม่?`
      )
    ) {
      changeInfo.revert();
      return;
    }
    try {
      const payload = {
        startTime: changeInfo.event.start?.toISOString(),
        endTime:
          changeInfo.event.end?.toISOString() ||
          changeInfo.event.start?.toISOString(),
        // ส่งเฉพาะ field ที่เปลี่ยนก็ได้ แต่ startTime/endTime น่าจะเปลี่ยนเสมอ
      };
      const response = await fetch(
        `/api/scheduled-sessions/${changeInfo.event.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update event time");
      }
      // ไม่ต้อง fetchData() ซ้ำ เพราะ FullCalendar อัปเดต UI เองเมื่อ event props เปลี่ยน
      // แต่ถ้า Backend เปลี่ยนแปลงข้อมูลอื่นด้วย อาจจะต้อง fetch
      alert("อัปเดตเวลาสำเร็จ!");
    } catch (err) {
      console.error("Error updating event time:", err);
      alert(
        `เกิดข้อผิดพลาด: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      changeInfo.revert();
    }
  };

  // --- Modal Form Submit Handler ---
  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.courseId || !formData.startTime || !formData.endTime) {
      setFormError("กรุณาเลือกคอร์ส และระบุวันเวลาเริ่มต้น-สิ้นสุด");
      return;
    }
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    if (end <= start) {
      setFormError("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        courseId: parseInt(formData.courseId),
        title: formData.title.trim() || null,
        description: formData.description.trim() || null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        location: formData.location.trim() || null,
      };
      let response;
      if (modalMode === "add") {
        response = await fetch("/api/scheduled-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (selectedEventId) {
        response = await fetch(`/api/scheduled-sessions/${selectedEventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        throw new Error("Invalid mode.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save session`);
      }
      const savedSession: ScheduledSessionFromAPI = await response.json();

      // --- อัปเดต FullCalendar Events State ---
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        if (modalMode === "edit" && selectedEventId) {
          const existingEvent = calendarApi.getEventById(selectedEventId);
          existingEvent?.remove();
        }
        calendarApi.addEvent({
          id: savedSession.id.toString(),
          // --- VVV แก้ไขตรงนี้ VVV ---
          title: savedSession.title || `${savedSession.course} - (ทั่วไป)`, // ใช้ title จาก savedSession (ซึ่ง API ควรจะจัดการให้แล้ว)
          // หรือสร้าง title ใหม่จาก savedSession.courseName ถ้า savedSession.title ไม่มี
          start: new Date(savedSession.startTime),
          end: new Date(savedSession.endTime),
          allDay: false,
          backgroundColor: savedSession.isRestricted ? "#A9A9A9" : "#0043CC", // สีตาม isRestricted (ถ้ามี)
          borderColor: savedSession.isRestricted ? "#808080" : "#0033a0",
          textColor: savedSession.isRestricted ? "#404040" : "white",
          extendedProps: {
            courseId: savedSession.courseId,
            description: savedSession.description,
            location: savedSession.location,
            originalTitle: savedSession.title, // ถ้า API ส่ง title ที่เป็น original title มา
            courseName: savedSession.course, // ใช้ courseName จาก savedSession โดยตรง
            isRestricted: savedSession.isRestricted,
            apiData: savedSession, // เก็บ object ที่ได้จาก API ไว้ทั้งหมด
          },
        });
      }
      setIsModalOpen(false);
      alert("บันทึกตารางสอนสำเร็จ!");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Event Handler ---
  const handleDeleteEvent = async () => {
    if (
      !selectedEventId ||
      !window.confirm("คุณต้องการลบตารางสอนนี้จริงหรือไม่?")
    )
      return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch(
        `/api/scheduled-sessions/${selectedEventId}`,
        { method: "DELETE" }
      );
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete session");
      }
      const calendarApi = calendarRef.current?.getApi();
      calendarApi?.getEventById(selectedEventId)?.remove();
      setIsModalOpen(false);
      alert("ลบตารางสอนสำเร็จ!");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unknown error");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && events.length === 0 && courses.length === 0) {
    // Initial full load
    return (
      <div className="p-6 text-center">
        Loading calendar and initial data...
      </div>
    );
  }
  if (pageError && events.length === 0 && courses.length === 0) {
    // Critical error on initial load
    return (
      <div className="p-6 text-center text-red-500">Error: {pageError}</div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {" "}
      {/* ควรถูกครอบด้วย AdminLayout */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          ปฏิทินการเรียนการสอน
        </h1>
        <button
          type="button"
          onClick={() =>
            handleDateClick({
              date: new Date(),
              dateStr: new Date().toISOString().split("T")[0],
              allDay: false,
            } as DateClickArg)
          } // เปิด Modal แบบ Add
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + เพิ่มตารางสอน
        </button>
      </div>
      {pageError && <p className="text-red-500 mb-4">Note: {pageError}</p>}
      <div className="bg-white p-2 sm:p-4 rounded-lg shadow">
        {" "}
        {/* ปรับ Padding ของ Calendar Wrapper */}
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            listPlugin,
          ]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          initialView="dayGridMonth"
          events={events}
          editable={true} // เปิดให้ลาก/ปรับขนาดได้
          selectable={true} // เปิดให้คลิกเลือกวันที่/ช่วงเวลาได้
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          locale={thLocale} // ใช้ภาษาไทย
          buttonText={{
            today: "วันนี้",
            month: "เดือน",
            week: "สัปดาห์",
            day: "วัน",
            list: "รายการ",
          }}
          allDaySlot={false}
          height="auto" // ปรับความสูงอัตโนมัติ
          // slotMinTime="08:00:00"
          // slotMaxTime="21:00:00"
          dateClick={handleDateClick} // คลิกวันที่ว่าง
          eventClick={handleEventClick} // คลิก Event ที่มีอยู่
          eventDrop={handleEventChange} // ลาก Event ไปวาง
          eventResize={handleEventChange} // ปรับขนาด Event
          // --- ดึง Event ใหม่เมื่อ View หรือช่วงวันที่เปลี่ยน ---
          datesSet={(dateInfo) => {
            console.log(
              "Calendar datesSet:",
              dateInfo.startStr,
              dateInfo.endStr
            );
            // fetchData({ startStr: dateInfo.startStr, endStr: dateInfo.endStr }); // Fetch events for the new view range
          }}
        />
      </div>
      {/* --- Modal --- */}
      <Dialog
        open={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        className="relative z-50"
      >
        {/* ... (JSX ของ Modal เหมือนตัวอย่างก่อนหน้า ที่มี Form, Inputs, Buttons) ... */}
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
            <Dialog.Title className="text-lg font-semibold leading-6 text-gray-900 border-b pb-3 mb-4">
              {modalMode === "add" ? "เพิ่มตารางสอนใหม่" : "แก้ไขตารางสอน"}
            </Dialog.Title>
            <form
              onSubmit={handleModalSubmit}
              className="space-y-4 overflow-y-auto flex-grow"
            >
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {formError}
                </p>
              )}
              <div>
                <label
                  htmlFor="courseId"
                  className="block text-sm font-medium text-gray-700"
                >
                  คอร์สเรียน
                </label>
                <select
                  id="courseId"
                  name="courseId"
                  required
                  value={formData.courseId}
                  onChange={(e) =>
                    setFormData({ ...formData, courseId: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2"
                >
                  <option value="" disabled>
                    -- เลือกคอร์ส --
                  </option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id.toString()}>
                      {course.courseName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  หัวข้อเฉพาะ (ถ้ามี)
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ..."
                />
              </div>
              <div>
                <label
                  htmlFor="startTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  เวลาเริ่มต้น
                </label>
                <input
                  type="datetime-local"
                  id="startTime"
                  name="startTime"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ..."
                />
              </div>
              <div>
                <label
                  htmlFor="endTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  เวลาสิ้นสุด
                </label>
                <input
                  type="datetime-local"
                  id="endTime"
                  name="endTime"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ..."
                />
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700"
                >
                  สถานที่/Link (ถ้ามี)
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ..."
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  รายละเอียด (ถ้ามี)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ..."
                />
              </div>
            </form>
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              {modalMode === "edit" &&
                selectedEventId && ( // แสดงปุ่มลบเฉพาะตอน Edit และมี Event ID
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    ลบ
                  </button>
                )}
              <div className="flex-grow"></div> {/* Spacer */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="achievementForm"
                /* ควรเปลี่ยน form id เป็น sessionForm */ onClick={
                  handleModalSubmit
                }
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : modalMode === "add"
                  ? "เพิ่มตาราง"
                  : "บันทึกการแก้ไข"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
