// feature/profile/components/SettingsSection
// Settings section: account management items + logout (destructive, always last).

import {
  LogOutIcon,
  KeyRoundIcon,
  BellIcon,
  ChevronRightIcon,
  TargetIcon,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SettingsSectionProps {
  onLogout: () => void
  onChangePassword?: () => void
  onNotificationSettings?: () => void
  onMonthlyTargetSettings?: () => void
}

interface SettingsItem {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  onClick: () => void
  variant?: "default" | "danger"
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SettingsSection({
  onLogout,
  onChangePassword,
  onNotificationSettings,
  onMonthlyTargetSettings,
}: SettingsSectionProps) {
  const items: SettingsItem[] = [
    {
      id: "target",
      icon: TargetIcon,
      label: "Target Kehadiran Bulanan",
      description: "Atur target jumlah kehadiran kamu setiap bulan",
      onClick: onMonthlyTargetSettings ?? (() => {}),
    },
    {
      id: "password",
      icon: KeyRoundIcon,
      label: "Ubah Kata Sandi",
      description: "Ganti password akun kamu",
      onClick: onChangePassword ?? (() => {}),
    },
    {
      id: "notifications",
      icon: BellIcon,
      label: "Notifikasi",
      description: "Atur pengingat kebaktian dan event",
      onClick: onNotificationSettings ?? (() => {}),
    },
    {
      id: "logout",
      icon: LogOutIcon,
      label: "Keluar",
      description: "Keluar dari akun Sekkha kamu",
      onClick: onLogout,
      variant: "danger",
    },
  ]

  return (
    <section
      aria-labelledby="settings-heading"
      className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-blue-50/20 backdrop-blur-md shadow-xs transition-all hover:shadow-md"
    >
      <div className="border-b border-sekkha-hairline-soft px-5 py-4">
        <h2
          id="settings-heading"
          className="text-body-sm-medium text-sekkha-ink"
        >
          Pengaturan
        </h2>
      </div>

      <ul role="list">
        {items.map((item, idx) => {
          const Icon = item.icon
          const isDanger = item.variant === "danger"

          return (
            <li key={item.id}>
              {idx > 0 && (
                <div className="mx-5 h-px bg-sekkha-hairline-soft" aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={item.onClick}
                className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-sekkha-surface active:bg-sekkha-hairline-soft ${
                  isDanger ? "text-red-600" : "text-sekkha-ink"
                }`}
                aria-label={item.label}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isDanger ? "bg-red-50" : "bg-sekkha-surface"
                  }`}
                >
                  <Icon
                    className={`size-4 ${
                      isDanger ? "text-red-500" : "text-sekkha-slate"
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-body-sm-medium ${
                      isDanger ? "text-red-600" : "text-sekkha-ink"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-caption text-sekkha-muted">
                    {item.description}
                  </p>
                </div>

                <ChevronRightIcon
                  className={`ml-auto size-4 shrink-0 ${
                    isDanger ? "text-red-400" : "text-sekkha-muted"
                  }`}
                  aria-hidden="true"
                />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
