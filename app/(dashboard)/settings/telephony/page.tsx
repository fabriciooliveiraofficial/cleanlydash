// ARQUIVO: app/(dashboard)/settings/telephony/page.tsx
'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Phone, Search, Plus, Loader2, Globe, ShieldCheck } from 'lucide-react'
import { searchAvailableNumbers, purchaseNumber } from './actions'
import { toast } from 'sonner'

export default function TelephonyPage() {
  const [areaCode, setAreaCode] = React.useState('201')
  const [searching, setSearching] = React.useState(false)
  const [results, setResults] = React.useState<any[]>([])
  const [purchasing, setPurchasing] = React.useState<string | null>(null)

  const handleSearch = async () => {
    setSearching(true)
    const res = await searchAvailableNumbers(areaCode)
    setSearching(false)
    if (res.error) toast.error(res.error)
    else setResults(res.data || [])
  }

  const handlePurchase = async (number: string) => {
    if (!confirm(`Confirmar a compra do número ${number}? O custo de R$ 10,00 será debitado da sua Wallet.`)) return
    
    setPurchasing(number)
    const res = await purchaseNumber(number)
    setPurchasing(null)

    if (res.success) {
      toast.success("Número adquirido com sucesso!")
      setResults(prev => prev.filter(r => r.phone_number !== number))
    } else {
      toast.error(res.error || "Erro ao processar compra.")
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Telefonia Corporativa</h2>
        <p className="text-slate-500 text-sm font-medium">Provisione números profissionais e automatize a comunicação da sua equipe.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Adquirir Número */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Globe className="text-indigo-600 h-5 w-5" />
              Adquirir Novo Número
            </CardTitle>
            <CardDescription>Busque números disponíveis por código de área (EUA/CAN).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="DDD (ex: 201)" 
                value={areaCode}
                onChange={e => setAreaCode(e.target.value)}
                className="font-bold"
              />
              <Button onClick={handleSearch} disabled={searching} className="bg-indigo-600">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={18} />}
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {results.length > 0 ? (
                results.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 group hover:bg-white hover:border-indigo-200 transition-all">
                    <span className="font-mono font-bold text-slate-700">{item.phone_number}</span>
                    <Button 
                      size="sm" 
                      onClick={() => handlePurchase(item.phone_number)}
                      disabled={!!purchasing}
                      className="h-8 bg-indigo-600 text-[10px] font-black uppercase tracking-widest"
                    >
                      {purchasing === item.phone_number ? <Loader2 className="h-3 w-3 animate-spin" /> : "Comprar R$10"}
                    </Button>
                  </div>
                ))
              ) : !searching && (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Busque por um código de área para ver opções.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status da Infra */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="text-emerald-600 h-5 w-5" />
              Números Ativos
            </CardTitle>
            <CardDescription>Gerencie suas linhas corporativas vinculadas ao painel.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-2xl border-2 border-dashed border-slate-100 p-12 text-center">
                <Phone className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                <h3 className="text-slate-900 font-bold uppercase tracking-tight">Sem números cadastrados</h3>
                <p className="text-slate-400 text-xs max-w-xs mx-auto mt-2">
                  Adquira seu primeiro número corporativo para liberar o Softphone no dashboard.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-amber-50 shadow-none">
        <CardContent className="p-4 flex gap-3 text-amber-800 text-sm">
          <Plus className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Informação sobre Custos:</p>
            <p className="text-xs opacity-80">
              Cada número possui um custo mensal de manutenção de aprox. R$ 5,00. 
              Chamadas efetuadas e recebidas são debitadas em tempo real da sua Wallet baseadas na duração.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
