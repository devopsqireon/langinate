"use client"

import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

const authRoutes = ['/login', '/signup', '/auth']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <div className="flex h-16 items-center border-b px-4">
          <SidebarTrigger />
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}