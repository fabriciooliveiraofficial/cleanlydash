// ARQUIVO: app/(dashboard)/customers/customer-form.tsx
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete } from "@/components/crm/address-autocomplete"
import { createCustomer } from "./actions"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner" // Assumindo disponibilidade ou use alert

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().min(5, "O endereço completo é necessário para rotas"),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export function CustomerForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    const res = await createCustomer(values)
    
    if (res.success) {
      form.reset()
      if (onSuccess) onSuccess()
      window.location.reload() 
    } else {
      alert(res.error || "Ocorreu um erro ao salvar.")
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 font-semibold">Nome do Cliente / Imóvel</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Loft Design Jardins" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-semibold">E-mail para Recibos</FormLabel>
                <FormControl>
                  <Input placeholder="contato@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-semibold">WhatsApp / Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(11) 99999-9999" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-slate-700 font-semibold">Localização Geográfica</FormLabel>
              <FormControl>
                <AddressAutocomplete 
                  onSelect={(res) => {
                    form.setValue('address', res.fullAddress)
                    form.setValue('lat', res.lat)
                    form.setValue('lng', res.lng)
                  }}
                  defaultValue={field.value}
                />
              </FormControl>
              <FormMessage />
              <p className="text-[10px] text-slate-400 italic">
                * Usamos estas coordenadas para otimizar a rota da equipe de limpeza.
              </p>
            </FormItem>
          )}
        />

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 py-6"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <><Save className="mr-2 h-5 w-5" /> Salvar Cliente</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}