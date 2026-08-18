# Requirements Document

## Introduction

Fitur ini mendefinisikan **Landing Page** untuk Sekkha — halaman publik di route `/` yang menjadi titik masuk utama bagi pengunjung yang belum terautentikasi. Tujuan halaman ini adalah menyampaikan value proposition Sekkha secara jelas, menampilkan fitur-fitur unggulan dengan visual menarik, membangun kepercayaan melalui social proof, dan mengarahkan pengunjung untuk mendaftar atau masuk ke aplikasi.

Secara teknis, Landing_Page dibangun sebagai TanStack Router index route (`/`), menggunakan komponen dari layer `features/landing-page/`, `src/components/common/`, dan `src/components/base/`. Halaman ini tidak menggunakan komponen sidebar (sidebar hanya dipakai pada halaman authenticated). Layout mengikuti struktur marketing page dari Design_System: 1280px max-width, 32px gutters, dan section spacing yang lebar.

---

## Glossary

- **Landing_Page**: Halaman publik di route `/` yang ditampilkan kepada semua pengunjung, termasuk yang belum terautentikasi.
- **Navbar**: Komponen navigasi horizontal fixed/sticky di bagian atas Landing_Page, berisi logo, navigation links, dan CTA buttons.
- **Hero_Section**: Area utama di bagian atas Landing_Page yang berisi headline, subheadline, dan primary/secondary CTA buttons.
- **Feature_Section**: Section yang menampilkan fitur-fitur utama Sekkha menggunakan Feature_Card dalam grid layout.
- **Feature_Card**: Kartu konten individual dengan border radius `rounded.xxxl` (28px) dan background pastel dari token `card-feature-yellow`, `card-feature-coral`, `card-feature-teal`, atau `card-feature-rose`.
- **Stats_Section**: Section yang menampilkan angka-angka key metrics Sekkha menggunakan typography `stat-display`.
- **CTA_Banner**: Section promosi dengan background gelap (`{colors.primary}`) yang mendorong pengunjung untuk sign up.
- **Footer**: Area paling bawah Landing_Page berisi kolom link navigasi sekunder dan informasi copyright.
- **Auth_State**: Status autentikasi pengunjung — `unauthenticated` (belum login) atau `authenticated` (sudah login).
- **Router**: Instance TanStack Router yang mengatur navigasi antar halaman, dikonfigurasi di `src/router.tsx`.
- **Design_System**: Kumpulan token desain yang terdefinisi di `DESIGN.md`, mencakup color tokens, typography tokens, spacing tokens, dan component tokens.
- **Viewport_Desktop**: Lebar layar ≥ 1024px.
- **Viewport_Tablet**: Lebar layar antara 768px dan 1023px (inklusif).
- **Viewport_Mobile**: Lebar layar < 768px.

---

## Requirements

### Requirement 1: Routing dan Render Kondisi Auth

**User Story:** Sebagai pengunjung, saya ingin halaman utama Sekkha dapat diakses tanpa harus login terlebih dahulu, sehingga saya bisa mempelajari produk sebelum memutuskan untuk mendaftar.

#### Acceptance Criteria

1. THE Landing_Page SHALL dirender pada route `/` (index route) di Router sebagai halaman yang dapat diakses tanpa autentikasi.
2. WHEN pengunjung mengakses route `/`, THE Landing_Page SHALL menampilkan konten publik tanpa redirect kepada semua pengunjung, baik yang terautentikasi maupun yang tidak.
3. WHILE Auth_State bernilai `unauthenticated`, THE Landing_Page SHALL menampilkan seluruh konten publik tanpa memblokir atau menyembunyikan section apapun berdasarkan status autentikasi.
4. WHILE Auth_State sedang dalam proses resolusi, THE Landing_Page SHALL menampilkan skeleton loading state pada area Navbar CTA buttons yang mempertahankan lebar 120px dan tinggi 36px setiap skeleton per tombol, serta mempertahankan posisi horizontal keduanya di sisi kanan Navbar.
5. IF auth service tidak merespons dalam 3000 milliseconds sejak Landing_Page dimuat, THEN THE Landing_Page SHALL menghapus skeleton loading state dan menampilkan tombol "Get started free" dan "Log in" sebagai default fallback tanpa menunggu resolusi Auth_State lebih lanjut.
6. WHILE Auth_State bernilai `authenticated`, THE Navbar SHALL menampilkan tombol "Go to app" menggunakan component token `button-primary` sebagai pengganti tombol "Get started free" dan "Log in".

---

### Requirement 2: Navbar

