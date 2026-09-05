import React, { useState, useRef, useEffect } from "react"
import { ShieldCheckIcon, CheckCircle2Icon, ArrowDownIcon } from "lucide-react"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button } from "@/components/ui/button"

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  onAgree: () => void
}

export function PrivacyPolicyModal({
  isOpen,
  onClose,
  onAgree,
}: PrivacyPolicyModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // Check if content is scrollable or already at bottom upon opening
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false)
      // Slight timeout to let DOM layout settle
      const timer = setTimeout(() => {
        const el = scrollContainerRef.current
        if (el) {
          // If content does not overflow, enable immediately
          if (el.scrollHeight <= el.clientHeight + 10) {
            setHasScrolledToBottom(true)
          }
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    // Tolerance of 25px for cross-browser subpixel calculations
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 25
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true)
    }
  }

  function handleAccept() {
    if (!hasScrolledToBottom) return
    onAgree()
    onClose()
  }

  return (
    <ResponsiveFormModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Kebijakan Privasi Sekkha Apps"
      description="Harap baca kebijakan privasi kami hingga selesai untuk melanjutkan pendaftaran."
    >
      <div className="flex flex-col gap-4 font-sans text-left">
        {/* Policy Content Scrollable Box */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Isi Kebijakan Privasi"
          className="h-[360px] sm:h-[400px] overflow-y-auto rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 text-xs text-[#3a3a3a] leading-relaxed space-y-4 shadow-inner focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]"
        >
          <div className="flex items-center gap-2 p-2.5 rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] text-[#0a0a0a]">
            <ShieldCheckIcon className="size-5 shrink-0 text-[#1a3a3a]" />
            <span className="font-semibold text-xs">
              Terakhir diperbarui: 1 September 2026
            </span>
          </div>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-[#0a0a0a]">1. Pendahuluan</h4>
            <p>
              Selamat datang di <strong>Sekkha Apps</strong>, platform komunitas remaja vihara yang mendukung pemantauan keaktifan, presensi kegiatan, dan sistem gamifikasi. Privasi Anda adalah prioritas utama kami. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda saat menggunakan aplikasi Sekkha.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-[#0a0a0a]">2. Data yang Kami Kumpulkan</h4>
            <p>Untuk memberikan pengalaman komunitas yang aman dan terorganisir, kami mengumpulkan beberapa data berikut:</p>
            <ul className="list-disc pl-5 space-y-1 text-[#3a3a3a]">
              <li><strong>Data Akun & Identitas:</strong> Nama lengkap, alamat email, nomor telepon/WhatsApp, asal sekolah atau universitas, tanggal lahir, jenis kelamin, serta username akun Anda.</li>
              <li><strong>Nomor Anggota & QR Code:</strong> Nomor ID Anggota unik yang dibuat otomatis untuk presensi dan verifikasi kegiatan vihara.</li>
              <li><strong>Data Kehadiran & Partisipasi:</strong> Riwayat presensi acara, jam kehadiran, peran petugas (Puja, Paritta, Panitia, dsb.), dan catatan poin/lencana gamifikasi.</li>
              <li><strong>Data Aktivitas Komunitas:</strong> Kontribusi pada forum diskusi, postingan publik, dan tiket curhat privat kepada pengurus vihara.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-[#0a0a0a]">3. Tujuan Penggunaan Data</h4>
            <p>Data yang dikumpulkan hanya digunakan untuk kepentingan internal komunitas vihara, antara lain:</p>
            <ul className="list-disc pl-5 space-y-1 text-[#3a3a3a]">
              <li>Memverifikasi identitas anggota komunitas vihara.</li>
              <li>Mencatat dan memantau presensi kegiatan rutin serta acara khusus.</li>
              <li>Menghitung perolehan poin gamifikasi, streak kehadiran, lencana prestasi, dan peringkat leaderboard komunitas.</li>
              <li>Memberikan notifikasi pengingat acara, jadwal kebaktian, dan pembaruan penting dari pengurus.</li>
              <li>Menyediakan analisis keaktifan agregat untuk membantu pengurus vihara mendampingi anggota komunitas.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-[#0a0a0a]">4. Keamanan & Kerahasiaan Data</h4>
            <p>
              Kami menerapkan standar keamanan enkripsi modern (termasuk hashing kata sandi dengan bcrypt dan token JWT terotentikasi). Kata sandi Anda tersimpan dalam bentuk terenkripsi dan tidak dapat dilihat oleh siapa pun, termasuk pengurus vihara. Kami <strong>tidak akan pernah menjual atau menyewakan</strong> data pribadi Anda kepada pihak ketiga mana pun.
            </p>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-[#0a0a0a]">5. Hak dan Kontrol Pengguna</h4>
            <p>Sebagai anggota, Anda memiliki hak penuh untuk:</p>
            <ul className="list-disc pl-5 space-y-1 text-[#3a3a3a]">
              <li>Melihat dan memperbarui informasi profil Anda melalui menu Pengaturan Profil.</li>
              <li>Mengubah kata sandi akun kapan saja secara mandiri.</li>
              <li>Menghubungi administrator atau pengurus vihara untuk mengajukan permohonan penonaktifan akun atau koreksi data keanggotaan.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="font-bold text-sm text-[#0a0a0a]">6. Persetujuan</h4>
            <p>
              Dengan mencentang kotak persetujuan dan mengklik tombol <em>"Saya Mengerti & Setujui"</em>, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui seluruh ketentuan Kebijakan Privasi Sekkha Apps.
            </p>
          </section>

          <div className="p-3 rounded-[12px] bg-[#f5f0e0] border border-[#ebe6d6] text-center font-medium text-xs text-[#0a0a0a]">
            — Akhir dari Kebijakan Privasi Sekkha Apps —
          </div>
        </div>

        {/* Scroll Progress / Status Notice */}
        <div className="flex items-center justify-between gap-2 px-1">
          {hasScrolledToBottom ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#22c55e]">
              <CheckCircle2Icon className="size-4" />
              <span>Anda telah membaca seluruh kebijakan privasi.</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#6a6a6a]">
              <ArrowDownIcon className="size-3.5 animate-bounce text-[#0a0a0a]" />
              <span>Gulir ke bawah hingga akhir untuk mengaktifkan persetujuan.</span>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e5e5e5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 px-4 rounded-[12px] text-xs font-semibold text-[#6a6a6a] hover:text-[#0a0a0a] cursor-pointer"
          >
            Batal
          </Button>

          <Button
            type="button"
            disabled={!hasScrolledToBottom}
            onClick={handleAccept}
            className="h-10 px-5 rounded-[12px] bg-[#0a0a0a] text-white text-xs font-semibold hover:bg-[#1f1f1f] shadow-xs active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1.5"
          >
            <CheckCircle2Icon className="size-3.5" />
            <span>Saya Mengerti & Setujui</span>
          </Button>
        </div>
      </div>
    </ResponsiveFormModal>
  )
}
