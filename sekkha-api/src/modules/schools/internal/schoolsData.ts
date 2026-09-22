export interface MasterSchoolItem {
  name: string
  type: "SMP" | "SMA" | "SMK" | "Universitas" | "Umum"
  city: string
}

export const INITIAL_SCHOOLS: MasterSchoolItem[] = [
  // Sekolah Buddhis & Swasta Unggulan
  { name: "SMA Tri Maha Dharma", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Dharma Widya", type: "SMA", city: "Tangerang" },
  { name: "SMA Cinta Kasih Tzu Chi", type: "SMA", city: "Jakarta Barat" },
  { name: "SMK Cinta Kasih Tzu Chi", type: "SMK", city: "Jakarta Barat" },
  { name: "SMA Tri Ratna", type: "SMA", city: "Jakarta Barat" },
  { name: "SMK Tri Ratna", type: "SMK", city: "Jakarta Barat" },
  { name: "SMA Bodhi Dharma", type: "SMA", city: "Batam" },
  { name: "SMA Narada", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Metta Maitreya", type: "SMA", city: "Pekanbaru" },
  { name: "SMA Kemurnian I", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Kemurnian II", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Ekayana Dharma Budha", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Silaparamita", type: "SMA", city: "Jakarta Timur" },
  { name: "SMA Pancaran Saraswati", type: "SMA", city: "Tangerang" },
  { name: "SMA Buddhi", type: "SMA", city: "Tangerang" },
  { name: "SMA Dharma Suci", type: "SMA", city: "Jakarta Utara" },
  { name: "SMA Dhammasavana", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Vimala Chanda", type: "SMA", city: "Tangerang" },
  { name: "SMP Tri Maha Dharma", type: "SMP", city: "Jakarta Barat" },
  { name: "SMP Dharma Widya", type: "SMP", city: "Tangerang" },
  { name: "SMP Cinta Kasih Tzu Chi", type: "SMP", city: "Jakarta Barat" },
  { name: "SMP Tri Ratna", type: "SMP", city: "Jakarta Barat" },
  { name: "SMP Narada", type: "SMP", city: "Jakarta Barat" },
  { name: "SMP Buddhi", type: "SMP", city: "Tangerang" },

  // Sekolah Negeri & Nasional
  { name: "SMA Negeri 1 Jakarta", type: "SMA", city: "Jakarta Pusat" },
  { name: "SMA Negeri 2 Jakarta", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Negeri 3 Jakarta", type: "SMA", city: "Jakarta Selatan" },
  { name: "SMA Negeri 8 Jakarta", type: "SMA", city: "Jakarta Selatan" },
  { name: "SMA Negeri 19 Jakarta", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Negeri 78 Jakarta", type: "SMA", city: "Jakarta Barat" },
  { name: "SMA Negeri 1 Tangerang", type: "SMA", city: "Tangerang" },
  { name: "SMA Negeri 2 Tangerang", type: "SMA", city: "Tangerang" },
  { name: "SMA Negeri 1 Medan", type: "SMA", city: "Medan" },
  { name: "SMA Negeri 1 Surabaya", type: "SMA", city: "Surabaya" },
  { name: "SMA Kanisius", type: "SMA", city: "Jakarta Pusat" },
  { name: "SMA Santa Ursula", type: "SMA", city: "Jakarta Pusat" },
  { name: "SMA BPK Penabur 1", type: "SMA", city: "Jakarta Pusat" },
  { name: "SMA BPK Penabur Gading Serpong", type: "SMA", city: "Tangerang" },

  // Perguruan Tinggi
  { name: "Universitas Indonesia", type: "Universitas", city: "Depok" },
  { name: "Universitas Bina Nusantara (BINUS)", type: "Universitas", city: "Jakarta Barat" },
  { name: "Universitas Tarumanagara (UNTAR)", type: "Universitas", city: "Jakarta Barat" },
  { name: "Universitas Trisakti", type: "Universitas", city: "Jakarta Barat" },
  { name: "Universitas Multimedia Nusantara (UMN)", type: "Universitas", city: "Tangerang" },
  { name: "Universitas Buddhi Dharma", type: "Universitas", city: "Tangerang" },
  { name: "STAB Kertarajasa", type: "Universitas", city: "Batu, Malang" },
  { name: "STAB Syailendra", type: "Universitas", city: "Semarang" },
  { name: "STAB Nalanda", type: "Universitas", city: "Jakarta Timur" },
  { name: "Universitas Gadjah Mada (UGM)", type: "Universitas", city: "Yogyakarta" },
  { name: "Institut Teknologi Bandung (ITB)", type: "Universitas", city: "Bandung" },
  { name: "Universitas Katolik Parahyangan", type: "Universitas", city: "Bandung" },
  { name: "Universitas Airlangga", type: "Universitas", city: "Surabaya" },
  { name: "Universitas Surabaya (UBAYA)", type: "Universitas", city: "Surabaya" },
  { name: "Universitas Prima Indonesia (UNPRI)", type: "Universitas", city: "Medan" },
  { name: "Universitas Mikroskil", type: "Universitas", city: "Medan" },
  { name: "Umum", type: "Umum", city: "Nasional" },
]
