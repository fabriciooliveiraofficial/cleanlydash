import React, { useState, useCallback, useRef } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isBefore, addHours, addMinutes } from 'date-fns';
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

interface WeekViewProps {
    currentDate: Date;
    bookings: Booking[];
    onCellClick: (date: Date, hour: number) => void;
    onBookingClick: (booking: Booking) => void;
    onBookingMove?: (bookingId: string, newStart: Date, newEnd: Date) => void;
    onBookingResize?: (bookingId: string, newEnd: Date) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am to 11pm

/**
 * Parse ISO date string as local time (not UTC).
 * This fixes the issue where parseISO interprets strings without 'Z' suffix
 * inconsistently, causing timezone offset issues.
 */
const parseLocalDate = (dateString: string): Date => {
    // new Date() interprets ISO strings without Z as local time
    return new Date(dateString);
};

const HOUR_HEIGHT = 60; // pixels per hour
const LONG_PRESS_DURATION = 400; // ms to trigger drag on mobile

export const WeekView: React.FC<WeekViewProps> = ({
    currentDate,
    bookings,
    onCellClick,
    onBookingClick,
    onBookingMove,
    onBookingResize
}) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Refs for touch handling
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const bookingRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Drag state (HTML5)
    const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
    const [dragOverCell, setDragOverCell] = useState<{ day: Date; hour: number; minute?: number } | null>(null);

    // Resize state
    const [resizingBooking, setResizingBooking] = useState<Booking | null>(null);
    const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | null>(null);
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

            const existingStart = parseLocalDate(b.start_date);
            const existingEnd = parseLocalDate(b.end_date);

