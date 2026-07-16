// Dummy data for Private Channel — replace with API calls later.
import type { PrivateThread, ThreadMessage } from "../types"

export const DUMMY_THREADS: PrivateThread[] = [
  {
    id: "th-1",
    subject: "Pertanyaan tentang jadwal mentoring pribadi",
    status: "open",
    author: { id: "me", name: "Kamu", role: "umat", initials: "AK" },
    assigned_to: null,
    created_at: "2025-07-12T10:00:00+07:00",
    last_message_at: "2025-07-12T10:00:00+07:00",
    last_message_preview: "Halo kak, apakah ada sesi mentoring...",
    unread_count: 0,
  },
  {
    id: "th-2",
    subject: "Minta panduan meditasi untuk pemula",
    status: "in_progress",
    author: { id: "me", name: "Kamu", role: "umat", initials: "AK" },
    assigned_to: { id: "p1", name: "Kakak Dewi", role: "pengurus", initials: "KD" },
    created_at: "2025-07-05T08:00:00+07:00",
    last_message_at: "2025-07-10T14:30:00+07:00",
    last_message_preview: "Coba mulai dari teknik napas dulu...",
    unread_count: 1,
  },
]

export const DUMMY_MESSAGES: Record<string, ThreadMessage[]> = {
  "th-1": [
    {
      id: "m1",
      thread_id: "th-1",
      body: "Halo kak, apakah ada sesi mentoring pribadi yang bisa saya ikuti? Saya sedang mencari bimbingan untuk perjalanan spiritual saya.",
      sender: { id: "me", name: "Kamu", role: "umat", initials: "AK" },
      created_at: "2025-07-12T10:00:00+07:00",
    },
  ],
  "th-2": [
    {
      id: "m2",
      thread_id: "th-2",
      body: "Halo kak, saya baru mulai belajar meditasi dan agak bingung harus mulai dari mana. Bisa minta panduan singkat?",
      sender: { id: "me", name: "Kamu", role: "umat", initials: "AK" },
      created_at: "2025-07-05T08:00:00+07:00",
    },
    {
      id: "m3",
      thread_id: "th-2",
      body: "Halo! Tentu. Coba mulai dari teknik napas dulu — fokus pada keluar masuknya napas selama 10 menit sehari. Jangan khawatir kalau pikiran mengembara, itu normal.",
      sender: { id: "p1", name: "Kakak Dewi", role: "pengurus", initials: "KD" },
      created_at: "2025-07-10T14:30:00+07:00",
    },
  ],
}
