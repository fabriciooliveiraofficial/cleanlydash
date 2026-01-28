import React, { useState, useCallback, useRef } from 'react';
import { format, isSameDay, parseISO, isBefore, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Clock, ClipboardList } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Booking {
    id: string;
    summary: string;
    start_date: string;
    end_date: string;
    status: string;
    color?: string;
    assigned_to?: string;
    customers?: {
        name: string;
    };
}

interface DayViewProps {
    currentDate: Date;
    bookings: Booking[];
    onCellClick: (date: Date, hour: number) => void;
    onBookingClick: (booking: Booking) => void;
    onBookingMove?: (bookingId: string, newStart: Date, newEnd: Date) => void;
    onBookingResize?: (bookingId: string, newEnd: Date) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6am to 7pm
const HOUR_HEIGHT = 70; // pixels per hour
const LONG_PRESS_DURATION = 400; // ms to trigger drag on mobile

export const DayView: React.FC<DayViewProps> = ({
    currentDate,
    bookings,
    onCellClick,
    onBookingClick,
    onBookingMove,
    onBookingResize
}) => {
    const dayBookings = bookings.filter(b => isSameDay(parseISO(b.start_date), currentDate));

    // Refs for touch handling
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Drag state (HTML5)
    const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
    const [dragOverHour, setDragOverHour] = useState<number | null>(null);
    const [dragOverMinute, setDragOverMinute] = useState<number>(0);

    // Resize state
    const [resizingBooking, setResizingBooking] = useState<Booking | null>(null);
    const [resizeDelta, setResizeDelta] = useState<number>(0);

    // Touch drag state
    const [touchDragBooking, setTouchDragBooking] = useState<Booking | null>(null);
    const [touchDragPosition, setTouchDragPosition] = useState<{ x: number; y: number } | null>(null);

    // Conflict state
    const [conflictError, setConflictError] = useState<string | null>(null);

    // Check for conflicts with same staff
    const checkConflict = useCallback((
        bookingId: string,
        assignedTo: string | undefined,
        newStart: Date,
        newEnd: Date
    ): boolean => {
        if (!assignedTo) return false;

        return bookings.some(b => {
            if (b.id === bookingId) return false;
            if (b.assigned_to !== assignedTo) return false;

            const existingStart = parseISO(b.start_date);
            const existingEnd = parseISO(b.end_date);

            return (newStart < existingEnd && newEnd > existingStart);
        });
    }, [bookings]);

    const getBookingsStartingAt = (hour: number) => {
        return dayBookings.filter(booking => {
            const start = parseISO(booking.start_date);
            return start.getHours() === hour;
        });
    };

    const getBookingCoveringSlot = (hour: number): Booking | null => {
        return dayBookings.find(booking => {
            const start = parseISO(booking.start_date);
            const end = parseISO(booking.end_date);
            return start.getHours() <= hour && end.getHours() > hour;
        }) || null;
    };

    const getBookingSpan = (booking: Booking) => {
        const start = parseISO(booking.start_date);
        const end = parseISO(booking.end_date);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return Math.max(1, hours);
    };

    const isPast = (hour: number) => {
        const slotTime = new Date(currentDate);
        slotTime.setHours(hour, 0, 0, 0);
        return isBefore(slotTime, new Date());
    };

    const isToday = isSameDay(currentDate, new Date());

    const getHourFromTouch = (clientY: number): number | null => {
        if (!gridRef.current) return null;

        const grid = gridRef.current;
        const rect = grid.getBoundingClientRect();
        const scrollTop = grid.scrollTop;

        const y = clientY - rect.top + scrollTop;
        const hourIndex = Math.floor(y / HOUR_HEIGHT);

        if (hourIndex < 0 || hourIndex >= HOURS.length) return null;
        return HOURS[hourIndex];
    };

    const handleCellClick = (hour: number) => {
        if (resizingBooking || touchDragBooking) return;

        const coveringBooking = getBookingCoveringSlot(hour);
        if (coveringBooking) {
            onBookingClick(coveringBooking);
        } else {
            onCellClick(currentDate, hour);
        }
    };

    // ==================== HTML5 DRAG HANDLERS ====================
    const handleDragStart = (e: React.DragEvent, booking: Booking) => {
        if (touchDragBooking) {
            e.preventDefault();
            return;
        }

        e.stopPropagation();
        setDraggedBooking(booking);
        setConflictError(null);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', booking.id);
    };

    const handleDragOver = (e: React.DragEvent, hour: number) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
        const snappedMinutes = Math.round(rawMinutes / 1); // 1-min precision

        if (draggedBooking) {
            const originalStart = parseISO(draggedBooking.start_date);
            const originalEnd = parseISO(draggedBooking.end_date);
            const duration = originalEnd.getTime() - originalStart.getTime();

            const newStart = new Date(currentDate);
            newStart.setHours(hour, snappedMinutes, 0, 0);
            const newEnd = new Date(newStart.getTime() + duration);

            if (checkConflict(draggedBooking.id, draggedBooking.assigned_to, newStart, newEnd)) {
                setConflictError('Conflito com outro agendamento');
            } else {
                setConflictError(null);
            }
        }

        setDragOverHour(hour);
        setDragOverMinute(snappedMinutes);

        // Auto-scroll
        if (gridRef.current) {
            const container = gridRef.current;
            const threshold = 100;
            if (e.clientY < container.getBoundingClientRect().top + threshold) container.scrollTop -= 10;
            if (e.clientY > container.getBoundingClientRect().bottom - threshold) container.scrollTop += 10;
        }
    };

