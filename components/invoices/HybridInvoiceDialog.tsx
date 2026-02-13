import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { useRole } from '../../hooks/use-role';
import {
    Plus,
    X,
    Search,
    Trash2,
    Check,
    Calendar as CalendarIcon,
    DollarSign,
    Loader2,
    Briefcase
} from 'lucide-react';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { toast } from 'sonner';

interface Customer {
    id: string;
    name: string;
    email?: string;
}

interface Booking {
    id: string;
    start_date: string;
    summary?: string;
    services?: { name: string };
    service_id?: string;
    price?: number;
}

interface InvoiceItem {
    description: string;
    amount: string;
    quantity: number;
    booking_id?: string;
    service_id?: string;
}

import { useTranslation } from 'react-i18next';

export const HybridInvoiceDialog: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
    const { t, i18n } = useTranslation();
    const supabase = createClient();
    const { tenant_id } = useRole();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: t('finance.invoice_dialog.items_label'), amount: '0', quantity: 1 }
    ]);

    useEffect(() => {
        if (open) {
            fetchCustomers();
        }
    }, [open]);

    useEffect(() => {
        if (selectedCustomerId) {
            fetchUninvoicedBookings(selectedCustomerId);
        } else {
            setBookings([]);
        }
    }, [selectedCustomerId]);

    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, email')
                .eq('status', 'active')
                .order('name');
            if (data) setCustomers(data);
        } catch (err) {
            console.error("Error fetching customers:", err);
        }
    };

    const fetchUninvoicedBookings = async (customerId: string) => {
        setLoadingBookings(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*, services(name)')
                .eq('customer_id', customerId)
                .or('invoice_status.is.null,invoice_status.neq.invoiced')
                .neq('status', 'cancelled')
                .order('start_date', { ascending: false });
            if (data) setBookings(data as any);
        } catch (err) {
            console.error("Error fetching bookings:", err);
        } finally {
            setLoadingBookings(false);
        }
    };

    const addItem = () => {
        setItems([...items, { description: t('finance.invoice_dialog.add_item'), amount: '0', quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...updates };
        setItems(newItems);
    };

    const addBookingToInvoice = (booking: Booking) => {
        const serviceName = booking.services?.name || booking.summary || 'Service';
        const dateStr = new Date(booking.start_date).toLocaleDateString(i18n.language);
        const description = `${t('finance.invoice_dialog.booking_prefix')}: ${serviceName} - ${dateStr}`;
        setItems([...items, {
            description,
            amount: booking.price?.toString() || '0',
            quantity: 1,
            booking_id: booking.id,
            service_id: booking.service_id
        }]);
        toast.info(t('booking_modal.success_created'));
    };

    const total = items.reduce((acc, item) => acc + (parseFloat(item.amount) * item.quantity), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId) {
            toast.error(t('finance.invoice_dialog.client_placeholder'));
            return;
        }
        if (items.length === 0) {
            toast.error(t('finance.invoice_dialog.items_label'));
            return;
        }

        setLoading(true);
        try {
            // Get current tenant_id from auth metadata/profile
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // 1. Create Invoice
            const { data: invoice, error: invError } = await supabase
                .from('invoices')
                .insert({
                    tenant_id,
                    customer_id: selectedCustomerId,
                    due_date: dueDate,
                    amount: total,
                    status: 'draft'
                })
                .select()
                .single();

            if (invError) throw invError;

            // 2. Create Line Items
            const lineItems = items.map(item => ({
                invoice_id: invoice.id,
                description: item.description,
                amount: parseFloat(item.amount),
                quantity: item.quantity,
                booking_id: item.booking_id || null,
                service_id: item.service_id || null
            }));

            const { error: linesError } = await supabase
                .from('invoice_lines')
                .insert(lineItems);

            if (linesError) throw linesError;

            // 3. Update Bookings if any
            const bookingIds = items.map(i => i.booking_id).filter(Boolean);
            if (bookingIds.length > 0) {
                const { error: bookError } = await supabase
                    .from('bookings')
                    .update({ invoice_status: 'invoiced' })
                    .in('id', bookingIds as string[]);
                if (bookError) console.error("Error updating bookings:", bookError);
            }

            toast.success(t('finance.invoice_dialog.submit'));
            setOpen(false);
            onSuccess?.();

            // Reset form
            setItems([{ description: t('finance.invoice_dialog.items_label'), amount: '0', quantity: 1 }]);
            setSelectedCustomerId('');
        } catch (err: any) {
            console.error("Error creating hybrid invoice:", err);
            toast.error(err.message || "Error generating invoice");
        } finally {
            setLoading(false);
        }
    };

    const selectedBookingIds = items.map(i => i.booking_id).filter(Boolean);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                    <Plus size={18} /> {t('finance.new_charge')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-3xl">
                <DialogHeader>
                    <DialogTitle>{t('finance.invoice_dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('finance.invoice_dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('finance.invoice_dialog.client_label')}</label>
                            <select
                                className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 ring-indigo-500"
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                                required
                            >
                                <option value="">{t('finance.invoice_dialog.client_placeholder')}</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('finance.invoice_dialog.due_date_label')}</label>
                            <input
                                type="date"
                                className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 ring-indigo-500"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Bookings Import Section */}
                    {selectedCustomerId && (
                        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <CalendarIcon size={12} /> {t('finance.invoice_dialog.booking_import_title')}
                            </h4>
                            {loadingBookings ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                    <Loader2 size={14} className="animate-spin" /> {t('common.loading')}
                                </div>
                            ) : bookings.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {bookings.map(book => {
                                        const isAlreadyAdded = selectedBookingIds.includes(book.id);
                                        return (
                                            <div key={book.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100/50">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{book.services?.name || book.summary || 'Cleaning'}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(book.start_date).toLocaleDateString(i18n.language)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                        {new Intl.NumberFormat(i18n.language, {
                                                            style: 'currency',
                                                            currency: i18n.language === 'en' ? 'USD' : 'BRL'
                                                        }).format(book.price || 0)}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={isAlreadyAdded ? "ghost" : "outline"}
                                                        disabled={isAlreadyAdded}
                                                        onClick={() => addBookingToInvoice(book)}
                                                        className="h-8 text-[10px] font-black uppercase"
                                                    >
                                                        {isAlreadyAdded ? <Check size={14} className="text-emerald-500" /> : t('finance.invoice_dialog.import_button')}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400 italic py-2">{t('finance.invoice_dialog.booking_import_empty')}</p>
                            )}
                        </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('finance.invoice_dialog.items_label')}</label>
                            <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 text-[10px] font-black text-indigo-600 hover:text-indigo-700">
                                <Plus size={14} className="mr-1" /> {t('finance.invoice_dialog.add_item')}
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-start group">
                                    <div className="flex-1 space-y-1">
                                        <input
                                            placeholder={t('common.search')}
                                            className="w-full h-10 bg-slate-50 border-none rounded-lg px-3 text-xs font-bold"
                                            value={item.description}
                                            onChange={(e) => updateItem(index, { description: e.target.value })}
                                        />
                                    </div>
                                    <div className="w-24 space-y-1 text-right">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full h-10 bg-slate-50 border-none rounded-lg pl-7 pr-2 text-xs font-bold text-right"
                                                value={item.amount}
                                                onChange={(e) => updateItem(index, { amount: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-16 space-y-1">
                                        <input
                                            type="number"
                                            className="w-full h-10 bg-slate-50 border-none rounded-lg px-2 text-xs font-bold text-center"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(index)}
                                        className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('finance.invoice_dialog.total_label')}</p>
                            <p className="text-2xl font-black text-slate-900">
                                {new Intl.NumberFormat(i18n.language, {
                                    style: 'currency',
                                    currency: i18n.language === 'en' ? 'USD' : 'BRL',
                                    minimumFractionDigits: 2
                                }).format(total)}
                            </p>
                        </div>
                        <Button
                            type="submit"
                            disabled={loading || items.length === 0}
                            className="h-12 px-8 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-lg"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : t('finance.invoice_dialog.submit')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
