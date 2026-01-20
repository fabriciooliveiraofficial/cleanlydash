
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button.tsx"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form.tsx"
import { Input } from "@/components/ui/input.tsx"
import { AddressAutocomplete } from "./address-autocomplete.tsx"
import { InternationalPhoneInput } from "@/components/ui/InternationalPhoneInput"
import { createClient } from "@/lib/supabase/client.ts"
import {
  Loader2, Save, User, Phone, MapPin, FileText,
  Building2, Mail, KeyRound, ChevronRight, ChevronLeft, Check
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
// react-phone-number-input and styles are now managed inside InternationalPhoneInput

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  company: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().min(5, "O endereço completo é necessário"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  access_notes: z.string().optional(),
  notes: z.string().optional(),
  geofence_radius: z.number().min(10, "Raio mínimo é 10m").max(5000, "Raio máximo é 5km").default(200),
})

type FormData = z.infer<typeof formSchema>

const tabs = [
  { id: 'basic', label: 'Básico', icon: User },
  { id: 'contact', label: 'Contato', icon: Phone },
  { id: 'location', label: 'Localização', icon: MapPin },
  { id: 'notes', label: 'Notas', icon: FileText },
]

export function CustomerForm({ onSuccess, customer }: { onSuccess?: () => void, customer?: any }) {
  const [loading, setLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState(0)
  const supabase = createClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer?.name || "",
      company: customer?.company || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      whatsapp: customer?.whatsapp || "",
      address: customer?.address || "",
      lat: customer?.latitude || undefined,
      lng: customer?.longitude || undefined,
      access_notes: customer?.access_notes || "",
      notes: customer?.notes || "",
      geofence_radius: customer?.geofence_radius || 200,
    },
  })

  async function onSubmit(values: FormData) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Não autorizado")

      const payload = {
        name: values.name,
        company: values.company || null,
        email: values.email || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        address: values.address,
        latitude: values.lat,
        longitude: values.lng,
        access_notes: values.access_notes || null,
        notes: values.notes || null,
        geofence_radius: values.geofence_radius,
        status: 'active'
      }

      let error;

      if (customer?.id) {
        // Update
        const { error: updateError } = await supabase
          .from('customers')
          .update(payload as any)
          .eq('id', customer.id);
        error = updateError;
      } else {
        // Insert
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (!profile) throw new Error("Perfil não encontrado")
        const tid = (profile as any).tenant_id;

        // 🔍 Smart Check: Evitar conflito 409
        if (payload.phone || payload.email) {
          const filters = [];
          if (payload.phone) filters.push(`phone.eq.${payload.phone}`);
          if (payload.email) filters.push(`email.eq.${payload.email}`);

          const { data: existing } = await supabase
            .from('customers')
            .select('*')
            .eq('tenant_id', tid)
            .or(filters.join(','))
            .maybeSingle();

          if (existing) {
            toast.info("Este cliente já existe no sistema. Atualizando dados...");
            // Se já existe, transformamos o insert em update silencioso ou apenas retornamos sucesso
            const { error: updateError } = await supabase
              .from('customers')
              .update(payload as any)
              .eq('id', (existing as any).id);
            error = updateError;
          } else {
            const { error: insertError } = await supabase.from('customers').insert({
              ...payload,
              tenant_id: tid,
            } as any);
            error = insertError;
          }
        } else {
          const { error: insertError } = await supabase.from('customers').insert({
            ...payload,
            tenant_id: tid,
          } as any);
          error = insertError;
        }
      }

      if (error) throw error

      toast.success(customer ? "Cliente atualizado!" : "Cliente cadastrado!")
      if (!customer) {
        form.reset()
        setActiveTab(0)
      }
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cliente")
    } finally {
      setLoading(false)
    }
  }

  const nextTab = () => setActiveTab(prev => Math.min(prev + 1, tabs.length - 1))
  const prevTab = () => setActiveTab(prev => Math.max(prev - 1, 0))
  const isLastTab = activeTab === tabs.length - 1

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 mb-4 pb-2">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(index)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all rounded-lg",
                activeTab === index
                  ? "text-indigo-600 bg-indigo-50 border border-indigo-200"
                  : "text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-[200px]">
          {/* Tab: Básico */}
          {activeTab === 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente / Imóvel *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Apartamento Jardins - João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa (opcional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Nome da empresa" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Tab: Contato */}
          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <InternationalPhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Digite o número de telefone"
                        defaultCountry="BR"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp (se diferente)</FormLabel>
                    <FormControl>
                      <InternationalPhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Digite o número do WhatsApp"
                        defaultCountry="BR"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="cliente@exemplo.com" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Tab: Localização */}
          {activeTab === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço Completo *</FormLabel>
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
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="geofence_radius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raio do Geofencing (metros)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-indigo-400" />
                        <Input
                          type="number"
                          placeholder="Ex: 200"
                          className="pl-9"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Define a distância máxima permitida para o Check-in no local. Padrão: 200m.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="access_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <KeyRound size={14} className="text-amber-500" />
                      Instruções de Acesso para Cleaners
                    </FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Código do chaveiro, portaria, onde está a chave..."
                        className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 resize-none"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Tab: Notas */}
          {activeTab === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Internas</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Anotações internas sobre este cliente (não visíveis para cleaners)..."
                        className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 resize-none"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2 font-semibold">
                  <Check size={16} />
                  Tudo pronto!
                </div>
                <p className="mt-1 text-xs">Revise as informações e clique em Salvar Cliente.</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation & Submit */}
        <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4">
          {activeTab > 0 && (
            <Button type="button" variant="outline" onClick={prevTab} className="gap-1">
              <ChevronLeft size={16} /> Voltar
            </Button>
          )}

          {!isLastTab ? (
            <Button type="button" onClick={nextTab} className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-1">
              Próximo <ChevronRight size={16} />
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Salvar Cliente</>
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}