    const handleDragLeave = () => {
        setDragOverHour(null);
    };

    const handleDrop = (e: React.DragEvent, hour: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverHour(null);

        if (draggedBooking && onBookingMove) {
            const originalStart = parseISO(draggedBooking.start_date);
            const originalEnd = parseISO(draggedBooking.end_date);
            const duration = originalEnd.getTime() - originalStart.getTime();

            const rect = e.currentTarget.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
            const snappedMinutes = Math.round(rawMinutes / 1); // 1-min precision

            const newStart = new Date(currentDate);
            newStart.setHours(hour, snappedMinutes, 0, 0);
            const newEnd = new Date(newStart.getTime() + duration);

            if (!checkConflict(draggedBooking.id, draggedBooking.assigned_to, newStart, newEnd)) {
                onBookingMove(draggedBooking.id, newStart, newEnd);
            } else {
                setConflictError('Conflito ao mover');
                setTimeout(() => setConflictError(null), 3000);
            }
        }
        setDraggedBooking(null);
    };

    const handleDragEnd = () => {
        setDraggedBooking(null);
        setDragOverHour(null);
        setConflictError(null);
    };

    // ==================== TOUCH DRAG HANDLERS ====================
    const handleTouchStart = (e: React.TouchEvent, booking: Booking) => {
        if (draggedBooking) return;

        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };

        longPressTimer.current = setTimeout(() => {
            setTouchDragBooking(booking);
            setTouchDragPosition({ x: touch.clientX, y: touch.clientY });

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, LONG_PRESS_DURATION);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];

        if (longPressTimer.current && touchStartPos.current) {
            const dx = Math.abs(touch.clientX - touchStartPos.current.x);
            const dy = Math.abs(touch.clientY - touchStartPos.current.y);
            if (dx > 10 || dy > 10) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }

