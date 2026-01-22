'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CardContent, CardFooter } from '@/components/ui/card'
import { Save, Loader2, Building2, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileFormProps {
    tenant: any
    userId?: string
}

export function ProfileForm({ tenant, userId }: ProfileFormProps) {
    const [loading, setLoading] = React.useState(false)
    const supabase = createClient()

    const [formData, setFormData] = React.useState({
        name: tenant?.name || '',
        phone: tenant?.phone || '',
        address: tenant?.address || '',
        zelle_id: tenant?.zelle_id || '',
        venmo_id: tenant?.venmo_id || '',
        check_instructions: tenant?.check_instructions || ''
    })

    const handleSave = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('tenant_profiles')
                .update({
                    name: formData.name,
                    zelle_id: formData.zelle_id,
                    venmo_id: formData.venmo_id,
                    check_instructions: formData.check_instructions,
                    phone: formData.phone,
                    address: formData.address
                } as any)
                .eq('id', tenant?.id)

            if (error) throw error

            toast.success("Perfil atualizado com sucesso!")
        } catch (err: any) {
            console.error(err)
            toast.error("Erro ao salvar alterações: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <CardContent className="space-y-6">
                {/* Logo Section */}
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
                        <p className="text-xs text-slate-500">PNG, JPG ou WEBP. Máx 2MB.</p>
                        <Button variant="outline" size="sm" className="mt-2 text-xs h-8">Substituir Logo</Button>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Fantasia</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Cleanly Services"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slug">Tenant Slug (URL ID)</Label>
                        <Input id="slug" value={tenant?.slug} disabled className="bg-slate-50 font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefone de Contato</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Endereço Principal</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Rua, Número, Cidade"
                        />
                    </div>
                </div>

                {/* Payment Methods Section */}
                <div className="pt-6 border-t">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Métodos de Pagamento (Manual)
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Preencha estes campos para oferecer opções de pagamento via Zelle, Venmo ou Check para seus clientes.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="zelle">Chave Zelle (E-mail ou Telefone)</Label>
                            <Input
                                id="zelle"
                                value={formData.zelle_id}
                                onChange={(e) => setFormData({ ...formData, zelle_id: e.target.value })}
                                placeholder="billing@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="venmo">ID Venmo (@usuario)</Label>
                            <Input
                                id="venmo"
                                value={formData.venmo_id}
                                onChange={(e) => setFormData({ ...formData, venmo_id: e.target.value })}
                                placeholder="@mybusiness"
                            />
                        </div>
                    </div>
                    <div className="space-y-2 mt-4">
                        <Label htmlFor="check">Instruções para Pagamento via Check</Label>
                        <Textarea
                            id="check"
                            value={formData.check_instructions}
                            onChange={(e) => setFormData({ ...formData, check_instructions: e.target.value })}
                            placeholder="Ex: Payable to Cleanly Services LLC..."
                            className="resize-none h-20"
                        />
                    </div>
                </div>
            </CardContent>

            <div className="flex items-center justify-end p-6 border-t bg-slate-50/50">
                <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 gap-2 min-w-[140px]"
                >
                    {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Save size={16} />
                    )}
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>
        </>
    )
}
