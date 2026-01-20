// ARQUIVO: components/dashboard/recent-sales.tsx
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Sale {
  id: string
  price: number
  customers?: {
    name: string
    email: string
  }
}

export function RecentSales({ sales }: { sales: any[] }) {
  return (
    <Card className="border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-900">Vendas Recentes</CardTitle>
        <CardDescription>Você teve {sales.length} vendas concluídas recentemente.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sales.length > 0 ? (
            sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between group transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200">
                    {sale.customers?.name?.charAt(0) || 'C'}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">
                      {sale.customers?.name || 'Cliente Particular'}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[140px]">
                      {sale.customers?.email || 'Nenhum e-mail'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">
                    +R$ {sale.price?.toFixed(2)}
                  </p>
                  <Badge variant="outline" className="text-[9px] h-4 font-bold border-emerald-200 text-emerald-600 bg-emerald-50">
                    PAGO
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-400 italic text-sm">
              Nenhuma transação concluída ainda.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
