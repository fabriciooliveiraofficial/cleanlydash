// ARQUIVO: components/booking/kanban-card.tsx
'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, DollarSign, User, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

// Fixed: Defined as React.FC to ensure TS recognizes this as a React component and allows the 'key' prop in mappings
export const KanbanCard: React.FC<{ item: any }> = ({ item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  if (!item) return null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md",
        isDragging && "opacity-50 z-50 grayscale"
      )}
    >
      <div className="mb-2">
        <h4 className="font-bold text-slate-900 leading-none">{item.customers?.name || 'Cliente'}</h4>
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <MapPin size={10} className="text-indigo-500" />
          <span className="truncate max-w-[180px]">{item.property_name}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
          <Clock size={12} className="text-amber-500" />
          {new Date(item.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center gap-3">
          {item.cleaner_pay_rate > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md shadow-sm" title="Repasse Profissional">
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter opacity-70">Pay:</span>
              <span className="text-[10px] font-bold text-emerald-700">R${item.cleaner_pay_rate}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5 text-xs font-black text-indigo-600" title="Preço Cliente">
            <span className="text-[10px] font-medium opacity-50">R$</span>
            {item.price}
          </div>
        </div>
      </div>
    </div>
  )
}
