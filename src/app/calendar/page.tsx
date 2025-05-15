// --- PATH: app/calendar/page.tsx ---
"use client";

import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction'; // สำหรับ eventClick
import { EventInput } from '@fullcalendar/core';
import thLocale from '@fullcalendar/core/locales/th';
import { useRouter } from 'next/navigation'; // สำหรับ App Router
import { Dialog } from '@headlessui/react';
import type {
    EventApi,
    DateSelectArg,  // <<-- ใช้ DateSelectArg แทน DateClickArg (ถ้าคลิกเลือกช่วงวัน) หรือใช้ EventClickArg แยก
    EventClickArg,  // <<-- Import แยกแบบนี้
    EventDropArg,
} from '@fullcalendar/core';
import Link from 'next/link';
// --- (Optional) Import Navbar/Footer ---
// import Navbar from '@/components/Navbar';
// import Footer from '@/components/Footer';

// --- Types (ควรตรงกับ API Response) ---
type ScheduledSessionFromAPI = {
    id: number;
    courseId: number;
    title: string | null; // ชื่องานสอนเฉพาะ (ถ้ามี)
    startTime: string;    // ISO String Date
    endTime: string;      // ISO String Date
    location: string | null;
    description?: string | null; // Optional: คำอธิบายเพิ่มเติม
    course: {
        id: number;
        courseName: string; // ชื่อคอร์สหลัก
    };
};

// Type สำหรับ Event ใน FullCalendar
type CalendarEvent = Omit<EventInput, 'start' | 'end'> & {
    extendedProps: {
        courseId: number;
        description?: string | null;
        location?: string | null;
        // เพิ่ม properties อื่นๆ ที่ต้องการเมื่อคลิก event
    };
};


const formatDate = (dateInput: Date | string | number | null | undefined): string => {
    if (dateInput === null || dateInput === undefined) return 'N/A';
    try {
        const d = new Date(dateInput); // new Date() รับ string, number, Date ได้
        if (isNaN(d.getTime())) {
            console.warn("formatDate received an invalid dateInput:", dateInput);
            return 'Invalid Date';
        }
        return d.toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    } catch (e) {
        console.error("Error in formatDate with input:", dateInput, e);
        return 'Invalid Date';
    }
};

