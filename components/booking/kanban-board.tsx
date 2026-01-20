// ARQUIVO: components/booking/kanban-board.tsx
'use client'

import * as React from 'react'
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { updateBookingStatus } from '@/app/(dashboard)/calendar/actions'

const COLUMNS = [
  { id: 'pending', title: 'Pendente', color: 'amber' },
  { id: 'confirmed', title: 'Confirmado', color: 'blue' },
  { id: 'in_progress', title: 'Em Execução', color: 'indigo' },
  { id: 'completed', title: 'Concluído', color: 'emerald' },
]

export function KanbanBoard({ initialBookings }: { initialBookings: any[] }) {
  const [items, setItems] = React.useState<{ [key: string]: any[] }>({
    pending: initialBookings.filter(b => b.status === 'pending'),
    confirmed: initialBookings.filter(b => b.status === 'confirmed'),
    in_progress: initialBookings.filter(b => b.status === 'in_progress'),
    completed: initialBookings.filter(b => b.status === 'completed'),
  })

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeItem, setActiveItem] = React.useState<any | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const findContainer = (id: string) => {
    if (id in items) return id
    return Object.keys(items).find(key => items[key].find(item => item.id === id))
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    
    const container = findContainer(active.id as string)
    if (container) {
      const item = items[container].find(i => i.id === active.id)
      setActiveItem(item)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(active.id as string)
    const overContainer = findContainer(over.id as string)

    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setItems(prev => {
      const activeItems = prev[activeContainer]
      const overItems = prev[overContainer]
      const activeIndex = activeItems.findIndex(i => i.id === active.id)
      
      return {
        ...prev,
        [activeContainer]: activeItems.filter(i => i.id !== active.id),
        [overContainer]: [
          ...overItems,
          { ...activeItems[activeIndex], status: overContainer }
        ]
      }
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(active.id as string)
    const overContainer = findContainer(over.id as string)

    if (activeContainer && overContainer) {
      // Sincroniza com o banco de dados
      await updateBookingStatus(active.id as string, overContainer)
    }

    setActiveId(null)
    setActiveItem(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-6 overflow-x-auto pb-6 custom-scrollbar">
        {COLUMNS.map(col => (
          <KanbanColumn 
            key={col.id} 
            id={col.id} 
            title={col.title} 
            color={col.color} 
            items={items[col.id]} 
          />
        ))}
      </div>
      
      <DragOverlay>
        {activeId ? (
          <div className="rotate-3 opacity-90">
            <KanbanCard item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}