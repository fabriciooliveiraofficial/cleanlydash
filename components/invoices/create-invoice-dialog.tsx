// ARQUIVO: components/invoices/create-invoice-dialog.tsx
'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog'
import { ManualInvoiceForm } from '@/app/(dashboard)/invoices/manual-invoice-form'

interface CreateInvoiceDialogProps {
  customers: { id: string; name: string }[]
}

export function CreateInvoiceDialog({ customers }: CreateInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 h-11 px-6 font-bold transition-all active:scale-95">
          <Plus size={18} />
          Gerar Fatura Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Nova Fatura Avulsa</DialogTitle>
          <DialogDescription>
            Crie uma cobrança manual sem vínculo com agendamentos de turnover.
          </DialogDescription>
        </DialogHeader>
        <ManualInvoiceForm customers={customers} />
      </DialogContent>
    </Dialog>
  )
}