        if (touchDragBooking) {
            setTouchDragPosition({ x: touch.clientX, y: touch.clientY });

            const hour = getHourFromTouch(touch.clientY);
            if (hour !== null) {
                setDragOverHour(hour);

                const originalStart = parseISO(touchDragBooking.start_date);
                const originalEnd = parseISO(touchDragBooking.end_date);
                const duration = originalEnd.getTime() - originalStart.getTime();

                const newStart = new Date(currentDate);
                newStart.setHours(hour, originalStart.getMinutes(), 0, 0);
                const newEnd = new Date(newStart.getTime() + duration);

                if (checkConflict(touchDragBooking.id, touchDragBooking.assigned_to, newStart, newEnd)) {
                    setConflictError('Conflito');
                } else {
                    setConflictError(null);
                }
            }
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (touchDragBooking && dragOverHour !== null && onBookingMove) {
            const originalStart = parseISO(touchDragBooking.start_date);
            const originalEnd = parseISO(touchDragBooking.end_date);
            const duration = originalEnd.getTime() - originalStart.getTime();

            const newStart = new Date(currentDate);
            newStart.setHours(dragOverHour, originalStart.getMinutes(), 0, 0);
            const newEnd = new Date(newStart.getTime() + duration);

            if (!checkConflict(touchDragBooking.id, touchDragBooking.assigned_to, newStart, newEnd)) {
                onBookingMove(touchDragBooking.id, newStart, newEnd);
            } else {
                setConflictError('Conflito ao mover');
                setTimeout(() => setConflictError(null), 3000);
            }
        }

        setTouchDragBooking(null);
        setTouchDragPosition(null);
        setDragOverHour(null);
        touchStartPos.current = null;
    };

