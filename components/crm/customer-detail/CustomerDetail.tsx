import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    User,
    Clock,
    Calendar,
    CreditCard,
    FileText,
    Phone,
    Mail,
    MoreVertical,
    Plus
} from 'lucide-react';
import { Button } from '../../ui/button';
import { createClient } from '../../../lib/supabase/client';
import { useTranslation } from 'react-i18next';
import { ProfileTab } from './tabs/ProfileTab';
import { TimelineTab } from './tabs/TimelineTab';
import { AppointmentsTab } from './tabs/AppointmentsTab';
import { BillingTab } from './tabs/BillingTab';
import { VaultTab } from './tabs/VaultTab';
import { BookingModal } from '../../BookingModal';

interface CustomerDetailProps {
    customerId: string;
    onBack: () => void;
    activeTab: 'profile' | 'timeline' | 'appointments' | 'billing' | 'vault';
    onTabChange: (tab: 'profile' | 'timeline' | 'appointments' | 'billing' | 'vault') => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
    customerId,
    onBack,
    activeTab,
    onTabChange
}) => {
    const { t } = useTranslation();
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showBookingModal, setShowBookingModal] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        async function loadCustomer() {
            // Only show heavy loading spinner if we don't have customer data yet
            if (!customer) {
                setLoading(true);
            }

            const { data } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();

            if (data) {
                setCustomer(data);
            }
            setLoading(false);
        }
        loadCustomer();
    }, [customerId]);

    if (loading && !customer) {
        return (
            <div className="flex items-center justify-center p-24">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'profile', label: 'Overview', icon: User },
        { id: 'timeline', label: 'Activity', icon: Clock },
        { id: 'appointments', label: 'Bookings', icon: Calendar },
        { id: 'billing', label: 'Payments', icon: CreditCard },
        { id: 'vault', label: 'Documents', icon: FileText },
    ] as const;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfileTab customer={customer} onUpdate={setCustomer} />;
            case 'timeline': return <TimelineTab customer={customer} />;
            case 'appointments': return <AppointmentsTab customerId={customerId} />;
            case 'billing': return <BillingTab customerId={customerId} />;
            case 'vault': return <VaultTab customerId={customerId} />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="rounded-xl hover:bg-slate-100"
                    >
                        <ArrowLeft size={20} />
                    </Button>

                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-100">
                            {customer?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{customer?.name}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                    Active
                                </span>
                                <span className="text-slate-400 text-sm font-medium flex items-center gap-1">
                                    <Mail size={12} /> {customer?.email}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                        onClick={() => setShowBookingModal(true)}
                    >
                        <Plus size={18} className="mr-2" /> New Booking
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl text-slate-400">
                        <MoreVertical size={20} />
                    </Button>
                </div>
            </div>

            {/* Tabs Layout */}
            <div className="flex flex-col gap-6">
                <div className="border-b border-slate-200/60 overflow-x-auto no-scrollbar">
                    <div className="flex gap-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id as any)}
                                className={`flex items-center gap-2 py-4 border-b-2 transition-all text-sm font-bold uppercase tracking-widest ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-[500px]">
                    {renderTabContent()}
                </div>
            </div>
            {showBookingModal && (
                <BookingModal
                    isOpen={showBookingModal}
                    onClose={() => setShowBookingModal(false)}
                    onSave={() => {
                        setShowBookingModal(false);
                        // Optional: Refresh data if needed, but BookingModal usually handles its own sync
                    }}
                    booking={{
                        customer_id: customerId,
                        tenant_id: customer?.tenant_id
                    }}
                />
            )}
        </div>
    );
};
