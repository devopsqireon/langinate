"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { NAVIGATION_START_EVENT } from "@/hooks/useProgressRouter"

export default function NavigationEvents() {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  // Complete progress when pathname changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  // Start progress on link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")

      if (link) {
        const href = link.getAttribute("href")

        // Check if it's an internal link
        if (
          href &&
          href.startsWith("/") &&
          !href.startsWith("//") &&
          href !== pathname
        ) {
          setIsNavigating(true)
        }
      }
    }

    // Listen for programmatic navigation (router.push)
    const handleNavigationStart = () => {
      setIsNavigating(true)
    }

    document.addEventListener("click", handleClick)
    window.addEventListener(NAVIGATION_START_EVENT, handleNavigationStart)

    return () => {
      document.removeEventListener("click", handleClick)
      window.removeEventListener(NAVIGATION_START_EVENT, handleNavigationStart)
    }
  }, [pathname])

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-1 bg-blue-600 z-50 transition-all duration-300 ${
        isNavigating ? "opacity-100" : "opacity-0"
      }`}
      style={{
        width: isNavigating ? "70%" : "0%",
        transition: isNavigating ? "width 2s ease-out" : "width 0.3s ease-in, opacity 0.3s",
      }}
    />
  )
}
