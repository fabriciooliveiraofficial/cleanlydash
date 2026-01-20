import React, { useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calculator, Calendar as CalendarIcon, Link, RefreshCw, Loader2, MapPin, ArrowLeft, Save, CheckCircle, Camera, Pencil, LayoutGrid, CalendarDays, CalendarRange } from 'lucide-react';
import { createClient } from '../lib/supabase/client.ts';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { BookingModal } from './BookingModal.tsx';
import { WeekView } from './calendar/WeekView.tsx';
import { DayView } from './calendar/DayView.tsx';
import { Button } from './ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from './ui/dialog.tsx';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isWithinInterval,
  parseISO,
  addWeeks,
  subWeeks,
  addDays,
  subDays
} from 'date-fns';

type ViewMode = 'month' | 'week' | 'day';

import { Booking } from '../types.ts';

interface Calendar {
  id: string;
  name: string;
  url: string;
  last_synced_at: string;
  color: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Bookings: React.FC = () => {
  const { t } = useTranslation();
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // New Calendar State
  const [newCalUrl, setNewCalUrl] = useState('');
  const [newCalName, setNewCalName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [defaultBookingDate, setDefaultBookingDate] = useState<Date | undefined>(undefined);
  const [defaultBookingHour, setDefaultBookingHour] = useState<number | undefined>(undefined);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const handleOpenNewBooking = (date?: Date, hour?: number) => {
    setEditingBooking(null);
    setDefaultBookingDate(date);
    setDefaultBookingHour(hour);
    setShowBookingModal(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking as any);
    setDefaultBookingDate(undefined);
    setDefaultBookingHour(undefined);
    setShowBookingModal(true);
  };

  // Calendar Generation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const fetchData = async () => {
    setLoading(true);

    // Fetch Calendars
    const { data: calendarsData, error: calendarsError } = await supabase.from('calendars').select('*');
    if (calendarsError) {
      console.error("Calendars Fetch Error:", calendarsError);
    } else if (calendarsData) {
      setCalendars(calendarsData as any);
    }

    // Fetch Bookings
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*, customers(name, address)')
      .gte('end_date', startDate.toISOString()) // Optimize fetch for view? For now fetch all or loose filter
      .lte('start_date', endDate.toISOString())
      .order('start_date', { ascending: true });

    if (bookingsError) {
      console.error("Bookings Fetch Error:", bookingsError);
      toast.error(`Error loading bookings: ${bookingsError.message}`);
    } else if (bookingsData) {
      setBookings(bookingsData as any);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]); // Refetch when month changes

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dialogViewMode, setDialogViewMode] = useState<'details' | 'inventory' | 'damage'>('details');
  const [damageDescription, setDamageDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset view mode when dialog opens/closes
  useEffect(() => {
    if (!selectedBooking) {
      setDialogViewMode('details');
      setDamageDescription('');
      setEvidenceFile(null);
    }
  }, [selectedBooking]);

  const handleSync = async () => {
    setSyncing(true);
    const promises = calendars.map(cal =>
      supabase.functions.invoke('ical-sync', { body: { calendar_id: cal.id } })
    );

    try {
      await Promise.all(promises);
      toast.success("Calendars synced successfully!");
      fetchData(); // Refresh bookings
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync some calendars.");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddCalendar = async () => {
    if (!newCalUrl || !newCalName) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const { data: customer } = await supabase.from('customers').select('id').limit(1).single();

      if (!customer) {
        toast.error("Please create a customer/property first in CRM.");
        return;
      }

      const { error } = await supabase.from('calendars').insert({
        name: newCalName,
        url: newCalUrl,
        customer_id: (customer as any).id,
      } as any);

      if (error) throw error;

      toast.success("Calendar added! Run Sync now.");
      setIsModalOpen(false);
      setNewCalName('');
      setNewCalUrl('');
      // Don't auto-fetch, let user click sync or auto
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Error adding calendar");
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Navigation based on view mode
  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const getDayBookings = (day: Date) => {
    // Basic check: is day inside start/end interval?
    // Note: timezone issues may arise, strict Day comparison is safest for visual placement
    return bookings.filter(b => {
      const start = parseISO(b.start_date);
      const end = parseISO(b.end_date);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start);
    });
  };

  // Check for booking conflicts (same staff, overlapping time)
  const checkBookingConflict = (bookingId: string, assignedTo: string | null, newStart: Date, newEnd: Date): boolean => {
    if (!assignedTo) return false;

    return bookings.some(b => {
      if (b.id === bookingId) return false;
      if ((b as any).assigned_to !== assignedTo) return false;

      const existingStart = parseISO(b.start_date);
      const existingEnd = parseISO(b.end_date);

      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  // Handle booking move (drag & drop) - Optimistic Update
  const handleBookingMove = async (bookingId: string, newStart: Date, newEnd: Date) => {
    // Find the booking to check assigned_to
    const booking = bookings.find(b => b.id === bookingId) as any;
    if (!booking) return;

    // Check for conflicts
    if (checkBookingConflict(bookingId, booking.assigned_to, newStart, newEnd)) {
      toast.error('Conflito: já existe agendamento para esta equipe neste horário');
      return;
    }

    // Store original values for rollback
    const originalStart = booking.start_date;
    const originalEnd = booking.end_date;

    // Optimistic update - update UI immediately
    setBookings(prev => prev.map(b =>
      b.id === bookingId
        ? { ...b, start_date: newStart.toISOString(), end_date: newEnd.toISOString() }
        : b
    ) as Booking[]);

    // Make API call in background
    const { error } = await supabase
      .from('bookings')
      .update({
        start_date: newStart.toISOString(),
        end_date: newEnd.toISOString()
      } as any)
      .eq('id', bookingId);

    if (error) {
      // Rollback on error
      setBookings(prev => prev.map(b =>
        b.id === bookingId
          ? { ...b, start_date: originalStart, end_date: originalEnd }
          : b
      ) as Booking[]);
      toast.error('Erro ao mover agendamento');
      console.error(error);
    } else {
      toast.success('Agendamento movido!');
    }
  };

  // Handle booking resize - Optimistic Update
  const handleBookingResize = async (bookingId: string, newEnd: Date) => {
    // Find the booking to check assigned_to and get start_date
    const booking = bookings.find(b => b.id === bookingId) as any;
    if (!booking) return;

    const newStart = parseISO(booking.start_date);

    // Check for conflicts
    if (checkBookingConflict(bookingId, booking.assigned_to, newStart, newEnd)) {
      toast.error('Conflito: já existe agendamento para esta equipe neste horário');
      return;
    }

    // Store original value for rollback
    const originalEnd = booking.end_date;

    // Optimistic update - update UI immediately
    setBookings(prev => prev.map(b =>
      b.id === bookingId
        ? { ...b, end_date: newEnd.toISOString() }
        : b
    ) as Booking[]);

    // Make API call in background
    const { error } = await supabase
      .from('bookings')
      .update({
        end_date: newEnd.toISOString()
      } as any)
      .eq('id', bookingId);

    if (error) {
      // Rollback on error
      setBookings(prev => prev.map(b =>
        b.id === bookingId
          ? { ...b, end_date: originalEnd }
          : b
      ) as Booking[]);
      toast.error('Erro ao redimensionar agendamento');
      console.error(error);
    } else {
      toast.success('Duração atualizada!');
    }
  };

  // Haversine formula to calculate distance in meters
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  const handleCheckIn = () => {
    const customer = selectedBooking?.customers;
    if (!customer?.latitude || !customer?.longitude) {
      toast.error("This property has no Geofence set.");
      return;
    }

    toast.loading("Verifying location...", { id: 'geo-check' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const dist = getDistance(userLat, userLng, customer.latitude!, customer.longitude!);

        const radius = customer.geofence_radius || 200; // default 200m

        if (dist <= radius) {
          toast.success(`Check-in Successful! You are ${Math.round(dist)}m away.`, { id: 'geo-check' });
          // Here we would save to DB: 'check_in_time', etc.
        } else {
          toast.error(`Check-in Failed. You are ${Math.round(dist)}m away (Max: ${radius}m).`, { id: 'geo-check' });
        }
      },
      (error) => {
        console.error(error);
        toast.error("Location access denied.", { id: 'geo-check' });
      }
    );
  };

  const handleSaveInventory = async () => {
    // Mock save for now
    toast.success("Inventory checklist saved!");
    setDialogViewMode('details');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEvidenceFile(e.target.files[0]);
    }
  };

  const handleSaveDamage = async () => {
    if (!damageDescription) {
      toast.error("Please describe the damage.");
      return;
    }

    try {
      let imageUrl = null;

      // Upload Image if present
      if (evidenceFile) {
        const fileName = `${selectedBooking?.id}/${Date.now()}_${evidenceFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(fileName, evidenceFile);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('job_evidence').insert({
        booking_id: selectedBooking?.id,
        type: 'damage_report',
        notes: damageDescription,
        url: imageUrl,
      } as any);

      if (error) throw error;

      toast.success("Damage report submitted securely.");
      setDamageDescription('');
      setEvidenceFile(null);
      setDialogViewMode('details');
    } catch (e: any) {
      console.error(e);
      if (e.message.includes('bucket')) {
        toast.error("Storage bucket 'evidence' missing. Please create it in Supabase.");
      } else {
        toast.error("Error saving report: " + e.message);
      }
    }
  };

  // --- Drag & Drop Logic ---
  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    e.dataTransfer.setData('bookingId', booking.id);
    e.dataTransfer.setData('originDate', booking.start_date);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('bookingId');
    if (!bookingId) return;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Calculate duration
    const start = parseISO(booking.start_date);
    const end = parseISO(booking.end_date);
    const duration = end.getTime() - start.getTime();

    // New dates
    const newStart = targetDate;
    const newEnd = new Date(targetDate.getTime() + duration);

    // Optimistic Update
    const updatedBookings = bookings.map(b =>
      b.id === bookingId
        ? { ...b, start_date: newStart.toISOString(), end_date: newEnd.toISOString() }
        : b
    );
    setBookings(updatedBookings);
    toast.success(`Rescheduled to ${format(newStart, 'MMM d')}`);

    // Persist to DB
    const { error } = await supabase
      .from('bookings')
      .update({
        start_date: newStart.toISOString(),
        end_date: newEnd.toISOString()
      } as any)
      .eq('id', bookingId);

    if (error) {
      console.error(error);
      toast.error("Failed to save schedule change");
      fetchData(); // revert
    }
  };

  // --- Route Optimization ---
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

  const AI_ROUTE_COST = 0.50;

  const fetchWallet = async () => {
    const { data } = await supabase.from('wallet_ledger').select('amount') as any;
    const balance = data?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
    setWalletBalance(balance);
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleOptimizeRoute = async () => {
    // Refresh balance before check
    await fetchWallet();

    // OPTIONAL: Mock money for demo if empty? 
    // For now, let's strictly enforcing it, but maybe seed 5.00 if 0 for demo purposes?
    // No, user said strictly paid. I'll stick to logic.
    // But for verifying, I might self-inject.

    const validBookings = bookings.filter(b => b.customers?.latitude && b.customers?.longitude);

    if (validBookings.length < 2) {
      toast.error("Not enough bookings with location data to optimize.");
      return;
    }

    if (walletBalance < AI_ROUTE_COST) {
      toast.error(`Insufficient AI Credits. Cost: $${AI_ROUTE_COST.toFixed(2)}`, {
        description: `Current Balance: $${walletBalance.toFixed(2)}`,
        action: {
          label: "Add Credits",
          onClick: () => toast.info("Redirecting to Billing...")
        }
      });
      return;
    }

    const points = validBookings.map(b => ({
      id: b.id,
      lat: b.customers!.latitude!,
      lng: b.customers!.longitude!,
      name: b.customers!.name,
      summary: b.summary,
      start_date: b.start_date
    }));

    // Mock HQ at center of points or just start at first
    // Simple logic: Start at the earliest booking?
    const sortedByTime = [...points].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const startPoint = sortedByTime[0];
    const others = sortedByTime.slice(1);

    const route = [startPoint];
    let current = startPoint;
    const unvisited = [...others];

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let minD = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const p = unvisited[i];
        const d = getDistance(current.lat, current.lng, p.lat, p.lng);
        if (d < minD) {
          minD = d;
          nearestIdx = i;
        }
      }

      if (nearestIdx !== -1) {
        const next = unvisited[nearestIdx];
        route.push(next);
        current = next;
        unvisited.splice(nearestIdx, 1);
      } else {
        break;
      }
    }

    setOptimizedRoute(route);
    setShowRouteModal(true);
  };

  // Handlers for Route Modal
  const handleAcceptRoute = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Deduct Credit
    const { error } = await supabase.from('wallet_ledger').insert({
      tenant_id: (user?.user_metadata as any)?.tenant_id, // Implicit via RLS usually, but explicit is fine if needed. RLS handles it.
      description: `AI Route Dispatch (${optimizedRoute.length} stops)`,
      amount: -AI_ROUTE_COST
    } as any);

    if (error) {
      toast.error("Transaction Failed");
      return;
    }

    setWalletBalance(prev => prev - AI_ROUTE_COST);
    toast.success("Route Applied! Credits deducted.");
    setShowRouteModal(false);

    // Here we would actually SAVE the order of bookings to DB, but for now we just close.
  };

  const renderRouteModal = () => (
    <Dialog open={showRouteModal} onOpenChange={setShowRouteModal}>
      <DialogContent className="glass-panel max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="text-indigo-500" /> AI Optimized Route
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700">
            <span>🤖 AI Analysis Cost: <b>${AI_ROUTE_COST.toFixed(2)}</b></span>
            <span>Balance: ${walletBalance.toFixed(2)}</span>
          </div>
          <div className="relative border-l-2 border-indigo-200 ml-3 space-y-6 pl-6 py-2">
            {optimizedRoute.map((point, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[31px] top-0 h-6 w-6 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-[10px] font-bold text-indigo-600 z-10">
                  {i + 1}
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-slate-100 shadow-sm">
                  <div className="font-semibold text-slate-800 text-sm">{point.name}</div>
                  <div className="text-xs text-slate-500">{point.summary}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {format(parseISO(point.start_date), 'PPP p')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full gap-2" onClick={handleAcceptRoute}>
            Pay ${AI_ROUTE_COST.toFixed(2)} & Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // --- Render Job Details ---
  const renderJobDetails = () => {
    const isDetails = dialogViewMode === 'details';

    return (
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="glass-panel border-white/20 max-w-2xl min-h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {!isDetails && (
                <button onClick={() => setDialogViewMode('details')} className="p-1 rounded-full hover:bg-slate-100 transition-colors mr-2">
                  <ArrowLeft size={20} className="text-slate-500" />
                </button>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-xl">
                  {dialogViewMode === 'details' && (selectedBooking?.summary || 'Booking Details')}
                  {dialogViewMode === 'inventory' && 'Inventory Check'}
                  {dialogViewMode === 'damage' && 'Report Damage'}
                </span>
                {isDetails && (
                  <span className="text-sm font-normal text-slate-500 flex items-center gap-2">
                    <CalendarIcon size={14} />
                    {selectedBooking && format(parseISO(selectedBooking.start_date), 'PPP')} - {selectedBooking && format(parseISO(selectedBooking.end_date), 'PPP')}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 py-4">
            {/* VIEW: DETAILS */}
            {dialogViewMode === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Property</label>
                    <div className="mt-1 font-medium text-slate-700 flex items-center gap-2">
                      <MapPin size={16} className="text-indigo-500" />
                      {selectedBooking?.customers?.name || 'Unknown Property'}
                    </div>
                    <div className="text-xs text-slate-500 ml-6 mt-0.5">{selectedBooking?.customers?.address}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${selectedBooking?.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {selectedBooking?.status}
                      </span>
                    </div>
                  </div>
                  {(selectedBooking as any)?.cleaner_pay_rate > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Repasse Profissional</label>
                        <div className="text-lg font-black text-emerald-700">R$ {(selectedBooking as any).cleaner_pay_rate.toFixed(2)}</div>
                      </div>
                      <p className="text-[10px] text-emerald-600/70 font-medium">Valor acordado para este job específico</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Operations & Trust</h3>

                  <Button
                    onClick={handleCheckIn}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm mb-2"
                  >
                    <MapPin size={16} className="mr-2" /> GPS Check-In
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setDialogViewMode('inventory')}
                      className="justify-start gap-2 h-auto py-3 border-dashed hover:border-indigo-300 hover:bg-indigo-50/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <CheckCircle size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-slate-700">Inventory Check</span>
                        <span className="text-[10px] text-slate-500">Track supplies & linen</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDialogViewMode('damage')}
                      className="justify-start gap-2 h-auto py-3 border-dashed hover:border-rose-300 hover:bg-rose-50/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                        <Camera size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-slate-700">Report Damage</span>
                        <span className="text-[10px] text-slate-500">Upload photo evidence</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW: INVENTORY */}
            {dialogViewMode === 'inventory' && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100">
                  ℹ️ Mock Inventory List based on Property settings.
                </div>
                {/* Mock Items */}
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                    <span className="font-medium text-slate-700">Item {i} (Towels)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Qty:</span>
                      <input type="number" className="w-16 p-1 border rounded text-center" defaultValue={2} />
                    </div>
                  </div>
                ))}
                <Button className="w-full mt-4" onClick={handleSaveInventory}>
                  <Save size={16} className="mr-2" /> Save Checklist
                </Button>
              </div>
            )}

            {/* VIEW: DAMAGE */}
            {dialogViewMode === 'damage' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description of Damage</label>
                  <textarea
                    className="w-full h-32 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-100 text-sm resize-none bg-white/50"
                    placeholder="Describe what you found..."
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                  ></textarea>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${evidenceFile ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  {evidenceFile ? (
                    <>
                      <CheckCircle size={32} className="text-indigo-500" />
                      <span className="text-sm font-semibold text-indigo-700">{evidenceFile.name}</span>
                      <span className="text-xs text-indigo-400">Click to change</span>
                    </>
                  ) : (
                    <>
                      <Camera size={32} className="text-slate-400" />
                      <span className="text-sm text-slate-400">Click to upload photo</span>
                    </>
                  )}
                </div>
                <Button variant="destructive" className="w-full mt-4 bg-rose-600 hover:bg-rose-700" onClick={handleSaveDamage}>
                  <Save size={16} className="mr-2" /> Submit Report
                </Button>
              </div>
            )}
          </div>
        </DialogContent >
      </Dialog >
    );
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header - Responsive Layout */}
      <div className="flex flex-col gap-3 lg:gap-4">
        {/* Row 1: Title + Navigation + Date */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">{t('sidebar.bookings')}</h2>

          {/* Navigation Controls */}
          <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-slate-200/60 shadow-sm">
            <button onClick={navigatePrev} className="p-2 hover:bg-white/80 rounded-lg transition-colors text-slate-600">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white/80 rounded-lg transition-colors">
              Hoje
            </button>
            <button onClick={navigateNext} className="p-2 hover:bg-white/80 rounded-lg transition-colors text-slate-600">
              <ChevronRight size={18} />
            </button>
          </div>

          <span className="text-lg lg:text-xl font-semibold text-slate-700">
            {format(currentDate, 'MMMM yyyy')}
          </span>
        </div>

        {/* Row 2: View Mode + Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-white/70 rounded-xl p-1 border border-slate-200/60 shadow-sm">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${viewMode === 'day'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white/80'
                }`}
            >
              <CalendarDays size={16} />
              <span className="hidden sm:inline">Dia</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${viewMode === 'week'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white/80'
                }`}
            >
              <CalendarRange size={16} />
              <span className="hidden sm:inline">Semana</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${viewMode === 'month'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white/80'
                }`}
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Máªs</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action - Always Visible */}
            <Button
              onClick={() => handleOpenNewBooking()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Novo Agendamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>

            {/* Secondary Actions - Icons on mobile */}
            <Button
              variant="outline"
              onClick={handleOptimizeRoute}
              className="gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
              title="AI Route"
            >
              <Calculator size={16} />
              <span className="hidden md:inline">AI Route</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing || calendars.length === 0}
              className="gap-2"
              title="Sync Now"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              <span className="hidden md:inline">{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </Button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-500/20"
                  title="Connect iCal"
                >
                  <Link size={18} />
                  <span className="hidden lg:inline">Connect iCal</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/20 w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Connect External Calendar</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name (e.g. Airbnb Beach House)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 bg-white/50"
                      placeholder="My Property Airbnb"
                      value={newCalName}
                      onChange={e => setNewCalName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">iCal URL (.ics)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100 bg-white/50"
                      placeholder="https://www.airbnb.com/calendar/ical/..."
                      value={newCalUrl}
                      onChange={e => setNewCalUrl(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddCalendar}>Save & Sync</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Calendar Views */}
      <div className="flex-1 overflow-hidden">
        {/* Week View */}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            bookings={bookings as any}
            onCellClick={(date, hour) => {
              const dateWithHour = new Date(date);
              dateWithHour.setHours(hour, 0, 0, 0);
              handleOpenNewBooking(dateWithHour, hour);
            }}
            onBookingClick={(booking) => handleEditBooking(booking as any)}
            onBookingMove={handleBookingMove}
            onBookingResize={handleBookingResize}
          />
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            bookings={bookings as any}
            onCellClick={(date, hour) => {
              const dateWithHour = new Date(date);
              dateWithHour.setHours(hour, 0, 0, 0);
              handleOpenNewBooking(dateWithHour, hour);
            }}
            onBookingClick={(booking) => handleEditBooking(booking as any)}
            onBookingMove={handleBookingMove}
            onBookingResize={handleBookingResize}
          />
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="h-full glass-panel rounded-2xl border-white/40 shadow-xl overflow-hidden flex flex-col">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200/50 bg-white/30 backdrop-blur-sm">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                const dayBookings = getDayBookings(day);

                return (
                  <div
                    key={day.toString()}
                    onClick={() => handleOpenNewBooking(day)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                    className={`
                      relative border-r border-b border-slate-200/30 p-1 flex flex-col cursor-pointer
                      hover:bg-indigo-50/30 transition-colors
                      ${!isCurrentMonth ? 'bg-slate-50/50' : 'bg-white/20'}
                      ${idx % 7 === 6 ? 'border-r-0' : ''}
                    `}
                  >
                    <span
                      className={`
                        text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                        ${isTodayDate ? 'bg-indigo-600 text-white' : ''}
                        ${!isCurrentMonth ? 'text-slate-400' : 'text-slate-600'}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Events */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                      {dayBookings.map(booking => (
                        <div
                          key={booking.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, booking)}
                          onClick={(e) => { e.stopPropagation(); handleEditBooking(booking); }}
                          className="group text-[10px] px-1.5 py-1 rounded-md border truncate font-medium flex items-center gap-1 shadow-sm cursor-grab active:cursor-grabbing hover:opacity-80 transition-all"
                          style={{
                            backgroundColor: `${(booking as any).color || '#6366f1'}20`,
                            borderColor: `${(booking as any).color || '#6366f1'}40`,
                            color: (booking as any).color || '#6366f1'
                          }}
                          title={`${booking.summary} (${booking.customers?.name})`}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: (booking as any).color || '#6366f1' }}
                          />
                          <span className="truncate">{booking.summary || 'Agendamento'}</span>
                          <Pencil size={10} className="ml-auto opacity-0 group-hover:opacity-100 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {renderJobDetails()}
      {renderRouteModal()}

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSave={() => { setShowBookingModal(false); fetchData(); }}
        booking={editingBooking}
        defaultDate={defaultBookingDate}
      />
    </div>
  );
};
