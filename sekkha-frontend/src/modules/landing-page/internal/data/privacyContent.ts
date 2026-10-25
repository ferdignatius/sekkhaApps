export interface PrivacySection {
  id: string
  number: number
  title: {
    id: string
    en: string
  }
  summary: {
    id: string
    en: string
  }
  paragraphs: {
    id: string[]
    en: string[]
  }
  bulletPoints?: {
    id: string[]
    en: string[]
  }
}

export interface PrivacyPolicyData {
  lastUpdated: {
    id: string
    en: string
  }
  effectiveDate: {
    id: string
    en: string
  }
  governingLaw: {
    id: string
    en: string
  }
  dataController: {
    name: string
    organization: string
    email: string
    address: string
  }
  sections: PrivacySection[]
}

export const privacyPolicyData: PrivacyPolicyData = {
  lastUpdated: {
    id: "25 Oktober 2026",
    en: "October 25, 2026",
  },
  effectiveDate: {
    id: "1 September 2026",
    en: "September 1, 2026",
  },
  governingLaw: {
    id: "Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP)",
    en: "Law of the Republic of Indonesia No. 27 of 2022 on Personal Data Protection (UU PDP)",
  },
  dataController: {
    name: "Pengurus Pemuda & Tim Sekkha",
    organization: "Vihara Tri Maha Dharma",
    email: "privacy@sekkha.local",
    address: "Sekretariat Pemuda Vihara Tri Maha Dharma",
  },
  sections: [
    {
      id: "pendahuluan",
      number: 1,
      title: {
        id: "1. Pendahuluan & Identitas Pengendali Data",
        en: "1. Introduction & Data Controller Identity",
      },
      summary: {
        id: "Sekkha Apps dikelola oleh Vihara Tri Maha Dharma untuk kegiatan pemuda vihara dan tunduk pada UU No. 27/2022 (UU PDP).",
        en: "Sekkha Apps is operated by Vihara Tri Maha Dharma for temple youth fellowship and complies with Indonesian PDP Law No. 27/2022.",
      },
      paragraphs: {
        id: [
          'Selamat datang di Sekkha Apps ("Aplikasi"), platform digital komunitas pemuda Buddhis yang dikelola oleh Pengurus dan Pembina Pemuda Vihara Tri Maha Dharma ("Pengendali Data"). Sekkha dirancang untuk memfasilitasi pencatatan kehadiran (presensi) kebaktian dan event, pembagian peran pelayanan puja bakti, gamifikasi (poin Dhamma, streak kehadiran, lencana prestasi, dan papan peringkat/leaderboard), serta pembinaan karakter generasi muda Buddhis.',
          "Kami berkomitmen penuh untuk melindungi privasi dan keamanan Data Pribadi Anda sesuai dengan peraturan perundang-undangan yang berlaku di Republik Indonesia, khususnya Undang-Undang Nomor 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, memproses, menyimpan, dan melindungi Data Pribadi Anda saat menggunakan Aplikasi Sekkha.",
        ],
        en: [
          'Welcome to Sekkha Apps ("Application"), the Buddhist youth community platform operated by the Youth Committee and Mentors of Vihara Tri Maha Dharma ("Data Controller"). Sekkha facilitates service and event check-in, puja service role assignments, gamification (Dhamma points, attendance streaks, achievement badges, and leaderboards), and youth spiritual fellowship.',
          "We are firmly committed to protecting your privacy and safeguarding your Personal Data in strict compliance with the laws of the Republic of Indonesia, primarily Law No. 27 of 2022 on Personal Data Protection (UU PDP). This Privacy Policy explains how we collect, process, store, and protect your personal information when using the Sekkha platform.",
        ],
      },
    },
    {
      id: "data-dikumpulkan",
      number: 2,
      title: {
        id: "2. Data Pribadi yang Kami Kumpulkan",
        en: "2. Personal Data We Collect",
      },
      summary: {
        id: "Kami hanya mengumpulkan data yang relevan untuk kebutuhan keanggotaan, presensi kegiatan vihara, dan gamifikasi.",
        en: "We collect only data necessary for youth community membership, event check-in, and gamification.",
      },
      paragraphs: {
        id: [
          "Untuk memberikan pengalaman komunitas yang aman, teratur, dan bermanfaat, kami mengumpulkan jenis-jenis Data Pribadi berikut yang diberikan secara langsung maupun yang dihasilkan saat berinteraksi dengan sistem:",
        ],
        en: [
          "To provide a safe, organized, and constructive community experience, we collect the following categories of Personal Data provided directly by you or generated during system interactions:",
        ],
      },
      bulletPoints: {
        id: [
          "Data Identitas Akun: Nama lengkap, alamat email aktif, nomor telepon/WhatsApp, tanggal lahir, nama institusi sekolah atau perguruan tinggi (kampus), username, serta kata sandi terenkripsi.",
          "Identitas Anggota Komunitas (Member ID & QR Code): Nomor identitas unik anggota yang dihasilkan sistem secara otomatis untuk verifikasi kartu anggota digital dan presensi acara vihara.",
          "Riwayat Kehadiran & Partisipasi: Catatan check-in kebaktian Minggu, retreat pemuda, perayaan hari besar Buddhis (Waisak, Kathina, Asadha, Magha Puja), cap waktu kedatangan, serta peran tugas kebaktian (pembaca paritta, usher, dokumentasi, panitia acara).",
          "Data Gamifikasi & Keaktifan: Perolehan poin Dhamma, catatan rekor streak mingguan, lencana (badges) pencapaian, serta peringkat pada leaderboard komunitas.",
          "Data Teknis & Sesi: Alamat IP saat masuk (login), tipe peramban (browser), waktu akses (timestamp), serta token sesi terenkripsi (JWT). Kami tidak melacak lokasi GPS perangkat Anda di latar belakang secara berkelanjutan.",
        ],
        en: [
          "Account Identity Information: Full legal name, active email address, WhatsApp/phone number, date of birth, school or campus name, username, and encrypted password credentials.",
          "Community Member Identifier (Member ID & QR Code): A system-generated unique membership ID and digital QR code used for temple service verification and digital card check-in.",
          "Attendance & Participation Records: Check-in timestamps for Sunday services, youth retreats, Buddhist festive ceremonies (Vesak, Kathina, Asadha, Magha Puja), and assigned liturgical duties (chanting leader, usher, multimedia, committee roles).",
          "Gamification & Engagement Metrics: Dhamma points earned, weekly attendance streaks, unlocked achievement badges, and public leaderboard standings.",
          "Technical & Session Data: IP address upon authentication, browser/device user-agent, activity timestamps, and encrypted session tokens (JWT). We do not perform background GPS geotracking.",
        ],
      },
    },
    {
      id: "tujuan-pemrosesan",
      number: 3,
      title: {
        id: "3. Dasar Hukum & Tujuan Pemrosesan Data",
        en: "3. Lawful Basis & Purposes of Data Processing",
      },
      summary: {
        id: "Data diproses atas persetujuan Anda dan kepentingan sah komunitas vihara untuk presensi, pelayanan, dan evaluasi pembinaan pemuda.",
        en: "Data is processed based on your consent and legitimate temple community interests for service records, duty rosters, and youth mentorship.",
      },
      paragraphs: {
        id: [
          "Berdasarkan Pasal 20 UU PDP, pemrosesan Data Pribadi dilakukan atas dasar persetujuan eksplisit Anda serta pemenuhan kepentingan sah komunitas keagamaan Vihara Tri Maha Dharma untuk tujuan-tujuan berikut:",
        ],
        en: [
          "In accordance with Article 20 of UU PDP, data processing is carried out upon your explicit consent and the legitimate fellowship interests of Vihara Tri Maha Dharma for the following purposes:",
        ],
      },
      bulletPoints: {
        id: [
          "Memverifikasi identitas dan keabsahan keanggotaan pemuda di lingkungan Vihara Tri Maha Dharma.",
          "Mencatat, mengelola, dan memvalidasi presensi kegiatan vihara secara cepat dan akurat melalui pemindaian QR Code.",
          "Menghitung poin gamifikasi, streak kehadiran mingguan, serta menampilkan papan peringkat komunitas sebagai sarana apresiasi dan motivasi positif.",
          "Mengkoordinasikan jadwal tugas kebaktian (chantiing, usher, panitia) dan komunikasi kegiatan pembinaan pemuda vihara.",
          "Menyediakan data statistik agregat tanpa menampilkan identitas sensitif guna membantu Pengurus dan Romo Pembina mengevaluasi program pembinaan generasi muda.",
          "Menjaga keamanan akun dan mencegah kecurangan presensi maupun penyalahgunaan sistem.",
        ],
        en: [
          "Verifying member identity and active membership status within Vihara Tri Maha Dharma.",
          "Recording, managing, and validating attendance at temple services and retreats rapidly via QR Code scanning.",
          "Calculating gamification points, weekly attendance streaks, and maintaining community leaderboards for positive youth fellowship recognition.",
          "Organizing liturgical service rosters, committee assignments, and youth fellowship communications.",
          "Supplying aggregated statistical insights (free of individual sensitive data) to help temple mentors and youth advisors evaluate youth engagement programs.",
          "Maintaining platform integrity and preventing attendance fraud or unauthorized access.",
        ],
      },
    },
    {
      id: "larangan-penjualan",
      number: 4,
      title: {
        id: "4. Larangan Penjualan Data & Pembatasan Akses",
        en: "4. Prohibition of Data Sale & Access Restrictions",
      },
      summary: {
        id: "Kami tidak pernah menjual data pribadi Anda. Akses dibatasi secara ketat berdasarkan peran internal (RBAC).",
        en: "We never sell your personal data. Access is strictly governed by internal Role-Based Access Control (RBAC).",
      },
      paragraphs: {
        id: [
          "Kami menjunjung tinggi amanah komunitas. Kami tidak pernah dan tidak akan pernah menjual, menyewakan, memperdagangkan, atau memonetisasi Data Pribadi Anda kepada pihak ketiga, perusahaan periklanan, atau perantara data komersial mana pun.",
          "Akses ke data anggota dibatasi secara ketat menggunakan sistem Role-Based Access Control (RBAC) dengan tingkatan peran: Umat/Member, Aktivis, Pengurus/Organizer, dan Admin. Setiap tingkatan hanya berhak melihat data yang relevan dengan tugas pelayanannya.",
          "Data pribadi Anda hanya dapat dibagikan kepada pihak berwenang apabila diwajibkan secara tegas oleh hukum Republik Indonesia atau melalui penetapan resmi pengadilan.",
        ],
        en: [
          "We hold our community trust sacred. We never sell, rent, trade, lease, or monetize your Personal Data to any third party, commercial advertiser, or data broker.",
          "Access to member data is strictly controlled through Role-Based Access Control (RBAC) across authorized tiers: Member, Activist, Organizer, and Admin. Each tier can access only the minimal data required for their specific community duties.",
          "Your personal data is disclosed to outside entities only when strictly required by Indonesian legislation or under official judicial subpoena.",
        ],
      },
    },
    {
      id: "keamanan-data",
      number: 5,
      title: {
        id: "5. Keamanan & Perlindungan Teknis Data",
        en: "5. Technical Data Security & Safeguards",
      },
      summary: {
        id: "Kami menggunakan enkripsi kata sandi modern (bcrypt/Argon2id), koneksi HTTPS/TLS, dan proteksi sesi JWT.",
        en: "We employ modern password hashing (bcrypt/Argon2id), HTTPS/TLS encryption, and secure JWT session controls.",
      },
      paragraphs: {
        id: [
          "Kami menerapkan langkah-langkah teknis dan organisasional yang kuat untuk melindungi Data Pribadi dari kehilangan, akses tanpa hak, pengubahan, atau pengungkapan ilegal:",
        ],
        en: [
          "We implement industry-standard technical and organizational measures to safeguard Personal Data against accidental loss, unauthorized access, alteration, or unlawful disclosure:",
        ],
      },
      bulletPoints: {
        id: [
          "Enkripsi Kata Sandi: Kata sandi akun Anda dienkripsi satu arah menggunakan algoritma hashing modern (bcrypt/Argon2id) dengan salt acak unik. Kata sandi Anda tidak dapat dibaca oleh siapa pun, termasuk pengurus dan tim teknis vihara.",
          "Enkripsi Komunikasi (HTTPS): Seluruh pertukaran data antara perangkat Anda dan server Sekkha dilindungi enkripsi SSL/TLS tingkat tinggi.",
          "Otentikasi & Sesi Aman: Penggunaan token JWT berumur pendek dengan rotasi refresh token yang disimpan secara aman dalam cookie HttpOnly.",
          "Verifikasi OTP: Pendaftaran akun dan pemulihan kata sandi dilindungi verifikasi kode OTP 6-digit via email dengan masa kedaluwarsa 10 menit dan pembatasan laju percobaan (rate limiting).",
        ],
        en: [
          "Password Hashing: Account credentials are cryptographically protected using modern one-way hashing algorithms (bcrypt/Argon2id) with unique salts. Passwords cannot be decrypted or viewed by anyone, including administrators.",
          "Encrypted Transit (HTTPS): All communications between client browsers and Sekkha servers are secured via high-grade SSL/TLS transport encryption.",
          "Secure Session Management: Short-lived JWT authentication tokens paired with rotated refresh tokens stored in secure HttpOnly cookies.",
          "OTP Verification Safeguards: Account registration and password reset workflows require a 6-digit email OTP valid for 10 minutes with strict rate limiting against brute-force attacks.",
        ],
      },
    },
    {
      id: "hak-subjek-data",
      number: 6,
      title: {
        id: "6. Hak-Hak Anda sebagai Subjek Data Pribadi",
        en: "6. Your Rights as a Data Subject (UU PDP)",
      },
      summary: {
        id: "Anda berhak mengakses, memperbaiki, menghapus data, dan menarik persetujuan sesuai ketentuan Bab IV UU PDP.",
        en: "You have the right to access, rectify, delete data, and withdraw consent under Chapter IV of UU PDP.",
      },
      paragraphs: {
        id: [
          "Sesuai ketentuan Bab IV UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi, sebagai Subjek Data Pribadi Anda memiliki hak-hak yang dijamin oleh hukum:",
        ],
        en: [
          "Pursuant to Chapter IV of Indonesian Law No. 27 of 2022 on Personal Data Protection, you hold the following statutory rights:",
        ],
      },
      bulletPoints: {
        id: [
          "Hak Mendapatkan Informasi & Akses (Pasal 5): Melihat data profil pribadi Anda secara transparan kapan pun melalui menu Pengaturan Profil.",
          "Hak Koreksi & Pembaruan (Pasal 6): Memperbaiki informasi profil yang tidak akurat, tidak lengkap, atau ketinggalan zaman secara mandiri.",
          "Hak Pengakhiran Pemrosesan & Penghapusan (Pasal 8 & 9): Mengajukan permintaan penonaktifan akun atau penghapusan data identitas pribadi jika Anda tidak lagi aktif di komunitas vihara.",
          "Hak Menarik Persetujuan (Pasal 7): Menarik kembali izin pemrosesan data tertentu dengan menyampaikan pemberitahuan tertulis kepada pengurus.",
          "Hak Portabilitas Data (Pasal 13): Meminta salinan data partisipasi dan poin yang tersimpan dalam format terstruktur yang lazim digunakan.",
        ],
        en: [
          "Right of Access & Transparency (Article 5): Inspect your personal profile records at any time via Profile Settings.",
          "Right to Rectification (Article 6): Update or correct any inaccurate, incomplete, or outdated personal information independently.",
          "Right to Erasure & Deletion (Articles 8 & 9): Request account deactivation or deletion of personal identifying data if you no longer wish to participate in the community.",
          "Right to Withdraw Consent (Article 7): Withdraw processing consent at any time upon formal written notice to administrators.",
          "Right to Data Portability (Article 13): Request a structured digital export copy of your event participation history and points.",
        ],
      },
    },
    {
      id: "retensi-data",
      number: 7,
      title: {
        id: "7. Masa Retensi & Penghapusan Data",
        en: "7. Data Retention & Permanent Disposal",
      },
      summary: {
        id: "Data disimpan selama akun aktif. Akun tidak aktif lebih dari 3 tahun dapat dianonimkan demi privasi.",
        en: "Data is retained while membership is active. Inactive accounts exceeding 3 years may be anonymized.",
      },
      paragraphs: {
        id: [
          "Data Pribadi Anda disimpan selama akun Anda aktif sebagai anggota komunitas pemuda Vihara Tri Maha Dharma.",
          "Apabila Anda mengajukan permohonan penutupan akun, atau jika akun tidak aktif selama lebih dari 3 (tiga) tahun kalender berturut-turut, seluruh data identitas langsung (nama lengkap, kontak telepon, email) akan dihapus atau dianonimkan secara permanen dari basis data utama.",
          "Data statistik kehadiran agregat masa lalu dapat tetap disimpan tanpa identitas pribadi untuk kepentingan arsip sejarah dan laporan tahunan vihara.",
        ],
        en: [
          "Your Personal Data is maintained throughout your active membership period in the youth community of Vihara Tri Maha Dharma.",
          "Upon an approved account closure request or sustained inactivity exceeding 3 consecutive calendar years, direct identifying markers (full name, phone, email) will be deleted or permanently anonymized from active operational databases.",
          "Aggregated historical attendance figures may be retained without personal identifiers for historical community archives and annual temple reporting.",
        ],
      },
    },
    {
      id: "perlindungan-anak",
      number: 8,
      title: {
        id: "8. Perlindungan Data Anggota Remaja & Anak",
        en: "8. Minor & Youth Data Protection",
      },
      summary: {
        id: "Anggota di bawah 18 tahun didampingi pengurus dan orang tua/wali sesuai Pasal 25 UU PDP.",
        en: "Members under 18 years old are guided by temple mentors and parents/guardians under Article 25 of UU PDP.",
      },
      paragraphs: {
        id: [
          "Sesuai ketentuan Pasal 25 UU PDP mengenai Perlindungan Data Pribadi Anak, anggota yang berusia di bawah 18 (delapan belas) tahun diwajibkan mendaftar dengan sepengetahuan dan persetujuan orang tua atau wali, serta mendapatkan pembinaan langsung dari Pengurus dan Romo Pembina Pemuda Vihara Tri Maha Dharma.",
          "Kami tidak menampilkan data kontak pribadi anak/remaja kepada publik secara terbuka. Lingkungan komunitas digital Sekkha dikurasi untuk menjadi ruang yang aman, beradab, berlandaskan nilai-nilai luhur Dhamma, dan bebas dari perundungan (anti-bullying).",
        ],
        en: [
          "Pursuant to Article 25 of UU PDP regarding Child Personal Data Protection, youth members under 18 years of age are expected to register with parental or guardian awareness, under the pastoral guidance of Vihara Tri Maha Dharma youth mentors.",
          "Direct contact details of minor members are never displayed publicly. The digital community space within Sekkha is curated to be safe, respectful, Dhamma-centered, and strictly intolerant of cyberbullying.",
        ],
      },
    },
    {
      id: "perubahan-kebijakan",
      number: 9,
      title: {
        id: "9. Perubahan Kebijakan Privasi",
        en: "9. Privacy Policy Amendments",
      },
      summary: {
        id: "Pembaruan kebijakan akan diumumkan melalui aplikasi dengan pembaruan tanggal revisi.",
        en: "Policy updates will be announced in-app with an updated revision date.",
      },
      paragraphs: {
        id: [
          "Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu untuk menyesuaikan dengan perubahan operasional kegiatan vihara, peningkatan fitur teknologi, atau penyesuaian terhadap peraturan perundang-undangan baru di Indonesia.",
          'Setiap perubahan substansial akan diberitahukan kepada anggota melalui pengumuman di aplikasi atau situs web Sekkha, disertai tanggal "Terakhir Diperbarui" pada bagian pembuka dokumen ini.',
        ],
        en: [
          "We may periodically revise this Privacy Policy to reflect evolving temple youth operations, technological enhancements, or statutory amendments under Indonesian law.",
          'Material revisions will be communicated through in-app notices or the Sekkha website, highlighted by an updated "Last Updated" timestamp at the beginning of this document.',
        ],
      },
    },
    {
      id: "kontak-pengendali",
      number: 10,
      title: {
        id: "10. Kontak Pengendali Data & Layanan Pengaduan",
        en: "10. Data Controller Contact & Inquiries",
      },
      summary: {
        id: "Hubungi sekretariat pemuda di privacy@sekkha.local untuk pertanyaan atau permohonan hak data.",
        en: "Contact our youth secretariat at privacy@sekkha.local for questions or data subject requests.",
      },
      paragraphs: {
        id: [
          "Apabila Anda memiliki pertanyaan, klarifikasi, saran, atau ingin mengajukan permohonan terkait hak-hak Data Pribadi Anda, silakan hubungi kami:",
        ],
        en: [
          "If you have inquiries, clarifications, feedback, or wish to exercise your data subject rights, please contact our team:",
        ],
      },
      bulletPoints: {
        id: [
          "Pengendali Data Pribadi: Pengurus Pemuda Vihara Tri Maha Dharma (Tim Pengembang Sekkha Apps)",
          "Email Kontak: privacy@sekkha.local / sekretariat@sekkha.local",
          "Lokasi Fisik: Sekretariat Pemuda & Remaja Vihara Tri Maha Dharma",
          "Waktu Operasional: Setiap hari Minggu saat kebaktian pemuda berlangsung",
        ],
        en: [
          "Data Controller: Youth Committee of Vihara Tri Maha Dharma (Sekkha Development Team)",
          "Contact Email: privacy@sekkha.local / sekretariat@sekkha.local",
          "Physical Office: Youth Community Secretariat, Vihara Tri Maha Dharma",
          "Service Hours: Every Sunday during youth fellowship services",
        ],
      },
    },
  ],
}
