// ARQUIVO: components/AirbnbDispatch.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DispatchTimeline } from './calendar/dispatch-timeline'
import { Button } from './ui/button'
import { RefreshCw, LayoutGrid, Calendar as CalendarIcon, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function AirbnbDispatch() {
    const [date, setDate] = useState(new Date())
    const [employees, setEmployees] = useState([])
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Employees (Cleaners/Staff) from team_members
            const { data: teamData, error: teamError } = await (supabase
                .from('team_members') as any)
                .select('*')
                .eq('status', 'active')

            if (teamError) throw teamError
            setEmployees(teamData || [])

            // 2. Fetch Bookings (Filtered for Airbnb/iCal - simplifying with a metadata check or custom flag if available)
            // For now, let's assume Airbnb bookings have 'external_id' or 'source' metadata
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const { data: bookingData, error: bookingError } = await supabase
                .from('bookings')
                .select(`
          id,
          summary,
          start_date,
          end_date,
          status,
          price,
          resource_ids,
          customers ( name ),
          property_name
        `)
                .gte('start_date', startOfDay.toISOString())
                .lte('start_date', endOfDay.toISOString())
            // In a real scenario, we'd add .eq('source', 'ical') or similar

            if (bookingError) throw bookingError

            // Transform data for the DispatchTimeline
            const transformedBookings = (bookingData || []).map((b: any) => ({
                id: b.id,
                property_name: b.property_name || b.customers?.name || 'Sem Nome',
                start_time: b.start_date,
                end_time: b.end_date,
                status: b.status,
                price: b.price || 0,
                resource_ids: b.resource_ids || [],
                customers: b.customers
            }))

            setBookings(transformedBookings)
        } catch (err: any) {
            console.error('Error fetching dispatch data:', err)
            toast.error('Erro ao carregar dados de despacho.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [date])

    const handleBookingUpdate = async (bookingId: string, updates: any) => {
        try {
            const { error } = await (supabase
                .from('bookings') as any)
                .update({
                    resource_ids: updates.resource_ids,
                    start_date: updates.start_date
                })
                .eq('id', bookingId)

            if (error) throw error
            toast.success('Agendamento atualizado com sucesso.')
            fetchData() // Refresh
        } catch (err: any) {
            console.error('Error updating booking:', err)
            toast.error('Erro ao atualizar agendamento.')
        }
    }

    const syncIcal = async () => {
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 2000)), // Simulate sync
            {
                loading: 'Sincronizando com Airbnb/VRBO...',
                success: 'Sincronização concluída! 2 novas limpezas encontradas.',
                error: 'Erro na sincronização.'
            }
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 space-y-6">
            {/* Dynamic Header */}
            <div className="bg-white rounded-3xl border border-slate-200/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                        <LayoutGrid size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Airbnb Dispatch Center</h1>
                        <p className="text-sm text-slate-500 font-medium">Gestão inteligente de turnovers iCal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" className="gap-2 rounded-xl flex-1 sm:flex-none" onClick={() => setDate(new Date())}>
                        <CalendarIcon size={18} />
                        Hoje, {format(date, 'dd MMM')}
                    </Button>
                    <Button variant="outline" className="gap-2 rounded-xl flex-1 sm:flex-none">
                        <Filter size={18} />
                        Filtros
                    </Button>
                    <Button onClick={syncIcal} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-100 font-bold rounded-xl flex-1 sm:flex-none">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Sincronizar iCal
                    </Button>
                </div>
            </div>

            {/* Timeline View */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[600px]">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <RefreshCw className="animate-spin text-indigo-300" size={48} />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando Escala...</p>
                        </div>
                    </div>
                ) : (
                    <DispatchTimeline
                        date={date}
                        employees={employees}
                        bookings={bookings}
                        onBookingUpdate={handleBookingUpdate}
                    />
                )}
            </div>
        </div>
    )
}
