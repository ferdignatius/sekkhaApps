import { useEffect, useState, useMemo } from "react"
import {
  UsersIcon,
  MailIcon,
  PlusIcon,
  SearchIcon,
  UserPlusIcon,
  ClockIcon,
  QrCodeIcon,
  Edit2Icon,
  Trash2Icon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  PrinterIcon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
  KeyIcon,
  Share2Icon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { useDebounce } from "@/hooks/useDebounce"
import { SkeletonCard, SkeletonTableRow } from "@/components/ui/skeleton"
import { teamsApi } from "../api/teamsApi"
import type { MemberDto, InvitationDto, CreateMemberPayload, UpdateMemberPayload } from "../api/teamsApi"

export function TeamsPage() {
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "pengurus" || authState.role === "admin")
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [members, setMembers] = useState<MemberDto[]>([])
  const [invitations, setInvitations] = useState<InvitationDto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberDto | null>(null)
  const [deletingMember, setDeletingMember] = useState<MemberDto | null>(null)
  const [qrMember, setQrMember] = useState<MemberDto | null>(null)
  const [credentialModalData, setCredentialModalData] = useState<{
    memberName: string
    username: string
    defaultPassword: string
    userNumber?: string
    phone?: string | null
  } | null>(null)

  // Form states
  const [createForm, setCreateForm] = useState<CreateMemberPayload>({
    name: "",
    username: "",
    email: "",
    phone: "",
    school: "",
    birth_date: "",
    gender: "L",
    role: "umat",
  })
  const [updateForm, setUpdateForm] = useState<UpdateMemberPayload>({})
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"pengurus" | "aktivis">("aktivis")
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  async function loadData() {
    try {
      setLoading(true)
      const [membersData, invitationsData] = await Promise.all([
        teamsApi.listMembers(),
        isPengurusOrAdmin ? teamsApi.listInvitations().catch(() => []) : Promise.resolve([]),
      ])
      setMembers(membersData)
      setInvitations(invitationsData)
    } catch (err) {
      console.error("Gagal memuat data People:", err)
      showToast("Gagal memuat data pengguna", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle Create Member with auto-generated credentials
  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.name.trim()) return

    try {
      setSubmitting(true)
      const created = await teamsApi.createMember({
        ...createForm,
        name: createForm.name.trim(),
        username: createForm.username?.trim() || undefined,
        email: createForm.email?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
        school: createForm.school?.trim() || undefined,
        birth_date: createForm.birth_date || undefined,
      })
      showToast(`Berhasil mendaftarkan umat "${created.name}" (Username: @${created.username || "-"})`)
      setShowCreateModal(false)
      setCreateForm({
        name: "",
        username: "",
        email: "",
        phone: "",
        school: "",
        birth_date: "",
        gender: "L",
        role: "umat",
      })
      await loadData()
      // Open credentials modal so Pengurus can copy username & password or share to WA
      setCredentialModalData({
        memberName: created.name,
        username: created.username || "-",
        defaultPassword: created.default_password || "sekkha123",
        userNumber: created.user_number || undefined,
        phone: created.phone,
      })
    } catch (err: any) {
      showToast(err.message || "Gagal menambahkan anggota", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Reset Member Password
  async function handleResetPassword(m: MemberDto) {
    if (!confirm(`Reset password untuk "${m.name}" (@${m.username || "umat"}) ke password default (sekkha123)?`)) return
    try {
      const res = await teamsApi.resetMemberPassword(m.id)
      setCredentialModalData({
        memberName: res.name,
        username: res.username || "-",
        defaultPassword: res.default_password,
        userNumber: res.user_number,
        phone: m.phone,
      })
      showToast(res.message)
    } catch (err: any) {
      showToast(err.message || "Gagal reset password", "error")
    }
  }

  // Handle Update Member Role
  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember) return

    try {
      setSubmitting(true)
      await teamsApi.updateMember(editingMember.id, { role: updateForm.role })
      showToast(`Peran "${editingMember.name}" berhasil diubah menjadi ${updateForm.role?.toUpperCase()}`)
      setEditingMember(null)
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah peran anggota", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Member
  async function handleDeleteMember() {
    if (!deletingMember) return

    try {
      setSubmitting(true)
      await teamsApi.deleteMember(deletingMember.id)
      showToast(`Anggota "${deletingMember.name}" berhasil dihapus`)
      setDeletingMember(null)
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus anggota", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Send Invitation (Admin only)
  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      setSubmitting(true)
      await teamsApi.sendInvitation({ email: inviteEmail.trim(), role: inviteRole })
      showToast(`Undangan sukses dikirim ke ${inviteEmail.trim()}`)
      setInviteEmail("")
      setShowInviteModal(false)
      const invData = await teamsApi.listInvitations()
      setInvitations(invData)
    } catch (err: any) {
      showToast(err.message || "Gagal mengirim undangan", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Copy helper
  function handleCopy(text?: string | null) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
    showToast("Berhasil disalin ke clipboard!")
  }

  // Stats calculation
  const stats = useMemo(() => {
    const total = members.length
    const umat = members.filter((m) => m.role === "umat").length
    const aktivis = members.filter((m) => m.role === "aktivis").length
    const pengurus = members.filter((m) => m.role === "pengurus" || m.role === "admin").length
    return { total, umat, aktivis, pengurus }
  }, [members])

  const debouncedSearchQuery = useDebounce(searchQuery, 250)

  // Filtered members list with debounced query optimization
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = debouncedSearchQuery.toLowerCase()
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.username && m.username.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.user_number && m.user_number.toLowerCase().includes(q)) ||
        (m.school && m.school.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q))

      const matchesRole = roleFilter === "all" ? true : m.role === roleFilter

      return matchesQuery && matchesRole
    })
  }, [members, debouncedSearchQuery, roleFilter])

  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-red-50 text-red-700 border-red-200",
    pengurus: "bg-sekkha-teal-light text-sekkha-brand-blue border-sekkha-brand-blue/30 font-semibold",
    aktivis: "bg-blue-50 text-blue-700 border-blue-200",
    umat: "bg-slate-50 text-slate-700 border-slate-200",
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30">
      <PageBreadcrumb items={[{ label: "People" }]} />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg backdrop-blur-md transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-600/95 text-white shadow-emerald-600/20"
              : "bg-red-600/95 text-white shadow-red-600/20"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircleIcon className="size-5" /> : <AlertTriangleIcon className="size-5" />}
          <span className="text-body-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      <div className="px-4 py-6 pb-28 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue to-blue-700 text-white shadow-md shadow-blue-500/20">
                <UsersIcon className="size-6" />
              </div>
              <div>
                <h1 className="text-heading-5 font-extrabold text-sekkha-ink">People & Database Umat</h1>
                <p className="text-micro font-medium text-sekkha-slate">
                  Manajemen terpusat seluruh profil umat terdaftar, pre-provisioning, dan hak akses
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {isPengurusOrAdmin && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue px-4 py-2.5 text-body-sm-medium text-white shadow-sm hover:bg-blue-700 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <PlusIcon className="size-4" />
                  <span>Tambah Umat Baru</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-sekkha-hairline-strong bg-white px-4 py-2.5 text-body-sm-medium text-sekkha-ink shadow-2xs hover:bg-sekkha-surface transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <UserPlusIcon className="size-4 text-sekkha-brand-blue" />
                    <span>Undang Staff</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl border border-sekkha-hairline bg-white/80 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Total Umat & User</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-heading-4 font-black text-sekkha-ink">{stats.total}</span>
                <span className="text-micro font-medium text-sekkha-muted">Pengguna</span>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-micro font-bold uppercase tracking-wider text-blue-800">Umat</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-heading-4 font-black text-blue-900">{stats.umat}</span>
                <span className="text-micro font-medium text-blue-700">Anggota</span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-micro font-bold uppercase tracking-wider text-emerald-800">Aktivis & Relawan</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-heading-4 font-black text-emerald-900">{stats.aktivis}</span>
                <span className="text-micro font-medium text-emerald-700">Aktivis</span>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-200/80 bg-purple-50/60 p-4 shadow-2xs backdrop-blur-sm">
              <p className="text-micro font-bold uppercase tracking-wider text-purple-800">Pengurus & Admin</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-heading-4 font-black text-purple-900">{stats.pengurus}</span>
                <span className="text-micro font-medium text-purple-700">Pengelola</span>
              </div>
            </div>
          </div>

          {/* Search, Filter Tabs & Controls */}
          <div className="flex flex-col gap-3 rounded-2xl border border-sekkha-hairline bg-white p-3 sm:p-3.5 shadow-2xs">
            {/* Top row: Status Tabs on mobile/desktop */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-slate-100/90 p-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setRoleFilter("all")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1.5 text-caption font-semibold transition-all cursor-pointer ${
                    roleFilter === "all" ? "bg-white text-sekkha-ink shadow-xs" : "text-sekkha-slate hover:text-sekkha-ink"
                  }`}
                >
                  Semua ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("umat")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1.5 text-caption font-semibold transition-all cursor-pointer ${
                    roleFilter === "umat" ? "bg-blue-600 text-white shadow-xs" : "text-blue-800 hover:text-blue-900"
                  }`}
                >
                  Umat ({stats.umat})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("aktivis")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1.5 text-caption font-semibold transition-all cursor-pointer ${
                    roleFilter === "aktivis" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-800 hover:text-emerald-900"
                  }`}
                >
                  Aktivis ({stats.aktivis})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("pengurus")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-lg px-2.5 sm:px-3 py-1.5 text-caption font-semibold transition-all cursor-pointer ${
                    roleFilter === "pengurus" ? "bg-purple-600 text-white shadow-xs" : "text-purple-800 hover:text-purple-900"
                  }`}
                >
                  Pengurus ({stats.pengurus})
                </button>
              </div>

              {/* Right side: Search box */}
              <div className="relative flex-1 sm:w-72">
                <SearchIcon className="absolute left-3 top-2.5 sm:top-2 size-4 text-sekkha-slate" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, @username, ID, kontak..."
                  className="w-full rounded-xl border border-sekkha-hairline-strong bg-white pl-9 pr-4 py-2 sm:py-1.5 text-caption text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
              </div>
            </div>
          </div>

          {/* Main Grid: Directory & Invitations (if Admin) */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Members Directory (Col Span 2 or 3) */}
            <div className={`space-y-4 ${isAdmin ? "lg:col-span-2" : "lg:col-span-3"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-body-base font-bold text-sekkha-ink">Daftar Anggota & Umat</h2>
                  <p className="text-micro text-sekkha-slate">
                    Menampilkan {filteredMembers.length} dari {members.length} anggota terdaftar
                  </p>
                </div>
              </div>

              {loading ? (
                <>
                  {/* Mobile Skeleton Cards */}
                  <div className="md:hidden space-y-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <SkeletonCard key={idx} />
                    ))}
                  </div>

                  {/* Desktop Skeleton Table */}
                  <div className="hidden md:block overflow-hidden rounded-2xl border border-sekkha-hairline bg-white shadow-2xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-sekkha-hairline bg-slate-50/75">
                          <th className="px-4 py-3 text-caption font-semibold text-sekkha-slate">Umat / Anggota</th>
                          <th className="px-4 py-3 text-caption font-semibold text-sekkha-slate">Kontak & Info</th>
                          <th className="px-4 py-3 text-caption font-semibold text-sekkha-slate">Role</th>
                          <th className="px-4 py-3 text-caption font-semibold text-sekkha-slate">Poin & Hadir</th>
                          <th className="px-4 py-3 text-right text-caption font-semibold text-sekkha-slate">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <SkeletonTableRow key={idx} columns={5} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : filteredMembers.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-sekkha-hairline bg-white p-8 text-center">
                  <UsersIcon className="size-10 text-slate-300 mb-2" />
                  <p className="text-body-sm font-bold text-sekkha-ink">Tidak ada anggota yang cocok</p>
                  <p className="text-micro text-sekkha-slate mt-1 max-w-xs">
                    Coba sesuaikan kata kunci pencarian atau ganti filter kategori.
                  </p>
                </div>
              ) : (
                <>
                  {/* 📱 MOBILE VIEW: Touch-optimized Card List (< md) */}
                  <div className="md:hidden space-y-3">
                    {filteredMembers.map((m) => {
                      const initials =
                        m.name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                          .join("") || "UM"

                      return (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-sekkha-hairline bg-white p-4 shadow-2xs space-y-3 transition-shadow hover:shadow-xs"
                        >
                          {/* Card Header: Avatar, Name, Username, Role */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-caption-bold text-white shadow-2xs">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-body-sm text-sekkha-ink truncate">{m.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {m.username && (
                                    <span className="font-mono text-micro font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      @{m.username}
                                    </span>
                                  )}
                                  <span className="font-mono text-micro font-medium text-sekkha-slate">
                                    {m.user_number || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-extrabold capitalize ${roleBadgeStyle[m.role] || roleBadgeStyle.umat}`}>
                                {m.role}
                              </span>
                            </div>
                          </div>

                          {/* Card Details: Contact & School info */}
                          <div className="grid grid-cols-2 gap-2 text-micro text-sekkha-slate pt-2 border-t border-sekkha-hairline-soft bg-slate-50/50 -mx-4 -mb-3 p-3 rounded-b-2xl">
                            <div className="truncate">
                              <span className="font-semibold text-sekkha-muted block text-[10px] uppercase">Sekolah / Kampus</span>
                              <span className="font-medium text-sekkha-ink truncate block">{m.school || "—"}</span>
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-sekkha-muted block text-[10px] uppercase">Kontak</span>
                              <span className="font-medium text-sekkha-ink truncate block">{m.phone || m.email || "—"}</span>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-sekkha-hairline-soft/80 mt-1">
                              <button
                                type="button"
                                onClick={() => setQrMember(m)}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue/10 border border-sekkha-brand-blue/20 py-2 text-caption-bold text-sekkha-brand-blue hover:bg-sekkha-brand-blue/20 transition-colors cursor-pointer"
                              >
                                <QrCodeIcon className="size-4" />
                                <span>QR & Kartu</span>
                              </button>

                              {isPengurusOrAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(m)}
                                    className="flex size-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                                    title="Reset Password ke default (sekkha123)"
                                  >
                                    <KeyIcon className="size-4 text-amber-700" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMember(m)
                                      setUpdateForm({ role: m.role })
                                    }}
                                    className="flex size-9 items-center justify-center rounded-xl border border-sekkha-hairline bg-white text-sekkha-slate hover:bg-slate-100 hover:text-sekkha-ink transition-colors cursor-pointer shadow-2xs"
                                    title="Ubah Peran Pengguna"
                                  >
                                    <Edit2Icon className="size-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeletingMember(m)}
                                    className="flex size-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer shadow-2xs"
                                    title="Hapus Data Anggota"
                                  >
                                    <Trash2Icon className="size-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 🖥️ DESKTOP VIEW: Structured Table (hidden on mobile, visible md+) */}
                  <div className="hidden md:block overflow-hidden rounded-2xl border border-sekkha-hairline bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-body-sm">
                        <thead>
                          <tr className="border-b border-sekkha-hairline-soft bg-slate-50/70 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                            <th className="px-4 py-3">No. Unik</th>
                            <th className="px-4 py-3">Nama & Username</th>
                            <th className="px-4 py-3">Peran</th>
                            <th className="px-4 py-3">Sekolah / Kontak</th>
                            <th className="px-4 py-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sekkha-hairline-soft">
                          {filteredMembers.map((m) => {
                            const initials = m.name
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                              .join("") || "UM"

                            return (
                              <tr key={m.id} className="group hover:bg-slate-50/60 transition-colors">
                                {/* No. Unik */}
                                <td className="px-4 py-3 font-mono text-caption-bold text-sekkha-brand-blue">
                                  <div className="flex items-center gap-1.5">
                                    <span>{m.user_number || "—"}</span>
                                    {m.user_number && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(m.user_number)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-sekkha-brand-blue transition-opacity cursor-pointer"
                                        title="Salin No. Unik"
                                      >
                                        <CopyIcon className="size-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Nama & Username */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-micro-bold text-white shadow-2xs">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-sekkha-ink truncate">{m.name}</p>
                                        {m.username && (
                                          <span className="font-mono text-micro font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                            @{m.username}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-micro text-sekkha-slate truncate">
                                        {m.email || (m.phone ? `HP: ${m.phone}` : "Tanpa kontak email")}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Role */}
                                <td className="px-4 py-3">
                                  <span className={`inline-block rounded-full border px-2 py-0.5 text-micro-bold capitalize ${roleBadgeStyle[m.role] || roleBadgeStyle.umat}`}>
                                    {m.role}
                                  </span>
                                </td>

                                {/* Sekolah / Kontak */}
                                <td className="px-4 py-3 text-caption text-sekkha-slate">
                                  <div className="space-y-0.5">
                                    {m.school && <p className="truncate max-w-[160px]">🏫 {m.school}</p>}
                                    {m.phone && <p className="text-micro text-sekkha-muted">📞 {m.phone}</p>}
                                    {!m.school && !m.phone && <span className="text-sekkha-muted">—</span>}
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setQrMember(m)}
                                      className="flex size-8 items-center justify-center rounded-lg border border-sekkha-hairline text-sekkha-brand-blue hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Lihat Kartu Anggota & QR"
                                    >
                                      <QrCodeIcon className="size-4" />
                                    </button>

                                    {isPengurusOrAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleResetPassword(m)}
                                          className="flex size-8 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                                          title="Reset Password ke default (sekkha123)"
                                        >
                                          <KeyIcon className="size-4 text-amber-700" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMember(m)
                                            setUpdateForm({ role: m.role })
                                          }}
                                          className="flex size-8 items-center justify-center rounded-lg border border-sekkha-hairline text-sekkha-slate hover:bg-slate-100 hover:text-sekkha-ink transition-colors cursor-pointer"
                                          title="Ubah Peran Pengguna"
                                        >
                                          <Edit2Icon className="size-4" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setDeletingMember(m)}
                                          className="flex size-8 items-center justify-center rounded-lg border border-sekkha-hairline text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                                          title="Hapus Data Anggota"
                                        >
                                          <Trash2Icon className="size-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Invitations History (Admin only) */}
            {isAdmin && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-body-sm font-bold text-sekkha-ink">Riwayat Undangan Staff</h2>
                  <ClockIcon className="size-4 text-sekkha-slate" />
                </div>

                {loading ? (
                  <div className="h-64 flex items-center justify-center rounded-2xl border border-sekkha-hairline bg-white text-center">
                    <span className="text-body-sm text-sekkha-muted">Memuat...</span>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center rounded-2xl border border-dashed border-sekkha-hairline bg-white text-center p-4">
                    <MailIcon className="size-6 text-sekkha-slate mb-1" />
                    <span className="text-caption text-sekkha-muted">Belum ada undangan terkirim.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {invitations.map((inv) => {
                      const statusStyles: Record<string, string> = {
                        pending: "bg-yellow-50 text-yellow-800 border-yellow-200",
                        accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        rejected: "bg-red-50 text-red-800 border-red-200",
                      }

                      return (
                        <div
                          key={inv.id}
                          className="rounded-2xl border border-sekkha-hairline bg-white p-3.5 space-y-1.5 shadow-2xs hover:shadow-xs transition-shadow"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-caption-bold text-sekkha-ink truncate max-w-[160px]">{inv.email}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-micro-bold capitalize ${statusStyles[inv.status]}`}>
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-micro text-sekkha-slate">
                            Diundang sebagai: <span className="font-bold text-sekkha-brand-blue uppercase">{inv.role}</span>
                          </p>
                          <div className="flex justify-between text-[10px] text-sekkha-muted pt-1.5 border-t border-sekkha-hairline-soft mt-1">
                            <span>Pengundang: {inv.invited_by?.name || "Admin"}</span>
                            <span>
                              {new Date(inv.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Create Pre-provisioned Member                                    */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-sekkha-hairline bg-white p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs">
                  <UserPlusIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-body-base sm:text-heading-6 font-extrabold text-sekkha-ink">Tambah Anggota Umat Baru</h3>
                  <p className="text-[11px] sm:text-micro text-sekkha-slate">Pendaftaran awal / pre-provisioning oleh Pengurus</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100 cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-bold text-sekkha-ink">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">
                    Username <span className="text-micro text-sekkha-muted font-normal">(Otomatis jika kosong)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: budi.santoso"
                    value={createForm.username || ""}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Nomor HP / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={createForm.phone || ""}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={createForm.email || ""}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Asal Sekolah / Kampus</label>
                  <input
                    type="text"
                    placeholder="Contoh: SMA Dharma Widya"
                    value={createForm.school || ""}
                    onChange={(e) => setCreateForm({ ...createForm, school: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={createForm.birth_date || ""}
                    onChange={(e) => setCreateForm({ ...createForm, birth_date: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Jenis Kelamin</label>
                  <select
                    value={createForm.gender || "L"}
                    onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Peran Akun</label>
                  <select
                    value={createForm.role || "umat"}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  >
                    <option value="umat">Umat</option>
                    <option value="aktivis">Aktivis</option>
                    <option value="pengurus">Pengurus</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50/70 p-3 text-micro text-blue-900 border border-blue-200/60 leading-relaxed space-y-1">
                <p>💡 <strong>Password Default:</strong> Akun baru akan dibuatkan password awal <code>sekkha123</code>. Umat dapat langsung login dan mengganti password mandiri.</p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan Umat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Change Member Role (Pengurus/Admin only can change role)          */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-sekkha-hairline bg-white p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shadow-2xs">
                  <ShieldCheckIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-body-base sm:text-heading-6 font-extrabold text-sekkha-ink">Ubah Peran Pengguna</h3>
                  <p className="text-[11px] sm:text-micro text-sekkha-slate">Kelola hak akses & otorisasi akun</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100 cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Read-Only User Info Card */}
            <div className="rounded-2xl border border-sekkha-hairline bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-caption-bold text-white font-bold shadow-2xs uppercase">
                  {editingMember.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                    .join("") || "UM"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-body-sm text-sekkha-ink truncate">{editingMember.name}</p>
                  <p className="font-mono text-micro font-bold text-sekkha-brand-blue">{editingMember.user_number || "—"}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold capitalize ${roleBadgeStyle[editingMember.role]}`}>
                  {editingMember.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-micro text-sekkha-slate pt-2 border-t border-sekkha-hairline-soft/80">
                <div className="truncate">
                  <span className="text-[10px] text-sekkha-muted block uppercase font-bold">Kontak</span>
                  <span className="font-medium text-sekkha-ink truncate block">{editingMember.phone || editingMember.email || "—"}</span>
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-sekkha-muted block uppercase font-bold">Sekolah/Kampus</span>
                  <span className="font-medium text-sekkha-ink truncate block">{editingMember.school || "—"}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-caption font-bold text-sekkha-ink flex items-center justify-between">
                  <span>Pilih Peran Baru (Role)</span>
                  <span className="text-micro font-normal text-sekkha-muted">Hanya peran yang dapat diubah</span>
                </label>
                <select
                  value={updateForm.role || "umat"}
                  onChange={(e) => setUpdateForm({ role: e.target.value as any })}
                  className="w-full rounded-xl border border-sekkha-hairline-strong bg-white px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue font-semibold"
                >
                  <option value="umat">Umat (Akses: Beranda, Acara, Leaderboard, Profil)</option>
                  <option value="aktivis">Aktivis (Akses: Scan Presensi & Tugas Kegiatan)</option>
                  <option value="pengurus">Pengurus (Akses Penuh: Manajemen & Acara)</option>
                  {isAdmin && <option value="admin">Admin (Master Administrator Sistem)</option>}
                </select>
              </div>

              <div className="rounded-xl bg-purple-50/70 p-3 text-micro text-purple-950 border border-purple-200/60 leading-relaxed">
                ℹ️ <strong>Informasi:</strong> Perubahan peran akan langsung berdampak pada hak akses dan menu pengguna di aplikasi.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan Peran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: Member QR Card & Printable Physical ID                           */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {qrMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-sekkha-hairline bg-white p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-sekkha-brand-blue" />
                <h3 className="text-body-base sm:text-heading-6 font-extrabold text-sekkha-ink">Kartu Anggota & QR Code</h3>
              </div>
              <button
                type="button"
                onClick={() => setQrMember(null)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100 cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* The ID Card Preview */}
            <div className="rounded-2xl border-2 border-sekkha-brand-blue/30 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/40 p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-2.5">
                <div>
                  <p className="text-caption-bold text-sekkha-ink">Vihara Sekkha Jakarta</p>
                  <p className="text-micro font-medium text-sekkha-slate">Kartu Tanda Anggota Resmi</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-micro-bold capitalize ${roleBadgeStyle[qrMember.role]}`}>
                  {qrMember.role}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <div className="rounded-2xl border-2 border-sekkha-brand-blue/20 bg-white p-3 shadow-sm">
                  <QRCode
                    value={qrMember.user_number || qrMember.id}
                    size={140}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div className="text-center space-y-0.5">
                  <p className="text-body-base sm:text-heading-6 font-extrabold text-sekkha-ink">{qrMember.name}</p>
                  <p className="font-mono text-caption-bold text-sekkha-brand-blue">{qrMember.user_number || "—"}</p>
                  {qrMember.school && <p className="text-micro text-sekkha-slate">🏫 {qrMember.school}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-micro text-sekkha-slate pt-2 border-t border-sekkha-hairline-soft">
                <span>Status: {qrMember.is_claimed ? "✅ Akun Aktif" : "⚠️ Belum Diklaim"}</span>
                <span>Total Hadir: {qrMember.total_attendance || 0}x</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(qrMember.user_number)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {copiedId ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4 text-sekkha-slate" />}
                <span>{copiedId ? "Tersalin!" : "Salin No. Unik"}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
              >
                <PrinterIcon className="size-4" />
                <span>Cetak Kartu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: Delete Confirmation                                              */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-sekkha-hairline bg-white p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <Trash2Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-body-base font-extrabold text-sekkha-ink">Hapus Anggota?</h3>
                <p className="text-micro text-sekkha-slate">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-body-sm text-sekkha-slate leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>"{deletingMember.name}"</strong> ({deletingMember.user_number || "Tanpa ID"})? Seluruh data terkait akan dihapus.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={submitting}
                className="flex-1 rounded-xl bg-red-600 py-2 text-body-sm font-bold text-white shadow-sm hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: Invite Staff (Admin only)                                        */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showInviteModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-sekkha-hairline bg-white p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2">
                <UserPlusIcon className="size-5 text-sekkha-brand-blue" />
                <h3 className="text-heading-6 font-extrabold text-sekkha-ink">Undang Peran Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Email Calon Pengurus/Aktivis</label>
                <input
                  type="email"
                  required
                  placeholder="calon.pengurus@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
              </div>

              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Peran yang Diberikan</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "pengurus" | "aktivis")}
                  className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                >
                  <option value="aktivis">Aktivis (Akses Event & Tugas Presensi)</option>
                  <option value="pengurus">Pengurus (Akses Penuh Manajemen & Data)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Kirim Undangan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 6: Member Credentials Modal (Pengurus / Admin)                      */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {credentialModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-blue-200 bg-white p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-sekkha-brand-blue">
                  <KeyIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-body-base font-extrabold text-sekkha-ink">Kredensial Akun Umat</h3>
                  <p className="text-micro text-sekkha-slate">Username & password untuk login umat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialModalData(null)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Member Info Card */}
            <div className="rounded-2xl bg-slate-50 border border-sekkha-hairline p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-micro font-bold text-sekkha-muted uppercase tracking-wider">Nama Umat</p>
                <p className="text-body-sm font-extrabold text-sekkha-ink truncate">{credentialModalData.memberName}</p>
                {credentialModalData.phone && (
                  <p className="text-micro text-sekkha-slate">📞 {credentialModalData.phone}</p>
                )}
              </div>
              {credentialModalData.userNumber && (
                <div className="text-right shrink-0">
                  <p className="text-micro font-bold text-sekkha-muted uppercase tracking-wider">No. Unik</p>
                  <span className="font-mono text-caption-bold text-sekkha-brand-blue bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                    {credentialModalData.userNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Username & Password Display */}
            <div className="space-y-3">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 p-4 space-y-3">
                {/* Username */}
                <div>
                  <p className="text-micro-bold text-blue-900 uppercase tracking-wider mb-1">USERNAME LOGIN</p>
                  <div className="flex items-center justify-between bg-white rounded-xl border border-blue-200 px-3.5 py-2.5">
                    <span className="font-mono text-body-base font-black text-sekkha-ink select-all">
                      @{credentialModalData.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(credentialModalData.username)}
                      className="flex items-center gap-1 text-micro-bold text-sekkha-brand-blue hover:text-blue-800 cursor-pointer"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Salin</span>
                    </button>
                  </div>
                </div>

                {/* Password Default */}
                <div>
                  <p className="text-micro-bold text-blue-900 uppercase tracking-wider mb-1">PASSWORD DEFAULT</p>
                  <div className="flex items-center justify-between bg-white rounded-xl border border-blue-200 px-3.5 py-2.5">
                    <span className="font-mono text-body-base font-black text-sekkha-ink select-all">
                      {credentialModalData.defaultPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(credentialModalData.defaultPassword)}
                      className="flex items-center gap-1 text-micro-bold text-sekkha-brand-blue hover:text-blue-800 cursor-pointer"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Salin</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-micro text-sekkha-slate leading-relaxed px-1">
                Umat dapat langsung login menggunakan <strong>Username</strong> dan <strong>Password Default</strong> di atas, lalu dapat mengubah password dan username mereka di menu Profil.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-sekkha-hairline-soft">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fullText = `Akun Sekkha Vihara:\nNama: ${credentialModalData.memberName}\nUsername: @${credentialModalData.username}\nPassword: ${credentialModalData.defaultPassword}`
                    navigator.clipboard.writeText(fullText)
                    showToast("Semua kredensial berhasil disalin!")
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sekkha-ink py-2.5 text-body-sm font-bold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <CopyIcon className="size-4" />
                  <span>Salin Semua</span>
                </button>

                {credentialModalData.phone && (
                  <a
                    href={`https://api.whatsapp.com/send?phone=${credentialModalData.phone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(
                      `Namo Buddhaya ${credentialModalData.memberName},\n\nBerikut akun login Sekkha Vihara Anda:\n👤 Username: *${credentialModalData.username}*\n🔑 Password: *${credentialModalData.defaultPassword}*\n🆔 No. Anggota: *${credentialModalData.userNumber || "-"}*\n\nSilakan login ke aplikasi Sekkha dengan username dan password di atas. Jangan lupa untuk mengganti password Anda di menu *Profil > Ganti Password*.\n\nTerima kasih!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-body-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                    title="Kirim ke WhatsApp Umat"
                  >
                    <Share2Icon className="size-4" />
                    <span className="hidden sm:inline">Kirim WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setCredentialModalData(null)}
                  className="text-micro font-semibold text-sekkha-slate hover:text-sekkha-ink cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}

