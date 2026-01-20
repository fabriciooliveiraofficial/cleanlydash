// ARQUIVO: app/(dashboard)/settings/general/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Building2, Save, Upload } from 'lucide-react'

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
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6 pb-4">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  <Building2 size={32} />
                )}
              </div>
              <button className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={18} />
              </button>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Logo da Empresa</h4>
              <p className="text-xs text-slate-500">Formatos aceitos: PNG, JPG ou WEBP. Máx 2MB.</p>
              <Button variant="outline" size="sm" className="mt-2">Substituir Logo</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Fantasia</Label>
              <Input id="name" defaultValue={tenant?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Tenant Slug (URL ID)</Label>
              <Input id="slug" defaultValue={tenant?.slug} disabled className="bg-slate-50 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone de Contato</Label>
              <Input id="phone" placeholder="+55 (11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Operacional</Label>
              <Input id="email" defaultValue={user?.email} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço Sede</Label>
            <Input id="address" placeholder="Rua, Número, Bairro, Cidade - UF" />
          </div>
        </CardContent>
        <div className="flex items-center justify-end p-6 border-t bg-slate-50/50">
          <Button className="bg-indigo-600 gap-2">
            <Save size={16} />
            Salvar Alterações
          </Button>
        </div>
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