**User Story:** Sebagai pengunjung, saya ingin melihat navigasi yang jelas dan mudah diakses di bagian atas halaman, sehingga saya bisa dengan cepat menavigasi ke section yang ingin saya tuju atau langsung mengambil aksi.

#### Acceptance Criteria

1. THE Navbar SHALL menampilkan logo Sekkha berupa teks di sisi kiri menggunakan typography token `heading-5` (18px / weight 500) dengan warna `{colors.ink}`.
2. THE Navbar SHALL menampilkan minimal 3 navigation links yang mengarah ke section utama Landing_Page menggunakan typography token `body-sm-medium` (14px / weight 500) dengan warna `{colors.ink}`.
3. THE Navbar SHALL menampilkan tombol "Log in" menggunakan component token `button-secondary` (background transparan, border `1px solid {colors.hairline-strong}`, rounded full) di area kanan.
4. THE Navbar SHALL menampilkan tombol "Get started free" menggunakan component token `button-primary` (background `{colors.primary}`, teks `{colors.on-primary}`, rounded full) di sisi kanan, di sebelah kanan tombol "Log in".
5. THE Navbar SHALL memiliki tinggi 64px dan properti CSS `position: sticky` dengan `top: 0` serta `z-index: 50` yang lebih tinggi dari seluruh konten halaman.
6. WHEN posisi scroll vertikal halaman bernilai lebih dari 64px (yaitu mulai dari 65px ke atas), THE Navbar SHALL menerapkan backdrop blur (`backdrop-filter: blur(12px)`) pada background-nya.
7. WHEN pengunjung melakukan scroll hingga posisi vertikal halaman melebihi 0px, THE Navbar SHALL menampilkan border bawah dengan warna `{colors.hairline}` (1px solid).
8. WHILE Landing_Page dirender pada Viewport_Mobile (lebar < 768px), THE Navbar SHALL menyembunyikan navigation links horizontal dan menampilkan hamburger menu icon (24×24px) di sisi kanan — navigation links horizontal tetap ditampilkan pada Viewport_Desktop (≥ 1024px) dan Viewport_Tablet (768px–1023px).
9. WHEN pengunjung menekan hamburger menu icon pada Viewport_Mobile, THE Navbar SHALL membuka drawer navigasi yang menampilkan semua navigation links dan kedua CTA buttons secara vertikal dengan lebar penuh layar.
10. WHEN drawer navigasi terbuka dan pengunjung menekan area di luar drawer atau menekan tombol close icon, THE Navbar SHALL menutup drawer navigasi dan mengembalikan tampilan ke kondisi hamburger menu icon terlihat.

---

### Requirement 3: Hero Section

**User Story:** Sebagai pengunjung baru, saya ingin melihat proposisi nilai Sekkha secara langsung di area paling atas halaman, sehingga dalam 5 detik pertama saya memahami apa yang ditawarkan dan terdorong untuk mengambil aksi.

#### Acceptance Criteria

1. THE Hero_Section SHALL menampilkan satu headline utama yang terpusat secara horizontal menggunakan typography token `hero-display` (80px / weight 500 / line-height 1.05 / letter-spacing -2px) dengan warna `{colors.ink}`, dengan max-width konten 800px.
2. THE Hero_Section SHALL menampilkan satu subheadline deskriptif yang terpusat di bawah headline menggunakan typography token `subtitle` (18px / weight 400 / line-height 1.50) dengan warna `{colors.slate}`, dengan max-width konten 600px.
3. THE Hero_Section SHALL menampilkan tombol "Get started free" menggunakan component token `button-primary` yang terpusat secara horizontal.
4. THE Hero_Section SHALL menampilkan tombol "See how it works" menggunakan component token `button-secondary` di sebelah kanan tombol "Get started free" dengan jarak `{spacing.xl}` (24px), keduanya terpusat secara horizontal sebagai satu grup pada Viewport_Desktop (≥ 1024px) dan Viewport_Tablet (768px–1023px).
5. THE Hero_Section SHALL menggunakan padding atas dan bawah masing-masing sebesar `{spacing.hero}` (120px).
6. THE Hero_Section SHALL menggunakan background warna `{colors.canvas}` (`#ffffff`).
7. WHILE Landing_Page dirender pada Viewport_Mobile (lebar < 768px), THE Hero_Section SHALL menampilkan headline menggunakan typography token `heading-1` (48px / weight 500 / letter-spacing -1px) sebagai pengganti `hero-display`.
8. WHILE Landing_Page dirender pada Viewport_Mobile (lebar < 768px), THE Hero_Section SHALL menampilkan kedua CTA buttons dalam layout vertikal (stacked) dengan lebar penuh container dan jarak antar tombol `{spacing.md}` (16px).

