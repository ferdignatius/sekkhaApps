import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { PlusIcon, TagIcon, EyeIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { getMasterCategories } from "@/modules/events/internal/masterdata"
import type { EventCategoryItem } from "@/modules/events/internal/masterdata"

export function EventTypePage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"
  const [categories] = useState<EventCategoryItem[]>(getMasterCategories)
  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 font-sans md:pb-12">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Master Data" }, { label: "Event Categories" }]} />
      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        <header className="flex flex-col justify-between gap-3 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white"><TagIcon className="size-5 text-[#e8b94a]" /></div><div><h1 className="text-base font-bold sm:text-xl">Event Categories Master Data</h1><p className="text-xs text-[#6a6a6a]">View event categories and configuration.</p></div></div>
          {isAdmin && <button type="button" onClick={() => navigate({ to: "/configure/master/event-type/new" })} className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white"><PlusIcon className="size-4" />Add Event Category</button>}
        </header>
        <div className="overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[#e5e5e5] bg-[#faf5e8] font-bold text-[#6a6a6a]"><th className="px-4 py-3">Category</th><th className="px-4 py-3">Autofill title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">View</th></tr></thead><tbody className="divide-y divide-[#f0f0f0]">{categories.map((category) => <tr key={category.id}><td className="px-4 py-3 font-bold">{category.name}</td><td className="px-4 py-3">{category.autofillTitle || `Vihara ${category.name} Activity`}</td><td className="px-4 py-3">{category.is_active === false ? "Inactive" : "Active"}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => navigate({ to: "/configure/master/event-type/$categoryId", params: { categoryId: category.id } })} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e5e5] px-3 py-2 font-bold"><EyeIcon className="size-3.5" />View detail</button></td></tr>)}</tbody></table>{categories.length === 0 && <p className="py-12 text-center text-xs text-[#6a6a6a]">No event categories saved yet.</p>}</div>
      </div>
    </main>
  )
}
