import { useEffect } from "react"
import { HeadContent, Scripts, createRootRoute, Outlet, useRouter } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { AuthProvider, useAuth } from "@/modules/auth"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Sekkha Vihara Community App",
      },
      {
        name: "description",
        content: "Sekkha Vihara Community App — Fellowship attendance, points gamification, activity streaks, and member management platform.",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/sekkha_logo.svg?v=2",
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/favicon.png?v=2",
      },
      {
        rel: "alternate icon",
        href: "/favicon.ico?v=2",
      },
      {
        rel: "apple-touch-icon",
        href: "/favicon.png?v=2",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RouterAuthSync() {
  const router = useRouter()
  const { authState } = useAuth()

  useEffect(() => {
    router.update({
      context: { authState },
    })
  }, [router, authState])

  return null
}

function RootComponent() {
  return (
    <AuthProvider>
      <RouterAuthSync />
      <Outlet />
    </AuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
