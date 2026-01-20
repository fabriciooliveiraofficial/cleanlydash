// ARQUIVO: components/dashboard/stat-card.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  description?: string
  color?: string
  bg?: string
}

export function StatCard({ title, value, icon: Icon, description, color = "text-indigo-600", bg = "bg-indigo-50" }: StatCardProps) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", bg, color)}>
          <Icon size={18} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-slate-900 leading-none">{value}</div>
        {description && (
          <p className="mt-2 text-[10px] font-medium text-slate-400 italic">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
