// ARQUIVO: app/(dashboard)/settings/general/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Building2, Save, Upload } from 'lucide-react'
import { ProfileForm } from './ProfileForm'

export default async function GeneralSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenants(*)')
    .eq('id', user?.id)
    .single()

  const tenant = profile?.tenants

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Perfil da Empresa</CardTitle>
          <CardDescription>
            Essas informações aparecerão nos recibos e comunicações com clientes.
          </CardDescription>
        </CardHeader>
        <ProfileForm tenant={tenant} userId={user?.id} />
      </Card>

      <Card className="border-red-100 bg-red-50/20">
        <CardHeader>
          <CardTitle className="text-red-700 text-base">Zona de Perigo</CardTitle>
          <CardDescription className="text-red-600/80">
            A exclusão da empresa é irreversível e apagará todos os agendamentos e histórico financeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm">Excluir Conta da Empresa</Button>
        </CardContent>
      </Card>
    </div>
  )
}
