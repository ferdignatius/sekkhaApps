import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { schoolsApi } from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Input } from "@/components/base/Input"
import { Select } from "@/components/base/Select"

const types = ["SMP", "SMA", "SMK", "Universitas", "Umum"]
export function SchoolFormPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [type, setType] = useState("SMA")
  const [city, setCity] = useState("")
  const [saving, setSaving] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !city.trim()) return
    setSaving(true)
    try { const school = await schoolsApi.create({ name: name.trim(), type, city: city.trim() }); await navigate({ to: "/configure/master/school/$schoolId", params: { schoolId: school.id } }) } finally { setSaving(false) }
  }
  return <main className="min-h-screen bg-[#fffaf0] p-6"><PageBreadcrumb items={[{ label: "Configure" }, { label: "Master Data" }, { label: "New School" }]} /><Card className="mx-auto max-w-xl space-y-5 p-6"><h1 className="text-xl font-bold">Tambah Sekolah</h1><form onSubmit={submit} className="space-y-4"><Input label="Nama Sekolah / Kampus" required value={name} onChange={e => setName(e.target.value)} /><Select label="Jenjang / Kategori" value={type} onValueChange={setType} options={types.map(value => ({ value, label: value }))} /><Input label="Kota / Wilayah" required value={city} onChange={e => setCity(e.target.value)} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => void navigate({ to: "/configure/master/school" })}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Tambah Sekolah"}</Button></div></form></Card></main>
}
