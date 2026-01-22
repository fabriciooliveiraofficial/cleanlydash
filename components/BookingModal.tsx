import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '../lib/supabase/client';
import {
    X, ChevronRight, ChevronLeft, User, Calendar, Clock,
    DollarSign, Palette, FileText, UserPlus, Check, RefreshCw,
    Mail, MessageSquare, Edit2, Trash2, Plus, Sparkles, Search, ListChecks, CreditCard, Users, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours, addDays, addWeeks, addMonths, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustomerCombobox } from './CustomerCombobox';
import { InternationalPhoneInput } from './ui/InternationalPhoneInput';
import { useRole } from '../hooks/use-role';
import { DeleteRecurrenceModal } from './DeleteRecurrenceModal';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    booking?: any;
    defaultDate?: Date;
}

interface Customer {
    id: string;
    name: string;
    address: string;
    email?: string;
    phone?: string;
}

interface ServiceCategory {
    id: string;
    name: string;
    icon: string;
}

interface Service {
    id: string;
    name: string;
    price_default: number;
    duration_minutes: number;
    category_id?: string;
    description?: string;
}

interface StaffMember {
    id: string; // Linked user_id (auth.users)
    team_member_id: string; // Actual team_members table UUID
    email: string;
    role: string;
    name: string;
    pay_rate?: number;
}

interface AvailabilityRule {
    member_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

interface RecurrenceInstance {
    id: string;
    date: Date;
    time: string;
    price: number;
    cleaner_pay_rate: number;
    service_id: string;
    duration_minutes: number;
    duration_minutes: number;
    addon_ids: string[]; // New: Per-instance addons
    assignments: { member_id: string, pay_rate: number, name: string }[]; // New: Per-instance assignments
    isEditing?: boolean;
}

interface BookingInventoryItem {
    id?: string;
    item_id: string;
    quantity: number;
    name?: string;
    unit?: string;
}

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
type NotificationType = 'none' | 'email' | 'sms' | 'both';

interface Addon {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    is_standalone: boolean;
}

const PRESET_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
];

// STEPS system removed in favor of Dual-Panel (Modal + Slide-over)

