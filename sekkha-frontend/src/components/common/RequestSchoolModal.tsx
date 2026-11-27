import { useEffect, useState } from "react"
import {
  AlertTriangleIcon,
  CheckIcon,
  GraduationCapIcon,
} from "lucide-react"
import { Button, Input, Select } from "@/components/base"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useDebounce } from "@/hooks/useDebounce"
import { api } from "@/lib/api"
import { fetchSchoolsPaginated } from "@/lib/pagination"

export type SchoolLevel = "SMP" | "SMA/SMK" | "Universitas" | "Umum"

const SCHOOL_LEVEL_OPTIONS: { value: SchoolLevel; label: string }[] = [
  { value: "SMP", label: "Junior High School (SMP)" },
  { value: "SMA/SMK", label: "Senior & Vocational High (SMA/SMK)" },
  { value: "Universitas", label: "University / College" },
  { value: "Umum", label: "General / Other Institution" },
]

export interface CreatedSchoolRequest {
  id: string
  name: string
  type: SchoolLevel | string
  status?: "active" | "pending" | "cancel"
  userCount?: number
}

export interface RequestSchoolModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  description?: string
  onCreated: (created: CreatedSchoolRequest) => void
  onSelectExisting?: (existing: CreatedSchoolRequest) => void
}

export function RequestSchoolModal({
  open,
  onOpenChange,
  initialName = "",
  description = "Submitted requests remain Pending until verified by administrators.",
  onCreated,
  onSelectExisting,
}: RequestSchoolModalProps) {
  const [name, setName] = useState(initialName)
  const debouncedName = useDebounce(name, 250)
  const [level, setLevel] = useState<SchoolLevel>("SMA/SMK")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [similarSchools, setSimilarSchools] = useState<CreatedSchoolRequest[]>(
    []
  )
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialName.trim())
      setLevel("SMA/SMK")
      setError(null)
      setSimilarSchools([])
    }
  }, [open, initialName])

  useEffect(() => {
    const query = debouncedName.trim()
    if (!open || query.length < 2) {
      setSimilarSchools([])
      setLoadingSimilar(false)
      return
    }

    let cancelled = false
    setLoadingSimilar(true)
    fetchSchoolsPaginated<CreatedSchoolRequest>({
      page: 1,
      limit: 5,
      search: query,
      includePending: true,
    })
      .then((res) => {
        if (!cancelled) {
          setSimilarSchools(res.items || [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSimilarSchools([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSimilar(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, debouncedName])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError("School name must be at least 2 characters.")
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const res: any = await api.post("/configure/school-requests", {
        name: trimmed,
        type: level,
      })
      const created = (res?.data || res) as CreatedSchoolRequest
      onOpenChange(false)
      onCreated({
        id: created.id,
        name: created.name || trimmed,
        type: created.type || level,
        status: created.status || "pending",
        userCount: created.userCount ?? 1,
      })
    } catch (err: any) {
      setError(err?.message || "Failed to submit school request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ResponsiveFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Request New School"
      description={description}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-left">
        {error && (
          <div className="flex items-center gap-2 rounded-[12px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-xs font-medium text-[#ef4444]">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Input
            label="School / Campus Name"
            type="text"
            required
            placeholder="e.g. SMA Maitreya or University of Indonesia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            startIcon={<GraduationCapIcon className="size-4" />}
          />

          {(loadingSimilar || similarSchools.length > 0) && (
            <div className="space-y-2 rounded-[14px] border border-[#e5dec9] bg-[#faf5e8] p-3">
              <p className="text-[11px] font-semibold text-[#6a6a6a]">
                {loadingSimilar
                  ? "Checking similar schools..."
                  : "Similar schools found — tap to use instead:"}
              </p>
              {!loadingSimilar && (
                <div className="max-h-36 space-y-1.5 overflow-y-auto">
                  {similarSchools.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onOpenChange(false)
                        ;(onSelectExisting ?? onCreated)(item)
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-[#e5dec9] bg-[#fffaf0] px-2.5 py-2 text-left text-xs transition-colors hover:border-[#0a0a0a]/40 hover:bg-[#f5efe0]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#0a0a0a]">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-[#6a6a6a]">
                          {item.type || "Umum"}
                          {item.status === "pending" ? " · Pending review" : ""}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0a0a0a] px-2 py-0.5 text-[10px] font-semibold text-white">
                        <CheckIcon className="size-3" />
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Select
            label="Education Level"
            value={level}
            onChange={(val) => setLevel(val as SchoolLevel)}
            options={SCHOOL_LEVEL_OPTIONS}
          />

          <div className="flex flex-row gap-2.5 border-t border-hairline pt-4 sm:justify-end">
            <Button
              type="button"
              variant="outlined"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-[2] rounded-xl sm:flex-none"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveFormModal>
  )
}
