// feature/configure/components/SchoolPage
// Master Data: School & University management — CRUD master data sekolah.
// Connected to backend: GET/POST/PUT/DELETE /api/schools

import { useState, useEffect, useMemo } from "react"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GraduationCapIcon,
  SearchIcon,
  UsersIcon,
  Building2Icon,
  AlertTriangleIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { schoolsApi } from "../api/configureApi"
import type { SchoolDto } from "../api/configureApi"

const SCHOOL_TYPES = ["SMP", "SMA", "SMK", "Universitas", "Umum"] as const

export function SchoolPage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"
  const isPengurusOrAdmin =
    authState.status === "authenticated" &&
    (authState.role === "pengurus" || authState.role === "admin")

  const [schools, setSchools] = useState<SchoolDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Modal Form State
  const [showModal, setShowModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState<SchoolDto | null>(null)
  const [formName, setFormName] = useState("")
  const [formType, setFormType] = useState<string>("SMA")
  const [formCity, setFormCity] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Fetch schools list
  async function fetchSchools() {
    try {
      setLoading(true)
      const data = await schoolsApi.list()
      setSchools(data)
    } catch (err: any) {
      console.error("Gagal memuat master data sekolah:", err)
      setFeedbackMsg({ type: "error", text: "Gagal memuat daftar sekolah. Silakan muat ulang." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSchools()
  }, [])

  // Auto clear feedback message after 4 seconds
  useEffect(() => {
    if (!feedbackMsg) return
    const timer = setTimeout(() => setFeedbackMsg(null), 4000)
    return () => clearTimeout(timer)
  }, [feedbackMsg])

  // Filtered schools
  const filteredSchools = useMemo(() => {
    const q = search.toLowerCase().trim()
    return schools.filter((item) => {
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q)
      const matchType = typeFilter === "all" || item.type === typeFilter
      return matchQuery && matchType
    })
  }, [schools, search, typeFilter])

  // Aggregate stats
  const stats = useMemo(() => {
    const total = schools.length
    const totalSmaSmk = schools.filter((s) => s.type === "SMA" || s.type === "SMK").length
    const totalUniv = schools.filter((s) => s.type === "Universitas").length
    const totalUsers = schools.reduce((acc, s) => acc + (s.userCount || 0), 0)
    return { total, totalSmaSmk, totalUniv, totalUsers }
  }, [schools])

  function resetForm() {
    setFormName("")
    setFormType("SMA")
    setFormCity("")
    setFormError(null)
    setEditingSchool(null)
    setShowModal(false)
  }

  function handleOpenCreate() {
    resetForm()
    setShowModal(true)
  }

  function handleOpenEdit(school: SchoolDto) {
    setEditingSchool(school)
    setFormName(school.name)
    setFormType(school.type || "SMA")
    setFormCity(school.city || "")
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim() || !formCity.trim() || !isPengurusOrAdmin) return

    try {
      setSubmitting(true)
      setFormError(null)

      if (editingSchool) {
        const updated = await schoolsApi.update(editingSchool.id, {
          name: formName.trim(),
          type: formType,
          city: formCity.trim(),
        })
        setSchools((prev) => prev.map((s) => (s.id === editingSchool.id ? { ...s, ...updated } : s)))
        setFeedbackMsg({ type: "success", text: `Sekolah "${updated.name}" berhasil diperbarui.` })
      } else {
        const created = await schoolsApi.create({
          name: formName.trim(),
          type: formType,
          city: formCity.trim(),
        })
        setSchools((prev) => [created, ...prev])
        setFeedbackMsg({ type: "success", text: `Sekolah "${created.name}" berhasil ditambahkan.` })
      }

      resetForm()
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data sekolah.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(school: SchoolDto) {
    if (!isAdmin) return
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${school.name}" dari master data?`)) {
      return
    }

    try {
      await schoolsApi.remove(school.id)
      setSchools((prev) => prev.filter((s) => s.id !== school.id))
      setFeedbackMsg({ type: "success", text: `Sekolah "${school.name}" berhasil dihapus.` })
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Gagal menghapus sekolah." })
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Schools Directory" },
        ]}
      />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto space-y-6">

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-[12px] border text-xs font-medium flex items-center justify-between animate-in fade-in ${
              feedbackMsg.type === "success"
                ? "bg-[#22c55e]/10 border-[#22c55e]/25 text-[#15803d]"
                : "bg-[#ef4444]/10 border-[#ef4444]/25 text-[#ef4444]"
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="ml-3 font-bold hover:opacity-75 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Band */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-white shrink-0 shadow-xs">
              <GraduationCapIcon className="size-6 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-[#0a0a0a] tracking-tight">
                Master Data Sekolah & Kampus
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Daftar almamater resmi untuk opsi registrasi, onboarding, dan pencocokan teman seangkatan umat
              </p>
            </div>
          </div>

          {isPengurusOrAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[12px] bg-[#0a0a0a] text-xs font-semibold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer shrink-0"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Sekolah</span>
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-[16px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs space-y-1">
            <p className="text-[11px] font-semibold text-[#6a6a6a] uppercase tracking-wider">
              Total Sekolah
            </p>
            <p className="text-2xl font-bold text-[#0a0a0a]">{stats.total}</p>
          </div>

          <div className="p-4 rounded-[16px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs space-y-1">
            <p className="text-[11px] font-semibold text-[#6a6a6a] uppercase tracking-wider">
              SMA & SMK
            </p>
            <p className="text-2xl font-bold text-[#0a0a0a]">{stats.totalSmaSmk}</p>
          </div>

          <div className="p-4 rounded-[16px] bg-[#ffffff] border border-[#e5e5e5] shadow-xs space-y-1">
            <p className="text-[11px] font-semibold text-[#6a6a6a] uppercase tracking-wider">
              Perguruan Tinggi
            </p>
            <p className="text-2xl font-bold text-[#0a0a0a]">{stats.totalUniv}</p>
          </div>

          <div className="p-4 rounded-[16px] bg-[#faf5e8] border border-[#e5e5e5] shadow-xs space-y-1">
            <p className="text-[11px] font-semibold text-[#6a6a6a] uppercase tracking-wider flex items-center gap-1">
              <UsersIcon className="size-3 text-[#22c55e]" />
              <span>Umat Terhubung</span>
            </p>
            <p className="text-2xl font-bold text-[#0a0a0a]">{stats.totalUsers}</p>
          </div>
        </div>

        {/* Search & Filter Band */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#9a9a9a]" />
            <input
              type="text"
              placeholder="Cari nama sekolah atau kota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs font-medium rounded-[12px] border border-[#e5e5e5] bg-[#ffffff] text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === "all"
                  ? "bg-[#0a0a0a] text-white"
                  : "bg-[#ffffff] text-[#6a6a6a] border border-[#e5e5e5] hover:bg-[#faf5e8]"
              }`}
            >
              Semua ({schools.length})
            </button>
            {SCHOOL_TYPES.map((t) => {
              const count = schools.filter((s) => s.type === t).length
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    typeFilter === t
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#ffffff] text-[#6a6a6a] border border-[#e5e5e5] hover:bg-[#faf5e8]"
                  }`}
                >
                  {t} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Schools Table Card */}
        <div className="rounded-[20px] border border-[#e5e5e5] bg-[#ffffff] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-[#6a6a6a] space-y-2">
              <div className="size-6 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Memuat master data sekolah...</p>
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <Building2Icon className="size-8 text-[#9a9a9a] mx-auto" />
              <p className="text-sm font-bold text-[#0a0a0a]">Tidak ada sekolah ditemukan</p>
              <p className="text-xs text-[#6a6a6a]">
                Coba sesuaikan kata kunci pencarian atau filter tipe sekolah Anda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] text-[11px] font-bold text-[#6a6a6a] uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Sekolah / Kampus</th>
                    <th className="py-3 px-4">Jenjang</th>
                    <th className="py-3 px-4">Kota / Wilayah</th>
                    <th className="py-3 px-4 text-center">Umat Terdaftar</th>
                    {isPengurusOrAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {filteredSchools.map((item) => (
                    <tr key={item.id} className="hover:bg-[#fffaf0] transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#0a0a0a]">{item.name}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block rounded-full bg-[#f5f0e0] border border-[#e5e5e5] px-2.5 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
                          {item.type || "Umum"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#6a6a6a] font-medium">
                        {item.city || "Indonesia"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.userCount !== undefined && item.userCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#15803d]">
                            <UsersIcon className="size-3" />
                            <span>{item.userCount} Umat</span>
                          </span>
                        ) : (
                          <span className="text-[#9a9a9a] text-[11px]">0</span>
                        )}
                      </td>

                      {isPengurusOrAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-[8px] text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                              title="Edit Sekolah"
                            >
                              <PencilIcon className="size-3.5" />
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-[8px] text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors cursor-pointer"
                                title="Hapus Sekolah"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal Form Tambah / Edit Sekolah */}
      <ResponsiveFormModal
        isOpen={showModal}
        onClose={resetForm}
        title={editingSchool ? "Edit Master Sekolah" : "Tambah Master Sekolah"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-[12px] bg-[#ef4444]/10 p-3 border border-[#ef4444]/20 text-xs text-[#ef4444] font-medium">
              <AlertTriangleIcon className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Nama Sekolah */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0a0a0a]">
              Nama Sekolah / Kampus <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: SMA Dharma Widya"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          {/* Jenjang */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0a0a0a]">
              Jenjang / Kategori <span className="text-[#ef4444]">*</span>
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all cursor-pointer"
            >
              {SCHOOL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Kota */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0a0a0a]">
              Kota / Wilayah <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Tangerang, Jakarta Barat"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
              className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={resetForm}
              className="h-10 px-4 rounded-[12px] border border-[#e5e5e5] bg-white text-xs font-semibold text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 rounded-[12px] bg-[#0a0a0a] text-xs font-semibold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Menyimpan..." : editingSchool ? "Simpan Perubahan" : "Tambah Sekolah"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>
    </main>
  )
}
