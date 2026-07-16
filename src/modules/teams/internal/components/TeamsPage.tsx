import { useEffect, useState } from "react"
import { UsersIcon, MailIcon, PlusIcon, SearchIcon, UserPlusIcon, ClockIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { teamsApi } from "../api/teamsApi"
import type { MemberDto, InvitationDto } from "../api/teamsApi"

export function TeamsPage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [members, setMembers] = useState<MemberDto[]>([])
  const [invitations, setInvitations] = useState<InvitationDto[]>([])
  const [loading, setLoading] = useState(true)

  // Invite Form State
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"pengurus" | "aktivis">("aktivis")
  const [submitting, setSubmitting] = useState(false)

  // Search State
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [membersData, invitationsData] = await Promise.all([
        teamsApi.listMembers(),
        teamsApi.listInvitations(),
      ])
      setMembers(membersData)
      setInvitations(invitationsData)
    } catch (err) {
      console.error("Gagal memuat data tim:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      setSubmitting(true)
      await teamsApi.sendInvitation({ email: inviteEmail.trim(), role: inviteRole })
      alert("Undangan sukses dikirim!")
      setInviteEmail("")
      setShowInviteForm(false)
      // Reload invitations list
      const invitationsData = await teamsApi.listInvitations()
      setInvitations(invitationsData)
    } catch (err: any) {
      alert(err.message || "Gagal mengirim undangan")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const roleBadgeStyle = {
    admin: "bg-red-50 text-red-700 border-red-200",
    pengurus: "bg-sekkha-teal-light text-sekkha-brand-blue border-sekkha-brand-blue/20",
    aktivis: "bg-blue-50 text-blue-700 border-blue-200",
    umat: "bg-sekkha-surface text-sekkha-slate border-sekkha-hairline-soft",
  }

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Beranda", href: "/home" }, { label: "Teams" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersIcon className="size-5 text-sekkha-brand-blue" />
              <h1 className="text-heading-5 text-sekkha-ink">Anggota Tim</h1>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowInviteForm(true)}
                className="flex items-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90"
              >
                <PlusIcon className="size-4" />
                Undang Pengurus/Aktivis
              </button>
            )}
          </div>

          {/* Invite Form Card */}
          {showInviteForm && isAdmin && (
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <UserPlusIcon className="size-4 text-sekkha-brand-blue" />
                <h2 className="text-body-sm-medium text-sekkha-ink">Undang Peran Baru</h2>
              </div>
              <form onSubmit={handleInviteSubmit} className="grid gap-4 sm:grid-cols-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invite-email" className="text-caption text-sekkha-slate">Email Pengguna</label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue bg-sekkha-canvas"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="invite-role" className="text-caption text-sekkha-slate">Role Target</label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as "pengurus" | "aktivis")}
                    className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue bg-sekkha-canvas"
                  >
                    <option value="aktivis">Aktivis</option>
                    <option value="pengurus">Pengurus</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="flex-1 rounded-full border border-sekkha-hairline-strong py-2 text-body-sm-medium text-sekkha-ink transition-colors hover:bg-sekkha-surface"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-full bg-sekkha-primary py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Mengirim..." : "Kirim"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Main Content Split (Members & Invitations) */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Members List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-body-sm-medium text-sekkha-ink">Daftar Pengguna ({filteredMembers.length})</h2>
                
                {/* Search */}
                <div className="relative w-48 sm:w-64">
                  <SearchIcon className="absolute left-3 top-2.5 size-4 text-sekkha-slate" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari anggota..."
                    className="w-full rounded-full border border-sekkha-hairline-strong bg-sekkha-canvas pl-9 pr-4 py-1.5 text-caption text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>
              </div>

              {loading ? (
                <div className="h-64 flex items-center justify-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
                  <span className="text-body-sm text-sekkha-muted">Memuat data...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="h-64 flex items-center justify-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
                  <span className="text-body-sm text-sekkha-muted">Anggota tidak ditemukan.</span>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-body-sm">
                      <thead>
                        <tr className="border-b border-sekkha-hairline-soft bg-sekkha-surface">
                          <th className="px-4 py-3 font-medium text-sekkha-slate">Nama</th>
                          <th className="px-4 py-3 font-medium text-sekkha-slate">Email</th>
                          <th className="px-4 py-3 font-medium text-sekkha-slate">Role</th>
                          <th className="hidden sm:table-cell px-4 py-3 font-medium text-sekkha-slate">Asal Sekolah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map(m => (
                          <tr key={m.id} className="border-b border-sekkha-hairline-soft last:border-0 hover:bg-sekkha-surface/40">
                            <td className="px-4 py-3 font-medium text-sekkha-ink">{m.name}</td>
                            <td className="px-4 py-3 text-sekkha-slate">{m.email}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block rounded-full border px-2 py-0.5 text-caption-bold capitalize ${roleBadgeStyle[m.role]}`}>
                                {m.role}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 text-sekkha-muted">{m.school || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Invitations List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-body-sm-medium text-sekkha-ink">Riwayat Undangan</h2>
                <ClockIcon className="size-4 text-sekkha-slate" />
              </div>

              {loading ? (
                <div className="h-64 flex items-center justify-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
                  <span className="text-body-sm text-sekkha-muted">Memuat data...</span>
                </div>
              ) : invitations.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas text-center p-4">
                  <MailIcon className="size-6 text-sekkha-slate mb-1" />
                  <span className="text-caption text-sekkha-muted">Belum ada undangan dikirim.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.map(inv => {
                    const statusStyles = {
                      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
                      accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      rejected: "bg-red-50 text-red-700 border-red-200",
                    }

                    return (
                      <div key={inv.id} className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 space-y-1 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-center">
                          <p className="text-caption-bold text-sekkha-ink truncate max-w-[150px]">{inv.email}</p>
                          <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold capitalize ${statusStyles[inv.status]}`}>
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-caption text-sekkha-slate capitalize">Undangan: <span className="font-semibold">{inv.role}</span></p>
                        <div className="flex justify-between text-[9px] text-sekkha-muted pt-1 border-t border-sekkha-hairline-soft mt-1">
                          <span>Pengundang: {inv.invited_by.name}</span>
                          <span>
                            {new Date(inv.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </main>
  )
}
