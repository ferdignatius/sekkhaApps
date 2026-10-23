import { useEffect, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { GraduationCapIcon, SearchIcon, UsersIcon } from "lucide-react"
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
    <main className="min-h-screen bg-[#fffaf0] pb-12 text-left">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Schools Directory" },
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-6 px-3.5 py-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-white">
              <GraduationCapIcon className="size-6 text-[#e8b94a]" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Master Data Sekolah & Kampus
              </h1>
              <p className="text-xs text-[#6a6a6a]">Daftar almamater resmi</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/configure/master/school/new">Tambah Sekolah</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-[#6a6a6a]">Total Sekolah</p>
            <p className="text-2xl font-bold">{schools.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[#6a6a6a]">SMA & SMK</p>
            <p className="text-2xl font-bold">
              {
                schools.filter((s) => s.type === "SMA" || s.type === "SMK")
                  .length
              }
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-[#6a6a6a]">Perguruan Tinggi</p>
            <p className="text-2xl font-bold">
              {schools.filter((s) => s.type === "Universitas").length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="flex items-center gap-1 text-xs text-[#6a6a6a]">
              <UsersIcon className="size-3" /> Umat Terhubung
            </p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </Card>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="bg-white"
            placeholder="Cari nama sekolah atau kota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={<SearchIcon className="size-4" />}
          />
          <div className="flex gap-2 overflow-x-auto">
            {["all", ...SCHOOL_TYPES].map((t) => (
              <Chip
                key={t}
                variant="filter"
                selected={typeFilter === t}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? `Semua (${schools.length})` : t}
              </Chip>
            ))}
          </div>
        </div>
        <Card className="overflow-hidden p-0">
          {loading ? (
            <p className="py-16 text-center text-xs">
              Memuat master data sekolah...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-[#faf5e8] text-[11px] uppercase">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Jenjang</th>
                    <th className="px-4 py-3">Kota</th>
                    <th className="px-4 py-3">Umat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-[#fffaf0]">
                      <td className="px-4 py-3">
                        <Link
                          className="font-semibold underline-offset-2 hover:underline"
                          to="/configure/master/school/$schoolId"
                          params={{ schoolId: s.id }}
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" size="sm">
                          {s.type || "Umum"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{s.city || "Indonesia"}</td>
                      <td className="px-4 py-3">
                        {s.userCount || s.user_count || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
