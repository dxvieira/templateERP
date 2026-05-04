"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full flex justify-start items-center gap-4 px-4 h-12 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 group"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground group-hover:text-primary" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground group-hover:text-primary" />
      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
        {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
