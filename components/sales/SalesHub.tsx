import React, { useState, useEffect } from 'react';
import {
    X, Sparkles, Calculator, Send, Check, ChevronRight,
    Clock, DollarSign, Palette, Plus, Star, UserPlus,
    ListChecks, Calendar, Info, Search
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { calculateEstimate, Service, Task, Addon, Discount } from '../../lib/sales/EstimateCalculator';
import { toast } from 'sonner';

interface SalesHubProps {
    isOpen: boolean;
    onClose: () => void;
    onConvertToBooking: (data: any) => void;
}

export const SalesHub: React.FC<SalesHubProps> = ({ isOpen, onClose, onConvertToBooking }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [serviceCategories, setServiceCategories] = useState<any[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
    const [existingBookings, setExistingBookings] = useState<any[]>([]);
    const [serviceAddons, setServiceAddons] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');
    const [recurringSearchTerm, setRecurringSearchTerm] = useState('');
    const [recurringSelectedCategoryId, setRecurringSelectedCategoryId] = useState<string | 'all'>('all');

    // Selection State
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedRecurringServiceId, setSelectedRecurringServiceId] = useState<string>('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [discount, setDiscount] = useState<Discount>({ type: 'percent', value: 0 });
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<string>('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');

    // Availability State
    const [team, setTeam] = useState<any[]>([]);
    const [availabilities, setAvailabilities] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [businessHours, setBusinessHours] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
    const [profile, setProfile] = useState<any>(null);

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            fetchStaticData();
            fetchDynamicData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchDynamicData();
        }
    }, [selectedDate]);

    const fetchStaticData = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: svcData } = await supabase.from('services').select('id, name, price_default, duration_minutes, category_id').eq('tenant_id', user.id).order('name');
        const { data: addData } = await supabase.from('addons').select('*').eq('tenant_id', user.id).order('name');
        const { data: svcAddonData } = await supabase.from('service_addons').select('*');
        const { data: catData } = await supabase.from('task_categories').select('id, name, color').eq('tenant_id', user.id).order('name');
        const { data: taskData } = await supabase.from('tasks').select('id, title, price, category_id, room_id').eq('tenant_id', user.id).order('title');
        const { data: profileData } = await supabase.from('tenant_profiles').select('*').eq('id', user.id).single();
        const { data: teamData } = await supabase.from('team_members').select('id, name').eq('tenant_id', user.id).eq('status', 'active');

        if (svcData) setServices(svcData);
        if (addData) setAddons(addData);
        if (svcAddonData) setServiceAddons(svcAddonData);
        if (catData) {
            setCategories(catData);
            setServiceCategories(catData);
        }
        if (taskData) setTasks(taskData);
        if (teamData) setTeam(teamData);
        if (profileData) {
            setProfile(profileData);
            if (profileData.business_hours) setBusinessHours(profileData.business_hours);
        }

        setIsLoading(false);
    };

    const fetchDynamicData = async () => {
        setIsAvailabilityLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Standardize date parsing to avoid TZ issues
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();

        console.log('[SalesHub] Fetching dynamic data for:', { selectedDate, dayOfWeek, userId: user.id });

        const { data: availData } = await supabase.from('team_availability')
            .select('*')
            .eq('day_of_week', dayOfWeek);
        // .eq('tenant_id', user.id); // Assuming team_availability has tenant_id or we rely on member_id link

        // Fetch existing bookings for conflict check
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        const { data: bookingsData } = await supabase.from('bookings')
            .select('id, start_date, end_date, duration_minutes')
            .eq('tenant_id', user.id)
            .gte('start_date', startOfDay.toISOString())
            .lte('start_date', endOfDay.toISOString());

        console.log('[SalesHub] Found bookings:', bookingsData?.length || 0);

        let assignData: any[] = [];
        if (bookingsData && bookingsData.length > 0) {
            const { data } = await supabase.from('booking_assignments')
                .select('booking_id, member_id')
                .in('booking_id', bookingsData.map(b => b.id));
            if (data) assignData = data;
        }

        if (availData) setAvailabilities(availData);
        if (bookingsData) setExistingBookings(bookingsData);
        if (assignData) setAssignments(assignData);

        setIsAvailabilityLoading(false);
    };

    const selectedService = services.find(s => String(s.id) === String(selectedServiceId)) || null;
    const selectedRecurringService = services.find(s => String(s.id) === String(selectedRecurringServiceId)) || selectedService;

    const estimate = calculateEstimate({
        service: selectedService,
        selectedTaskIds,
        availableTasks: tasks,
        selectedAddonIds,
        availableAddons: addons,
        discount
    });

    const recurringEstimate = calculateEstimate({
        service: selectedRecurringService,
        selectedTaskIds,
        availableTasks: tasks,
        selectedAddonIds,
        availableAddons: addons,
        discount: { type: 'percent', value: 0 } // No manual discount on recurring by default, or maybe same?
    });

    const availableSlots = React.useMemo(() => {
        if (!businessHours) return [];

        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();

        // Handle potential string keys from JSONB or numeric keys
        const dayConfig = businessHours[dayOfWeek] || businessHours[String(dayOfWeek)];

        if (!dayConfig) return [];
        // Company Closed fallback: if company is closed, only show slots if a specific cleaner is selected
        if (!dayConfig.active && selectedMemberId === 'all') return [];

        const slots: string[] = [];
        const [startH, startM] = dayConfig.start.split(':').map(Number);
        const [endH, endM] = dayConfig.end.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        // Ensure we have a valid duration to prevent infinite loops or errors
        const DURATION = estimate.totalDuration || 60;

        // Filter team based on selection - Use String() for ID safety
        const teamToCheck = selectedMemberId && selectedMemberId !== 'all'
            ? team.filter(m => String(m.id) === String(selectedMemberId))
            : team;

        console.log('[SalesHub] availability loop:', {
            dayOfWeek,
            dayConfig,
            teamSize: team.length,
            checking: teamToCheck.length,
            selectedMemberId,
            duration: DURATION
        });

        if (teamToCheck.length === 0) return [];

        // Generate slots every 60 minutes for Sales Hub
        for (let t = startTotal; t <= endTotal - DURATION; t += 60) {
            const h = Math.floor(t / 60);
            const m = t % 60;
            const slotStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

            // Check if any team member is available AND free
            const isAnyAvailable = teamToCheck.some(member => {
                // 1. Is available in their personal schedule for this day?
                const memberAvail = availabilities.find(a => String(a.member_id) === String(member.id) && a.day_of_week === dayOfWeek);

                let mStartTotal, mEndTotal;

                if (memberAvail) {
                    // Explicitly unavailable
                    if (!memberAvail.is_available) return false;

                    const [mStartH, mStartM] = (memberAvail.start_time || "").split(':').map(Number);
                    const [mEndH, mEndM] = (memberAvail.end_time || "").split(':').map(Number);
                    mStartTotal = mStartH * 60 + mStartM;
                    mEndTotal = mEndH * 60 + mEndM;
                } else {
                    // Fallback to company business hours if no specific record found
                    mStartTotal = startTotal;
                    mEndTotal = endTotal;
                }

                if (t < mStartTotal || (t + DURATION) > mEndTotal) return false;

                // 2. Is free (no overlapping bookings)?
                const memberAssignments = assignments.filter(a => String(a.member_id) === String(member.id));
                const memberBusy = memberAssignments.some(a => {
                    const booking = existingBookings.find(b => String(b.id) === String(a.booking_id));
                    if (!booking) return false;

                    const bStart = new Date(booking.start_date);
                    const bStartTotal = bStart.getHours() * 60 + bStart.getMinutes();
                    // Fallback for duration if missing
                    const bDuration = booking.duration_minutes || 60;
                    const bEndTotal = bStartTotal + bDuration;

                    return t < bEndTotal && (t + DURATION) > bStartTotal;
                });

                return !memberBusy;
            });

            if (isAnyAvailable) {
                slots.push(slotStr);
            }
        }

        console.log('[SalesHub] Generated slots:', slots.length);
        return slots;
    }, [businessHours, selectedDate, team, availabilities, assignments, existingBookings, estimate.totalDuration, selectedMemberId]);

    const handleServiceSelect = async (serviceId: string) => {
        setSelectedServiceId(serviceId);
        // Default recurring service to the same as initial
        if (!selectedRecurringServiceId) {
            setSelectedRecurringServiceId(serviceId);
        }
        // Auto-select mandatory tasks for this service
        const { data: defTasks } = await supabase.from('service_def_tasks').select('task_id').eq('service_id', serviceId);
        if (defTasks) {
            setSelectedTaskIds(defTasks.map(dt => String(dt.task_id)));
        } else {
            setSelectedTaskIds([]);
        }
    };

    const handleSendQuote = async () => {
        if (!clientEmail) return toast.error("Please enter a client email address.");

        toast.promise(
            supabase.functions.invoke('send_quote_email', {
                body: {
                    clientEmail,
                    clientName,
                    profile, // Pass company profile (logo, name, etc.)
                    serviceName: selectedService?.name,
                    recurringServiceName: isRecurring ? (selectedRecurringService?.name || selectedService?.name) : null,
                    estimate,
                    recurringEstimate: isRecurring ? recurringEstimate : null,
                    frequency: isRecurring ? frequency : null,
                    checklist: tasks.filter(t => selectedTaskIds.includes(t.id)),
                    addons: addons.filter(a => selectedAddonIds.includes(a.id)),
                    selectedDate,
                    selectedSlot,
                    confirmationUrl: `${window.location.origin}/confirm-booking?data=${btoa(JSON.stringify({
                        tenantId: (await supabase.auth.getUser()).data.user?.id,
                        serviceId: selectedServiceId,
                        recurringServiceId: isRecurring ? selectedRecurringServiceId : selectedServiceId,
                        addonIds: selectedAddonIds,
                        date: selectedDate,
                        time: selectedSlot,
                        clientName,
                        clientEmail,
                        total: estimate.total,
                        recurringTotal: isRecurring ? recurringEstimate.total : null,
                        isRecurring,
                        frequency
                    }))}`
                }
            }),
            {
                loading: 'Sending quote...',
                success: 'Quote sent successfully!',
                error: (err) => `Failed to send quote: ${err.message}`
            }
        );
    };

    const getCategoryStyle = (cat: any) => {
        if (!cat) return 'bg-slate-50 text-slate-400 border-slate-100';

        // If the category has a color from database, use it with slight opacity/transparency logic if needed
        // but for now let's prioritize the name-based defaults for look & feel, 
        // or just apply the color if it exists.
        if (cat.color) {
            return `bg-opacity-10 border-opacity-20`; // We'll apply style={ { backgroundColor: cat.color + '10', color: cat.color, borderColor: cat.color + '30' } } in the component
        }

        const name = cat.name.toLowerCase();
        if (name.includes('deep')) return 'bg-rose-50 text-rose-500 border-rose-100';
        if (name.includes('standard')) return 'bg-emerald-50 text-emerald-500 border-emerald-100';
        if (name.includes('office') || name.includes('comercial')) return 'bg-sky-50 text-sky-500 border-sky-100';
        if (name.includes('move')) return 'bg-amber-50 text-amber-500 border-amber-100';
        return 'bg-slate-50 text-slate-400 border-slate-100';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 z-[60] w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">Sales Machine</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Estimation & Booking Hub</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all hover:rotate-90">
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                {/* 1. Service Selection (Grouped & Searchable) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={12} className="text-indigo-500" />
                            Step 1: Select Service
                        </label>
                        {services.length > 5 && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">
                                {services.length} Services
                            </span>
                        )}
                    </div>

                    {/* Search & Quick Filters */}
                    <div className="space-y-3">
                        <div className="relative group">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by service name or category..."
                                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[24px] outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-bold text-slate-700 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {serviceCategories.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                                <button
                                    onClick={() => setSelectedCategoryId('all')}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all snap-start ${selectedCategoryId === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                    All
                                </button>
                                {serviceCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all snap-start ${selectedCategoryId === cat.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse flex items-center px-4 justify-between">
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-slate-100 rounded"></div>
                                            <div className="h-3 w-48 bg-slate-100 rounded"></div>
                                        </div>
                                        <div className="h-6 w-6 bg-slate-100 rounded-full"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {serviceCategories
                                    .filter(cat => selectedCategoryId === 'all' || selectedCategoryId === cat.id)
                                    .map(cat => {
                                        const catServices = services.filter(s =>
                                            s.category_id === cat.id &&
                                            s.name.toLowerCase().includes(searchTerm.toLowerCase())
                                        );
                                        if (catServices.length === 0) return null;
                                        return (
                                            <div key={cat.id} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{cat.name}</h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {catServices.map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => handleServiceSelect(s.id)}
                                                            className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${selectedServiceId === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className={`text-sm font-black ${selectedServiceId === s.id ? 'text-white' : 'text-slate-800'}`}>{s.name}</div>
                                                                    <span
                                                                        className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${selectedServiceId === s.id ? 'bg-white/20 text-white border-transparent' : getCategoryStyle(cat)}`}
                                                                        style={selectedServiceId === s.id || !cat.color ? {} : {
                                                                            backgroundColor: cat.color + '15',
                                                                            color: cat.color,
                                                                            borderColor: cat.color + '30'
                                                                        }}
                                                                    >
                                                                        {cat.name}
                                                                    </span>
                                                                </div>
                                                                <div className={`text-[10px] font-bold ${selectedServiceId === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>{s.duration_minutes} min • From ${s.price_default}</div>
                                                            </div>
                                                            <ChevronRight size={18} className={`transition-transform group-hover:translate-x-1 ${selectedServiceId === s.id ? 'text-white' : 'text-slate-300'}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                {/* Services without category or with invalid category */}
                                {(selectedCategoryId === 'all') && (
                                    <>
                                        {services.filter(s =>
                                            (!s.category_id || !serviceCategories.some(cat => cat.id === s.category_id)) &&
                                            s.name.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).length > 0 && (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                                                        {serviceCategories.length > 0 ? 'Other Services' : 'All Services'}
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {services.filter(s =>
                                                            (!s.category_id || !serviceCategories.some(cat => cat.id === s.category_id)) &&
                                                            s.name.toLowerCase().includes(searchTerm.toLowerCase())
                                                        ).map(s => {
                                                            const cat = serviceCategories.find(c => c.id === s.category_id);
                                                            return (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => handleServiceSelect(s.id)}
                                                                    className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${selectedServiceId === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                                                                >
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <div className={`text-sm font-black ${selectedServiceId === s.id ? 'text-white' : 'text-slate-800'}`}>{s.name}</div>
                                                                            {cat && (
                                                                                <span
                                                                                    className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${selectedServiceId === s.id ? 'bg-white/20 text-white border-transparent' : getCategoryStyle(cat)}`}
                                                                                    style={selectedServiceId === s.id || !cat.color ? {} : {
                                                                                        backgroundColor: cat.color + '15',
                                                                                        color: cat.color,
                                                                                        borderColor: cat.color + '30'
                                                                                    }}
                                                                                >
                                                                                    {cat.name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className={`text-[10px] font-bold ${selectedServiceId === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>{s.duration_minutes} min • From ${s.price_default}</div>
                                                                    </div>
                                                                    <ChevronRight size={18} className={`transition-transform group-hover:translate-x-1 ${selectedServiceId === s.id ? 'text-white' : 'text-slate-300'}`} />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                    </>
                                )}

                                {services.length === 0 && !isLoading && (
                                    <div className="text-center p-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                                        <Info className="mx-auto text-slate-300 mb-3" size={40} />
                                        <p className="text-sm font-bold text-slate-500 italic">No services found. <br /> Please add them in the Resources section.</p>
                                    </div>
                                )}

                                {services.length > 0 && services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                    <div className="text-center p-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                                        <Search className="mx-auto text-slate-300 mb-3" size={40} />
                                        <p className="text-sm font-bold text-slate-500 italic">No results for "{searchTerm}"</p>
                                        <button
                                            onClick={() => { setSearchTerm(''); setSelectedCategoryId('all'); }}
                                            className="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* 2. Add-ons Upsell */}
                    {selectedServiceId && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Plus size={12} className="text-indigo-500" />
                                Step 2: Recommended Upgrades
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {addons
                                    .filter(a => {
                                        // Only active addons
                                        if (!a.active) return false;
                                        // If standalone, show it
                                        if (a.is_standalone) return true;
                                        // If linked to this service, show it
                                        return serviceAddons.some(link => String(link.addon_id) === String(a.id) && String(link.service_id) === String(selectedServiceId));
                                    })
                                    .map(a => (
                                        <button
                                            key={a.id}
                                            onClick={() => {
                                                if (selectedAddonIds.includes(a.id)) {
                                                    setSelectedAddonIds(selectedAddonIds.filter(id => id !== a.id));
                                                } else {
                                                    setSelectedAddonIds([...selectedAddonIds, a.id]);
                                                }
                                            }}
                                            className={`p-4 rounded-2xl border transition-all text-center relative overflow-hidden group ${selectedAddonIds.includes(a.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                                        >
                                            <div className={`text-xs font-black ${selectedAddonIds.includes(a.id) ? 'text-indigo-900' : 'text-slate-800'}`}>{a.name}</div>
                                            <div className="flex items-center justify-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold ${selectedAddonIds.includes(a.id) ? 'text-indigo-400' : 'text-slate-400'}`}>R$ {a.price}</span>
                                                {a.duration_minutes > 0 && (
                                                    <span className="text-[9px] font-bold text-indigo-400 flex items-center gap-1">
                                                        <Clock size={8} />
                                                        +{a.duration_minutes}m
                                                    </span>
                                                )}
                                            </div>
                                            {selectedAddonIds.includes(a.id) && (
                                                <div className="absolute top-0 right-0 p-1">
                                                    <div className="bg-indigo-600 text-white rounded-bl-lg p-0.5">
                                                        <Check size={8} strokeWidth={4} />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Availability & Slots */}
                    {selectedServiceId && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} className="text-indigo-500" />
                                Step 3: Choose Professional, Date & Time
                            </label>

                            {/* Team Selection */}
                            {team.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                    <button
                                        onClick={() => setSelectedMemberId('all')}
                                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${selectedMemberId === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        Any Professional
                                    </button>
                                    {team.map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => setSelectedMemberId(member.id)}
                                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${selectedMemberId === member.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {member.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                                    const date = new Date();
                                    date.setDate(date.getDate() + offset);
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const dateStr = `${year}-${month}-${day}`;
                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={`flex-shrink-0 w-14 h-16 rounded-2xl border flex flex-col items-center justify-center transition-all ${selectedDate === dateStr ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                                        >
                                            <span className="text-[10px] font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                            <span className="text-lg font-black">{date.getDate()}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Real-time Slots (Dynamic) */}
                            <div className="grid grid-cols-4 gap-2">
                                {isAvailabilityLoading ? (
                                    [1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse border border-slate-100"></div>
                                    ))
                                ) : availableSlots.length > 0 ? (
                                    availableSlots.map(slot => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-3 rounded-xl border text-xs font-black transition-all ${selectedSlot === slot ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50'}`}
                                        >
                                            {slot}
                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No slots available for this date</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 italic text-center">
                                Slots calculated for {estimate.totalDuration} min duration
                            </p>
                        </div>
                    )}

                    {/* 4. Client Info */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <UserPlus size={12} className="text-indigo-500" />
                            Step 4: Who is this for?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="Client Name"
                                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                            />
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={clientEmail}
                                onChange={e => setClientEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 5. Discount Engine */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Star size={12} className="text-indigo-500" />
                            Special Offer
                        </label>
                        <div className="flex gap-2">
                            {[0, 5, 10, 15, 20].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setDiscount({ type: 'percent', value: val })}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${discount.type === 'percent' && discount.value === val ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                    {val === 0 ? 'None' : `${val}%`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 6. Frequency Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <DollarSign size={12} className="text-indigo-500" />
                            Frequency
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => setIsRecurring(false)}
                                className={`py-3 rounded-xl text-[10px] font-black transition-all ${!isRecurring ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                            >
                                Once
                            </button>
                            {['weekly', 'biweekly', 'monthly'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => {
                                        setIsRecurring(true);
                                        setFrequency(f as any);
                                    }}
                                    className={`py-3 rounded-xl text-[10px] font-black transition-all ${isRecurring && frequency === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>

                        {isRecurring && (
                            <div className="space-y-4 p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100 animate-in slide-in-from-top-4 duration-500 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block pl-1">
                                        Recurring Service Type
                                    </label>
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase bg-white px-2 py-0.5 rounded border border-indigo-100">
                                        Smart Filter
                                    </span>
                                </div>

                                {/* Recurring Section Search & Filters */}
                                <div className="space-y-3">
                                    <div className="relative group">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search maintenance services..."
                                            className="w-full pl-9 pr-4 py-3 bg-white border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold text-slate-700 placeholder:text-indigo-200"
                                            value={recurringSearchTerm}
                                            onChange={e => setRecurringSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {serviceCategories.length > 0 && (
                                        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar snap-x">
                                            <button
                                                onClick={() => setRecurringSelectedCategoryId('all')}
                                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all snap-start ${recurringSelectedCategoryId === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-400 hover:bg-indigo-50'}`}
                                            >
                                                All
                                            </button>
                                            {serviceCategories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setRecurringSelectedCategoryId(cat.id)}
                                                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all snap-start ${recurringSelectedCategoryId === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-400 hover:bg-indigo-50'}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                    {serviceCategories
                                        .filter(cat => recurringSelectedCategoryId === 'all' || recurringSelectedCategoryId === cat.id)
                                        .map(cat => {
                                            const catServices = services.filter(s =>
                                                s.category_id === cat.id &&
                                                s.name.toLowerCase().includes(recurringSearchTerm.toLowerCase())
                                            );
                                            if (catServices.length === 0) return null;
                                            return (
                                                <div key={cat.id} className="space-y-2">
                                                    <h4 className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest pl-1">{cat.name}</h4>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {catServices.map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => setSelectedRecurringServiceId(s.id)}
                                                                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedRecurringServiceId === s.id ? 'bg-white border-indigo-300 text-indigo-700 shadow-sm ring-2 ring-indigo-500/10' : 'bg-white/50 border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-bold">{s.name}</div>
                                                                    <div className="text-[9px] font-bold text-slate-400">{s.duration_minutes} min</div>
                                                                </div>
                                                                <div className="text-[10px] font-black text-indigo-400">R$ {s.price_default}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    {/* Fallback for Uncategorized or Other Services in Recurring Section */}
                                    {(recurringSelectedCategoryId === 'all') && (
                                        <>
                                            {services.filter(s =>
                                                (!s.category_id || !serviceCategories.some(cat => cat.id === s.category_id)) &&
                                                s.name.toLowerCase().includes(recurringSearchTerm.toLowerCase())
                                            ).length > 0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest pl-1">
                                                            {serviceCategories.length > 0 ? 'Other Services' : 'All Services'}
                                                        </h4>
                                                        <div className="grid grid-cols-1 gap-1">
                                                            {services.filter(s =>
                                                                (!s.category_id || !serviceCategories.some(cat => cat.id === s.category_id)) &&
                                                                s.name.toLowerCase().includes(recurringSearchTerm.toLowerCase())
                                                            ).map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={() => setSelectedRecurringServiceId(s.id)}
                                                                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedRecurringServiceId === s.id ? 'bg-white border-indigo-300 text-indigo-700 shadow-sm ring-2 ring-indigo-500/10' : 'bg-white/50 border-slate-100 text-slate-500 hover:border-indigo-200'}`}
                                                                >
                                                                    <div className="flex-1">
                                                                        <div className="text-xs font-bold">{s.name}</div>
                                                                        <div className="text-[9px] font-bold text-slate-400">{s.duration_minutes} min</div>
                                                                    </div>
                                                                    <div className="text-[10px] font-black text-indigo-400">R$ {s.price_default}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                        </>
                                    )}
                                </div>

                                <p className="text-[9px] text-indigo-400 font-medium italic pl-1">
                                    * Regular visits are priced based on the selected maintenance service.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Footer Summary */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-t-[40px] shadow-[0_-20px_40px_rgba(0,0,0,0.02)] space-y-6 shrink-0">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimate</span>
                        <div className="flex items-center gap-3">
                            {isRecurring ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded">Initial Visit</span>
                                        <div className="flex items-center gap-2">
                                            {estimate.discountAmount > 0 && (
                                                <span className="text-xs text-rose-300 line-through font-bold">R$ {estimate.subtotal.toFixed(2)}</span>
                                            )}
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">
                                                R$ {estimate.total.toFixed(2)}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded">Recurring</span>
                                        <h3 className="text-xl font-bold text-slate-500 tracking-tight">
                                            R$ {recurringEstimate.total.toFixed(2)} <span className="text-[10px] font-bold text-slate-400">/ visit</span>
                                        </h3>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {estimate.discountAmount > 0 && (
                                        <span className="text-sm text-rose-300 line-through font-bold">R$ {estimate.subtotal.toFixed(2)}</span>
                                    )}
                                    <h3 className="text-4xl font-black text-indigo-700 tracking-tighter">
                                        R$ {estimate.total.toFixed(2)}
                                    </h3>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 justify-end">
                            <Clock size={10} />
                            {estimate.totalDuration} min total
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleSendQuote}
                        disabled={!selectedServiceId}
                        className="flex-1 py-4 px-6 bg-white border-2 border-slate-100 text-slate-600 font-black rounded-3xl hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group shadow-sm active:scale-95"
                    >
                        <Send size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                        Send Quote
                    </button>
                    <button
                        onClick={() => onConvertToBooking({
                            service_id: selectedServiceId,
                            addon_ids: selectedAddonIds,
                            price: estimate.total,
                            discount_value: discount.value,
                            discount_type: discount.type
                        })}
                        disabled={!selectedServiceId}
                        className="flex-1 py-4 px-6 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 disabled:opacity-50 active:scale-95"
                    >
                        <Calculator size={20} />
                        Book Now
                    </button>
                </div>
            </div>
        </div>
    );
};
