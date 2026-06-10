// feature/community/components/CommunityPage
// Two-tab surface: Forum (public) + Curhat (private channel).

import { useState } from "react"
import { useAuth } from "@/feature/auth"
import { ForumTab } from "./ForumTab"
import { CurhatTab } from "./CurhatTab"
import { UsersIcon, LockIcon } from "lucide-react"

type ActiveTab = "forum" | "curhat"

export function CommunityPage() {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : "umat"
  const userId = authState.status === "authenticated" ? (authState.userId ?? "me") : "me"

  const [activeTab, setActiveTab] = useState<ActiveTab>("forum")

  const currentUser = {
    id: userId,
    name: userId === "admin-user-1" ? "Admin Sekkha" : "Kamu",
    role: role ?? "umat",
    initials: userId === "admin-user-1" ? "AS" : "AK",
  } as const

  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-full bg-sekkha-surface p-1">
          <button
            type="button"
            onClick={() => setActiveTab("forum")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-body-sm-medium transition-colors ${
              activeTab === "forum"
                ? "bg-sekkha-canvas text-sekkha-ink shadow-sm"
                : "text-sekkha-muted"
            }`}
          >
            <UsersIcon className="size-4" aria-hidden="true" />
            Forum
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("curhat")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-body-sm-medium transition-colors ${
              activeTab === "curhat"
                ? "bg-sekkha-canvas text-sekkha-ink shadow-sm"
                : "text-sekkha-muted"
            }`}
          >
            <LockIcon className="size-4" aria-hidden="true" />
            Curhat
          </button>
        </div>

        {activeTab === "forum" && <ForumTab currentUser={currentUser} />}
        {activeTab === "curhat" && <CurhatTab currentUser={currentUser} />}
      </div>
    </main>
  )
}
