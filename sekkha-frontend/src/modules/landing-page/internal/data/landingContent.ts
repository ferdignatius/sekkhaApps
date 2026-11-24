// Static content data for the Sekkha Landing Page
// 100% static data — zero backend API requests are triggered from the landing page.

export interface LeaderboardEntry {
  rank: number
  name: string
  subtitle?: string
  points: number
  badge: string
}

export interface EventItem {
  title: string
  date: string
  location: string
  category: "fellowship" | "retreat" | "social" | "event"
}

export interface FooterLinkItem {
  label: string
  href: string
  disabled?: boolean
}

export interface LandingContent {
  hero: {
    headline: string
    subheadline: string
  }
  features: Array<{
    title: string
    description: string
    tag?: string
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
      links: FooterLinkItem[]
    }>
  }
}

export const landingContent: LandingContent = {
  hero: {
    headline: "Buddhist Youth Community of Vihara Tri Maha Dharma",
    subheadline:
      "An integrated digital platform for youth fellowship — scan attendance with your Digital Member Card, build weekly streaks, contribute through Seva duties, and grow with the community.",
  },

  features: [
    {
      title: "Quick-Scan & Digital Member QR",
      description:
        "Show your 10-digit Sekkha Member ID and personal QR pass at arrival for instant, verified temple check-in.",
    },
    {
      title: "Weekly Streaks & Karma Points",
      description:
        "Build Sunday attendance consistency with weekly streaks, Daily Dhamma Wisdom, and verified Karma Point rewards.",
    },
    {
      title: "Season Leaderboard & Seva",
      description:
        "Participate in zero-reset Vassa Seasons and earn extra points when you serve in MC, usher, or media Seva duties.",
    },
    {
      title: "Event Schedule & Categories",
      description:
        "Discover Sunday fellowships, Dhamma retreats, social action, and major Buddhist celebrations organized cleanly.",
    },
  ],

  stats: [
    {
      value: "100+",
      label: "Active Members",
    },
    {
      value: "50+",
      label: "Events This Year",
    },
    {
      value: "10+",
      label: "Years of Community",
    },
    {
      value: "98%",
      label: "Member Satisfaction",
    },
  ],

  leaderboard: {
    heading: "Community Leaderboard",
    subheading:
      "Sample highlights from the active Vassa Season based on verified attendance points and Seva service duties.",
    entries: [
      {
        rank: 1,
        name: "@sari_dewi",
        subtitle: "Seva Coordinator • Vihara Member",
        points: 980,
        badge: "🥇",
      },
      {
        rank: 2,
        name: "@budi_santoso",
        subtitle: "Dhamma Host • Vihara Member",
        points: 870,
        badge: "🥈",
      },
      {
        rank: 3,
        name: "@mei_ling",
        subtitle: "Youth Usher • Vihara Member",
        points: 820,
        badge: "🥉",
      },
      {
        rank: 4,
        name: "@andi_wijaya",
        subtitle: "Sound & Media • Vihara Member",
        points: 760,
        badge: "⭐",
      },
      {
        rank: 5,
        name: "@ratna_sari",
        subtitle: "Regular Attendee • Vihara Member",
        points: 710,
        badge: "⭐",
      },
    ],
  },

  events: {
    heading: "Upcoming Events",
    subheading:
      "Discover recurring Sunday gatherings, retreats, and social outreach crafted for Buddhist youth.",
    items: [
      {
        title: "Sunday Youth Fellowship",
        date: "Every Sunday • 09:00 WIB",
        location: "Main Temple Hall",
        category: "fellowship",
      },
      {
        title: "Youth Dhamma Retreat",
        date: "Upcoming • 3-Day Camp",
        location: "Bogor Highlands",
        category: "retreat",
      },
      {
        title: "Community Outreach & Charity",
        date: "Monthly • Social Action",
        location: "Cahaya Partner Home",
        category: "social",
      },
      {
        title: "Vihara Youth Celebration",
        date: "Upcoming • Seasonal Gathering",
        location: "Vihara Tri Maha Dharma",
        category: "event",
      },
    ],
  },

  ctaBanner: {
    heading: "Join our vibrant youth community today",
  },

  footer: {
    navColumns: [
      {
        heading: "Community",
        links: [
          { label: "Features", href: "#features" },
          { label: "Events", href: "#events" },
          { label: "Leaderboard", href: "#leaderboard" },
          { label: "About Us", href: "/about", disabled: true },
        ],
      },
      {
        heading: "Programs",
        links: [
          { label: "Retreats & Camps", href: "/retreat", disabled: true },
          { label: "Social Action", href: "/social", disabled: true },
          { label: "Dhamma Forum", href: "/forum", disabled: true },
          { label: "Study Resources", href: "/resources", disabled: true },
        ],
      },
      {
        heading: "Information",
        links: [
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Contact", href: "/contact", disabled: true },
          { label: "Terms of Service", href: "/terms", disabled: true },
          { label: "FAQ", href: "/faq", disabled: true },
        ],
      },
    ],
  },
}
