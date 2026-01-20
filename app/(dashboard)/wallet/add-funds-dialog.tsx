// ARQUIVO: app/(dashboard)/wallet/add-funds-dialog.tsx
'use client'

import * as React from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addFunds } from "./actions"

export function AddFundsDialog() {
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState("100")

  const handleAddFunds = async () => {
    setLoading(true)
    const res = await addFunds(parseFloat(amount))
    if (res.success) {
      setOpen(false)
      window.location.reload()
    } else {
      alert("Erro ao adicionar fundos")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100">
          <Plus size={18} />
          Adicionar Saldo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Recarregar Wallet</DialogTitle>
          <DialogDescription>
            Adicione saldo para pagar por serviços de telefonia e automações.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor da Recarga (R$)</Label>
            <Input 
              id="amount" 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-bold" 
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={handleAddFunds} disabled={loading} className="w-full bg-indigo-600">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Recarga"}
          </Button>
          <p className="text-[10px] text-center text-slate-400 italic">
            * Ambiente de teste: o saldo será adicionado instantaneamente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}