---

### Requirement 4: Feature Cards Section

**User Story:** Sebagai calon pengguna, saya ingin melihat fitur-fitur utama Sekkha ditampilkan dengan visual yang atraktif dan mudah dipahami, sehingga saya dapat mengevaluasi apakah Sekkha sesuai dengan kebutuhan saya.

#### Acceptance Criteria

1. THE Feature_Section SHALL menampilkan antara 4 dan 8 Feature_Card (inklusif) yang merepresentasikan fitur-fitur utama Sekkha.
2. THE Feature_Section SHALL menampilkan section title yang terpusat secara horizontal menggunakan typography token `heading-2` (36px / weight 500) dengan warna `{colors.ink}`.
3. THE Feature_Section SHALL menggunakan layout grid 2-kolom dengan column gap dan row gap masing-masing `{spacing.xxl}` (32px) pada Viewport_Desktop (≥ 1024px) dan Viewport_Tablet (768px–1023px), serta 1-kolom pada Viewport_Mobile (lebar < 768px), dengan max-width container 1280px.
4. EACH Feature_Card SHALL menggunakan salah satu dari empat component tokens secara berurutan: `card-feature-yellow`, `card-feature-coral`, `card-feature-teal`, `card-feature-rose` — untuk kartu ke-5 dan seterusnya, urutan diulang dari awal sehingga tidak ada dua Feature_Card yang berurutan memiliki background color yang identik.
5. EACH Feature_Card SHALL menampilkan judul fitur menggunakan typography token `heading-3` (28px / weight 500) dengan warna `{colors.ink}`.
6. EACH Feature_Card SHALL menampilkan deskripsi singkat menggunakan typography token `body-md` (16px / weight 400) dengan warna `{colors.slate}`, di mana teks yang melebihi 120 karakter dipotong dengan ellipsis (…) pada karakter ke-120, dengan ellipsis dihitung sebagai bagian dari output yang terlihat.
7. THE Feature_Section SHALL menggunakan padding vertikal `{spacing.section-lg}` (96px) pada tepi atas dan bawah section.

---

### Requirement 5: Stats Section

**User Story:** Sebagai calon pengguna yang sedang mengevaluasi Sekkha, saya ingin melihat angka-angka konkret yang menunjukkan skala dan kepercayaan terhadap produk, sehingga saya semakin yakin untuk mendaftar.

#### Acceptance Criteria

1. THE Stats_Section SHALL menampilkan antara 3 dan 5 stat items (inklusif), masing-masing terdiri dari satu nilai utama dan satu label deskriptif.
2. WHEN Stats_Section dirender, EACH stat item SHALL menampilkan nilai utama (angka dan satuan, contoh: "50K+" atau "99%") menggunakan typography token `stat-display` (64px / weight 500 / letter-spacing -1.5px) dengan warna `{colors.ink}`.
3. WHEN Stats_Section dirender, EACH stat item SHALL menampilkan label deskriptif singkat (maksimal 5 kata) menggunakan typography token `body-md` (16px / weight 400) dengan warna `{colors.slate}`.
4. WHILE Landing_Page dirender pada Viewport_Desktop (≥ 1024px) atau Viewport_Tablet (768px–1023px), THE Stats_Section SHALL menampilkan stat items dalam layout row horizontal dengan minimum gap antar stat items sebesar `{spacing.xxl}` (32px).
5. WHILE Landing_Page dirender pada Viewport_Mobile (lebar < 768px), THE Stats_Section SHALL menampilkan stat items dalam layout vertikal (stacked) yang terpusat secara horizontal dengan minimum gap vertikal antar stat items sebesar `{spacing.xxl}` (32px).
6. THE Stats_Section SHALL menggunakan background warna `{colors.surface}` (`#f7f8fa`) sebagai pembeda visual dari section lain.

---

### Requirement 6: CTA Banner Section

**User Story:** Sebagai pengunjung yang telah membaca konten halaman, saya ingin melihat ajakan yang jelas dan menarik untuk mulai menggunakan Sekkha, sehingga saya mudah mengambil langkah selanjutnya tanpa harus kembali ke bagian atas halaman.

#### Acceptance Criteria

