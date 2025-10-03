"use client"

import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import NavigationEvents from "@/components/NavigationEvents"
import { SubscriptionGate } from "@/components/subscription-gate"
import { SubscriptionStatusBanner } from "@/components/subscription-status-banner"

const authRoutes = ['/login', '/signup', '/auth']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  if (isAuthRoute) {
    return (
      <>
        <NavigationEvents />
        {children}
      </>
    )
  }

  return (
    <SidebarProvider>
      <NavigationEvents />
      <SubscriptionGate>
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <SubscriptionStatusBanner />
          <div className="flex h-16 items-center border-b px-4">
            <SidebarTrigger />
          </div>
          <div className="p-6 flex-1">
            {children}
          </div>
        </main>
      </SubscriptionGate>
    </SidebarProvider>
  )
}