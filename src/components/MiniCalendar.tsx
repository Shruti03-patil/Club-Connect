import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FirestorePost } from '../types/auth';

interface MiniCalendarProps {
    events: FirestorePost[];
    selectedDate?: Date | null;
    onDateSelect: (date: Date) => void;
}

export default function MiniCalendar({ events, selectedDate, onDateSelect }: MiniCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month + 1, 0).getDate();
    }, [currentDate]);

    const firstDayOfMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month, 1).getDay();
    }, [currentDate]);

    const monthEvents = useMemo(() => {
        return events.filter(event => {
            const eventDate = new Date(event.date);
            return (
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()
            );
        });
    }, [events, currentDate]);

    const hasEvent = (day: number) => {
        return monthEvents.some(event => new Date(event.date).getDate() === day);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                        <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-xs font-bold text-slate-400 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {padding.map(i => (
                    <div key={`pad-${i}`} />
                ))}
                {days.map(day => {
                    const isToday =
                        new Date().getDate() === day &&
                        new Date().getMonth() === currentDate.getMonth() &&
                        new Date().getFullYear() === currentDate.getFullYear();

                    const isSelected = selectedDate &&
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === currentDate.getMonth() &&
                        selectedDate.getFullYear() === currentDate.getFullYear();

                    const hasEventOnDay = hasEvent(day);

                    return (
                        <div
                            key={day}
                            onClick={() => {
                                const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                onDateSelect(newDate);
                            }}
                            className={`
                aspect-square flex flex-col items-center justify-center rounded-md text-sm font-medium relative group cursor-pointer transition-colors
                ${isSelected
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : isToday
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }
              `}
                        >
                            {day}
                            {hasEventOnDay && !isSelected && (
                                <div className={`w-1 h-1 rounded-full mt-1 ${isToday ? 'bg-blue-500' : 'bg-blue-500'}`} />
                            )}
                            {hasEventOnDay && isSelected && (
                                <div className="w-1 h-1 rounded-full bg-white mt-1" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-center">
                Events are marked with dots
            </div>
        </div>
    );
}
