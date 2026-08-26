import { useState } from "react"
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, UserIcon } from "lucide-react"
import { Input } from "@/components/base/Input"

interface AuthFormFieldProps {
  id: string
  label: string
  type: "email" | "password" | "text"
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string | null
}

export function AuthFormField({
  id,
  label,
  type,
  value,
  placeholder,
  onChange,
  onBlur,
  error,
}: AuthFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordType = type === "password"
  const resolvedType = isPasswordType ? (showPassword ? "text" : "password") : type

  const startIcon =
    type === "email" ? (
      <MailIcon className="size-4.5" />
    ) : type === "password" ? (
      <LockIcon className="size-4.5" />
    ) : (
      <UserIcon className="size-4.5" />
    )

  const endIcon = isPasswordType ? (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => setShowPassword(!showPassword)}
      className="flex items-center justify-center text-sekkha-slate hover:text-sekkha-ink focus:outline-none transition-colors p-1 rounded-lg cursor-pointer"
      title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
    >
      {showPassword ? (
        <EyeOffIcon className="size-4" />
      ) : (
        <EyeIcon className="size-4" />
      )}
    </button>
  ) : undefined

  return (
    <Input
      id={id}
      label={label}
      type={resolvedType}
      value={value}
      placeholder={
        placeholder ||
        (type === "email"
          ? "nama@email.com"
          : type === "password"
          ? "••••••••"
          : "")
      }
      autoComplete={
        type === "email"
          ? "email"
          : type === "password"
          ? id === "confirmPassword"
            ? "new-password"
            : "current-password"
          : "off"
      }
      startIcon={startIcon}
      endIcon={endIcon}
      error={error}
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
