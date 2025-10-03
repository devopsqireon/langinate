"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import NProgress from "nprogress"

export default function NavigationEvents() {
  const pathname = usePathname()

  useEffect(() => {
    NProgress.done()
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")

      if (!link) return

      const href = link.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("http")) return

      // Check if it's an internal link that would trigger navigation
      if (href && href !== pathname && !link.hasAttribute("target")) {
        NProgress.start()
      }
    }

    const handleRouteChange = () => {
      NProgress.start()
    }

    // Listen for link clicks
    document.addEventListener("click", handleClick, true)

    // Listen for browser navigation
    window.addEventListener("popstate", handleRouteChange)

    return () => {
      document.removeEventListener("click", handleClick, true)
      window.removeEventListener("popstate", handleRouteChange)
    }
  }, [pathname])

  return null
}
