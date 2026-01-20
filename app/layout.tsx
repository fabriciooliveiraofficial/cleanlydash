
// ARQUIVO: app/layout.tsx
import React from "react"
import type { Metadata } from "next"
import { cn } from "../lib/utils"

export const metadata: Metadata = {
  title: "AirGoverness | Gestão de Turnovers",
  description: "Plataforma profissional para gestão de operações em locações de curta temporada.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased"
      )}>
        {children}
      </body>
    </html>
  )
}
