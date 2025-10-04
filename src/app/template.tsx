"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import NProgress from "nprogress"

function ProgressWatcher() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  return null
}

export default function Template({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest("a")

      if (anchor) {
        const href = anchor.getAttribute("href")

        // Start progress for internal navigation
        if (href &&
            !href.startsWith("http") &&
            !href.startsWith("#") &&
            !href.startsWith("mailto:") &&
            !href.startsWith("tel:") &&
            !anchor.hasAttribute("target")) {
          NProgress.start()
        }
      }
    }

    // Add button clicks that might trigger navigation
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const button = target.closest("button")

      if (button && (
        button.textContent?.includes("View") ||
        button.textContent?.includes("Details") ||
        button.onclick
      )) {
        NProgress.start()
      }
    }

    document.addEventListener("click", handleClick, { capture: true })
    document.addEventListener("click", handleButtonClick, { capture: true })

    return () => {
      document.removeEventListener("click", handleClick, { capture: true })
      document.removeEventListener("click", handleButtonClick, { capture: true })
    }
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <ProgressWatcher />
      </Suspense>
      {children}
    </>
  )
}
