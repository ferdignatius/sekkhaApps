import type { Request, Response, NextFunction } from "express"
import { prisma } from "../../../lib/prisma"
import jwt from "jsonwebtoken"

// JWT Generator helper (matching service.ts logic)
function generateToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any }
  )
}

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow.
 * If client details are not configured, serves a mock Google Account chooser.
 */
export async function handleGoogleRedirect(req: Request, res: Response, next: NextFunction) {
  try {
    // If we wanted real Google OAuth, we'd check process.env.GOOGLE_CLIENT_ID here.
    // Since we are running local dev without client keys, serve the simulator.
    
    // Fetch all users to display as choices
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      orderBy: { name: "asc" }
    })

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Accounts - Sign In</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#F0F4F9] flex items-center justify-center min-h-screen font-sans">
  <div class="bg-white rounded-3xl p-10 shadow-sm border border-gray-200 w-full max-w-[450px]">
    <!-- Google Logo -->
    <div class="flex flex-col items-center mb-8">
      <svg class="w-12 h-12 mb-4" viewBox="0 0 24 24" width="24" height="24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
      </svg>
      <h1 class="text-2xl font-normal text-[#1F1F1F]">Pilih akun</h1>
      <p class="text-sm text-[#444746] mt-1">untuk melanjutkan ke Sekkha</p>
    </div>

    <!-- Account List -->
    <div class="space-y-1 mb-6 max-h-[250px] overflow-y-auto pr-1">
      ${users.map(u => `
        <a href="/api/auth/google/callback-mock?email=${encodeURIComponent(u.email)}" 
           class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F8FAFC] transition-colors border border-transparent hover:border-gray-100">
          <div class="w-8 h-8 rounded-full bg-[#E0E2EC] flex items-center justify-center font-bold text-[#1F1F1F] text-sm uppercase">
            ${u.name.charAt(0)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[#1F1F1F] truncate">${u.name}</p>
            <p class="text-xs text-[#444746] truncate">${u.email}</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">${u.role}</span>
        </a>
      `).join("")}
    </div>

    <!-- Add New Account Mode (Optional) -->
    <div class="border-t border-[#E3E3E3] pt-4">
      <h2 class="text-xs font-bold text-gray-400 uppercase mb-3">Gunakan akun lain</h2>
      <form action="/api/auth/google/callback-mock" method="GET" class="space-y-3">
        <div>
          <input type="text" name="name" required placeholder="Nama Lengkap" 
                 class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0B57D0]" />
        </div>
        <div class="flex gap-2">
          <input type="email" name="email" required placeholder="email@gmail.com" 
                 class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0B57D0]" />
          <button type="submit" class="bg-[#0B57D0] hover:bg-[#0842A0] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Masuk
          </button>
        </div>
      </form>
    </div>

    <div class="flex justify-between items-center text-xs text-[#747775] mt-8 pt-4 border-t border-[#E3E3E3]">
      <span>Indonesia</span>
      <div class="flex gap-3">
        <a href="#" class="hover:underline">Bantuan</a>
        <a href="#" class="hover:underline">Privasi</a>
        <a href="#" class="hover:underline">Persyaratan</a>
      </div>
    </div>
  </div>
</body>
</html>
    `
    res.send(html)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/google/callback-mock
 * Simulates receiving Google credentials. Registers or logs in the user,
 * then redirects to frontend app with JWT access token query parameter.
 */
export async function handleGoogleMockCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const email = req.query.email as string
    const name = req.query.name as string

    if (!email) {
      res.status(400).send("Parameter email diperlukan")
      return
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      const now = new Date()
      const yy = now.getFullYear().toString().slice(2)
      const mm = String(now.getMonth() + 1).padStart(2, "0")
      const dd = String(now.getDate()).padStart(2, "0")
      const prefix = `${yy}${mm}${dd}`
      const count = await prisma.user.count({ where: { userNumber: { startsWith: prefix } } })
      const userNumber = `${prefix}${String(count + 1).padStart(2, "0")}`

      // Register new user (from simulated Google profile)
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: "", // OAuth users don't need a local password
          role: "umat", // default role
          userNumber,
        },
      })
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role)

    // Redirect to frontend app
    res.redirect(`http://localhost:3000/login?token=${token}`)
  } catch (err) {
    next(err)
  }
}