    // ==================== RESIZE HANDLERS ====================
    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, booking: Booking) => {
        e.stopPropagation();
        e.preventDefault();

        const isTouch = 'touches' in e;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;

        setResizingBooking(booking);
        setResizeDelta(0);
        setConflictError(null);

        if (isTouch && navigator.vibrate) {
            navigator.vibrate(30);
        }

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            moveEvent.preventDefault();
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = currentY - startY;
            setResizeDelta(deltaY);

            const deltaHours = Math.round(deltaY / HOUR_HEIGHT);
            if (deltaHours !== 0) {
                const originalEnd = parseISO(booking.end_date);
                const newEnd = addHours(originalEnd, deltaHours);
                const originalStart = parseISO(booking.start_date);

                if (newEnd.getTime() > originalStart.getTime() + 30 * 60 * 1000) {
                    if (checkConflict(booking.id, booking.assigned_to, originalStart, newEnd)) {
                        setConflictError('Conflito');
                    } else {
                        setConflictError(null);
                    }
                }
            }
        };

        const handleEnd = (upEvent: MouseEvent | TouchEvent) => {
            upEvent.preventDefault();
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            const endY = 'changedTouches' in upEvent
                ? upEvent.changedTouches[0].clientY
                : upEvent.clientY;
            const finalDelta = endY - startY;
            const deltaHours = Math.round(finalDelta / HOUR_HEIGHT);

            if (deltaHours !== 0 && onBookingResize) {
                const originalEnd = parseISO(booking.end_date);
                const newEnd = addHours(originalEnd, deltaHours);
                const originalStart = parseISO(booking.start_date);

                if (newEnd.getTime() > originalStart.getTime() + 30 * 60 * 1000) {
                    if (!checkConflict(booking.id, booking.assigned_to, originalStart, newEnd)) {
                        onBookingResize(booking.id, newEnd);
                    } else {
                        setConflictError('Conflito ao redimensionar');
                        setTimeout(() => setConflictError(null), 3000);
                    }
                }
            }

            setResizingBooking(null);
            setResizeDelta(0);
        };

        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    const isAnyDragging = draggedBooking !== null || touchDragBooking !== null;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden relative">
            {/* Conflict Error Banner */}
            {conflictError && (
                <div className="absolute top-0 left-0 right-0 z-50 p-3 bg-red-500 text-white flex items-center justify-center gap-2">
                    <AlertCircle size={18} />
                    <span className="font-medium">{conflictError}</span>
                </div>
            )}

            {/* Touch Drag Ghost */}
            {touchDragBooking && touchDragPosition && (
                <div
                    className="fixed z-[100] pointer-events-none"
                    style={{
                        left: touchDragPosition.x - 80,
                        top: touchDragPosition.y - 20,
                    }}
                >
                    <div
                        className="px-4 py-2 rounded-lg shadow-2xl text-white text-sm font-semibold max-w-[200px] truncate opacity-90"
                        style={{ backgroundColor: touchDragBooking.color || '#6366f1' }}
                    >
                        {touchDragBooking.summary || 'Agendamento'}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-center py-4 border-b border-slate-200 bg-slate-50/80">
                <div className={`text-center ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>
                    <div className="text-sm font-medium text-slate-500 uppercase">
                        {format(currentDate, 'EEEE', { locale: ptBR })}
                    </div>
                    <div className="text-3xl font-bold">
                        {format(currentDate, 'd')}
                    </div>
                    <div className="text-sm text-slate-500">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </div>
                </div>
            </div>

            {/* Time Grid */}
            <div ref={gridRef} className="flex-1 overflow-y-auto">
                {HOURS.map(hour => {
                    const bookingsStartingHere = getBookingsStartingAt(hour);
                    const coveringBooking = getBookingCoveringSlot(hour);
                    const past = isPast(hour);
                    const isDragOverThis = dragOverHour === hour;
                    const hasConflict = isDragOverThis && conflictError;
                    const hasCoveringBooking = !!coveringBooking;

                    return (
                        <div key={hour} className="flex border-b border-slate-100" style={{ minHeight: `${HOUR_HEIGHT}px` }}>
                            {/* Hour Label */}
                            <div className="w-20 flex-shrink-0 border-r border-slate-200 text-sm text-slate-400 text-right pr-3 pt-2 font-medium">
                                {format(new Date().setHours(hour, 0), 'HH:mm')}
                            </div>

                            {/* Slot */}
                            <div
                                onClick={() => !past && handleCellClick(hour)}
                                onDragOver={(e) => handleDragOver(e, hour)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, hour)}
                                className={`flex-1 relative group transition-colors ${past
                                    ? 'bg-slate-50/50 cursor-not-allowed'
                                    : resizingBooking
                                        ? 'cursor-ns-resize'
                                        : hasCoveringBooking
                                            ? 'cursor-pointer'
                                            : 'hover:bg-indigo-50/50 cursor-pointer'
                                    } ${isDragOverThis && !hasConflict ? 'bg-indigo-100 ring-2 ring-indigo-400 ring-inset' : ''
                                    } ${hasConflict ? 'bg-red-100 ring-2 ring-red-400 ring-inset' : ''}`}
                            >
                                {/* Hover indicator */}
                                {!past && !isDragOverThis && !resizingBooking && !isAnyDragging && !hasCoveringBooking && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <span className="text-sm text-indigo-400 font-medium">+ Clique para agendar</span>
                                    </div>
                                )}

                                {/* Drop indicator & Ghost Preview */}
                                {isDragOverThis && !hasConflict && draggedBooking && (
                                    <div
                                        className="absolute left-1 right-1 rounded-lg pointer-events-none z-[100] border-2 border-indigo-400 bg-indigo-500/10 shadow-xl overflow-hidden flex flex-col p-2"
                                        style={{
                                            top: `${dragOverMinute / 60 * HOUR_HEIGHT}px`,
                                            height: `${(parseISO(draggedBooking.end_date).getTime() - parseISO(draggedBooking.start_date).getTime()) / (1000 * 60 * 60) * HOUR_HEIGHT}px`
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Badge className="h-4 px-1.5 text-[8px] bg-indigo-600 text-white border-0 shadow-sm">
                                                PREVISÃO
                                            </Badge>
                                            <div className="bg-slate-900/90 text-[10px] text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                                <Clock size={10} className="text-amber-400" />
                                                {hour}:{dragOverMinute.toString().padStart(2, '0')}
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-indigo-900 border-b border-indigo-200 truncate leading-none pb-1 mb-1">
                                            {draggedBooking.summary}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-indigo-700/70 font-bold">
                                            <ClipboardList size={10} />
                                            <span>Solte para confirmar</span>
                                        </div>
                                    </div>
                                )}

                                {/* Highlight for hover Cell (without booking) */}
                                {isDragOverThis && !draggedBooking && (
                                    <div className="absolute inset-0 bg-indigo-100/30 ring-2 ring-indigo-400/50 ring-inset z-30" />
                                )}

                                {/* Conflict indicator */}
                                {hasConflict && (
                                    <div className="absolute inset-0 bg-rose-100 ring-4 ring-rose-500 ring-inset flex items-center justify-center pointer-events-none z-30 animate-pulse">
                                        <div className="bg-rose-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2 border-2 border-white/20">
                                            <AlertCircle size={14} />
                                            CONFLITO DETECTADO
                                        </div>
                                    </div>
                                )}

                                {/* Bookings */}
                                {bookingsStartingHere.map(booking => {
                                    let span = getBookingSpan(booking);
                                    const bgColor = booking.color || '#6366f1';
                                    const isBeingDragged = (draggedBooking?.id === booking.id) || (touchDragBooking?.id === booking.id);
                                    const isBeingResized = resizingBooking?.id === booking.id;

                                    let heightPx = span * HOUR_HEIGHT - 8;
                                    if (isBeingResized) {
                                        heightPx = Math.max(HOUR_HEIGHT / 2, span * HOUR_HEIGHT + resizeDelta - 8);
                                    }

                                    return (
                                        <div
                                            key={booking.id}
                                            draggable={!isBeingResized}
                                            onDragStart={(e) => handleDragStart(e, booking)}
                                            onDragEnd={handleDragEnd}
                                            onTouchStart={(e) => handleTouchStart(e, booking)}
                                            onTouchMove={handleTouchMove}
                                            onTouchEnd={handleTouchEnd}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isBeingResized && !isAnyDragging) onBookingClick(booking);
                                            }}
                                            className={`absolute left-2 right-2 rounded-lg overflow-hidden transition-all group/booking ${isBeingDragged ? 'opacity-50 scale-95 z-10' : ''
                                                } ${isBeingResized ? 'ring-2 ring-indigo-500 shadow-lg z-30' : 'hover:shadow-xl cursor-grab active:cursor-grabbing z-20'}`}
                                            style={{
                                                top: '4px',
                                                height: `${heightPx}px`,
                                                backgroundColor: bgColor,
                                                color: 'white',
                                            }}
                                        >
                                            {/* Booking Content */}
                                            <div className="px-4 py-2 h-full flex flex-col pointer-events-none select-none">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-bold">
                                                        {format(parseISO(booking.start_date), 'HH:mm')} - {format(parseISO(booking.end_date), 'HH:mm')}
                                                    </div>
                                                    <Badge
                                                        className="px-2 py-0 text-[10px] uppercase font-bold bg-white/20"
                                                        style={{
                                                            borderColor:
                                                                booking.status === 'confirmed' ? '#3b82f6' :
                                                                    booking.status === 'pending' ? '#f59e0b' :
                                                                        booking.status === 'completed' ? '#22c55e' :
                                                                            booking.status === 'cancelled' ? '#f97316' :
                                                                                'white',
                                                            color: 'white' // Text is white on colored background in DayView
                                                        }}
                                                        variant="outline"
                                                    >
                                                        {booking.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-base font-semibold truncate">
                                                    {booking.summary || 'Agendamento'}
                                                </div>
                                                {booking.customers?.name && span >= 1.5 && (
                                                    <div className="text-sm opacity-90 truncate">
                                                        📍 {booking.customers.name}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Resize Handle */}
                                            <div
                                                className="absolute bottom-0 left-0 right-0 h-6 cursor-ns-resize flex items-end justify-center pb-1"
                                                style={{ background: 'linear-gradient(transparent, rgba(255,255,255,0.5))' }}
                                                onMouseDown={(e) => handleResizeStart(e, booking)}
                                                onTouchStart={(e) => handleResizeStart(e, booking)}
                                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                            >
                                                <div className="w-12 h-1.5 rounded-full bg-white/70 group-hover/booking:bg-white transition-colors shadow-sm"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Touch dragging overlay */}
            {touchDragBooking && (
                <div className="fixed inset-0 z-40" style={{ touchAction: 'none' }} />
            )}
        </div>
    );
};
