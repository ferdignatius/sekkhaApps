// Static content data for the Sekkha Landing Page
// Sekkha — platform digital komunitas & kebaktian remaja Vihara Tri Maha Dharma

export interface LeaderboardEntry {
  rank: number
  name: string
  points: number
  badge: string
}

export interface EventItem {
  title: string
  date: string
  location: string
  category: 'kebaktian' | 'retreat' | 'bakti-sosial' | 'event'
}

export interface LandingContent {
  hero: {
    headline: string
    subheadline: string
  }
  features: Array<{
    title: string
    description: string
  }>
  stats: Array<{
    value: string
    label: string
  }>
  leaderboard: {
    heading: string
    subheading: string
    entries: LeaderboardEntry[]
  }
  events: {
    heading: string
    subheading: string
    items: EventItem[]
  }
  ctaBanner: {
    heading: string // maks 80 karakter
  }
  footer: {
    navColumns: Array<{
      heading: string
      links: Array<{ label: string; href: string }>
    }>
  }
}

export const landingContent: LandingContent = {
  hero: {
    headline: 'Komunitas Remaja Vihara Tri Maha Dharma',
    subheadline:
      'Platform digital terpadu untuk umat remaja Buddhis — presensi kebaktian, daftar retreat, kumpulkan poin kebaikan, dan terhubung bersama komunitas.',
  },

  features: [
    {
      title: 'Presensi Kebaktian Quick-Scan',
      description:
        'Hadir kebaktian rutin setiap Minggu, pindai QR presensi instan di lokasi vihara, dan riwayat kehadiranmu langsung tercatat secara otomatis.',
    },
    {
      title: 'Poin & Leaderboard Umat',
      description:
        'Kumpulkan poin kebaikan setiap kali mengikuti kebaktian dan kegiatan, raih badge prestasi, serta naikkan level peringkatmu di komunitas.',
    },
    {
      title: 'Pendaftaran Retreat & Event',
      description:
        'Daftar kegiatan retreat youth, kamp Dhamma, dan workshop pengembangan diri hanya dalam beberapa sentuhan dengan konfirmasi langsung.',
    },
    {
      title: 'Aksi Bakti Sosial',
      description:
        'Bergabung dalam aksi nyata kepedulian sosial, donor darah, dan penghijauan lingkungan vihara bersama teman-teman se-dharma.',
    },
    {
      title: 'Akses Materi & Paritta',
      description:
        'Akses kumpulan materi Dhamma interaktif, teks paritta kebaktian, dan rekaman pembacaan kapan saja untuk memperdalam pengetahuan spiritual.',
    },
    {
      title: 'Notifikasi & Pengumuman Instant',
      description:
        'Dapatkan informasi jadwal kebaktian terbaru, pergeseran jam kegiatan, dan pengumuman penting vihara langsung di genggamanmu.',
    },
  ],

  stats: [
    {
      value: '500+',
      label: 'Anggota Aktif',
    },
    {
      value: '120+',
      label: 'Kegiatan per Tahun',
    },
    {
      value: '15+',
      label: 'Tahun Komunitas',
    },
    {
      value: '98%',
      label: 'Kepuasan Umat',
    },
  ],

  leaderboard: {
    heading: 'Leaderboard Umat Aktif',
    subheading: 'Umat remaja paling aktif bulan ini berdasarkan presensi kebaktian dan partisipasi kegiatan.',
    entries: [
      { rank: 1, name: 'Sari Dewi', points: 980, badge: '🥇' },
      { rank: 2, name: 'Budi Santoso', points: 870, badge: '🥈' },
      { rank: 3, name: 'Mei Ling', points: 820, badge: '🥉' },
      { rank: 4, name: 'Andi Wijaya', points: 760, badge: '⭐' },
      { rank: 5, name: 'Ratna Sari', points: 710, badge: '⭐' },
    ],
  },

  events: {
    heading: 'Kegiatan Mendatang',
    subheading: 'Jangan lewatkan kegiatan seru dan bermakna yang sudah menunggumu.',
    items: [
      {
        title: 'Kebaktian Remaja Minggu',
        date: '15 Jun 2026',
        location: 'Aula Utama Vihara',
        category: 'kebaktian',
      },
      {
        title: 'Retreat Dhamma Muda',
        date: '20–22 Jun 2026',
        location: 'Puncak Bogor',
        category: 'retreat',
      },
      {
        title: 'Bakti Sosial Panti Asuhan',
        date: '28 Jun 2026',
        location: 'Panti Asuhan Cahaya',
        category: 'bakti-sosial',
      },
      {
        title: 'Perayaan Asadha Youth',
        date: '5 Jul 2026',
        location: 'Vihara Tri Maha Dharma',
        category: 'event',
      },
    ],
  },

  ctaBanner: {
    // Tepat ≤ 80 karakter
    heading: 'Bergabunglah bersama komunitas kami hari ini',
  },

  footer: {
    navColumns: [
      {
        heading: 'Komunitas',
        links: [
          { label: 'Tentang Kami', href: '/about' },
          { label: 'Kebaktian', href: '#kebaktian' },
          { label: 'Kegiatan', href: '#events' },
          { label: 'Leaderboard', href: '#leaderboard' },
        ],
      },
      {
        heading: 'Program Umat',
        links: [
          { label: 'Retreat & Kamp', href: '/retreat' },
          { label: 'Bakti Sosial', href: '/bakti-sosial' },
          { label: 'Forum Dhamma', href: '/forum' },
          { label: 'Materi Dhamma', href: '/materi' },
        ],
      },
      {
        heading: 'Informasi',
        links: [
          { label: 'Kontak', href: '/contact' },
          { label: 'Kebijakan Privasi', href: '/privacy' },
          { label: 'Syarat & Ketentuan', href: '/terms' },
          { label: 'FAQ', href: '/faq' },
        ],
      },
    ],
  },
}