1. THE CTA_Banner SHALL menggunakan background warna dan teks sesuai component token `cta-banner-dark` (background `{colors.primary}`, teks `{colors.on-primary}`).
2. THE CTA_Banner SHALL menampilkan satu heading yang terpusat secara horizontal menggunakan typography token `heading-1` (48px / weight 500 / line-height 1.15 / letter-spacing -1px) dengan warna `{colors.on-primary}`.
3. THE CTA_Banner SHALL memiliki teks heading yang tidak melebihi 80 karakter termasuk spasi.
4. THE CTA_Banner SHALL menampilkan tombol "Get started free" menggunakan component token `button-on-dark` (background `{colors.on-dark}`, teks `{colors.primary}`, rounded full) yang terpusat pada sumbu horizontal container CTA_Banner, sejajar dengan heading.
5. WHEN pengunjung mengklik tombol "Get started free" pada CTA_Banner, THE Router SHALL menavigasi pengunjung ke route `/sign-up`.
6. IF route `/sign-up` tidak tersedia saat tombol "Get started free" pada CTA_Banner diklik, THEN THE Landing_Page SHALL menampilkan pesan error toast yang memberitahu pengunjung bahwa halaman registrasi tidak tersedia saat ini.
7. THE CTA_Banner SHALL menggunakan border radius `{rounded.feature}` (32px) pada keseluruhan container.
8. THE CTA_Banner SHALL menggunakan padding vertikal dan horizontal masing-masing sebesar `{spacing.section}` (64px).

---

### Requirement 7: Footer

**User Story:** Sebagai pengunjung, saya ingin menemukan link navigasi sekunder dan informasi legal di bagian bawah halaman, sehingga saya dapat dengan mudah mengakses halaman pendukung seperti kebijakan privasi, tentang kami, atau kontak.

#### Acceptance Criteria

1. THE Footer SHALL menggunakan background warna `{colors.footer-bg}` (`#1c1c1e`) dan teks warna `{colors.on-dark}` (`#ffffff`) sesuai component token `footer-region`.
2. THE Footer SHALL menampilkan logo Sekkha berupa teks di area kiri atas footer menggunakan typography token `heading-5` (18px / weight 500) dengan warna `{colors.on-dark}`.
3. THE Footer SHALL menampilkan minimal 2 kolom link navigasi sekunder, di mana setiap kolom memiliki heading kolom menggunakan typography token `body-md-medium` (16px / weight 500) dengan warna `{colors.on-dark}`.
4. EACH footer link SHALL menggunakan typography token `footer-link` (body-sm / 14px / weight 400) dengan warna `{colors.on-dark-muted}`.
5. THE Footer SHALL menampilkan teks copyright (format: "© [tahun] Sekkha. All rights reserved.") menggunakan typography token `micro` (12px / weight 500) dengan warna `{colors.on-dark-muted}` di area bawah footer.
6. THE Footer SHALL menggunakan padding vertikal `{spacing.section}` (64px) dan padding horizontal `{spacing.xxl}` (32px) sesuai component token `footer-region`.
7. WHILE Landing_Page dirender pada Viewport_Mobile (lebar < 768px), THE Footer SHALL menampilkan kolom-kolom link dalam layout vertikal (stacked) dengan setiap kolom ditampilkan penuh secara horizontal dan jarak antar kolom `{spacing.xxl}` (32px) — pada Viewport_Desktop (≥ 1024px) dan Viewport_Tablet (768px–1023px), layout kolom horizontal dipertahankan.

---

### Requirement 8: Responsivitas dan Layout

**User Story:** Sebagai pengguna mobile, saya ingin Landing_Page terlihat baik dan berfungsi dengan benar di berbagai ukuran layar, sehingga pengalaman saya tidak terganggu oleh layout yang rusak atau konten yang terpotong.

#### Acceptance Criteria

1. WHILE Landing_Page dirender pada Viewport_Desktop (≥ 1024px) atau Viewport_Tablet (768px–1023px), THE Landing_Page SHALL menggunakan container utama dengan max-width 1280px, `width: 100%`, `margin: 0 auto`, dan horizontal padding 32px.
2. WHILE Landing_Page dirender pada Viewport_Mobile (lebar < 768px), THE Landing_Page SHALL menggunakan container utama dengan `width: 100%` dan horizontal padding 16px.
3. THE Landing_Page SHALL tidak menghasilkan horizontal scrollbar pada viewport width 320px, 768px, 1024px, dan 1280px.
4. WHILE Landing_Page dirender pada Viewport_Mobile (lebar < 768px), THE Landing_Page SHALL menampilkan semua section utama (Navbar, Hero_Section, Feature_Section, Stats_Section, CTA_Banner, Footer) dalam layout single-column sehingga tidak ada dua section sibling yang berbagi baris horizontal yang sama.
5. EACH elemen `<img>`, `<video>`, dan `<iframe>` dalam Landing_Page SHALL memiliki properti CSS `max-width: 100%` yang mencegah elemen tersebut overflow keluar dari container-nya pada semua breakpoint.

