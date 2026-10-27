import { api } from "@/lib/api"

export type UserRole = "member" | "activist" | "organizer" | "admin"

export interface UserStatsDto {
  total_points: number
  current_streak: number
  total_attendances: number
}

export interface UserProfileDto {
  id: string
  user_number?: number | string | null
  username: string
  name: string
  email: string
  email_verified: boolean
  role: UserRole
  school_id?: string | null
  school?: string | null
  phone?: string | null
  date_of_birth?: string | null
  stats?: UserStatsDto
  joined_at?: string
}

export interface UpdateProfilePayload {
  username?: string
  name?: string
  phone?: string | null
  school_id?: string | null
  school?: string | null
  date_of_birth?: string | null
}

export interface PointTransactionDto {
  id: string
  points: number
  points_delta?: number
  type: string
  description: string
  running_balance?: number
  created_at: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  otp: string
}

export interface RequestChangePasswordOtpResult {
  expires_in_seconds?: number
  resend_after_seconds?: number
  masked_email?: string
}

export interface ChangePasswordResult {
  success?: boolean
  message?: string
  accessToken?: string
  password_changed_by_user?: boolean
}

export interface VerifiedSchoolDto {
  id: string
  name: string
  type?: string
}

export const userApi = {
  getProfile: async (): Promise<UserProfileDto> => {
    const res = await api.get<any>("/users/me")
    if (res && res.data) return res.data
    return res
  },

  updateProfile: async (
    payload: UpdateProfilePayload
  ): Promise<UserProfileDto> => {
    // Try PUT /users/me/profile first, fallback to PATCH /users/me
    try {
      const res = await api.put<any>("/users/me/profile", payload)
      if (res && res.data) return res.data
      return res
    } catch {
      const res = await api.patch<any>("/users/me", payload)
      if (res && res.data) return res.data
      return res
    }
  },

  getPointsHistory: async (
    limit: number = 50
  ): Promise<PointTransactionDto[]> => {
    try {
      const res = await api.get<any>(`/users/me/points-history?limit=${limit}`)
      if (Array.isArray(res)) return res
      if (res && Array.isArray(res.data)) return res.data
      if (res && Array.isArray(res.items)) return res.items
      return []
    } catch {
      try {
        const fallback = await api.get<any>(
          `/users/me/point-transactions?limit=${limit}`
        )
        if (Array.isArray(fallback)) return fallback
        if (fallback && Array.isArray(fallback.data)) return fallback.data
        if (fallback && Array.isArray(fallback.items)) return fallback.items
        return []
      } catch {
        return []
      }
    }
  },

  requestChangePasswordOtp: async (
    currentPassword?: string
  ): Promise<RequestChangePasswordOtpResult> => {
    const res = await api.post<any>("/users/change-password/request-otp", {
      current_password: currentPassword,
    })
    return res?.data || res
  },

  changePassword: async (
    payload: ChangePasswordPayload
  ): Promise<ChangePasswordResult> => {
    const res = await api.post<any>("/users/change-password", {
      current_password: payload.current_password,
      new_password: payload.new_password,
      otp: payload.otp,
    })
    return res?.data || res
  },

  requestEmailVerification: async (
    newEmail: string
  ): Promise<{
    expires_in_seconds?: number
    resend_after_seconds?: number
  }> => {
    const res = await api.post<any>("/users/email-verification/request", {
      email: newEmail.trim().toLowerCase(),
    })
    return res?.data || res
  },

  confirmEmailVerification: async (
    code: string
  ): Promise<{ email: string; email_verified: boolean }> => {
    const res = await api.post<any>("/users/email-verification/confirm", {
      code: code.trim(),
    })
    return res?.data || res
  },

  getVerifiedSchools: async (): Promise<VerifiedSchoolDto[]> => {
    try {
      const res = await api.get<any>("/schools?limit=100&is_active=true")
      if (Array.isArray(res)) return res
      if (res && Array.isArray(res.data)) return res.data
      if (res && Array.isArray(res.schools)) return res.schools
      if (res && Array.isArray(res.items)) return res.items
      return []
    } catch {
      try {
        const fallback = await api.get<any>("/schools")
        if (Array.isArray(fallback)) return fallback
        if (fallback && Array.isArray(fallback.data)) return fallback.data
        if (fallback && Array.isArray(fallback.schools)) return fallback.schools
        if (fallback && Array.isArray(fallback.items)) return fallback.items
        return []
      } catch {
        return []
      }
    }
  },
}