export default function UserCalendarPage() {
    const router = useRouter();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);


    // --- Fetch Scheduled Sessions (Events) ---
    useEffect(() => {
        const fetchScheduledEvents = async (fetchInfo?: { startStr?: string, endStr?: string }) => {
            setIsLoading(true);
            setError(null);
            try {
                let apiUrl = '/api/scheduled-sessions'; // API เดิมที่ Admin ใช้
                if (fetchInfo?.startStr && fetchInfo?.endStr) {
                    apiUrl += `?start=${fetchInfo.startStr}&end=${fetchInfo.endStr}`;
                }
                const res = await fetch(apiUrl);
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `Failed to fetch schedule (status: ${res.status})`);
                }
                const data: ScheduledSessionFromAPI[] = await res.json();

                const calendarEvents: CalendarEvent[] = data.map(session => ({
                    id: session.id.toString(),
                    title: `${session.course.courseName}${session.title ? ` - ${session.title}` : ''}`,
                    start: new Date(session.startTime),
                    end: new Date(session.endTime),
                    allDay: false, // หรือตรวจสอบจากข้อมูลจริง
                    extendedProps: {
                        courseId: session.courseId,
                        description: session.description,
                        location: session.location,
                    },
                    // backgroundColor: '#007bff', // ตัวอย่างสี Event
                    // borderColor: '#007bff'
                }));
                setEvents(calendarEvents);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load schedule");
                console.error("Fetch Schedule Error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchScheduledEvents(); // โหลดข้อมูลครั้งแรก
    }, []);

    // --- Handler เมื่อคลิก Event ในปฏิทิน ---
    const handleEventClick = (clickInfo: EventClickArg) => {
        // แสดงรายละเอียด Event (อาจจะใน Modal หรือ Tooltip)
        // หรือ Link ไปยังหน้า Course Detail
        console.log("Event clicked:", clickInfo.event);
        setSelectedEventDetails(clickInfo.event as unknown as CalendarEvent); // Cast type
        setIsDetailModalOpen(true);
        // ตัวอย่าง: พาไปหน้า Course Detail
        // router.push(`/courses/${clickInfo.event.extendedProps.courseId}`);
    };


    if (isLoading) return <div className="flex justify-center items-center min-h-screen p-4 text-gray-600">กำลังโหลดปฏิทิน...</div>;
    if (error) return <div className="flex flex-col justify-center items-center min-h-screen text-red-500 text-center p-4"><p className="text-xl font-semibold">เกิดข้อผิดพลาด</p><p className="mt-2">{error}</p></div>;

    return (
        <>
            {/* <Navbar /> */}
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    ปฏิทินการเรียนการสอน
                </h1>
                <div className="bg-white p-2 sm:p-4 rounded-lg shadow-lg"> {/* เพิ่ม shadow ให้ดูดีขึ้น */}
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth' // เพิ่ม listMonth
                        }}
                        initialView="dayGridMonth"
                        events={events}
                        locale={thLocale} // ภาษาไทย
                        buttonText={{
                            today: 'วันนี้', month: 'เดือน', week: 'สัปดาห์', day: 'วัน', list: 'รายการ'
                        }}
                        editable={false} // User ทั่วไปไม่ควรแก้ไข Event ได้
                        selectable={false} // User ทั่วไปไม่ควรเลือกช่วงวันที่ได้ (ถ้าไม่ต้องการให้ทำ Action)
                        dayMaxEvents={true} // แสดง +more ถ้า Event ในวันนั้นเยอะ
                        weekends={true}
                        eventClick={handleEventClick} // <<-- Handler เมื่อคลิก Event
                        height="auto" // หรือกำหนดความสูงคงที่ เช่น "700px"
                        // --- (Optional) ดึง Event ใหม่เมื่อ View หรือช่วงวันที่เปลี่ยน ---
                        // datesSet={(dateInfo) => {
                        //     console.log("User Calendar datesSet:", dateInfo.startStr, dateInfo.endStr);
                        //     fetchScheduledEvents({ startStr: dateInfo.startStr, endStr: dateInfo.endStr });
                        // }}
                        // --- (Optional) Custom Event Rendering ---
                        // eventContent={(eventInfo) => (
                        //     <>
                        //       <b>{eventInfo.timeText}</b>
                        //       <i className="ml-1 truncate">{eventInfo.event.title}</i>
                        //     </>
                        // )}
                    />
                </div>

                {/* --- Modal แสดงรายละเอียด Event (ตัวอย่างง่ายๆ) --- */}
                        {selectedEventDetails && (
            <Dialog open={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <Dialog.Title className="text-xl font-semibold leading-6 text-gray-900 border-b pb-3 mb-4">
                            {/* ใช้ Optional Chaining ?. */}
                            {selectedEventDetails?.title || 'รายละเอียด Event'}
                        </Dialog.Title>
                        <div className="space-y-2 text-sm">
                            <p>
                                <strong>คอร์ส:</strong>{' '}
                                {/* selectedEventDetails.title มาจาก FullCalendar event */}
                                {selectedEventDetails?.title?.split(' - ')[0] ?? 'N/A'}
                            </p>
                            <p>
                                <strong>เริ่ม:</strong>{' '}
                                {selectedEventDetails?.start ? formatDate(selectedEventDetails.start) : 'N/A'}
                            </p>
                            <p>
                                <strong>สิ้นสุด:</strong>{' '}
                                {selectedEventDetails?.end ? formatDate(selectedEventDetails.end) : 'N/A'}
                            </p>
                            {/* @ts-ignore selectedEventDetails.extendedProps อาจจะยังไม่ถูก type guard ดีพอ */}
                            {selectedEventDetails?.extendedProps?.location && (
                                <p><strong>สถานที่/Link:</strong> {selectedEventDetails.extendedProps.location}</p>
                            )}
                            {/* @ts-ignore */}
                            {selectedEventDetails?.extendedProps?.description && (
                                <p><strong>รายละเอียด:</strong> {selectedEventDetails.extendedProps.description}</p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end space-x-3"> {/* เพิ่ม space-x-3 */}
                            {/* ปุ่ม Link ไปหน้า Course Detail */}
                            {selectedEventDetails?.extendedProps?.courseId && (
                                <Link
                                    href={`/course/${selectedEventDetails.extendedProps.courseId}`}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                    onClick={() => setIsDetailModalOpen(false)} // ปิด Modal เมื่อคลิก
                                >
                                    ดูรายละเอียดคอร์ส
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                ปิด
                            </button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        )}

            </main>
            {/* <Footer /> */}
        </>
    );
}