---

### Requirement 9: Aksesibilitas

**User Story:** Sebagai pengguna dengan kebutuhan aksesibilitas, saya ingin dapat menavigasi dan menggunakan Landing_Page menggunakan keyboard dan screen reader, sehingga pengalaman saya setara dengan pengguna tanpa keterbatasan aksesibilitas.

#### Acceptance Criteria

1. THE Landing_Page SHALL menggunakan elemen HTML semantik: `<header>` untuk Navbar, `<main>` untuk konten utama, dan `<footer>` untuk Footer.
2. THE Landing_Page SHALL memiliki satu elemen `<h1>` yang merepresentasikan headline utama Hero_Section, dengan heading hierarchy yang berurutan (`<h1>`, `<h2>`, `<h3>`) tanpa melewati level.
3. IF teks tombol atau link tidak secara eksplisit mendeskripsikan aksinya dalam konteks, THEN THE tombol atau link tersebut SHALL memiliki atribut `aria-label` yang mendeskripsikan aksi secara ringkas dengan panjang maksimal 80 karakter dalam bahasa yang sama dengan konten halaman.
4. WHEN elemen interaktif (tombol, link, input) menerima fokus keyboard, THE elemen tersebut SHALL menampilkan indikator fokus berupa outline atau ring yang memiliki rasio kontras minimum 3:1 terhadap warna di sekitarnya sesuai WCAG 2.1 AA, dengan area indikator fokus mencakup minimum perimeter elemen dengan offset 2px.
5. WHEN pengunjung menekan tombol Enter atau Space pada tombol yang sedang menerima fokus keyboard, THE tombol tersebut SHALL mengeksekusi aksi yang sama seperti ketika diklik dengan pointer.
6. THE Landing_Page SHALL dapat dinavigasi menggunakan Tab key dari elemen interaktif pertama hingga elemen interaktif terakhir tanpa ada elemen interaktif yang terlewat dari natural tab order.
7. IF gambar bersifat dekoratif, tidak menyampaikan informasi konten, atau tidak merupakan konten informatif, THEN THE gambar tersebut SHALL memiliki atribut `alt=""`. IF gambar menyampaikan informasi, THEN THE gambar tersebut SHALL memiliki atribut `alt` yang mendeskripsikan konten gambar tersebut.
8. THE Landing_Page SHALL memiliki rasio kontras warna minimum 4.5:1 antara teks body dan background di belakangnya untuk semua kombinasi warna teks-background yang digunakan (kecuali teks besar ≥ 18pt regular atau ≥ 14pt bold yang menggunakan minimum 3:1) sesuai WCAG 2.1 Level AA.

---

### Requirement 10: Performa

**User Story:** Sebagai pengunjung, saya ingin Landing_Page dimuat dengan cepat bahkan pada koneksi yang tidak ideal, sehingga saya tidak kehilangan minat sebelum melihat konten.

#### Acceptance Criteria

1. WHEN Landing_Page dimuat pada koneksi jaringan yang disimulasikan sebagai Slow 3G (throughput 750 kbps downstream, RTT 300ms), THE Landing_Page SHALL mencapai Largest Contentful Paint (LCP) untuk konten Hero_Section dan Navbar dalam waktu kurang dari 3000 milliseconds sejak navigation dimulai.
2. WHEN gambar berada dalam jarak 1 viewport height dari area yang terlihat, THE Landing_Page SHALL mulai mengunduh gambar tersebut — gambar yang berada di luar jarak tersebut tidak difetch hingga pengunjung melakukan scroll mendekatinya (implementasi via `loading="lazy"` pada elemen `<img>` atau Intersection Observer).
3. THE Landing_Page SHALL tidak memuat kode JavaScript atau CSS dari komponen sidebar (`app-sidebar.tsx`, `nav-main.tsx`, `nav-user.tsx`, `nav-projects.tsx`, `team-switcher.tsx`) sebagai bagian dari initial page load bundle yang dapat diverifikasi melalui Network tab di browser DevTools.
4. THE Landing_Page SHALL menggunakan font Roobert PRO dengan strategi preload (`<link rel="preload">`) untuk file font yang digunakan pada Hero_Section sehingga FOUT (Flash of Unstyled Text) pada area hero tidak terjadi lebih dari 100ms setelah LCP.
