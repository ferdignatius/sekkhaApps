import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { GraduationCapIcon, ArrowLeftIcon, AlertCircleIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { schoolsApi } from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Input } from "@/components/base/Input"
import { Select } from "@/components/base/Select"

const SCHOOL_TYPES = [
  { value: "SMP", label: "Junior High School (SMP)" },
  { value: "SMA/SMK", label: "Senior & Vocational High (SMA/SMK)" },
  { value: "Universitas", label: "University / College" },
  { value: "Umum", label: "General / Other Institution" },
]

export function SchoolFormPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [type, setType] = useState("SMA/SMK")
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedName = name.trim()

    if (!trimmedName) {
      setErrorMsg("Institution name is required.")
      return
    }

    setSaving(true)
    try {
      const school = await schoolsApi.create({
        name: trimmedName,
        type,
      })
      await navigate({
        to: "/configure/master/school/$schoolId",
        params: { schoolId: school.id },
      })
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Failed to create institution. Please try again."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-24 text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Schools & Universities" },
          { label: "Add Institution" },
        ]}
      />

      <div className="mx-auto max-w-2xl space-y-6 px-3.5 py-4 sm:px-6 md:px-8">
        {/* Back Button */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigate({ to: "/configure/master/school" })}
            className="gap-2 rounded-[12px] border-[#e5e5e5] bg-white text-xs font-semibold hover:bg-[#faf5e8]"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Directory
          </Button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#ef4444]/30 bg-[#ef4444]/10 p-4 text-xs font-medium text-[#b91c1c] shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0 text-[#ef4444]" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="rounded p-1 hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Form Card */}
        <Card className="rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-2xs sm:p-8">
          <div className="mb-6 flex items-start gap-3 border-b border-[#f0ece1] pb-5">
            <div className="flex size-12 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-2xs">
              <GraduationCapIcon className="size-6 text-[#e8b94a]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
                Add Educational Institution
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Register a new school, college, or university into the master
                directory.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <Input
              label="Institution Name"
              required
              placeholder="e.g. SMA/SMK Tri Maha Dharma, Universitas Indonesia"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Official full name of the school or campus."
            />

            <Select
              label="Institution Level / Category"
              value={type}
              onValueChange={setType}
              options={SCHOOL_TYPES}
            />

            <div className="flex items-center justify-end gap-3 border-t border-[#f0ece1] pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void navigate({ to: "/configure/master/school" })
                }
                className="rounded-[12px] text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-[12px] bg-[#0a0a0a] px-6 text-xs font-bold text-white shadow-xs hover:bg-[#222]"
              >
                {saving ? "Creating Institution..." : "Create Institution"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  )
}