            return (newStart < existingEnd && newEnd > existingStart);
        });
    }, [bookings]);

    const getBookingsStartingAt = (day: Date, hour: number) => {
        return bookings.filter(booking => {
            const start = parseLocalDate(booking.start_date);
            return isSameDay(start, day) && start.getHours() === hour;
        });
    };

    const getBookingCoveringSlot = (day: Date, hour: number): Booking | null => {
        return bookings.find(booking => {
            const start = parseLocalDate(booking.start_date);
            const end = parseLocalDate(booking.end_date);
            return isSameDay(start, day) && start.getHours() <= hour && end.getHours() > hour;
        }) || null;
    };

    const getBookingSpan = (booking: Booking) => {
        const start = parseLocalDate(booking.start_date);
        const end = parseLocalDate(booking.end_date);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return Math.max(1, hours);
    };

    const isToday = (day: Date) => isSameDay(day, new Date());
    const isPast = (day: Date, hour: number) => {
        const slotTime = new Date(day);
        slotTime.setHours(hour, 0, 0, 0);
        return isBefore(slotTime, new Date());
    };

    const getCellFromTouch = (clientX: number, clientY: number): { day: Date; hour: number; minute?: number } | null => {
        if (!gridRef.current) return null;

        const grid = gridRef.current;
        const rect = grid.getBoundingClientRect();
        const scrollTop = grid.scrollTop;

        const x = clientX - rect.left;
        const y = clientY - rect.top + scrollTop;

        const cellX = x - 64;
        if (cellX < 0) return null;

        const cellWidth = (rect.width - 64) / 7;
        const dayIndex = Math.floor(cellX / cellWidth);
        if (dayIndex < 0 || dayIndex >= 7) return null;

        const hourIndex = Math.floor(y / HOUR_HEIGHT);
        if (hourIndex < 0 || hourIndex >= HOURS.length) return null;

        const yInHour = y % HOUR_HEIGHT;
        const rawMinutes = (yInHour / HOUR_HEIGHT) * 60;
        const snappedMinutes = Math.round(rawMinutes / 10) * 10;

        return { day: days[dayIndex], hour: HOURS[hourIndex], minute: snappedMinutes };
    };

    const handleCellClick = (day: Date, hour: number) => {
        if (resizingBooking || touchDragBooking) return;

        const coveringBooking = getBookingCoveringSlot(day, hour);
        if (coveringBooking) {
            onBookingClick(coveringBooking);
        } else {
            onCellClick(day, hour);
        }
    };

    // ==================== HTML5 DRAG HANDLERS ====================
    const handleDragStart = (e: React.DragEvent, booking: Booking) => {
        // Prevent drag if touch drag is active
        if (touchDragBooking) {
            if (e.cancelable) e.preventDefault();
            return;
        }

        e.stopPropagation();
        setDraggedBooking(booking);
        setConflictError(null);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', booking.id);
    };

    const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
        const snappedMinutes = Math.round(rawMinutes / 1); // 1-min precision

        if (draggedBooking) {
            const originalStart = parseLocalDate(draggedBooking.start_date);
            const originalEnd = parseLocalDate(draggedBooking.end_date);
            const duration = originalEnd.getTime() - originalStart.getTime();

            const newStart = new Date(day);
            newStart.setHours(hour, snappedMinutes, 0, 0);
            const newEnd = new Date(newStart.getTime() + duration);

            if (checkConflict(draggedBooking.id, draggedBooking.assigned_to, newStart, newEnd)) {
                setConflictError('Conflito com outro agendamento');
            } else {
                setConflictError(null);
            }
        }

        setDragOverCell({ day, hour, minute: snappedMinutes });

        // Auto-scroll
        if (gridRef.current) {
            const container = gridRef.current;
            const threshold = 100;
            if (e.clientY < container.getBoundingClientRect().top + threshold) container.scrollTop -= 10;
            if (e.clientY > container.getBoundingClientRect().bottom - threshold) container.scrollTop += 10;
        }
    };

    const handleDragLeave = () => {
        setDragOverCell(null);
    };

    const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        setDragOverCell(null);

        if (draggedBooking && onBookingMove) {
            const originalStart = parseLocalDate(draggedBooking.start_date);
            const originalEnd = parseLocalDate(draggedBooking.end_date);
            const duration = originalEnd.getTime() - originalStart.getTime();

            const rect = e.currentTarget.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
            const snappedMinutes = Math.round(rawMinutes / 1); // 1-min precision

            const newStart = new Date(day);
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
        setDragOverCell(null);
        setConflictError(null);
    };

    // ==================== TOUCH DRAG HANDLERS ====================
    const handleTouchStart = (e: React.TouchEvent, booking: Booking) => {
        // Don't interfere with native drag
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

        // Cancel long press if moved too much before it triggered
        if (longPressTimer.current && touchStartPos.current) {
            const dx = Math.abs(touch.clientX - touchStartPos.current.x);
            const dy = Math.abs(touch.clientY - touchStartPos.current.y);
            if (dx > 10 || dy > 10) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }

        // Handle active touch drag
        if (touchDragBooking) {
            setTouchDragPosition({ x: touch.clientX, y: touch.clientY });

            const cell = getCellFromTouch(touch.clientX, touch.clientY);
            if (cell) {
                setDragOverCell(cell);

                const originalStart = parseLocalDate(touchDragBooking.start_date);
                const originalEnd = parseLocalDate(touchDragBooking.end_date);
                const duration = originalEnd.getTime() - originalStart.getTime();

                const newStart = new Date(cell.day);
                newStart.setHours(cell.hour, cell.minute !== undefined ? cell.minute : originalStart.getMinutes(), 0, 0);
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

        if (touchDragBooking && dragOverCell && onBookingMove) {
            const originalStart = parseLocalDate(touchDragBooking.start_date);
            const originalEnd = parseLocalDate(touchDragBooking.end_date);
            const duration = originalEnd.getTime() - originalStart.getTime();

            const newStart = new Date(dragOverCell.day);
            newStart.setHours(dragOverCell.hour, dragOverCell.minute !== undefined ? dragOverCell.minute : originalStart.getMinutes(), 0, 0);
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
        setDragOverCell(null);
        touchStartPos.current = null;
    };

    // ==================== RESIZE HANDLERS ====================
    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, booking: Booking, direction: 'top' | 'bottom') => {
        e.stopPropagation();
        // Note: Don't call preventDefault() here for touch events as React adds them as passive by default.
        // The actual prevention is handled in the document-level listeners below with { passive: false }.
        if (!('touches' in e)) {
            e.preventDefault();
        }

        const isTouch = 'touches' in e;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;

        setResizingBooking(booking);
        setResizeDirection(direction);
        setResizeDelta(0);
        setConflictError(null);

        if (isTouch && navigator.vibrate) {
            navigator.vibrate(30);
        }

        const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
            if (moveEvent.cancelable) {
                moveEvent.preventDefault();
            }
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = currentY - startY;
            const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60 / 10) * 10;
            setResizeDelta(deltaY);

            if (deltaMinutes !== 0) {
                const originalEnd = parseLocalDate(booking.end_date);
                const originalStart = parseLocalDate(booking.start_date);

                let newStart = originalStart;
                let newEnd = originalEnd;

                if (direction === 'bottom') {
                    newEnd = addMinutes(originalEnd, deltaMinutes);
                } else {
                    newStart = addMinutes(originalStart, deltaMinutes);
                }

                if (newEnd.getTime() > newStart.getTime() + 10 * 60 * 1000) { // Min 10 mins
                    if (checkConflict(booking.id, booking.assigned_to, newStart, newEnd)) {
                        setConflictError('Conflito');
                    } else {
                        setConflictError(null);
                    }
                }
            }
        };

        const handleEnd = (upEvent: MouseEvent | TouchEvent) => {
            if (upEvent.cancelable) {
                upEvent.preventDefault();
            }
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
            const deltaMinutes = Math.round((finalDelta / HOUR_HEIGHT) * 60 / 10) * 10;

            if (deltaMinutes !== 0 && onBookingResize) {
                const originalEnd = parseLocalDate(booking.end_date);
                const originalStart = parseLocalDate(booking.start_date);

                let newStart = originalStart;
                let newEnd = originalEnd;

                if (direction === 'bottom') {
                    newEnd = addMinutes(originalEnd, deltaMinutes);
                    if (newEnd.getTime() > newStart.getTime() + 10 * 60 * 1000) {
                        if (!checkConflict(booking.id, booking.assigned_to, newStart, newEnd)) {
                            onBookingResize(booking.id, newEnd); // TODO: Update to support start time change
                        } else {
                            setConflictError('Conflito ao redimensionar');
                            setTimeout(() => setConflictError(null), 3000);
                        }
                    }
                } else {
                    newStart = addMinutes(originalStart, deltaMinutes);
                    if (newEnd.getTime() > newStart.getTime() + 10 * 60 * 1000) {
                        if (!checkConflict(booking.id, booking.assigned_to, newStart, newEnd)) {
                            if (onBookingMove) onBookingMove(booking.id, newStart, newEnd);
                        } else {
                            setConflictError('Conflito ao redimensionar');
                            setTimeout(() => setConflictError(null), 3000);
                        }
                    }
                }
            }

            setResizingBooking(null);
            setResizeDirection(null);
            setResizeDelta(0);
        };

        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd, { passive: false });
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
                        left: touchDragPosition.x - 60,
                        top: touchDragPosition.y - 20,
                    }}
                >
                    <div
                        className="px-3 py-2 rounded-lg shadow-2xl text-white text-xs font-semibold max-w-[150px] truncate opacity-90"
                        style={{ backgroundColor: touchDragBooking.color || '#6366f1' }}
                    >
                        {touchDragBooking.summary || 'Agendamento'}
                    </div>
                </div>
            )}

            {/* Header Row - Days */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
                <div className="w-16 flex-shrink-0 border-r border-slate-200"></div>
                {days.map(day => (
                    <div
                        key={day.toISOString()}
                        className={`flex-1 text-center py-3 border-r border-slate-100 last:border-r-0 ${isToday(day) ? 'bg-indigo-50' : ''}`}
                    >
                        <div className="text-xs font-medium text-slate-500 uppercase">
                            {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div className={`text-lg font-bold ${isToday(day) ? 'text-indigo-600' : 'text-slate-800'}`}>
                            {format(day, 'd')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Time Grid */}
            <div ref={gridRef} className="flex-1 overflow-y-auto">
                {HOURS.map(hour => (
                    <div key={hour} className="flex border-b border-slate-100" style={{ minHeight: `${HOUR_HEIGHT}px` }}>
                        {/* Hour Label */}
                        <div className="w-16 flex-shrink-0 border-r border-slate-200 text-xs text-slate-400 text-right pr-2 pt-1">
                            {format(new Date().setHours(hour, 0), 'ha')}
                        </div>

                        {/* Day Cells */}
                        {days.map(day => {
                            const bookingsStartingHere = getBookingsStartingAt(day, hour);
                            const coveringBooking = getBookingCoveringSlot(day, hour);
                            const past = isPast(day, hour);
                            const isDragOverThis = dragOverCell?.day && isSameDay(dragOverCell.day, day) && dragOverCell.hour === hour;
                            const hasConflict = isDragOverThis && conflictError;
                            const hasCoveringBooking = !!coveringBooking;

                            return (
                                <div
                                    key={`${day.toISOString()}-${hour}`}
                                    onClick={() => !past && handleCellClick(day, hour)}
                                    onDragOver={(e) => handleDragOver(e, day, hour)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, day, hour)}
                                    className={`flex-1 border-r border-slate-100 last:border-r-0 relative group transition-colors ${past
                                        ? 'bg-slate-50/50 cursor-not-allowed'
                                        : resizingBooking
                                            ? 'cursor-ns-resize'
                                            : hasCoveringBooking
                                                ? 'cursor-pointer'
                                                : 'hover:bg-indigo-50/50 cursor-pointer'
                                        } ${isToday(day) ? 'bg-indigo-50/30' : ''} ${isDragOverThis && !hasConflict ? 'bg-indigo-100 ring-2 ring-indigo-400 ring-inset' : ''
                                        } ${hasConflict ? 'bg-red-100 ring-2 ring-red-400 ring-inset' : ''}`}
                                >
                                    {/* Hover indicator */}
                                    {!past && !isDragOverThis && !resizingBooking && !isAnyDragging && !hasCoveringBooking && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <span className="text-xs text-indigo-400 font-medium">+ Novo</span>
                                        </div>
                                    )}

                                    {/* Drop indicator & Ghost Preview */}
                                    {isDragOverThis && !hasConflict && draggedBooking && (
                                        <div
                                            className="absolute left-0.5 right-0.5 rounded-md pointer-events-none z-[100] border-2 border-indigo-400 bg-indigo-500/10 shadow-xl overflow-hidden flex flex-col p-1.5"
                                            style={{
                                                top: `${(dragOverCell.minute || 0) / 60 * HOUR_HEIGHT}px`,
                                                height: `${(parseLocalDate(draggedBooking.end_date).getTime() - parseLocalDate(draggedBooking.start_date).getTime()) / (1000 * 60 * 60) * HOUR_HEIGHT}px`
                                            }}
                                        >
                                            <div className="flex items-center gap-1 mb-1">
                                                <Badge className="h-3 px-1 text-[8px] bg-indigo-600 text-white border-0">
                                                    PREVISÃO
                                                </Badge>
                                                <div className="bg-slate-900/90 text-[8px] text-white px-1 rounded flex items-center gap-0.5">
                                                    <Clock size={8} />
                                                    {hour}:{dragOverCell.minute?.toString().padStart(2, '0')}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-indigo-900 border-b border-indigo-200 truncate leading-none pb-1">
                                                {draggedBooking.summary}
                                            </span>
                                        </div>
                                    )}

                                    {/* Simple Highlight for hover Cell (without booking) */}
                                    {isDragOverThis && !draggedBooking && (
                                        <div className="absolute inset-0 bg-indigo-100/50 ring-2 ring-indigo-400 ring-inset z-30" />
                                    )}

                                    {/* Conflict indicator */}
                                    {hasConflict && (
                                        <div className="absolute inset-0 bg-rose-100 ring-2 ring-rose-500 ring-inset flex items-center justify-center pointer-events-none z-30 animate-pulse">
                                            <div className="bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                                <AlertCircle size={12} />
                                                CONFLITO
                                            </div>
                                        </div>
                                    )}

                                    {/* Bookings */}
                                    {bookingsStartingHere.map(booking => {
                                        let span = getBookingSpan(booking);
                                        const bgColor = booking.color || '#6366f1';
                                        const isBeingDragged = (draggedBooking?.id === booking.id) || (touchDragBooking?.id === booking.id);
                                        const isBeingResized = resizingBooking?.id === booking.id;

                                        const startMin = parseLocalDate(booking.start_date).getMinutes();
                                        let topOffset = (startMin / 60) * HOUR_HEIGHT + 2;

                                        let heightPx = span * HOUR_HEIGHT - 4;
                                        if (isBeingResized) {
                                            if (resizeDirection === 'bottom') {
                                                heightPx = Math.max(HOUR_HEIGHT / 6, span * HOUR_HEIGHT + resizeDelta - 4); // Min 10 min height
                                            } else if (resizeDirection === 'top') {
                                                // When resizing top:
                                                // 1. Height increases by -delta (dragging up = negative delta -> positive height increase)
                                                // 2. Top position moves by delta (dragging up = negative delta -> moves up)
                                                const newHeight = span * HOUR_HEIGHT - resizeDelta - 4;
                                                const newTop = topOffset + resizeDelta;

                                                if (newHeight >= HOUR_HEIGHT / 6) {
                                                    heightPx = newHeight;
                                                    topOffset = newTop;
                                                }
                                            }
                                        }

                                        return (
                                            <div
                                                key={booking.id}
                                                ref={(el) => {
                                                    if (el) bookingRefs.current.set(booking.id, el);
                                                }}
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
                                                className={`absolute left-0.5 right-0.5 rounded-md overflow-hidden transition-all group/booking ${isBeingDragged ? 'opacity-50 scale-95 z-10' : ''
                                                    } ${isBeingResized ? 'ring-2 ring-indigo-500 shadow-lg z-30' : 'hover:shadow-lg cursor-grab active:cursor-grabbing z-20'}`}
                                                style={{
                                                    top: `${topOffset}px`,
                                                    height: `${heightPx}px`,
                                                    backgroundColor: `${bgColor}20`,
                                                    borderLeft: `3px solid ${bgColor}`,
                                                }}
                                            >
                                                {/* Top Resize Handle */}
                                                <div
                                                    className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize flex items-start justify-center pt-1 z-40 opacity-0 group-hover/booking:opacity-100 transition-opacity"
                                                    style={{ background: `linear-gradient(${bgColor}40, transparent)` }}
                                                    onMouseDown={(e) => handleResizeStart(e, booking, 'top')}
                                                    onTouchStart={(e) => handleResizeStart(e, booking, 'top')}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                                >
                                                    <div className="w-8 h-1 rounded-full bg-white/60 shadow-sm"></div>
                                                </div>

                                                {/* Booking Content */}
                                                <div className="px-2 py-1 h-full flex flex-col pointer-events-none select-none mt-1">
                                                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                        <div className="text-[10px] font-bold truncate" style={{ color: bgColor }}>
                                                            {format(parseLocalDate(booking.start_date), 'HH:mm')}
                                                        </div>
                                                        <Badge
                                                            className="h-3 px-1 text-[7px] uppercase font-bold bg-white/50"
                                                            style={{
                                                                borderColor:
                                                                    booking.status === 'confirmed' ? '#3b82f6' :
                                                                        booking.status === 'pending' ? '#f59e0b' :
                                                                            booking.status === 'completed' ? '#22c55e' :
                                                                                booking.status === 'cancelled' ? '#f97316' :
                                                                                    bgColor,
                                                                color:
                                                                    booking.status === 'confirmed' ? '#1e40af' :
                                                                        booking.status === 'pending' ? '#92400e' :
                                                                            booking.status === 'completed' ? '#166534' :
                                                                                booking.status === 'cancelled' ? '#9a3412' :
                                                                                    bgColor
                                                            }}
                                                            variant="outline"
                                                        >
                                                            {booking.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs font-semibold text-slate-800 truncate">
                                                        {booking.summary || 'Agendamento'}
                                                    </div>
                                                    {booking.customers?.name && span >= 1.5 && (
                                                        <div className="text-[10px] text-slate-500 truncate">
                                                            📍 {booking.customers.name}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Resize Handle */}
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 h-6 cursor-ns-resize flex items-end justify-center pb-1"
                                                    style={{ background: `linear-gradient(transparent, ${bgColor}40)` }}
                                                    onMouseDown={(e) => handleResizeStart(e, booking, 'bottom')}
                                                    onTouchStart={(e) => handleResizeStart(e, booking, 'bottom')}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                                >
                                                    <div className="w-8 h-1.5 rounded-full bg-white/60 group-hover/booking:bg-white/90 transition-colors shadow-sm"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Touch dragging overlay */}
            {touchDragBooking && (
                <div className="fixed inset-0 z-40" style={{ touchAction: 'none' }} />
            )}
        </div>
    );
};
