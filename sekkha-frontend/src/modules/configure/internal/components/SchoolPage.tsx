import { useEffect, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  GraduationCapIcon,
  SearchIcon,
  UsersIcon,
  MapPinIcon,
  PlusIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { schoolsApi } from "../api/configureApi"
import type { SchoolDto } from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Chip } from "@/components/base/Chip"
import { Badge } from "@/components/base/Badge"
import { Input } from "@/components/base/Input"

const SCHOOL_TYPES = ["SMP", "SMA", "SMK", "Universitas", "Umum"] as const

export function SchoolPage() {
  const [schools, setSchools] = useState<SchoolDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    void schoolsApi
      .list()
      .then(setSchools)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return schools.filter(
      (s) =>
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q)) &&
        (typeFilter === "all" || s.type === typeFilter)
    )
  }, [schools, search, typeFilter])

  const totalUsers = schools.reduce(
    (n, s) => n + (s.userCount || s.user_count || 0),
    0
  )

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-24 text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Schools Directory" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-3.5 py-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#e5e5e5] pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-white shadow-2xs">
              <GraduationCapIcon className="size-6 text-[#e8b94a]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
                Master Data Sekolah & Kampus
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Daftar almamater resmi jemaat dan pemuda vihara.
              </p>
            </div>
          </div>
          <Button asChild className="h-10 gap-2 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#222]">
            <Link to="/configure/master/school/new">
              <PlusIcon className="size-4" />
              Tambah Sekolah
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="text-xs text-[#6a6a6a]">Total Sekolah</p>
            <p className="mt-1 text-2xl font-black text-[#0a0a0a]">{schools.length}</p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="text-xs text-[#6a6a6a]">SMA & SMK</p>
            <p className="mt-1 text-2xl font-black text-[#0a0a0a]">
              {schools.filter((s) => s.type === "SMA" || s.type === "SMK").length}
            </p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="text-xs text-[#6a6a6a]">Perguruan Tinggi</p>
            <p className="mt-1 text-2xl font-black text-[#0a0a0a]">
              {schools.filter((s) => s.type === "Universitas").length}
            </p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="flex items-center gap-1 text-xs text-[#6a6a6a]">
              <UsersIcon className="size-3 text-[#e8b94a]" /> Umat Terhubung
            </p>
            <p className="mt-1 text-2xl font-black text-[#0a0a0a]">{totalUsers}</p>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Input
              className="bg-white"
              placeholder="Cari nama sekolah atau kota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon={<SearchIcon className="size-4" />}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", ...SCHOOL_TYPES].map((t) => (
              <Chip
                key={t}
                variant="filter"
                selected={typeFilter === t}
                onClick={() => setTypeFilter(t)}
                className="shrink-0 text-xs"
              >
                {t === "all" ? `Semua (${schools.length})` : t}
              </Chip>
            ))}
          </div>
        </div>

        {/* Responsive Card Grid View (Replaces rigid table) */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-[20px] border border-[#e5e5e5] bg-white p-5 shadow-2xs"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[20px] border border-[#e5e5e5] bg-white py-16 text-center shadow-2xs">
            <GraduationCapIcon className="mx-auto size-10 text-[#6a6a6a]/40" />
            <p className="mt-3 text-sm font-semibold text-[#0a0a0a]">
              Tidak ada sekolah ditemukan
            </p>
            <p className="mt-1 text-xs text-[#6a6a6a]">
              Coba sesuaikan kata kunci pencarian atau filter jenjang almamater.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Card
                key={s.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-white p-5 shadow-2xs transition-all hover:border-[#0a0a0a]/30 hover:shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-base font-bold tracking-tight text-[#0a0a0a]">
                      {s.name}
                    </h3>
                    <Badge variant="secondary" size="sm" className="shrink-0 font-semibold">
                      {s.type || "Umum"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6a6a6a]">
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="size-3.5 text-[#8a7a5a]" />
                      {s.city || "Indonesia"}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-[#0a0a0a]">
                      <UsersIcon className="size-3.5 text-[#e8b94a]" />
                      {s.userCount || s.user_count || 0} Umat
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#f0ece1] pt-3">
                  <span className="text-[11px] font-medium text-[#8a8a8a]">
                    {s.is_active === false ? "Nonaktif" : "Aktif"}
                  </span>
                  <Link
                    to="/configure/master/school/$schoolId"
                    params={{ schoolId: s.id }}
                    className="flex items-center gap-1 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-white"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
