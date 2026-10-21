import { useEffect, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { schoolsApi } from "../api/configureApi"
import type { SchoolDto } from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Badge } from "@/components/base/Badge"
export function SchoolDetailPage() {
  const { schoolId } = useParams({ strict: false }) as { schoolId: string }
  const navigate = useNavigate(); const [school, setSchool] = useState<SchoolDto | null>(null)
  useEffect(() => { void schoolsApi.list().then(xs => setSchool(xs.find(x => x.id === schoolId) || null)) }, [schoolId])
  async function remove() { if (!school || !window.confirm(`Hapus "${school.name}"?`)) return; await schoolsApi.remove(school.id); await navigate({ to: "/configure/master/school" }) }
  if (!school) return <main className="p-6">Memuat data sekolah...</main>
  return <main className="min-h-screen bg-[#fffaf0] p-6"><PageBreadcrumb items={[{ label: "Configure" }, { label: "Master Data" }, { label: school.name }]} /><Card className="mx-auto max-w-xl space-y-5 p-6"><h1 className="text-xl font-bold">{school.name}</h1><div className="space-y-3 text-sm"><p>Jenjang: <Badge variant="secondary">{school.type || "Umum"}</Badge></p><p>Kota: {school.city || "Indonesia"}</p><p>Umat terdaftar: {school.userCount || school.user_count || 0}</p></div><div className="flex justify-between"><Button variant="outline" onClick={() => void navigate({ to: "/configure/master/school" })}>Kembali</Button><Button variant="destructive" onClick={() => void remove()}>Hapus Sekolah</Button></div></Card></main>
}
