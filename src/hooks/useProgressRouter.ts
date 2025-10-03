"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

// Custom event for programmatic navigation
export const NAVIGATION_START_EVENT = "navigation-start"

export function useProgressRouter() {
  const router = useRouter()

  const push = useCallback((href: string) => {
    // Dispatch custom event to trigger progress bar
    window.dispatchEvent(new CustomEvent(NAVIGATION_START_EVENT))
    router.push(href)
  }, [router])

  const replace = useCallback((href: string) => {
    window.dispatchEvent(new CustomEvent(NAVIGATION_START_EVENT))
    router.replace(href)
  }, [router])

  return {
    ...router,
    push,
    replace,
  }
}
