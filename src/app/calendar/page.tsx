// src/app/calendar/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react"; // เพิ่ม useCallback
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import thLocale from "@fullcalendar/core/locales/th";
import { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core"; // Import EventInput
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
// import styles from './calendar.module.css'; // ถ้ามี CSS module

// Interface สำหรับ event ที่จะใช้กับ FullCalendar
interface CalendarDisplayEvent extends EventInput {
  // kế thừaจาก EventInput ของ FullCalendar
  // id, title, start, end จะถูกกำหนดโดย EventInput อยู่แล้ว
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    description?: string | null;
    location?: string | null;
    meetingLink?: string | null;
    courseName: string;
    courseId: number;
    isRestricted: boolean;
  };
}

// Interface สำหรับข้อมูลที่คาดหวังจาก API
interface ApiScheduledSessionResponse {
  id: number;
  title: string; // API จะส่ง title ที่ผ่านการ process มาแล้ว (session title หรือ course name)
  description?: string | null;
  startTime: string; // ISO String
  endTime: string; // ISO String
  location?: string | null;
  sessionSpecificTitle?: string | null;
  // meetingLink?: string | null; // ถ้า API ส่ง field นี้มา
  courseId: number;
  courseName: string;
  isRestricted: boolean;
}

const CalendarPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarDisplayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarDisplayEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    // ใช้ useCallback
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scheduled-sessions");
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({
            message: `Failed to fetch events: ${response.statusText}`,
          }));
        throw new Error(
          errorData.message || `Failed to fetch events: ${response.statusText}`
        );
      }
      const data: ApiScheduledSessionResponse[] = await response.json();
      const calendarEvents: CalendarDisplayEvent[] = data.map((apiEvent) => ({
        id: apiEvent.id.toString(),
        title: apiEvent.title, // ใช้ title ที่ API ส่งมาโดยตรง
        start: apiEvent.startTime,
        end: apiEvent.endTime,
        backgroundColor: apiEvent.isRestricted ? "#A9A9A9" : "#0043CC", // DarkGray ถ้าถูกจำกัด
        borderColor: apiEvent.isRestricted ? "#808080" : "#0033a0",
        textColor: apiEvent.isRestricted ? "#404040" : "white",
        classNames: apiEvent.isRestricted ? ["fc-event-restricted"] : [], // เพิ่ม class สำหรับ styling
        extendedProps: {
          description: apiEvent.description,
          location: apiEvent.location,
          // meetingLink: apiEvent.meetingLink,
          courseName: apiEvent.courseName,
          courseId: apiEvent.courseId,
          isRestricted: apiEvent.isRestricted,
        },
      }));
      setEvents(calendarEvents);
    } catch (err) {
      console.error("Calendar Page Error - fetchEvents:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred while fetching events."
      );
    } finally {
      setLoading(false);
    }
  }, []); // useCallback ไม่มี dependencies ที่เปลี่ยนบ่อย

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]); // เรียก fetchEvents เมื่อ component mount หรือ fetchEvents เปลี่ยน (ซึ่งไม่ควรเปลี่ยน)

  const renderEventContent = (eventArg: EventContentArg) => {
    const { isRestricted, location, meetingLink } = eventArg.event
      .extendedProps as CalendarDisplayEvent["extendedProps"];
    const title = eventArg.event.title;
    const timeText = eventArg.timeText;

    return (
      <div className="fc-event-title fc-sticky font-semibold text-xs">
        {" "}
        {/* Tailwind: p-1 */}
        {timeText && (
          <div className="fc-event-time text-xs">{timeText}</div>
        )}{" "}
        {/* Tailwind: text-xs */}
        <div className="fc-event-title-container">
          <div className="fc-event-title fc-sticky font-semibold">{title}</div>{" "}
          {/* Tailwind: font-semibold */}
        </div>
        {!isRestricted && location && (
          <div className="fc-event-location text-xs mt-1">📍 {location}</div>
        )}
        {!isRestricted && meetingLink && (
          <div className="fc-event-meeting-link text-xs mt-1">
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-500 hover:text-blue-700"
            >
              🔗 Join Meeting
            </a>
          </div>
        )}
        {isRestricted && (
          <div className="fc-event-restricted-notice text-xs mt-1 italic">
            🔒 (ลงทะเบียนเพื่อดูรายละเอียด)
          </div>
        )}
      </div>
    );
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventProps = clickInfo.event
      .extendedProps as CalendarDisplayEvent["extendedProps"];
    if (eventProps.isRestricted) {
      alert(
        `คุณต้องลงทะเบียนเรียนในคอร์ส "${eventProps.courseName}" เพื่อดูรายละเอียดและเข้าร่วมกิจกรรมนี้`
      );
      // ตัวเลือก: พาไปยังหน้ารายละเอียดคอร์ส

      router.push(`/course/${eventProps.courseId}`);
    } else {
      setSelectedEvent(clickInfo.event as unknown as CalendarDisplayEvent);
    }
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  if (loading)
    return (
      <div className="calendar-loading text-center p-10">
        กำลังโหลดปฏิทิน...
      </div>
    );
  if (error)
    return (
      <div className="calendar-error text-center p-10 text-red-600">
        เกิดข้อผิดพลาด: {error}
      </div>
    );

  return (
    <div className="calendar-container container mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-800">
        ปฏิทินการเรียน
      </h1>
      <div className="calendar-wrapper bg-white p-2 md:p-6 rounded-xl shadow-lg">
        <FullCalendar
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
          locale={thLocale}
          buttonText={{
            today: "วันนี้",
            month: "เดือน",
            week: "สัปดาห์",
            day: "วัน",
            list: "รายการ",
          }}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
          editable={session?.user?.role === "admin"}
          selectable={session?.user?.role === "admin"}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          height="auto" // ให้ FullCalendar จัดการความสูง หรือ "calc(100vh - 200px)"
          contentHeight="auto"
          aspectRatio={1.8} // ลองปรับค่านี้เพื่อให้เหมาะสม
          // navLinks={true}
          // nowIndicator={true}
        />
      </div>

      {selectedEvent && !selectedEvent.extendedProps.isRestricted && (
        <div
          className="event-modal-overlay fixed inset-0 backdrop-blur-md bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="event-modal-content bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="event-modal-close-button absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>
            <h2 className="event-modal-title text-xl md:text-2xl font-bold mb-4 text-gray-800">
              {selectedEvent.title}
            </h2>
            <p className="event-modal-time text-sm text-gray-600 mb-4">
              {new Date(selectedEvent.start as string).toLocaleString("th-TH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -
              {new Date(selectedEvent.end as string).toLocaleString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {selectedEvent.extendedProps.description && (
              <p className="mb-3 text-gray-700">
                <strong>คำอธิบาย:</strong>{" "}
                {selectedEvent.extendedProps.description}
              </p>
            )}
            {selectedEvent.extendedProps.location && (
              <p className="mb-3 text-gray-700">
                <strong>สถานที่:</strong> {selectedEvent.extendedProps.location}
              </p>
            )}
            {selectedEvent.extendedProps.meetingLink && (
              <p className="mb-3 text-gray-700">
                <strong>ลิงก์:</strong>{" "}
                <a
                  href={selectedEvent.extendedProps.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  เข้าร่วม
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
