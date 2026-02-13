// ARQUIVO: app/(dashboard)/invoices/manual-invoice-form.tsx
'use client'

import * as React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { createManualInvoice, getUninvoicedBookings } from './actions'
import { Loader2, Save, Plus, Trash2, Import, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

const formSchema = z.object({
  customer_id: z.string().min(1, "Selecione um cliente"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
  items: z.array(z.object({
    description: z.string().min(1, "Descrição obrigatória"),
    amount: z.any(), // Handle string/number conversion
    quantity: z.number().min(1).default(1),
    booking_id: z.string().optional().nullable(),
    service_id: z.string().optional().nullable()
  })).min(1, "Adicione pelo menos um item")
})

export function ManualInvoiceForm({ customers }: { customers: any[] }) {
  const [mounted, setMounted] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [bookings, setBookings] = React.useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: "",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ description: "Serviço Avulso", amount: "0", quantity: 1 }]
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  })

  const customerId = form.watch('customer_id')

  React.useEffect(() => {
    if (customerId && mounted) {
      setLoadingBookings(true)
      getUninvoicedBookings(customerId)
        .then(data => {
          setBookings(data || [])
        })
        .finally(() => setLoadingBookings(false))
    } else {
      setBookings([])
    }
  }, [customerId, mounted])

  const selectedBookingIds = form.watch('items').map(i => i.booking_id).filter(Boolean)

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
      </div>
    )
  }


  const handleAddBooking = (booking: any) => {
    append({
      description: `Agendamento: ${booking.services?.name || 'Limpeza'} - ${new Date(booking.start_time).toLocaleDateString('pt-BR')}`,
      amount: booking.price,
      quantity: 1,
      booking_id: booking.id,
      service_id: booking.service_id
    })
    toast.success("Agendamento adicionado à fatura")
  }

  const items = form.watch('items')
  const total = items.reduce((acc, item) => acc + (Number(item.amount) * Number(item.quantity)), 0)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    const res = await createManualInvoice({
      customer_id: values.customer_id,
      due_date: values.due_date,
      items: values.items.map(i => ({
        description: i.description,
        amount: Number(i.amount),
        quantity: Number(i.quantity),
        booking_id: i.booking_id || undefined,
        service_id: i.service_id || undefined
      }))
    })

    if (res.success) {
      toast.success("Fatura criada com sucesso!")
      window.location.reload()
    } else {
      toast.error(res.error || "Erro ao criar fatura.")
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">

        {/* Top Section: Customer & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500 tracking-wider">Cliente / Proprietário</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500 tracking-wider">Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" className="h-11 rounded-xl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Uninvoiced Bookings Section */}
        {customerId && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Import size={14} /> Agendamentos Pendentes
            </h4>

            {loadingBookings ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : bookings.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {bookings.filter(b => !selectedBookingIds.includes(b.id)).map(booking => (
                  <div key={booking.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all">
                    <div>
                      <div className="text-sm font-bold text-slate-700">{booking.services?.name || 'Serviço'}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={10} /> {new Date(booking.start_time).toLocaleDateString('pt-BR')}
                        <span className="mx-1">•</span>
                        R$ {booking.price}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                      onClick={() => handleAddBooking(booking)}
                    >
                      <Plus size={12} /> Adicionar
                    </Button>
                  </div>
                ))}
                {bookings.filter(b => !selectedBookingIds.includes(b.id)).length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-2">Todos os agendamentos já foram adicionados.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhum agendamento pendente encontrado para este cliente.</p>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs font-bold uppercase text-slate-500 tracking-wider">Itens da Fatura</FormLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-indigo-600 font-bold hover:bg-indigo-50"
              onClick={() => append({ description: "", amount: "0", quantity: 1, booking_id: null })}
            >
              <Plus size={14} className="mr-1" /> Item Manual
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start animate-in fade-in slide-in-from-left-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Descrição do serviço" className="h-10 rounded-xl bg-slate-50/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className="w-20">
                      <FormControl>
                        <Input type="number" min="1" className="h-10 rounded-xl text-center" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.amount`}
                  render={({ field }) => (
                    <FormItem className="w-28">
                      <FormControl>
                        <Input type="number" step="0.01" className="h-10 rounded-xl font-bold bg-slate-50/50" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl shrink-0"
                  onClick={() => remove(index)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end pt-4 border-t border-dashed border-slate-200">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-3">Total Estimado</span>
              <span className="text-2xl font-black text-slate-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 h-12 rounded-xl shadow-lg shadow-indigo-100 font-bold hover:bg-indigo-700 transition-all active:scale-[0.98]">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Emitir Fatura (Híbrida)
          </Button>
        </div>
      </form>
    </Form>
  )
}
