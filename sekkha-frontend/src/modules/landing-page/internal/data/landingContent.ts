// Static content data for the Sekkha Landing Page
// Sekkha — digital community & youth fellowship platform for Vihara Tri Maha Dharma

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
  category: 'fellowship' | 'retreat' | 'social' | 'event'
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
    heading: string
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
    headline: 'Buddhist Youth Community of Vihara Tri Maha Dharma',
    subheadline:
      'An integrated digital platform for youth fellowship — scan attendance, join retreats, earn merit points, and stay connected with the community.',
  },

  features: [
    {
      title: 'Quick-Scan Attendance',
      description:
        'Attend regular Sunday services, scan instant QR codes at the temple, and your attendance history is recorded automatically.',
    },
    {
      title: 'Merit Points & Leaderboard',
      description:
        'Earn merit points every time you participate in fellowship and activities, unlock achievement badges, and level up in the community.',
    },
    {
      title: 'Retreat & Event Registration',
      description:
        'Register for youth retreats, Dhamma camps, and self-development workshops in just a few taps with instant confirmation.',
    },
    {
      title: 'Social Impact & Charity',
      description:
        'Join hands-on community service, blood donation drives, and environmental initiatives alongside your fellow Dhamma friends.',
    },
    {
      title: 'Dhamma Resources & Chanting',
      description:
        'Access interactive Dhamma teachings, service chanting parittas, and audio guides anytime to deepen your spiritual journey.',
    },
    {
      title: 'Real-time Notifications',
      description:
        'Get timely schedule updates, room adjustments, and important announcements right in the palm of your hand.',
    },
  ],

  stats: [
    {
      value: '500+',
      label: 'Active Members',
    },
    {
      value: '120+',
      label: 'Annual Events',
    },
    {
      value: '15+',
      label: 'Years of Community',
    },
    {
      value: '98%',
      label: 'Member Satisfaction',
    },
  ],

  leaderboard: {
    heading: 'Community Leaderboard',
    subheading: 'Most active youth members this month based on attendance, contributions, and community involvement.',
    entries: [
      { rank: 1, name: 'Sari Dewi', points: 980, badge: '🥇' },
      { rank: 2, name: 'Budi Santoso', points: 870, badge: '🥈' },
      { rank: 3, name: 'Mei Ling', points: 820, badge: '🥉' },
      { rank: 4, name: 'Andi Wijaya', points: 760, badge: '⭐' },
      { rank: 5, name: 'Ratna Sari', points: 710, badge: '⭐' },
    ],
  },

  events: {
    heading: 'Upcoming Events',
    subheading: 'Discover meaningful gatherings, spiritual retreats, and fun activities crafted for youth.',
    items: [
      {
        title: 'Sunday Youth Fellowship',
        date: 'Jun 15, 2026',
        location: 'Main Temple Hall',
        category: 'fellowship',
      },
      {
        title: 'Youth Dhamma Retreat',
        date: 'Jun 20–22, 2026',
        location: 'Bogor Highlands',
        category: 'retreat',
      },
      {
        title: 'Community Outreach & Charity',
        date: 'Jun 28, 2026',
        location: 'Cahaya Orphanage',
        category: 'social',
      },
      {
        title: 'Asadha Youth Celebration',
        date: 'Jul 5, 2026',
        location: 'Vihara Tri Maha Dharma',
        category: 'event',
      },
    ],
  },

  ctaBanner: {
    heading: 'Join our vibrant youth community today',
  },

  footer: {
    navColumns: [
      {
        heading: 'Community',
        links: [
          { label: 'About Us', href: '/about' },
          { label: 'Fellowship', href: '#fellowship' },
          { label: 'Events', href: '#events' },
          { label: 'Leaderboard', href: '#leaderboard' },
        ],
      },
      {
        heading: 'Programs',
        links: [
          { label: 'Retreats & Camps', href: '/retreat' },
          { label: 'Social Action', href: '/social' },
          { label: 'Dhamma Forum', href: '/forum' },
          { label: 'Study Resources', href: '/resources' },
        ],
      },
      {
        heading: 'Information',
        links: [
          { label: 'Contact', href: '/contact' },
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'FAQ', href: '/faq' },
        ],
      },
    ],
  },
}
