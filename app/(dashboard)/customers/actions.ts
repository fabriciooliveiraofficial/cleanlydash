// ARQUIVO: app/(dashboard)/customers/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().min(5, "O endereço é obrigatório"),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export async function createCustomer(data: z.infer<typeof customerSchema>) {
  const supabase = createClient()
  
  // 1. Validar inputs
  const validatedFields = customerSchema.safeParse(data)
  if (!validatedFields.success) {
    return { error: "Dados inválidos: " + validatedFields.error.message }
  }

  // 2. Obter Tenant ID do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Perfil não encontrado" }

  // 3. Inserir no banco
  const { error } = await supabase.from('customers').insert({
    tenant_id: profile.tenant_id,
    name: validatedFields.data.name,
    email: validatedFields.data.email || null,
    phone: validatedFields.data.phone || null,
    address: validatedFields.data.address,
    lat: validatedFields.data.lat,
    lng: validatedFields.data.lng,
    status: 'active'
  })

  if (error) {
    console.error("Supabase Error:", error)
    return { error: "Falha ao salvar no banco de dados." }
  }

  revalidatePath('/dashboard/customers')
  return { success: true }
}