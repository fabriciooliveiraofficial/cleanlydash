
import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Filter, Mail, Phone, MoreVertical, Loader2, MapPin } from 'lucide-react';
import { createClient } from '../lib/supabase/client.ts';
import { Button } from './ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog.tsx';
import { CustomerForm } from './crm/customer-form.tsx';
import { toast } from 'sonner';
import { useTelnyx } from '../hooks/use-telnyx.ts';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx';

export const Customers: React.FC = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const supabase = createClient();
  const { makeCall } = useTelnyx();

  async function loadCustomers() {
    setLoading(true);
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setCustomers(data || []);
    setLoading(false);
  }

  // Debounce search or reload on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const handleCall = (phone: string, name: string) => {
    if (!phone) {
      toast.error(t('common.error') || "Phone number missing");
      return;
    }
    toast.info(`${t('inbox.calling')} ${name}...`);
    makeCall(phone);
  };

  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('crm.title')}</h2>
          <p className="text-slate-500 text-sm">{t('crm.subtitle')}</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <UserPlus size={18} /> {t('crm.new_client')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('crm.add_client_title')}</DialogTitle>
            </DialogHeader>
            <CustomerForm onSuccess={loadCustomers} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="glass-panel flex-1 min-w-[300px] flex items-center gap-3 rounded-2xl px-4 py-3 border-white/50">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder={t('crm.search_placeholder')}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`gap-2 rounded-xl border-slate-200/60 backdrop-blur-md ${statusFilter !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white/50 hover:bg-white/80'}`}>
              <Filter size={18} />
              {statusFilter === 'all' ? t('common.filter') : statusFilter === 'active' ? t('crm.status_active') : t('crm.status_inactive')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('active')}>
              {t('crm.status_active')} only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
              {t('crm.status_inactive')} only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="glass-panel rounded-3xl border-white/40">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200/60 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <th className="px-8 py-5">{t('crm.table_client')}</th>
              <th className="px-6 py-5">{t('crm.table_contact')}</th>
              <th className="px-6 py-5">{t('crm.table_status')}</th>
              <th className="px-6 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></td>
              </tr>
            ) : customers.length > 0 ? (
              customers.map((customer) => (
                <tr key={customer.id} className="group hover:bg-white/40 transition-colors duration-300">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-white border border-indigo-100/50 text-indigo-700 font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                        {customer.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-base">{customer.name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5"><MapPin size={10} className="text-indigo-400" /> {customer.address}</p>
                          {customer.latitude && (
                            <span title="Geofencing Enabled" className="flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                              <MapPin size={8} className="fill-current" /> Location
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1.5 text-xs font-medium">
                      <div className="flex items-center gap-2 text-slate-600"><Mail size={12} className="text-slate-400" /> {customer.email || 'N/A'}</div>
                      <button
                        onClick={() => handleCall(customer.phone, customer.name)}
                        className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 hover:underline transition-colors text-left group/phone"
                        title={t('inbox.calling')}
                      >
                        <Phone size={12} className="text-slate-400 group-hover/phone:text-indigo-500 transition-colors" />
                        {customer.phone || 'N/A'}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide border ${customer.status === 'active'
                      ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100'
                      : 'bg-slate-50/80 text-slate-600 border-slate-100'
                      }`}>
                      <span className={`h-1.5 w-1.5 rounded-full shadow-sm ${customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {customer.status === 'active' ? t('crm.status_active') : t('crm.status_inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl">
                          <MoreVertical size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl">
                        <DropdownMenuItem
                          className="rounded-lg cursor-pointer"
                          onClick={() => setEditingCustomer(customer)}
                        >
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500 rounded-lg cursor-pointer">{t('common.delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                  {t('inbox.no_customers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <CustomerForm
              customer={editingCustomer}
              onSuccess={() => {
                setEditingCustomer(null);
                loadCustomers();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};