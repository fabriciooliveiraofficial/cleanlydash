import { createClient } from '@/lib/supabase/server'
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Plus, Search, Filter, Mail, Phone, MoreVertical, UserPlus, MapPin } from 'lucide-react'
import { CustomerForm } from './customer-form'

export default async function CustomersPage() {
  const supabase = createClient()
  
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clientes CRM</h2>
          <p className="text-slate-500 text-sm">Gerencie seus imóveis e contatos.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <UserPlus size={18} />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              <DialogDescription>
                Cadastre um novo proprietário ou unidade de locação.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px] flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome, e-mail ou endereço..." 
            className="flex-1 text-sm outline-none"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter size={18} />
          Filtros
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-semibold border-b uppercase text-[10px] tracking-widest">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Contato</th>
              <th className="px-6 py-4">Endereço</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers && customers.length > 0 ? (
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase">
                        {customer.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={14} />
                        {customer.email || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} />
                        {customer.phone || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-[200px] truncate">
                      <MapPin size={12} className="shrink-0" />
                      {customer.address}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      customer.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}></span>
                      {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="text-slate-400">
                      <MoreVertical size={18} />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