export const BookingModal: React.FC<BookingModalProps> = ({
    isOpen,
    onClose,
    onSave,
    booking,
    defaultDate
}) => {
    const supabase = createClient();
    const { t } = useTranslation();
    const isEditMode = !!booking;

    // Interface states
    const [showDrawer, setShowDrawer] = useState(false);
    const [drawerMode, setDrawerMode] = useState<'schedule' | 'customer' | 'service'>('schedule');


    // Data sources
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

    // Teams & Assignments
    const [crews, setCrews] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<{ member_id: string, pay_rate: number, name: string }[]>([]);
    const [selectedCrewId, setSelectedCrewId] = useState<string>('');

    // UI State for Filters
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedRecurrenceCategory, setSelectedRecurrenceCategory] = useState<string>('');

    // Form state
    const [formData, setFormData] = useState({
        customer_id: '',
        service_id: '',
        assigned_to: '',
        start_date: '',
        start_time: '09:00',
        duration_minutes: 60,
        price: 0,
        cleaner_pay_rate: 0,
        color: '#6366f1',
        notes_internal: '',
        notes_client: '',
        notes_staff: '',
        status: 'pending',
        // Recurrence
        recurrence_type: 'none' as RecurrenceType,
        recurrence_count: 4,
        recurrence_end_date: '',
        // Notification options
        notify_client: 'email' as NotificationType,
        notify_staff: 'email' as NotificationType,
        payment_method_preference: 'stripe',
        // Split Service
        use_split_recurrence: false,
        recurrence_service_id: '',
        recurrence_price: 0,
    });

    // Recurrence instances for preview
    const [recurrenceInstances, setRecurrenceInstances] = useState<RecurrenceInstance[]>([]);
    const [editingInstance, setEditingInstance] = useState<string | null>(null);
    const [instanceCategoryFilter, setInstanceCategoryFilter] = useState<string>('');
    const [pendingPropagationId, setPendingPropagationId] = useState<string | null>(null);

    // Reset instance filter when changing which instance is being edited
    useEffect(() => {
        setInstanceCategoryFilter('');
    }, [editingInstance]);

    // Inline customer creation
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });

    // Notes tab
    const [activeNotesTab, setActiveNotesTab] = useState<'internal' | 'client' | 'staff'>('internal');

    // Inventory State
    const [bookingInventory, setBookingInventory] = useState<BookingInventoryItem[]>([]);
    const [availableInventory, setAvailableInventory] = useState<any[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'inventory'>('details');

    const { tenant_id: sessionTenantId } = useRole();
    const [saving, setSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [recurrenceSeriesForDelete, setRecurrenceSeriesForDelete] = useState<any[]>([]);

    const [isInitialized, setIsInitialized] = useState(false);
    const initialValuesRef = React.useRef<any>(null);



    // Addons State
    interface ServiceTask {
        id: string;
        title: string;
        description: string;
        is_global: boolean;
        order: number;
        room_id?: string;
        room_name?: string;
    }

    interface Discount {
        type: 'percent' | 'fixed';
        value: number;
        reason: string;
    }

    const [serviceTasks, setServiceTasks] = useState<ServiceTask[]>([]);
    const [discount, setDiscount] = useState<Discount>({ type: 'fixed', value: 0, reason: '' });

    // Fetch linked tasks for the selected service
    const fetchServiceTasks = async (serviceId: string) => {
        if (!serviceId) {
            setServiceTasks([]);
            return;
        }

        const { data, error } = await supabase
            .from('service_def_tasks')
            .select(`
                task_id,
                order,
                tasks ( 
                    id, 
                    title, 
                    description, 
                    is_global,
                    room_id,
                    rooms ( id, name )
                )
            `)
            .eq('service_id', serviceId)
            .order('order', { ascending: true });

        if (!error && data) {
            const mappedTasks = data.map((item: any) => ({
                id: item.tasks.id,
                title: item.tasks.title,
                description: item.tasks.description,
                is_global: item.tasks.is_global,
                order: item.order,
                room_id: item.tasks.room_id,
                room_name: item.tasks.rooms?.name || 'Geral'
            }));
            setServiceTasks(mappedTasks);
        }
    };

    const fetchServiceInventory = async (serviceId: string) => {
        setIsLoadingInventory(true);
        const { data, error } = await supabase
            .from('service_inventory')
            .select(`
                item_id,
                quantity,
                inventory_items ( name, unit )
            `)
            .eq('service_id', serviceId);

        if (!error && data) {
            setBookingInventory(data.map((d: any) => ({
                item_id: d.item_id,
                quantity: d.quantity,
                name: d.inventory_items?.name,
                unit: d.inventory_items?.unit
            })));
        }
        setIsLoadingInventory(false);
    };

    const fetchBookingInventory = async (bookingId: string) => {
        setIsLoadingInventory(true);
        const { data, error } = await supabase
            .from('booking_inventory')
            .select(`
                id,
                item_id,
                quantity,
                inventory_items ( name, unit )
            `)
            .eq('booking_id', bookingId);

        if (!error && data) {
            setBookingInventory(data.map((d: any) => ({
                id: d.id,
                item_id: d.item_id,
                quantity: d.quantity,
                name: d.inventory_items?.name,
                unit: d.inventory_items?.unit
            })));
        }
        setIsLoadingInventory(false);
    };

    // Update fetch when service changes
    useEffect(() => {
        if (formData.service_id) {
            fetchServiceTasks(formData.service_id);
            // Only fetch defaults if creating NEW booking. 
            // If editing, skip this as the form load will fetch actual stored inventory.
            if (!booking?.id) {
                fetchServiceInventory(formData.service_id);
            }
        } else {
            setServiceTasks([]);
            if (!booking?.id) setBookingInventory([]);
        }
    }, [formData.service_id]);

    const parseRRule = (rule: string): RecurrenceType => {
        if (!rule) return 'none';
        if (rule.includes('FREQ=DAILY')) return 'daily';
        if (rule.includes('FREQ=WEEKLY')) {
            if (rule.includes('INTERVAL=2')) return 'biweekly';
            return 'weekly';
        }
        if (rule.includes('FREQ=MONTHLY')) return 'monthly';
        return 'none';
    };

    // Fetch data on mount
    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            fetchCategories();
            fetchServices();
            fetchStaff();
            fetchCrews();

            const fetchAvailableInventory = async () => {
                const { data } = await supabase.from('inventory_items').select('id, name, unit').order('name');
                if (data) setAvailableInventory(data);
            };
            fetchAvailableInventory();

            if (booking) {
                // Fetch inventory for existing booking
                (async () => {
                    await fetchBookingInventory(booking.id);
                })();

                // Fetch assigned addons for this specific booking
                const fetchAssignedAddons = async () => {
                    const { data } = await supabase
                        .from('booking_addons')
                        .select('addon_id')
                        .eq('booking_id', booking.id);
                    if (data) setSelectedAddons(data.map((a: any) => a.addon_id));
                };
                fetchAssignedAddons();

                const recType = parseRRule(booking.recurrence_rule);
                const startDate = booking.start_date ? format(new Date(booking.start_date), 'yyyy-MM-dd') : '';
                const startTime = booking.start_date ? format(new Date(booking.start_date), 'HH:mm') : '09:00';

                initialValuesRef.current = {
                    recurrence_type: recType,
                    recurrence_count: booking.recurrence_count || 4,
                    start_date: startDate,
                    start_time: startTime,
                    price: booking.price || 0
                };

                setFormData({
                    customer_id: booking.customer_id || '',
                    service_id: booking.service_id || '',
                    assigned_to: booking.assigned_to || '',
                    start_date: startDate,
                    start_time: startTime,
                    duration_minutes: booking.duration_minutes || 60,
                    price: booking.price || 0,
                    cleaner_pay_rate: booking.cleaner_pay_rate || 0,
                    color: booking.color || '#6366f1',
                    notes_internal: booking.notes_internal || '',
                    notes_client: booking.notes_client || '',
                    notes_staff: booking.notes_staff || '',
                    status: booking.status || 'pending',
                    recurrence_type: recType,
                    recurrence_count: booking.recurrence_count || 4,
                    recurrence_end_date: booking.recurrence_end_date ? format(new Date(booking.recurrence_end_date), 'yyyy-MM-dd') : '',
                    notify_client: booking.notify_client || 'email',
                    notify_staff: booking.notify_staff || 'email',
                    payment_method_preference: booking.payment_method_preference || 'stripe',
                    // Split Service (if applicable)
                    use_split_recurrence: false,
                    recurrence_service_id: '',
                    recurrence_price: 0,
                });

                // Fetch real instances and their specific addons
                const fetchInstancesFromDB = async () => {
                    const { data: children } = await supabase
                        .from('bookings')
                        .select('id, start_date, price, cleaner_pay_rate, service_id, duration_minutes')
                        .eq('parent_booking_id', booking.id)
                        .order('start_date', { ascending: true });

                    const allIds = [booking.id, ...((children as any[])?.map(c => c.id) || [])];

                    const { data: allAddons } = await supabase
                        .from('booking_addons')
                        .select('booking_id, addon_id')
                        .in('booking_id', allIds);

                    const addonsByBooking = new Map<string, string[]>();
                    (allAddons as any[])?.forEach(a => {
                        const existing = addonsByBooking.get(a.booking_id) || [];
                        addonsByBooking.set(a.booking_id, [...existing, a.addon_id]);
                    });

                    const instances: RecurrenceInstance[] = [
                        {
                            id: booking.id,
                            date: new Date(booking.start_date),
                            time: format(new Date(booking.start_date), 'HH:mm'),
                            price: booking.price,
                            cleaner_pay_rate: booking.cleaner_pay_rate || 0,
                            service_id: booking.service_id,
                            duration_minutes: booking.duration_minutes,
                            duration_minutes: booking.duration_minutes,
                            addon_ids: addonsByBooking.get(booking.id) || [],
                            assignments: [] // Populated below
                        }
                    ];

                    if (children && children.length > 0) {
                        instances.push(...(children as any[]).map(c => ({
                            id: c.id,
                            date: new Date(c.start_date),
                            time: format(new Date(c.start_date), 'HH:mm'),
                            price: c.price,
                            cleaner_pay_rate: c.cleaner_pay_rate || 0,
                            service_id: c.service_id,
                            duration_minutes: c.duration_minutes,
                            service_id: c.service_id,
                            duration_minutes: c.duration_minutes,
                            addon_ids: addonsByBooking.get(c.id) || [],
                            assignments: [] // Populated below
                        })));
                    }

                    // Fetch assignments for all instances
                    const { data: allAssignments } = await supabase
                        .from('booking_assignments')
                        .select('booking_id, member_id, pay_rate, team_members(name)')
                        .in('booking_id', allIds);

                    const assignmentsByBooking = new Map<string, any[]>();
                    (allAssignments as any[])?.forEach(a => {
                        const existing = assignmentsByBooking.get(a.booking_id) || [];
                        assignmentsByBooking.set(a.booking_id, [...existing, {
                            member_id: a.member_id,
                            pay_rate: a.pay_rate,
                            name: a.team_members?.name || 'Unknown'
                        }]);
                    });

                    // Assign back to instances
                    instances.forEach(inst => {
                        inst.assignments = assignmentsByBooking.get(inst.id) || [];
                    });

                    // For the top-level "Upsell" visual, we reflect the FIRST instance's addons
                    if (instances.length > 0) {
                        setSelectedAddons(instances[0].addon_ids);
                    }

                    setRecurrenceInstances(instances);
                    setIsInitialized(true);
                };
                fetchInstancesFromDB();
            } else if (defaultDate) {
                // Reset form for new booking with default date
                setFormData({
                    customer_id: '',
                    service_id: '',
                    assigned_to: '',
                    start_date: format(defaultDate, 'yyyy-MM-dd'),
                    start_time: format(defaultDate, 'HH:mm'),
                    duration_minutes: 60,
                    price: 0,
                    cleaner_pay_rate: 0,
                    color: '#6366f1',
                    notes_internal: '',
                    notes_client: '',
                    notes_staff: '',
                    status: 'pending',
                    recurrence_type: 'none' as RecurrenceType,
                    recurrence_count: 4,
                    recurrence_end_date: '',
                    notify_client: 'email' as NotificationType,
                    notify_staff: 'email' as NotificationType,
                    payment_method_preference: 'stripe',
                    use_split_recurrence: false,
                    recurrence_service_id: '',
                    recurrence_price: 0,
                });
                setSelectedAddons([]);
                setRecurrenceInstances([]);
                setDiscount({ type: 'fixed', value: 0, reason: '' });
                setIsInitialized(true);
            } else {
                // Reset form for new booking without default date
                setFormData({
                    customer_id: '',
                    service_id: '',
                    assigned_to: '',
                    start_date: '',
                    start_time: '09:00',
                    duration_minutes: 60,
                    price: 0,
                    cleaner_pay_rate: 0,
                    color: '#6366f1',
                    notes_internal: '',
                    notes_client: '',
                    notes_staff: '',
                    status: 'pending',
                    recurrence_type: 'none' as RecurrenceType,
                    recurrence_count: 4,
                    recurrence_end_date: '',
                    notify_client: 'email' as NotificationType,
                    notify_staff: 'email' as NotificationType,
                    payment_method_preference: 'stripe',
                    use_split_recurrence: false,
                    recurrence_service_id: '',
                    recurrence_price: 0,
                });
                setSelectedAddons([]);
                setRecurrenceInstances([]);
                setDiscount({ type: 'fixed', value: 0, reason: '' });
                setIsInitialized(true);
            }
        } else {
            // Reset initialization when modal closes
            setIsInitialized(false);
            initialValuesRef.current = null;
        }
    }, [isOpen, booking, defaultDate]);

    useEffect(() => {
        if (!isInitialized) return;

        // In edit mode, if values hasn't changed from original, don't overwrite DB-fetched instances
        if (isEditMode && initialValuesRef.current) {
            const hasRecurrenceChanged =
                formData.recurrence_type !== initialValuesRef.current.recurrence_type ||
                formData.recurrence_count !== initialValuesRef.current.recurrence_count ||
                formData.start_date !== initialValuesRef.current.start_date ||
                formData.start_time !== initialValuesRef.current.start_time;

            if (!hasRecurrenceChanged) return;
        }

        if (formData.recurrence_type !== 'none' && formData.start_date) {
            generateRecurrenceInstances();
        } else {
            setRecurrenceInstances([]);
        }
    }, [isInitialized, formData.recurrence_type, formData.recurrence_count, formData.start_date, formData.start_time, formData.price]);

    // Fetch addons whenever a service is selected
    useEffect(() => {
        if (formData.service_id) {
            fetchAddonsForService(formData.service_id);
        } else {
            setAddons([]);
        }
    }, [formData.service_id]);

    const fetchAddonsForService = async (serviceId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch linked addons OR standalone addons
        const { data: linked } = await supabase
            .from('service_addons')
            .select('addon_id')
            .eq('service_id', serviceId);

        const linkedIds = linked?.map((l: any) => l.addon_id) || [];

        const { data: allAddons } = await supabase
            .from('addons')
            .select('*')
            .eq('tenant_id', user.id)
            .eq('active', true);

        if (allAddons) {
            // Filter: Show linked addons + standalone addons
            const relevent = allAddons.filter((a: any) => linkedIds.includes(a.id) || a.is_standalone);
            // Sort: Linked first, then alphabetical?
            relevent.sort((a: any, b: any) => {
                const aLinked = linkedIds.includes(a.id);
                const bLinked = linkedIds.includes(b.id);
                if (aLinked && !bLinked) return -1;
                if (!aLinked && bLinked) return 1;
                return 0;
            });
            setAddons(relevent as Addon[]);
        }
    };

    const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('id, name, address, email, phone').order('name');
        setCustomers(data || []);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('task_categories').select('id, name, icon').order('name');
        setCategories(data || []);
    };

    const fetchServices = async () => {
        const { data } = await supabase
            .from('services')
            .select('id, name, price_default, duration_minutes, description, category_id')
            .order('name');
        setServices(data || []);
    };

    const fetchStaff = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('team_members')
            .select('id, user_id, name, role, email, pay_rate')
            .eq('tenant_id', user.id)
            .order('name');

        if (data) {
            // Map team members to options.
            // We use user_id as the value for compatibility with bookings foreign key to auth.users
            // We filter out members who don't have a linked user account yet (pending invites/manual only)
            const staffList = data
                .filter((d: any) => d.user_id)
                .map((d: any) => ({
                    id: d.user_id, // For legacy assigned_to (auth.users)
                    team_member_id: d.id, // For booking_assignments (team_members)
                    email: d.email || '',
                    role: d.role,
                    name: d.name,
                    pay_rate: d.pay_rate
                }));
            setStaff(staffList);

            // Fetch availability for these members
            if (staffList.length > 0) {
                const memberIds = data.map((d: any) => d.id); // Use team_member.id for relation match if availability uses team_member.id
                // Note: AvailabilityEditor uses 'memberId' which is team_member.id.
                // So we need to map user_id <-> team_member_id to check availability.

                // Let's store the map of user_id -> team_member_id or just fetch using the list we have.
                // Actually, let's just fetch all availability for the tenant's members.

                const { data: availData } = await supabase
                    .from('team_availability')
                    .select('*')
                    .in('member_id', memberIds);

                if (availData) {
                    // We need to attach the availability to the user_id mainly.
                    // Let's create a map: member_id (team_member table) -> user_id (auth)
                    const memberIdToUserId = new Map(data.map((d: any) => [d.id, d.user_id]));

                    const rulesWithUserId = availData.map((rule: any) => ({
                        ...rule,
                        // Add a virtual field or just rely on looking up via the map during check
                        user_id: memberIdToUserId.get(rule.member_id)
                    })).filter((r: any) => r.user_id); // Only keep rules for members with users

                    setAvailabilityRules(rulesWithUserId);
                }
            }
        }
    };

    const getNextDate = (date: Date, type: RecurrenceType): Date => {
        switch (type) {
            case 'daily': return addDays(date, 1);
            case 'weekly': return addWeeks(date, 1);
            case 'biweekly': return addWeeks(date, 2);
            case 'monthly': return addMonths(date, 1);
            default: return date;
        }
    };

    const generateRecurrenceInstances = () => {
        const instances: RecurrenceInstance[] = [];
        let currentDate = new Date(`${formData.start_date}T${formData.start_time}`);

        for (let i = 0; i < formData.recurrence_count; i++) {
            // Determine service for this instance
            let instanceServiceId = formData.service_id;
            let instancePrice = formData.price;
            let instanceDuration = formData.duration_minutes;

            // If it's a recurrence (not the first visit) and split-service is ON
            if (i > 0 && formData.use_split_recurrence && formData.recurrence_service_id) {
                const recurrenceService = services.find(s => s.id === formData.recurrence_service_id);
                instanceServiceId = formData.recurrence_service_id;
                instancePrice = formData.recurrence_price || (recurrenceService?.price_default || 0);
                instanceDuration = recurrenceService?.duration_minutes || formData.duration_minutes;
            }

            instances.push({
                id: `instance-${i}`,
                date: new Date(currentDate),
                time: formData.start_time,
                price: instancePrice,
                cleaner_pay_rate: formData.cleaner_pay_rate,
                service_id: instanceServiceId,
                duration_minutes: instanceDuration,
                service_id: instanceServiceId,
                duration_minutes: instanceDuration,
                addon_ids: [...selectedAddons], // Default to currently selected top-level addons
                assignments: [...assignments] // Default to current main assignments
            });
            currentDate = getNextDate(currentDate, formData.recurrence_type);
        }

        setRecurrenceInstances(instances);
    };

    const updateInstance = (id: string, updates: Partial<RecurrenceInstance>) => {
        setRecurrenceInstances(prev =>
            prev.map(inst => inst.id === id ? { ...inst, ...updates } : inst)
        );
    };

    const propagateInstanceChanges = (sourceId: string) => {
        const source = recurrenceInstances.find(i => i.id === sourceId);
        if (!source) return;

        setRecurrenceInstances(prev => {
            const sourceIndex = prev.findIndex(i => i.id === sourceId);
            return prev.map((inst, idx) => {
                // Only propagate to instances AFTER the source
                if (idx > sourceIndex) {
                    return {
                        ...inst,
                        service_id: source.service_id,
                        price: source.price,
                        duration_minutes: source.duration_minutes,
                        time: source.time,
                        cleaner_pay_rate: source.cleaner_pay_rate,
                        time: source.time,
                        cleaner_pay_rate: source.cleaner_pay_rate,
                        addon_ids: [...source.addon_ids],
                        assignments: source.assignments.map(a => ({ ...a }))
                    };
                }
                return inst;
            });
        });

        toast.success("Alterações replicadas para os agendamentos seguintes!");
    };

    const removeInstance = (id: string) => {
        setRecurrenceInstances(prev => prev.filter(inst => inst.id !== id));
    };

    const handleServiceChange = (serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        setFormData(prev => ({
            ...prev,
            service_id: serviceId,
            price: service?.price_default || prev.price,
            duration_minutes: service?.duration_minutes || prev.duration_minutes
        }));
    };

    const handleStaffChange = (staffId: string) => {
        // Individual selection logic
        const staffMember = staff.find(s => s.id === staffId);

        // Single assignment mode (legacy compatibility or single user)
        setFormData(prev => ({
            ...prev,
            assigned_to: staffId,
            cleaner_pay_rate: staffMember?.pay_rate || prev.cleaner_pay_rate
        }));

        // Also update assignment list for new multi-assignment logic
        if (staffMember) {
            setAssignments([{
                member_id: staffMember.team_member_id, // Use team_member UUID
                pay_rate: staffMember.pay_rate || 0,
                name: staffMember.name
            }]);
            setSelectedCrewId(''); // Clear crew if manually selecting single person
        }
    };

    const fetchCrews = async () => {
        const { data } = await supabase.from('crews').select('*, crew_members(member_id)');
        if (data) setCrews(data);
    };

    const handleCrewChange = (crewId: string) => {
        setSelectedCrewId(crewId);
        const crew = crews.find(c => c.id === crewId);
        if (!crew) return;

        // Auto-populate assignments from crew members
        const newAssignments = crew.crew_members.map((cm: any) => {
            // Find staff details to get default pay rate
            // Note: staff array uses user_id as id. We need to map correctly.
            // In fetchStaff, we mapped id: user_id. 
            // In crew_members, member_id is uuid of team_members table.

            // We need to match efficiently. 
            // Let's rely on finding by name or we need to robustify the staff fetch to include team_member_id

            // HOTFIX: To ensure matching, let's find the staff member whose underlying team_member ID matches.
            // But staff state currently only has user_id as 'id'.
            // For now, simpler approach: we need team_member_id in staff state.

            // Let's try to match by user_id if we can resolve it, otherwise we might have issues.
            // Improvement: Update fetchStaff to store team_member_id too.
            // Assuming for now user_id is the primary key used in UI.

            // We'll iterate staff to find the user_id that corresponds to this member_id?
            // Actually, we don't have that map in state easily.

            // Let's assume for this MVP step we can fetch the team members details again or optimize later.
            // For immediate result:
            return {
                member_id: cm.member_id, // This is team_member_id
                pay_rate: 0, // Default to 0 until we match
                name: 'Loading...'
            };
        });

        // We will need to resolve names and rates. 
        // Ideally fetchCrews should include member details.
        resolveCrewMembersDetails(newAssignments);
    };

    const resolveCrewMembersDetails = async (initialAssignments: any[]) => {
        const memberIds = initialAssignments.map(a => a.member_id);
        const { data } = await supabase
            .from('team_members')
            .select('id, name, pay_rate, user_id')
            .in('id', memberIds);

        if (data) {
            const detailed = data.map((m: any) => ({
                member_id: m.id, // Keep team_member_id as the key for assignments
                pay_rate: m.pay_rate || 0,
                name: m.name,
                user_id: m.user_id
            }));
            setAssignments(detailed);

            // Legacy compat: Set assigned_to to the first leader-like figure (first member)
            if (detailed.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    assigned_to: detailed[0].user_id
                }));
            }
        }
    };

    const updateAssignmentPay = (index: number, newRate: number) => {
        const updated = [...assignments];
        updated[index].pay_rate = newRate;
        setAssignments(updated);
    };

    const removeAssignment = (index: number) => {
        const updated = [...assignments];
        updated.splice(index, 1);
        setAssignments(updated);
        setSelectedCrewId(''); // Custom set now
    };

    const handleCreateCustomer = async () => {
        if (!newCustomer.name) {
            toast.error("Nome do cliente á© obrigatá³rio");
            return;
        }


        if (!sessionTenantId) return;

        const { data, error } = await supabase
            .from('customers')
            .insert({
                name: newCustomer.name,
                email: newCustomer.email,
                phone: newCustomer.phone,
                address: newCustomer.address,
                tenant_id: sessionTenantId
            } as any)
            .select()
            .single();

        if (error) {
            toast.error(`Erro: ${error.message}`);
            return;
        }

        toast.success("Cliente criado!");
        setCustomers([...customers, data as Customer]);
        setFormData(prev => ({ ...prev, customer_id: (data as any).id }));
        setShowNewCustomer(false);
        setNewCustomer({ name: '', email: '', phone: '', address: '' });
    };

    // Navigation logic removed

    const handleDeleteClick = async () => {
        if (!booking) return;

        // If not recurrence, confirm simple delete
        if (formData.recurrence_type === 'none' && !booking.recurrence_rule && !booking.parent_booking_id) {
            if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
                setSaving(true);
                const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
                if (error) {
                    toast.error("Erro ao excluir");
                } else {
                    toast.success("Agendamento excluído");
                    onSave();
                    onClose();
                }
                setSaving(false);
            }
            return;
        }

        // Is Recurrence
        setIsDeleting(true);
        // Find parent ID
        const parentId = booking.parent_booking_id || booking.id;

        // Fetch series
        const { data } = await supabase.from('bookings')
            .select(`
            id, start_date, price, status, assigned_to
        `)
            .or(`id.eq.${parentId},parent_booking_id.eq.${parentId}`)
            .order('start_date', { ascending: true });

        // Fetch team member names
        // Note: Relation might be tricky if not set up, so manual fetch is safer or use join if confident
        // We'll trust the join if it's there, but to be safe let's map form staff list

        if (data) {
            const series = data.map((b: any) => ({
                id: b.id,
                start_date: b.start_date,
                price: b.price,
                status: b.status,
                cleaner_name: staff.find(s => s.id === b.assigned_to)?.name || 'Sem Staff'
            }));
            setRecurrenceSeriesForDelete(series);
            setShowDeleteModal(true);
        }
        setIsDeleting(false);
    };

    const confirmDeleteSeries = async (ids: string[]) => {
        setIsDeleting(true);
        try {
            await supabase.from('bookings').delete().in('id', ids);
            toast.success(`${ids.length} agendamentos excluídos`);
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Erro ao excluir");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        let createdBookingId: string | null = null;

        const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + formData.duration_minutes * 60 * 1000);

        // Use standard ISO format (UTC) for both
        const startDateISO = startDateTime.toISOString();
        const endDateISO = endDateTime.toISOString();

        // DEBUG: Log the values being saved
        console.log('[BookingModal] Save Debug:', {
            formData_start_date: formData.start_date,
            formData_start_time: formData.start_time,
            formData_duration_minutes: formData.duration_minutes,
            startDateISO,
            endDateISO,
            recurrence_type: formData.recurrence_type,
            recurrenceInstances_count: recurrenceInstances.length,
            firstInstance: recurrenceInstances[0] || null
        });

        const bookingData = {
            customer_id: formData.customer_id || null,
            service_id: formData.service_id || null,
            assigned_to: formData.assigned_to || null,
            start_date: startDateISO,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            color: formData.color,
            end_date: endDateISO,
            notes_internal: formData.notes_internal,
            notes_client: formData.notes_client,
            notes_staff: formData.notes_staff,
            status: formData.status,
            notify_client: formData.notify_client,
            notify_staff: formData.notify_staff,
            cleaner_pay_rate: formData.cleaner_pay_rate,
            payment_method_preference: formData.payment_method_preference
        };

        try {
            if (!sessionTenantId) throw new Error("Acesso negado: Tenant não identificado.");

            const addonsTotalPerVisit = selectedAddons.reduce((sum, id) => {
                const addon = addons.find(a => a.id === id);
                return sum + (addon?.price || 0);
            }, 0);

            if (isEditMode) {
                // Update parent booking
                const { error } = await (supabase
                    .from('bookings') as any)
                    .update({
                        ...bookingData,
                        recurrence_rule: formData.recurrence_type !== 'none'
                            ? (formData.recurrence_type === 'biweekly' ? 'FREQ=WEEKLY;INTERVAL=2' : `FREQ=${formData.recurrence_type.toUpperCase()}`)
                            : null,
                        recurrence_count: formData.recurrence_type !== 'none' ? recurrenceInstances.length : null,
                        recurrence_end_date: formData.recurrence_end_date || null,
                    } as any)
                    .eq('id', booking.id);

                if (error) throw error;

                // 1.5 Handle Parent Addons Sync
                // Get current parent addons from DB
                const { data: dbParentAddons } = await supabase.from('booking_addons').select('addon_id').eq('booking_id', booking.id);
                const dbParentAddonIds = new Set((dbParentAddons as any[])?.map(a => a.addon_id) || []);
                const currentParentAddons = recurrenceInstances[0]?.addon_ids || [];

                // Addons to delete
                const parentAddonsToDelete = [...dbParentAddonIds].filter(id => !currentParentAddons.includes(id));
                if (parentAddonsToDelete.length > 0) {
                    await supabase.from('booking_addons').delete().eq('booking_id', booking.id).in('addon_id', parentAddonsToDelete);
                }
                // Addons to insert
                const parentAddonsToInsert = currentParentAddons.filter(id => !dbParentAddonIds.has(id));
                if (parentAddonsToInsert) {
                    for (const aid of parentAddonsToInsert) {
                        const addon = addons.find(a => a.id === aid);
                        await (supabase.from('booking_addons') as any).insert({
                            booking_id: booking.id,
                            addon_id: aid,
                            price_at_time: addon?.price || 0,
                            quantity: 1
                        });
                    }
                }

                // Sync recurrence instances (Ajuste Fino)
                if (formData.recurrence_type !== 'none') {
                    // 1. Get current children from DB
                    const { data: dbChildren } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('parent_booking_id', booking.id);

                    const dbIds = new Set((dbChildren as any[])?.map(c => c.id) || []);
                    const currentInstances = recurrenceInstances.slice(1); // All except parent
                    const currentIds = new Set(currentInstances.map(i => i.id).filter(id => !id.startsWith('instance-')));

                    // Delete instances removed in UI
                    const toDelete = [...dbIds].filter(id => !currentIds.has(id));
                    if (toDelete.length > 0) {
                        await supabase.from('bookings').delete().in('id', toDelete);
                    }

                    // Update existing or Insert new
                    for (const inst of currentInstances) {
                        const instStart = new Date(inst.date);
                        instStart.setHours(parseInt(inst.time.split(':')[0]), parseInt(inst.time.split(':')[1]));
                        const instEnd = new Date(instStart.getTime() + inst.duration_minutes * 60 * 1000);

                        const instData = {
                            ...bookingData,
                            service_id: inst.service_id,
                            tenant_id: sessionTenantId,
                            parent_booking_id: booking.id,
                            start_date: instStart.toISOString(),
                            end_date: instEnd.toISOString(),
                            price: inst.price + addonsTotalPerVisit,
                            cleaner_pay_rate: inst.cleaner_pay_rate,
                            duration_minutes: inst.duration_minutes,
                            is_exception: false, // Could be true if modified, but false for now
                        };

                        let finalId = inst.id;
                        if (!inst.id.startsWith('instance-')) {
                            await (supabase.from('bookings') as any).update(instData).eq('id', inst.id);
                        } else {
                            const { data: newInst } = await (supabase.from('bookings') as any).insert(instData).select().single();
                            finalId = (newInst as any).id;
                        }

                        // Sync Assignments for this Instance (Cascade)
                        // Verify if we should update assignments.
                        // For now, we apply the CURRENT modal assignments to ALL instances in the series (Cascade).
                        if (assignments.length > 0) {
                            // Clear existing
                            await supabase.from('booking_assignments').delete().eq('booking_id', finalId);

                            // Insert new
                            const assignmentInserts = assignments.map(a => ({
                                booking_id: finalId,
                                member_id: a.member_id,
                                pay_rate: a.pay_rate,
                                status: 'pending'
                            }));

                            const { error: assignError } = await supabase
                                .from('booking_assignments')
                                .insert(assignmentInserts);

                            if (assignError) throw assignError;
                        } else if (!formData.assigned_to) {
                            // If unassigned, clear assignments
                            await supabase.from('booking_assignments').delete().eq('booking_id', finalId);
                        }

                        // Sync Addons for this Instance
                        const { data: instAddons } = await supabase.from('booking_addons').select('addon_id').eq('booking_id', finalId);
                        const dbInstAddonIds = new Set((instAddons as any[])?.map(a => a.addon_id) || []);
                        const currentInstAddons = inst.addon_ids;

                        // Delete
                        const instToDel = [...dbInstAddonIds].filter(id => !currentInstAddons.includes(id));
                        if (instToDel.length > 0) {
                            await supabase.from('booking_addons').delete().eq('booking_id', finalId).in('addon_id', instToDel);
                        }
                        // Insert
                        const instToIns = currentInstAddons.filter(id => !dbInstAddonIds.has(id));
                        for (const aid of instToIns) {
                            const addon = addons.find(a => a.id === aid);
                            await (supabase.from('booking_addons') as any).insert({
                                booking_id: finalId,
                                addon_id: aid,
                                price_at_time: addon?.price || 0,
                                quantity: 1
                            });
                        }
                    }
                } else {
                    // If changed to 'none', delete all children
                    await supabase.from('bookings').delete().eq('parent_booking_id', booking.id);
                }

                toast.success(t('booking_modal.success_series_updated'));
            } else {
                // Create parent booking
                // For single booking, price includes addons
                // For recurrence, parent usually stores "default" price or 0? 
                // Let's store the first instance price + addons.

                const firstInstance = (formData.recurrence_type !== 'none' && recurrenceInstances.length > 0)
                    ? recurrenceInstances[0]
                    : null;

                const parentDuration = firstInstance ? firstInstance.duration_minutes : formData.duration_minutes;
                const parentEnd = new Date(startDateTime.getTime() + parentDuration * 60 * 1000);

                const { data: parentBooking, error } = await (supabase
                    .from('bookings') as any)
                    .insert({
                        ...bookingData,
                        service_id: firstInstance ? firstInstance.service_id : formData.service_id,
                        price: (firstInstance ? firstInstance.price : formData.price) + addonsTotalPerVisit,
                        duration_minutes: parentDuration,
                        end_date: parentEnd.toISOString(),
                        tenant_id: sessionTenantId,
                        recurrence_rule: formData.recurrence_type !== 'none'
                            ? (formData.recurrence_type === 'biweekly' ? 'FREQ=WEEKLY;INTERVAL=2' : `FREQ=${formData.recurrence_type.toUpperCase()}`)
                            : null,
                        recurrence_count: formData.recurrence_type !== 'none' ? recurrenceInstances.length : null,
                        cleaner_pay_rate: firstInstance ? firstInstance.cleaner_pay_rate : formData.cleaner_pay_rate,
                    } as any)
                    .select()
                    .single();

                if (error) throw error;
                if (parentBooking) createdBookingId = (parentBooking as any).id;

                // 3.1 Insert Booking Assignments for PARENT (Multi-User)
                if (assignments.length > 0) {
                    const assignmentInserts = assignments.map(a => ({
                        booking_id: (parentBooking as any).id,
                        member_id: a.member_id,
                        pay_rate: a.pay_rate,
                        status: 'pending'
                    }));

                    const { error: assignError } = await supabase
                        .from('booking_assignments')
                        .insert(assignmentInserts);

                    if (assignError) throw assignError;
                } else if (formData.assigned_to) {
                    // Should we insert for single user compatibility?
                    // For strict conflict checking, yes we should.
                    // But we need the member_id (UUID), not just user_id.
                    // The assignments array is populated by handleStaffChange, so we should be good.
                    // If assignments is empty but assigned_to is set, it might be legacy or direct state manipulation.
                    // We'll trust assignments array for now.
                }

                // Insert Addons for Parent
                if (selectedAddons.length > 0) {
                    const addonInserts = selectedAddons.map(aid => {
                        const addon = addons.find(a => a.id === aid);
                        return {
                            booking_id: (parentBooking as any).id,
                            addon_id: aid,
                            price_at_time: addon?.price || 0,
                            quantity: 1
                        };
                    });
                    await supabase.from('booking_addons').insert(addonInserts);
                }
                if (error) throw error;

                // Insert Addons for child instances
                if (recurrenceInstances.length > 1) {
                    for (let i = 1; i < recurrenceInstances.length; i++) {
                        const inst = recurrenceInstances[i];
                        const instStart = new Date(inst.date);
                        instStart.setHours(parseInt(inst.time.split(':')[0]), parseInt(inst.time.split(':')[1]));
                        const instEnd = new Date(instStart.getTime() + inst.duration_minutes * 60 * 1000);

                        const instData = {
                            ...bookingData,
                            service_id: inst.service_id,
                            tenant_id: sessionTenantId,
                            parent_booking_id: (parentBooking as any).id,
                            start_date: instStart.toISOString(),
                            end_date: instEnd.toISOString(),
                            price: inst.price + inst.addon_ids.reduce((s, aid) => s + (addons.find(a => a.id === aid)?.price || 0), 0),
                            cleaner_pay_rate: inst.cleaner_pay_rate,
                            duration_minutes: inst.duration_minutes,
                            is_exception: false
                        };

                        const { data: childObj } = await (supabase
                            .from('bookings') as any)
                            .insert(instData)
                            .select()
                            .single();

                        // 3.1 Insert Booking Assignments (Multi-User)
                        if (true) { // Always run this block, logic inside handles empty

                            const assignmentInserts = assignments.map(a => ({
                                booking_id: (childObj as any).id,
                                member_id: a.member_id,
                                pay_rate: a.pay_rate,
                                status: 'pending'
                            }));

                            // We use maybeSingle or catch errors for overlaps
                            const { error: assignError } = await supabase
                                .from('booking_assignments')
                                .insert(assignmentInserts);

                            if (assignError) {
                                // If overlap triggered, we must throw to rollback or at least stop
                                throw assignError;
                            }
                        } else if (formData.assigned_to) {
                            // Fallback: If no assignment array but assigned_to is set (Legacy or Single user via dropdown)
                            // Logic: Find the member_id for this user_id
                            const member = staff.find(s => s.id === formData.assigned_to);
                            // We need actual team_member_id.
                            // Fetch it if needed or rely on the fact that for single user 'assigned_to' works for display.
                            // BUT we should really populate booking_assignments for consistency if we want conflict check.

                            // Optional: For now, if assignments array is empty, we rely on legacy 'assigned_to' column only?
                            // No, user wants conflict check. We MUST insert into booking_assignments.

                            // Problem: We need team_member_id. 'staff' array probably needs it.
                            // Let's defer this specific single-user improvement for the next quick step if needed,
                            // but assignments array is populated by handleStaffChange now. So it should be fine.
                        }


                        // Insert Addons for this specific child
                        if (inst.addon_ids.length > 0) {
                            const childAddonInserts = inst.addon_ids.map(aid => {
                                const addon = addons.find(a => a.id === aid);
                                return {
                                    booking_id: (childObj as any).id,
                                    addon_id: aid,
                                    price_at_time: addon?.price || 0,
                                    quantity: 1
                                };
                            });
                            await (supabase.from('booking_addons') as any).insert(childAddonInserts);
                        }
                    }
                }

                // Trigger Notification (Background)
                if ((formData.notify_client !== 'none' || formData.notify_staff !== 'none') && createdBookingId) {
                    supabase.functions.invoke('send_booking_notification', {
                        body: { booking_id: createdBookingId }
                    }).catch(err => console.error("Notification Trigger Error:", err));
                }

                toast.success(recurrenceInstances.length > 1
                    ? t('booking_modal.success_created_count', { count: recurrenceInstances.length })
                    : t('booking_modal.success_created')
                );
            }

            // Update Inventory (Replace all)
            const finalBookingId = isEditMode ? booking.id : createdBookingId;
            if (finalBookingId && bookingInventory.length > 0) {
                await supabase.from('booking_inventory').delete().eq('booking_id', finalBookingId);
                await supabase.from('booking_inventory').insert(
                    bookingInventory.map(item => ({
                        booking_id: finalBookingId,
                        item_id: item.item_id,
                        quantity: item.quantity,
                        tenant_id: sessionTenantId
                    }))
                );
            }

            onSave();
            onClose();
        } catch (e: any) {
            console.error('FULL BOOKING ERROR:', e);
            let errorMessage = e.message || 'Erro desconhecido ao salvar';

            if (e.code === '23503' && e.message?.includes('bookings_tenant_id_fkey')) {
                errorMessage = t('booking_modal.error_sync');
            } else if (e.code === '23503') {
                errorMessage = t('booking_modal.error_integrity') + (e.details || e.message);
            }

            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const getSelectedCustomer = () => customers.find(c => c.id === formData.customer_id);
    const getSelectedService = () => services.find(s => s.id === formData.service_id);

    // Smart Availability Logic
    const isStaffAvailable = (staffId: string, checkTime?: string) => {
        // If no date is selected, we can't check
        if (!formData.start_date) return true;

        const timeToCheck = checkTime || formData.start_time;
        if (!timeToCheck) return true; // No time to check yet

        const date = new Date(`${formData.start_date}T${timeToCheck}`);
        const dayOfWeek = date.getDay(); // 0 = Sunday

        // Find rules for this staff member
        const rule = (availabilityRules as any[]).find(r => r.user_id === staffId && r.day_of_week === dayOfWeek);

        if (!rule) return false; // Default to unavailable if no rule exists for that day? Or true? Usually false ensures safety.

        if (!rule.is_available) return false;

        // Check time range
        return timeToCheck >= rule.start_time && timeToCheck <= rule.end_time;
    };

    const availableStaff = staff.filter(s => isStaffAvailable(s.id));
    const unavailableStaff = staff.filter(s => !isStaffAvailable(s.id));

    // Generate Time Slots based on Staff Availability
    const generateTimeSlots = () => {
        const slots: { time: string; available: boolean }[] = [];
        const startHour = 8; // Configurable?
        const endHour = 18; // Configurable?

        for (let hour = startHour; hour <= endHour; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

                let isAvailable = true;
                if (formData.assigned_to) {
                    isAvailable = isStaffAvailable(formData.assigned_to, timeStr);
                }

                slots.push({ time: timeStr, available: isAvailable });
            }
        }
        return slots;
    };



    if (!isOpen) return null;

    const toggleAddon = (id: string) => {
        setSelectedAddons(prev => {
            if (prev.includes(id)) {
                return prev.filter(aid => aid !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const totalPriceRecurrence = () => {
        // Base Total from Instances
        let instancesTotal = 0;
        if (formData.recurrence_type === 'none') {
            instancesTotal = formData.price;
        } else {
            instancesTotal = recurrenceInstances.reduce((sum, i) => sum + i.price, 0);
        }

        // Addons Total (Per instance or One-off?)
        // Assumption: Add-ons are per visit/instance.
        // So we multiply addons total by number of instances (if recurrence > none, else 1)

        const addonsTotalPerVisit = selectedAddons.reduce((sum, id) => {
            const addon = addons.find(a => a.id === id);
            return sum + (addon?.price || 0);
        }, 0);

        const count = formData.recurrence_type !== 'none' ? recurrenceInstances.length : 1;
        const totalBeforeDiscount = instancesTotal + (addonsTotalPerVisit * count);

        let discountAmount = 0;
        if (discount.type === 'fixed') {
            discountAmount = discount.value;
        } else {
            discountAmount = (totalBeforeDiscount * discount.value) / 100;
        }

        return Math.max(0, totalBeforeDiscount - discountAmount);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-5xl animate-in zoom-in-95 max-h-[92vh] flex flex-col transition-all duration-500 ${showDrawer ? 'scale-[0.98] opacity-90 -translate-x-32' : ''}`}>

                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-t-3xl border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-800 tracking-tight">
                                {isEditMode ? t('booking_modal.edit_title') : t('booking_modal.new_title')}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{t('booking_modal.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden p-8 flex gap-8">

                    {/* Left Column: Client & Service Details */}
                    <div className="flex-[1.2] space-y-6 overflow-y-auto pr-2 custom-scrollbar">

                        {/* Section: Cliente Card */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking_modal.client_label')}</label>
                                {formData.customer_id && (
                                    <button
                                        onClick={() => {
                                            setDrawerMode('customer');
                                            setShowDrawer(true);
                                        }}
                                        className="text-xs text-indigo-600 font-bold hover:text-indigo-700"
                                    >
                                        {t('booking_modal.change_button')}
                                    </button>
                                )}
                            </div>

                            {formData.customer_id ? (
                                <div
                                    onClick={() => {
                                        setDrawerMode('customer');
                                        setShowDrawer(true);
                                    }}
                                    className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 cursor-pointer hover:bg-indigo-100/50 transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                            {getSelectedCustomer()?.name?.[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">
                                                {getSelectedCustomer()?.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 line-clamp-1">{getSelectedCustomer()?.address}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] px-2 py-0.5 bg-white rounded-full text-slate-500 font-bold border border-indigo-100">
                                                    {getSelectedCustomer()?.phone}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setDrawerMode('customer');
                                        setShowDrawer(true);
                                    }}
                                    className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition-all group flex items-center justify-center gap-2"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                        <UserPlus size={16} />
                                    </div>
                                    <span className="font-bold text-slate-400 group-hover:text-indigo-600">{t('booking_modal.select_client_placeholder')}</span>
                                </button>
                            )}
                        </div>

                        {/* Section: Staff & Color (Moved) */}
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking_modal.assign_to_label')}</label>

                                        {assignments.length > 0 && (
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                {assignments.length} Membro(s)
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700 transition-all"
                                                value={selectedCrewId}
                                                onChange={e => {
                                                    if (e.target.value) handleCrewChange(e.target.value);
                                                    else {
                                                        setSelectedCrewId('');
                                                        setAssignments([]);
                                                    }
                                                }}
                                            >
                                                <option value="">Selecionar Equipe...</option>
                                                {crews.map(c => (
                                                    <option key={c.id} value={c.id}>👥 {c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="relative flex-1">
                                            <select
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700 transition-all"
                                                value={formData.assigned_to}
                                                onChange={e => handleStaffChange(e.target.value)}
                                                disabled={!!selectedCrewId} // Lock individual selector if crew selected
                                            >
                                                <option value="">(Ou) Individual...</option>
                                                <optgroup label={t('booking_modal.available_group')}>
                                                    {availableStaff.map(s => (
                                                        <option key={s.id} value={s.id}>✅ {s.name} ({s.role})</option>
                                                    ))}
                                                </optgroup>
                                                {unavailableStaff.length > 0 && (
                                                    <optgroup label={t('booking_modal.unavailable_group')}>
                                                        {unavailableStaff.map(s => (
                                                            <option key={s.id} value={s.id}>⚠️ {s.name} ({s.role})</option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Assignments List with Pay Rate Overrides */}
                                    {assignments.length > 0 && (
                                        <div className="mt-2 space-y-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Pagamentos Individuais (R$)</label>
                                            {assignments.map((assign, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                        {assign.name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-slate-700 truncate">{assign.name}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-slate-400">R$</span>
                                                        <input
                                                            type="number"
                                                            className="w-16 px-1 py-0.5 text-right text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                                                            value={assign.pay_rate}
                                                            onChange={e => updateAssignmentPay(idx, parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                    <button onClick={() => removeAssignment(idx)} className="text-slate-300 hover:text-rose-500">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!isStaffAvailable(formData.assigned_to) && formData.assigned_to && !selectedCrewId && (
                                        <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-200 animate-in fade-in">
                                            <div className="min-w-4"><Clock size={14} /></div>
                                            <span><strong>{t('booking_modal.warning_unavailable', { defaultValue: 'Warning:' })}</strong> {t('booking_modal.warning_unavailable_text', { defaultValue: 'This time might be outside the shift.' })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section: Serviço e Valores */}
                        <div className={`space-y-4 transition-all duration-300 ${!formData.assigned_to ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking_modal.service_label')}</label>
                            <div className="space-y-4">
                                {/* Smart Service Selector */}
                                <div className="space-y-3">


                                    {/* Summary Card */}
                                    {formData.service_id ? (
                                        <div
                                            onClick={() => {
                                                setDrawerMode('service');
                                                setShowDrawer(true);
                                            }}
                                            className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group animate-in fade-in zoom-in-95"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-indigo-50 shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                    <Sparkles size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-indigo-900">
                                                        {formData.recurrence_type !== 'none' && recurrenceInstances.length > 0
                                                            ? services.find(s => s.id === recurrenceInstances[0].service_id)?.name
                                                            : getSelectedService()?.name}
                                                    </div>
                                                    <div className="text-[10px] text-indigo-700/70 font-bold">
                                                        {formData.recurrence_type !== 'none' && recurrenceInstances.length > 0
                                                            ? `${recurrenceInstances[0].duration_minutes} min • R$ ${recurrenceInstances[0].price.toFixed(2)}`
                                                            : `${getSelectedService()?.duration_minutes || 0} min • R$ ${formData.price.toFixed(2)}`}
                                                    </div>
                                                </div>
                                                <div className="ml-auto">
                                                    <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-600">
                                                        {t('booking_modal.edit_button')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setDrawerMode('service');
                                                setShowDrawer(true);
                                            }}
                                            className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition-all group flex items-center justify-center gap-2"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                <Sparkles size={16} />
                                            </div>
                                            <span className="font-bold text-slate-400 group-hover:text-indigo-600">{t('booking_modal.select_service_placeholder')}</span>
                                        </button>
                                    )}

                                    {/* Old Smart Estimate Card (Disabled) */}
                                    {false && formData.service_id && (
                                        <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-50/50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {/* Header with Sales Copy */}
                                            <div className="bg-indigo-50/50 p-4 border-b border-indigo-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-black text-indigo-900 text-sm">{getSelectedService()?.name}</h4>
                                                        <p className="text-xs text-indigo-700/80 mt-1 italic font-medium">
                                                            "{getSelectedService()?.description || 'Serviço profissional de alta qualidade.'}"
                                                        </p>
                                                    </div>
                                                    <div className="bg-white px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                                        <span className="text-xs font-black text-indigo-600">{getSelectedService()?.duration_minutes} min</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Checklist (What's Included) */}
                                            {serviceTasks.length > 0 && (
                                                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">{t('booking_modal.whats_included')}</label>
                                                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                        {serviceTasks.map(task => (
                                                            <div key={task.id} className="flex items-start gap-2.5 group">
                                                                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                                                                    <Check size={10} strokeWidth={3} />
                                                                </div>
                                                                <span className="text-xs text-slate-600 font-medium leading-relaxed group-hover:text-slate-900 transition-colors">
                                                                    {task.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Price & Discount Engine */}
                                            <div className="p-4 grid grid-cols-2 gap-4">
                                                {/* Base Price */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">{t('booking_modal.base_price_label')}</label>
                                                    <div className="relative group">
                                                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700 transition-all"
                                                            value={formData.price}
                                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Discount Selector */}
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">{t('booking_modal.apply_discount_label')}</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 px-2 outline-none focus:border-indigo-500"
                                                            value={discount.type}
                                                            onChange={e => setDiscount({ ...discount, type: e.target.value as any })}
                                                        >
                                                            <option value="fixed">R$</option>
                                                            <option value="percent">%</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            step={discount.type === 'percent' ? '1' : '0.01'}
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-bold text-rose-600 placeholder:text-rose-200 transition-all"
                                                            placeholder="0"
                                                            value={discount.value || ''}
                                                            onChange={e => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reason for Discount - Only show if discount > 0 */}
                                            {discount.value > 0 && (
                                                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1">
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 placeholder:text-rose-300 focus:ring-1 focus:ring-rose-500 outline-none"
                                                        placeholder={t('booking_modal.discount_reason_placeholder')}
                                                        value={discount.reason}
                                                        onChange={e => setDiscount({ ...discount, reason: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 2.1 ADD-ONS UPSELL */}

                            </div>
                        </div>


                        {/* Section: Status */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking_modal.status_label')}</label>
                            <div className="flex gap-2">
                                {['pending', 'confirmed', 'completed', 'cancelled'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setFormData({ ...formData, status: st })}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${formData.status === st
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'
                                            }`}
                                    >
                                        {st === 'pending' ? t('booking_modal.status_pending') : st === 'confirmed' ? t('booking_modal.status_confirmed') : st === 'completed' ? t('booking_modal.status_completed') : t('booking_modal.status_cancelled')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section: Payment Preference */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('booking_modal.payment_method_label', { defaultValue: 'Preferência de Pagamento' })}</label>
                            <div className="flex gap-2">
                                {[
                                    { id: 'stripe', label: 'Stripe/CC', icon: CreditCard },
                                    { id: 'zelle', label: 'Zelle', icon: DollarSign },
                                    { id: 'venmo', label: 'Venmo', icon: DollarSign },
                                    { id: 'check', label: 'Check', icon: FileText },
                                ].map(pm => (
                                    <button
                                        key={pm.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, payment_method_preference: pm.id })}
                                        className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${formData.payment_method_preference === pm.id
                                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm ring-1 ring-indigo-600'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'
                                            }`}
                                    >
                                        <pm.icon size={14} className="mb-1" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">{pm.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Schedule Card & Notes */}
                    <div className="flex-1 space-y-6 flex flex-col overflow-hidden">

                        {/* Schedule Summary Card */}
                        <div
                            onClick={() => {
                                setDrawerMode('schedule');
                                setShowDrawer(true);
                            }}
                            className={`p-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-100 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group shrink-0 ${!formData.assigned_to ? 'opacity-40 pointer-events-none grayscale' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <Clock size={20} />
                                </div>
                                <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                    {formData.recurrence_type === 'none' ? t('booking_modal.type_single') : t('booking_modal.type_recurring')}
                                </div>
                            </div>

                            {formData.start_date ? (
                                <div>
                                    <div className="text-2xl font-black">{format(new Date(`${formData.start_date}T00:00:00`), "dd 'de' MMM", { locale: ptBR })}</div>
                                    <div className="text-white/80 font-bold flex items-center gap-1.5 mt-1">
                                        <span>{formData.start_time}</span>
                                        <span className="opacity-40">•</span>
                                        <span>{formData.duration_minutes}min</span>
                                        {formData.recurrence_type !== 'none' && (
                                            <>
                                                <span className="opacity-40">•</span>
                                                <span className="capitalize">{formData.recurrence_type} ({formData.recurrence_count}x)</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-2">
                                    <div className="text-lg font-bold">{t('booking_modal.time_undefined')}</div>
                                    <div className="text-white/60 text-xs">{t('booking_modal.click_to_configure')}</div>
                                </div>
                            )}

                            <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center group-hover:border-white/20 transition-colors">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">{t('booking_modal.configure_schedule')}</span>
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Notes & Inventory Section */}
                        <div className="flex-1 border border-slate-100 rounded-3xl flex flex-col overflow-hidden bg-slate-50/30">
                            <div className="flex gap-1 p-1.5 bg-slate-100 rounded-t-3xl shrink-0">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex-1 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'details'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {t('booking_modal.tab_notes')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('inventory')}
                                    className={`flex-1 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'inventory'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {t('booking_modal.tab_inventory')}
                                </button>
                            </div>

                            {activeTab === 'details' ? (
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <div className="flex gap-1 p-1.5 bg-slate-50 border-b border-slate-100 shrink-0">
                                        {(['internal', 'client', 'staff'] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveNotesTab(tab)}
                                                className={`flex-1 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeNotesTab === tab
                                                    ? 'bg-slate-800 text-white shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {tab === 'internal' ? t('booking_modal.tab_internal') : tab === 'client' ? t('booking_modal.tab_client') : t('booking_modal.tab_staff')}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-4 flex-1 overflow-y-auto">
                                        <textarea
                                            className="w-full h-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 placeholder:text-slate-300 italic resize-none"
                                            placeholder={
                                                activeNotesTab === 'internal' ? t('booking_modal.notes_placeholder_internal') :
                                                    activeNotesTab === 'client' ? t('booking_modal.notes_placeholder_client') :
                                                        t('booking_modal.notes_placeholder_staff')
                                            }
                                            value={
                                                activeNotesTab === 'internal' ? formData.notes_internal :
                                                    activeNotesTab === 'client' ? formData.notes_client :
                                                        formData.notes_staff
                                            }
                                            onChange={e => setFormData({
                                                ...formData,
                                                [activeNotesTab === 'internal' ? 'notes_internal' : activeNotesTab === 'client' ? 'notes_client' : 'notes_staff']: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{t('booking_modal.supplies_label')}</h4>
                                        <span className="text-[10px] text-slate-400 font-bold">{bookingInventory.length} {t('booking_modal.items_count')}</span>
                                    </div>

                                    {isLoadingInventory ? (
                                        <div className="text-center py-8"><div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto"></div></div>
                                    ) : (
                                        <div className="space-y-2">
                                            {bookingInventory.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl group">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700">{item.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} {item.unit}(s)</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setBookingInventory(bookingInventory.filter((_, i) => i !== idx))}
                                                            className="p-1.5 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="pt-2">
                                                <select
                                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                                                    onChange={(e) => {
                                                        const item = availableInventory.find(i => i.id === e.target.value);
                                                        if (item) {
                                                            setBookingInventory([...bookingInventory, { item_id: item.id, quantity: 1, name: item.name, unit: item.unit }]);
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                    value=""
                                                >
                                                    <option value="">{t('booking_modal.add_extra_item')}</option>
                                                    {availableInventory.filter(i => !bookingInventory.some(bi => bi.item_id === i.id)).map(i => (
                                                        <option key={i.id} value={i.id}>{i.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-3xl">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('booking_modal.total_label')}</span>
                        <div className="flex items-center gap-2">
                            {formData.recurrence_type !== 'none' && (
                                <span className="text-xs text-slate-400 font-bold">{t('booking_modal.grand_total_label')}</span>
                            )}
                            <span className="text-2xl font-black text-indigo-700">R$ {totalPriceRecurrence().toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-2xl transition-colors text-sm">
                            {t('booking_modal.cancel_button')}
                        </button>
                        {isEditMode && (
                            <button
                                onClick={handleDeleteClick}
                                className="px-4 py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-2xl transition-colors text-sm flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || !formData.customer_id || !formData.assigned_to || !formData.service_id || !formData.start_date || !formData.start_time}
                            className={`px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 text-sm ${(!formData.customer_id || !formData.assigned_to || !formData.service_id || !formData.start_date || !formData.start_time) ? 'grayscale' : ''}`}
                        >
                            {saving ? (
                                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {t('booking_modal.saving')}</span>
                            ) : (
                                <>{isEditMode ? t('booking_modal.save_changes') : t('booking_modal.confirm_booking')} <ChevronRight size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <DeleteRecurrenceModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDeleteSeries}
                instances={recurrenceSeriesForDelete}
                isDeleting={isDeleting}
            />

            {/* Slide-over (Scheduling & Recurrence) */}
            {showDrawer && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowDrawer(false)}></div>

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                                    {drawerMode === 'schedule' ? t('booking_modal.drawer_schedule_title') : drawerMode === 'service' ? t('booking_modal.drawer_service_title') : t('booking_modal.drawer_client_title')}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                                    {drawerMode === 'schedule' ? t('booking_modal.drawer_schedule_subtitle') : drawerMode === 'service' ? t('booking_modal.subtitle') : t('booking_modal.drawer_client_subtitle')}
                                </p>
                            </div>
                            <button onClick={() => setShowDrawer(false)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all active:scale-95">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            {drawerMode === 'customer' ? (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <CustomerCombobox
                                        customers={customers}
                                        selectedId={formData.customer_id}
                                        onSelect={(customer) => {
                                            setFormData({ ...formData, customer_id: customer.id });
                                            setShowDrawer(false);
                                        }}
                                        onCreate={async (newCust) => {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) return null;

                                            const { data: profile } = await supabase
                                                .from('profiles')
                                                .select('tenant_id')
                                                .eq('id', user.id)
                                                .single();

                                            const tenantId = (profile as any)?.tenant_id;
                                            if (!tenantId) {
                                                toast.error("Erro: Tenant ID náo encontrado.");
                                                return null;
                                            }

                                            if (newCust.phone || newCust.email) {
                                                const filters = [];
                                                if (newCust.phone) filters.push(`phone.eq.${newCust.phone}`);
                                                if (newCust.email) filters.push(`email.eq.${newCust.email}`);

                                                const { data: existing } = await (supabase
                                                    .from('customers')
                                                    .select('*')
                                                    .eq('tenant_id', tenantId)
                                                    .or(filters.join(','))
                                                    .maybeSingle() as any);

                                                if (existing) {
                                                    toast.info("Cliente já cadastrado. Selecionando existente...");
                                                    if (!(customers as Customer[]).find(c => c.id === existing.id)) {
                                                        setCustomers([...customers, existing as Customer]);
                                                    }
                                                    setShowDrawer(false);
                                                    return existing as Customer;
                                                }
                                            }

                                            const { data, error } = await supabase
                                                .from('customers')
                                                .insert({
                                                    name: newCust.name,
                                                    email: newCust.email || null,
                                                    phone: newCust.phone || null,
                                                    address: newCust.address,
                                                    tenant_id: tenantId
                                                } as any)
                                                .select()
                                                .single();

                                            if (error) { toast.error(`Erro: ${error.message}`); return null; }
                                            toast.success("Cliente criado!");
                                            setCustomers([...customers, data as Customer]);
                                            setShowDrawer(false);
                                            return data as Customer;
                                        }}
                                    />

                                    <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <UserPlus size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 mb-1">Novo Cliente?</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                Digite o nome acima. Se náo encontrarmos, o formulário de cadastro aparecerá automaticamente aqui mesmo.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : drawerMode === 'service' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex-1 overflow-y-auto px-1 scrollbar-hide pb-20">
                                        {(() => {
                                            const selectedService = getSelectedService();
                                            return (
                                                <>
                                                    {/* INITIAL SERVICE SECTION */}
                                                    <div className="mb-8">
                                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
                                                            {formData.use_split_recurrence ? '1ª Visita (Serviço Inicial)' : 'Serviço Principal'}
                                                        </label>

                                                        <div className="flex gap-2 mb-4">
                                                            <div className="w-1/3 relative">
                                                                <select
                                                                    className="w-full pl-3 pr-8 py-3 bg-white border border-slate-200 rounded-2xl appearance-none text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                    value={selectedCategory}
                                                                    onChange={e => setSelectedCategory(e.target.value)}
                                                                >
                                                                    <option value="">Todas Categorias</option>
                                                                    {categories.map(c => (
                                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                                                            </div>

                                                            <div className="w-2/3 relative">
                                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                                <select
                                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl appearance-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow shadow-sm"
                                                                    value={formData.service_id}
                                                                    onChange={e => handleServiceChange(e.target.value)}
                                                                >
                                                                    <option value="">Selecione o serviço...</option>

                                                                    {/* Empty State warning inside the select if category selected but no services */}
                                                                    {(() => {
                                                                        if (!selectedCategory) return null;
                                                                        const hasServicesInCat = services.some(s => s.category_id === selectedCategory);
                                                                        if (!hasServicesInCat) {
                                                                            return (
                                                                                <option disabled className="text-rose-500">
                                                                                    ⚠️ Nenhum serviço vinculado a esta categoria
                                                                                </option>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}

                                                                    {/* Grouped services by category */}
                                                                    {categories
                                                                        .filter(cat => !selectedCategory || cat.id === selectedCategory)
                                                                        .map(cat => {
                                                                            const catServices = services.filter(s => s.category_id === cat.id);
                                                                            if (catServices.length === 0) return null;

                                                                            return (
                                                                                <optgroup key={cat.id} label={cat.name}>
                                                                                    {catServices.map(s => (
                                                                                        <option key={s.id} value={s.id}>
                                                                                            {s.name} - R$ {s.price_default}
                                                                                        </option>
                                                                                    ))}
                                                                                </optgroup>
                                                                            );
                                                                        })}

                                                                    {/* Services without category (only show if no filter is active or if specifically "all" is intended) */}
                                                                    {(!selectedCategory) && services.filter(s => !s.category_id).length > 0 && (
                                                                        <optgroup label="Geral / Outros">
                                                                            {services.filter(s => !s.category_id).map(s => (
                                                                                <option key={s.id} value={s.id}>
                                                                                    {s.name} - R$ {s.price_default}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    )}
                                                                </select>
                                                                <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90" />
                                                            </div>
                                                        </div>

                                                        {selectedService && (
                                                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800 text-sm">{selectedService.name}</h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wide rounded-md">
                                                                                {selectedService.duration_minutes} min
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-lg font-black text-indigo-600">R$ {formData.price.toFixed(2)}</div>
                                                                        <div className="text-[10px] text-slate-400 font-medium">Preço Base</div>
                                                                    </div>
                                                                </div>

                                                                {serviceTasks.length > 0 && (
                                                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                                                        <div className="mb-4 flex items-center justify-between">
                                                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                                <Sparkles size={14} className="text-amber-500" /> Smart Estimate Checklist
                                                                            </div>
                                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-tight">
                                                                                Incluso
                                                                            </span>
                                                                        </div>

                                                                        <div className="space-y-4 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                                                            {Object.entries(
                                                                                serviceTasks.reduce((acc, task) => {
                                                                                    const room = task.room_name || 'Geral';
                                                                                    if (!acc[room]) acc[room] = [];
                                                                                    acc[room].push(task);
                                                                                    return acc;
                                                                                }, {} as Record<string, ServiceTask[]>)
                                                                            ).map(([room, tasks]) => (
                                                                                <div key={room} className="space-y-2">
                                                                                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                                                                                        <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                                                            {room.toLowerCase().includes('cozinha') || room.toLowerCase().includes('kitchen') ? <Clock size={12} /> :
                                                                                                room.toLowerCase().includes('banheiro') || room.toLowerCase().includes('bath') ? <Palette size={12} /> :
                                                                                                    room.toLowerCase().includes('quarto') || room.toLowerCase().includes('bed') ? <FileText size={12} /> :
                                                                                                        <Check size={12} />}
                                                                                        </div>
                                                                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{room}</span>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-1 gap-1.5 pl-7">
                                                                                        {(tasks as ServiceTask[]).map(task => (
                                                                                            <div key={task.id} className="flex items-start gap-2 group">
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                                                                                                <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">{task.title}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="p-4 grid grid-cols-3 gap-3 bg-slate-50/30">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Preço Manual (R$)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700"
                                                                            value={formData.price}
                                                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Desconto (R$)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-xs font-bold text-rose-600"
                                                                            value={discount.value || ''}
                                                                            onChange={e => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="my-6 border-t border-slate-100" />

                                                    {/* Add-ons Section */}
                                                    <div className="pt-4">
                                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-4">
                                                            Adicionais & Upsell
                                                        </label>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {addons
                                                                .filter(addon => addon.is_standalone || (formData.service_id && !addon.is_standalone))
                                                                .map(addon => {
                                                                    const isSelected = selectedAddons.includes(addon.id);
                                                                    return (
                                                                        <div
                                                                            key={addon.id}
                                                                            onClick={() => toggleAddon(addon.id)}
                                                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${isSelected
                                                                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                                                : 'bg-white border-slate-100 hover:border-indigo-200'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-400'
                                                                                    }`}>
                                                                                    <Check size={12} strokeWidth={4} />
                                                                                </div>
                                                                                <div>
                                                                                    <div className={`text-xs font-bold transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{addon.name}</div>
                                                                                    {addon.description && <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{addon.description}</div>}
                                                                                </div>
                                                                            </div>
                                                                            <div className={`text-xs font-black transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                                                + R$ {addon.price.toFixed(2)}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>

                                                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0 mt-auto">
                                                        <button
                                                            onClick={() => setShowDrawer(false)}
                                                            className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                                                        >
                                                            Confirmar Serviços
                                                        </button>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">

                                    {/* Section 1: Data & Hora */}
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-6">
                                            <span className="bg-slate-800 text-white h-5 w-5 rounded-lg flex items-center justify-center not-italic text-[10px] shadow-lg shadow-slate-200">1</span>
                                            Definiçáo Inicial
                                        </label>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data</label>
                                                <input
                                                    type="date"
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700"
                                                    value={formData.start_date}
                                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                                />
                                            </div>
                                            {/* Smart Time Slot Selector */}
                                            <div className="space-y-3 col-span-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                                                    Horários Disponíveis
                                                    {formData.assigned_to && (
                                                        <span className="ml-2 text-indigo-600 font-normal normal-case opacity-80">
                                                            (Baseado em {staff.find(s => s.id === formData.assigned_to)?.name})
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                    {generateTimeSlots().map(slot => (
                                                        <button
                                                            key={slot.time}
                                                            type="button"
                                                            disabled={!slot.available}
                                                            onClick={() => setFormData({ ...formData, start_time: slot.time })}
                                                            className={`
                                                                    py-2 rounded-lg text-xs font-bold transition-all border
                                                                    ${formData.start_time === slot.time
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                                                    : slot.available
                                                                        ? 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                                                        : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed decoration-slate-300'
                                                                }
                                                                `}
                                                        >
                                                            {slot.time}
                                                        </button>
                                                    ))}
                                                </div>
                                                {generateTimeSlots().filter(s => s.available).length === 0 && (
                                                    <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-xl flex items-center gap-2 border border-amber-100">
                                                        <Sparkles size={14} />
                                                        <span>Nenhum horário disponível para este dia.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Duraçáo</label>
                                            <select
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700 transition-all"
                                                value={formData.duration_minutes}
                                                onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                            >
                                                <option value={30}>30 min</option>
                                                <option value={60}>1 hora</option>
                                                <option value={90}>1h 30min</option>
                                                <option value={120}>2 horas</option>
                                                <option value={180}>3 horas</option>
                                                <option value={240}>4 horas</option>
                                            </select>
                                        </div>
                                    </div>


                                    {/* Section 2: Recorrência */}
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-6">
                                            <span className="bg-slate-800 text-white h-5 w-5 rounded-lg flex items-center justify-center not-italic text-[10px] shadow-lg shadow-slate-200">2</span>
                                            Frequência
                                        </label>

                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: 'none', label: 'Náo repete' },
                                                { value: 'daily', label: 'Diário' },
                                                { value: 'weekly', label: 'Semanal' },
                                                { value: 'biweekly', label: 'Quinzenal' },
                                                { value: 'monthly', label: 'Mensal' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, recurrence_type: opt.value as RecurrenceType })}
                                                    className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${formData.recurrence_type === opt.value
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        {formData.recurrence_type !== 'none' && (
                                            <div className="mt-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-bold text-indigo-700 uppercase">Repetir</span>
                                                    <input
                                                        type="number"
                                                        min="2"
                                                        max="52"
                                                        className="w-16 h-12 bg-white border border-indigo-200 rounded-2xl text-lg font-black text-center text-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        value={formData.recurrence_count}
                                                        onChange={e => setFormData({ ...formData, recurrence_count: parseInt(e.target.value) || 4 })}
                                                    />
                                                    <span className="text-xs font-bold text-indigo-700 uppercase">vezes</span>
                                                </div>
                                                <RefreshCw className="text-indigo-300 animate-spin-slow" size={24} />
                                            </div>
                                        )}

                                        {/* Section 2.5: Notificações */}
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-6">
                                                <span className="bg-slate-800 text-white h-5 w-5 rounded-lg flex items-center justify-center not-italic text-[10px] shadow-lg shadow-slate-200">2.5</span>
                                                Notificações
                                            </label>

                                            <div className="grid grid-cols-1 gap-4">
                                                {/* Cliente Notification */}
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                                            <Mail size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">Notificar Cliente</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confirmação de Agendamento</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                                        {(['none', 'email', 'sms', 'both'] as NotificationType[]).map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => setFormData({ ...formData, notify_client: type })}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.notify_client === type
                                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                                    : 'text-slate-400 hover:text-indigo-500'
                                                                    }`}
                                                            >
                                                                {type === 'none' ? 'Off' : type === 'both' ? 'Email+SMS' : type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Staff Notification */}
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                                                            <MessageSquare size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">Notificar Equipe</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aviso de Novo Trabalho</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                                        {(['none', 'email', 'sms', 'both'] as NotificationType[]).map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => setFormData({ ...formData, notify_staff: type })}
                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.notify_staff === type
                                                                    ? 'bg-purple-600 text-white shadow-sm'
                                                                    : 'text-slate-400 hover:text-purple-500'
                                                                    }`}
                                                            >
                                                                {type === 'none' ? 'Off' : type === 'both' ? 'Email+SMS' : type}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Preview */}
                                    {formData.recurrence_type !== 'none' && recurrenceInstances.length > 0 && (
                                        <div className="space-y-4 pt-4">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-6">
                                                <span className="bg-slate-800 text-white h-5 w-5 rounded-lg flex items-center justify-center not-italic text-[10px] shadow-lg shadow-slate-200">3</span>
                                                Ajuste Fino das Datas
                                            </label>

                                            <div className="space-y-3 pr-2">
                                                {recurrenceInstances.map((instance, idx) => (
                                                    <div
                                                        key={instance.id}
                                                        className={`p-5 rounded-3xl border transition-all group ${editingInstance === instance.id
                                                            ? 'bg-indigo-50/50 border-indigo-200 shadow-xl shadow-indigo-100/20'
                                                            : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-slate-100 cursor-pointer'
                                                            }`}
                                                        onClick={() => setEditingInstance(editingInstance === instance.id ? null : instance.id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-5">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'
                                                                    }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div>
                                                                    <div className="text-base font-black text-slate-800 leading-tight">
                                                                        {format(instance.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                                            {instance.time} • R$ {(instance.price + instance.addon_ids.reduce((s, aid) => s + (addons.find(a => a.id === aid)?.price || 0), 0)).toFixed(2)}
                                                                        </span>
                                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                                        <span className="text-[11px] font-black text-indigo-500 uppercase tracking-tight">
                                                                            {services.find(s => s.id === instance.service_id)?.name}
                                                                            {instance.addon_ids.length > 0 && ` (+${instance.addon_ids.length} add-ons)`}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {idx > 0 && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); removeInstance(instance.id); }}
                                                                        className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-95"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}
                                                                <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${editingInstance === instance.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50'}`}>
                                                                    <Edit2 size={16} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {editingInstance === instance.id && (
                                                            <div className="mt-5 pt-5 border-t border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Data da Visita</label>
                                                                        <input
                                                                            type="date"
                                                                            className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                            value={format(instance.date, 'yyyy-MM-dd')}
                                                                            onChange={e => updateInstance(instance.id, { date: new Date(e.target.value + 'T' + instance.time) })}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Horário</label>
                                                                        <input
                                                                            type="time"
                                                                            className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                            value={instance.time}
                                                                            onChange={e => updateInstance(instance.id, { time: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Categoria da Visita</label>
                                                                            <select
                                                                                className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                                value={instanceCategoryFilter || services.find(s => s.id === instance.service_id)?.category_id || ''}
                                                                                onChange={e => setInstanceCategoryFilter(e.target.value)}
                                                                            >
                                                                                <option value="">Todas Categorias</option>
                                                                                {categories.map(c => (
                                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Serviço da Visita</label>
                                                                            <select
                                                                                className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                                value={instance.service_id}
                                                                                onChange={e => {
                                                                                    const s = services.find(srv => srv.id === e.target.value);
                                                                                    updateInstance(instance.id, {
                                                                                        service_id: e.target.value,
                                                                                        price: s?.price_default || 0,
                                                                                        duration_minutes: s?.duration_minutes || 60
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <option value="">Selecione o serviço...</option>

                                                                                {categories
                                                                                    .filter(cat => !instanceCategoryFilter || cat.id === instanceCategoryFilter)
                                                                                    .map(cat => {
                                                                                        const catServices = services.filter(s => s.category_id === cat.id);
                                                                                        if (catServices.length === 0) return null;
                                                                                        return (
                                                                                            <optgroup key={cat.id} label={cat.name}>
                                                                                                {catServices.map(s => (
                                                                                                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price_default}</option>
                                                                                                ))}
                                                                                            </optgroup>
                                                                                        );
                                                                                    })}

                                                                                {(!instanceCategoryFilter) && services.filter(s => !s.category_id).length > 0 && (
                                                                                    <optgroup label="Geral / Outros">
                                                                                        {services.filter(s => !s.category_id).map(s => (
                                                                                            <option key={s.id} value={s.id}>{s.name} - R$ {s.price_default}</option>
                                                                                        ))}
                                                                                    </optgroup>
                                                                                )}
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4 pt-4 border-t border-indigo-50">
                                                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Add-ons desta Visita</label>
                                                                        {addons.length > 0 ? (
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {addons.map(addon => {
                                                                                    const isSelected = instance.addon_ids.includes(addon.id);
                                                                                    return (
                                                                                        <button
                                                                                            key={addon.id}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const newAddons = isSelected
                                                                                                    ? instance.addon_ids.filter(id => id !== addon.id)
                                                                                                    : [...instance.addon_ids, addon.id];
                                                                                                updateInstance(instance.id, { addon_ids: newAddons });
                                                                                            }}
                                                                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight border transition-all flex items-center gap-2 ${isSelected
                                                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                                                                : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                                                                                                }`}
                                                                                        >
                                                                                            {isSelected ? <Check size={12} /> : <Plus size={12} />}
                                                                                            {addon.name} (+R$ {addon.price})
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="text-[10px] text-slate-400 italic font-medium ml-1">Nenhum add-on disponível para este serviço.</div>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid grid-cols-4 gap-3">
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                                                                            <input
                                                                                type="number"
                                                                                className="w-full px-3 py-3 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                                value={instance.price}
                                                                                onChange={e => updateInstance(instance.id, { price: parseFloat(e.target.value) || 0 })}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            {instance.assignments && instance.assignments.length > 0 ? (
                                                                                <div className="space-y-2">
                                                                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Pagto (R$)</label>
                                                                                    {instance.assignments.map((assign, aIdx) => (
                                                                                        <div key={assign.member_id} className="flex items-center gap-2">
                                                                                            <span className="text-[9px] font-bold text-slate-400 w-16 truncate" title={assign.name}>{assign.name}</span>
                                                                                            <input
                                                                                                type="number"
                                                                                                className="w-full px-2 py-1.5 bg-white border border-indigo-100 rounded-lg text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                                                                                                value={assign.pay_rate}
                                                                                                onChange={e => {
                                                                                                    const newRate = parseFloat(e.target.value) || 0;
                                                                                                    const newAssignments = [...instance.assignments];
                                                                                                    newAssignments[aIdx] = { ...newAssignments[aIdx], pay_rate: newRate };
                                                                                                    updateInstance(instance.id, { assignments: newAssignments });
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Pagto (R$)</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        className="w-full px-3 py-3 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                                                                                        value={instance.cleaner_pay_rate}
                                                                                        onChange={e => updateInstance(instance.id, { cleaner_pay_rate: parseFloat(e.target.value) || 0 })}
                                                                                    />
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Dur (Min)</label>
                                                                            <input
                                                                                type="number"
                                                                                className="w-full px-3 py-3 bg-white border border-indigo-100 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                                                                value={instance.duration_minutes}
                                                                                onChange={e => updateInstance(instance.id, { duration_minutes: parseInt(e.target.value) || 0 })}
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-end pb-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingInstance(null);
                                                                                    // Smart Propagation: If editing the 2nd instance (index 1)
                                                                                    if (idx === 1 && recurrenceInstances.length > 2) {
                                                                                        setPendingPropagationId(instance.id);
                                                                                    }
                                                                                }}
                                                                                className="w-full py-3 bg-black text-white font-black uppercase tracking-widest rounded-2xl text-[9px] shadow-lg hover:bg-slate-800 transition-all active:scale-95"
                                                                            >
                                                                                OK
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0">
                                        <button
                                            onClick={() => setShowDrawer(false)}
                                            className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-2xl shadow-slate-300 active:scale-95"
                                        >
                                            Confirmar Horários
                                        </button>
                                    </div>

                                    {/* Smart Propagation Confirmation Card */}
                                    {pendingPropagationId && (
                                        <div className="absolute inset-x-0 bottom-0 z-[100] p-6 animate-in fade-in slide-in-from-bottom duration-500">
                                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md rounded-t-[40px]" onClick={() => setPendingPropagationId(null)}></div>

                                            <div className="relative w-full bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(79,70,229,0.3)] p-8 border border-indigo-50 flex flex-col gap-6">
                                                <div className="flex items-start gap-5">
                                                    <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 shrink-0">
                                                        <Sparkles size={28} />
                                                    </div>
                                                    <div className="pt-1">
                                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Sugestão Inteligente</h4>
                                                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                                                            Detectamos uma mudança na segunda visita. Deseja replicar essa configuração para todos os agendamentos seguintes?
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => {
                                                            propagateInstanceChanges(pendingPropagationId);
                                                            setPendingPropagationId(null);
                                                        }}
                                                        className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                                    >
                                                        <RefreshCw size={16} className="animate-spin-slow" />
                                                        Sim, Replicar
                                                    </button>
                                                    <button
                                                        onClick={() => setPendingPropagationId(null)}
                                                        className="px-8 py-5 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
                                                    >
                                                        Não
                                                    </button>
                                                </div>

                                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest text-center opacity-40">
                                                    * O Agendamento 1 náo será alterado
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
