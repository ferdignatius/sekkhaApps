import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { PlusIcon, AwardIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { badgesApi } from "../api/configureApi"
import type { BadgeDto } from "../api/configureApi"

export function BadgePage() {
  const { authState } = useAuth()
  const canManage = authState.status === "authenticated" && authState.role === "admin"
  const [items, setItems] = useState<BadgeDto[]>([])
  useEffect(() => { void badgesApi.list().then(setItems).catch(() => setItems([])) }, [])
  return <main className="min-h-screen bg-[#fffaf0] pb-32"><PageBreadcrumb items={[{ label: "Configure" }, { label: "Gamification" }, { label: "Master Badges" }]} /><div className="mx-auto max-w-7xl space-y-5 px-4 py-6"><header className="flex items-center justify-between border-b pb-4"><div className="flex items-center gap-3"><AwardIcon className="size-8" /><div><h1 className="text-xl font-bold">Member Achievement Badges</h1><p className="text-xs text-[#6a6a6a]">Manage badge trigger conditions</p></div></div>{canManage && <Link to="/configure/master/badge/new" className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white"><PlusIcon className="size-4" />Add Badge</Link>}</header><div className="overflow-hidden rounded-xl border"><table className="w-full text-left text-xs"><thead className="bg-[#faf5e8]"><tr><th className="px-4 py-3">Badge</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{items.map(item => <tr key={item.id}><td className="px-4 py-3"><Link className="font-bold underline" to="/configure/master/badge/$badgeId" params={{ badgeId: item.id }}>{item.icon_url} {item.name}</Link><p className="text-[#6a6a6a]">{item.description}</p></td><td className="px-4 py-3">{item.condition_type}: {item.condition_value}</td><td className="px-4 py-3">{item.is_active ? "Active" : "Inactive"}</td></tr>)}</tbody></table>{!items.length && <p className="p-10 text-center text-xs">No badges found.</p>}</div></div></main>
}

export { BadgeFormPage } from "./BadgeFormPage"
export { BadgeDetailPage } from "./BadgeDetailPage"
