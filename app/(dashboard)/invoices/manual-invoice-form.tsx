// ARQUIVO: app/(dashboard)/invoices/manual-invoice-form.tsx
'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
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
import { createManualInvoice } from './actions'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

const formSchema = z.object({
  customer_id: z.string().min(1, "Selecione um cliente"),
  amount: z.string().min(1, "O valor é obrigatório"),
  due_date: z.string().min(1, "Data de vencimento é obrigatória"),
})

export function ManualInvoiceForm({ customers }: { customers: any[] }) {
  const [loading, setLoading] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: "",
      amount: "0",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    const res = await createManualInvoice({
      ...values,
      amount: parseFloat(values.amount)
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold uppercase text-slate-500 tracking-wider">Cliente / Proprietário</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione o cliente comercial" />
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500 tracking-wider">Valor Bruto (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" className="h-11 rounded-xl font-bold" {...field} />
                </FormControl>
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

        <div className="pt-6">
          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 h-12 rounded-xl shadow-lg shadow-indigo-100 font-bold">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Emitir Fatura em Rascunho
          </Button>
          <p className="text-[10px] text-slate-400 text-center mt-3 italic">
            * Ao emitir, a fatura ficará em status de Rascunho. Você poderá enviá-la para o e-mail do cliente posteriormente.
          </p>
        </div>
      </form>
    </Form>
  )
}
