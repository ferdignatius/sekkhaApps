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
      'Platform digital untuk mengelola kegiatan, kebaktian, dan komunitas remaja Buddhis — terhubung, berkembang, dan berkarya bersama.',
  },

  features: [
    {
      title: 'Kebaktian Remaja',
      description:
        'Ikuti jadwal kebaktian rutin setiap minggu, pantau kehadiranmu, dan dapatkan materi dhamma yang bisa kamu akses kapan saja.',
    },
    {
      title: 'Kegiatan & Retreat',
      description:
        'Daftar kegiatan retreat, kamp dhamma, dan program pengembangan diri yang dirancang khusus untuk generasi muda Buddhis.',
    },
    {
      title: 'Bakti Sosial',
      description:
        'Bergabung dalam program bakti sosial dan kegiatan amal — dari donor darah, santunan, hingga penghijauan lingkungan vihara.',
    },
    {
      title: 'Leaderboard Umat',
      description:
        'Sistem poin untuk menghargai keaktifan anggota — hadiri kebaktian, ikuti kegiatan, dan raih posisi teratas leaderboard komunitas.',
    },
    {
      title: 'Forum & Diskusi',
      description:
        'Ruang diskusi dhamma, berbagi cerita inspiratif, dan tanya jawab bersama Bhikku dan pembimbing komunitas secara online.',
    },
    {
      title: 'Pengumuman & Notifikasi',
      description:
        'Tidak ketinggalan satu pun informasi penting — jadwal kebaktian, perubahan kegiatan, dan pengumuman vihara langsung ke tanganmu.',
    },
  ],

  stats: [
    {
      value: '500+',
      label: 'Anggota aktif',
    },
    {
      value: '120+',
      label: 'Kegiatan per tahun',
    },
    {
      value: '15+',
      label: 'Tahun komunitas',
    },
    {
      value: '98%',
      label: 'Kepuasan anggota',
    },
  ],

  leaderboard: {
    heading: 'Leaderboard Umat Aktif',
    subheading: 'Anggota paling aktif bulan ini berdasarkan kehadiran dan partisipasi kegiatan.',
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
        title: 'Perayaan Asadha',
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
        heading: 'Program',
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
