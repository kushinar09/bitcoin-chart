"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Bitcoin } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export function Header() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full flex h-14 items-center px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Bitcoin className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">Bitcoin Chart</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center gap-2">
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
