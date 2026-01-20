// ARQUIVO: components/booking/kanban-column.tsx
'use client'

import * as React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import { cn } from '@/lib/utils'

interface KanbanColumnProps {
  id: string;
  title: string;
  items: any[];
  color: string;
}

// Fixed: Defined as React.FC to ensure TS recognizes this as a React component and allows the 'key' prop in mappings
export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, items, color }) => {
  const { setNodeRef } = useDroppable({ id })

  const bgColors: any = {
    amber: 'bg-amber-50/50 border-amber-100',
    blue: 'bg-blue-50/50 border-blue-100',
    indigo: 'bg-indigo-50/50 border-indigo-100',
    emerald: 'bg-emerald-50/50 border-emerald-100'
  }

  const textColors: any = {
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700'
  }

  return (
    <div className={cn("flex min-w-[300px] flex-1 flex-col gap-4 rounded-2xl border p-3", bgColors[color])}>
      <div className="flex items-center justify-between px-2">
        <h3 className={cn("text-xs font-bold uppercase tracking-widest", textColors[color])}>
          {title}
        </h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400 shadow-sm ring-1 ring-slate-100">
          {items.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-3 min-h-[150px]">
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <KanbanCard key={item.id} item={item} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
