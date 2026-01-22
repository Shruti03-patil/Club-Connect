import { X, Calendar, Clock, MapPin, Share2, ExternalLink, Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { FirestorePost } from '../types/auth';
import RSVPModal from './RSVPModal';

interface EventDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: FirestorePost | null;
    onManageEvent?: (eventId: string) => void;
    canManageEvent?: boolean;
}

export default function EventDetailModal({ isOpen, onClose, event, onManageEvent, canManageEvent }: EventDetailModalProps) {
    const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false);
    const [isShared, setIsShared] = useState(false);

    if (!isOpen || !event) return null;

    const isPastEvent = new Date(event.date) < new Date();



    const handleShare = async () => {
        const shareData = {
            title: event.title,
            text: `Check out this event: ${event.title}`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setIsShared(true);
                setTimeout(() => setIsShared(false), 2000);
            }
        } catch (err) {
            console.log('Share failed:', err);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={handleBackdropClick}
            >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                    {/* Header - Simple Gradient without Image */}
                    <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold px-3 py-1 rounded-full bg-white/20 text-white">
                                Event
                            </span>
                            {isPastEvent && (
                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                    Completed
                                </span>
                            )}
                        </div>
                        <p className="text-white/80 text-sm mb-1">by {event.clubName}</p>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">{event.title}</h2>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-16rem)]">
                        {/* Action buttons row */}
                        <div className="flex items-center justify-end gap-2 mb-6">
                            {canManageEvent && onManageEvent && event.id && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onManageEvent(event.id!);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                                >
                                    <Settings className="w-4 h-4" />
                                    Manage
                                </button>
                            )}
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
                            >
                                <Share2 className="w-4 h-4" />
                                {isShared ? 'Copied!' : 'Share'}
                            </button>
                        </div>

                        {/* Event Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Date</p>
                                    <p className="text-slate-900 dark:text-white font-medium text-sm">
                                        {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Time</p>
                                    <p className="text-slate-900 dark:text-white font-medium text-sm">{event.time || 'All Day'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Venue</p>
                                    {event.locationUrl ? (
                                        <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline flex items-center gap-1">
                                            {event.location || 'Campus'}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : (
                                        <p className="text-slate-900 dark:text-white font-medium text-sm">{event.location || 'Campus'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {event.content && (
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About this Event</h3>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                                    {event.content}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {event.registrationLink && (() => {
                                // Check if registration period has ended
                                if (event.registrationEnd) {
                                    let registrationEndDateTime = new Date(event.registrationEnd);
                                    // If there's an end time, parse and apply it
                                    if (event.registrationEndTime) {
                                        const timeMatch = event.registrationEndTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                                        if (timeMatch) {
                                            let hours = parseInt(timeMatch[1]);
                                            const minutes = parseInt(timeMatch[2]);
                                            const period = timeMatch[3];
                                            if (period) {
                                                if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                                                if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
                                            }
                                            registrationEndDateTime.setHours(hours, minutes, 59, 999);
                                        }
                                    } else {
                                        // No time specified, set to end of day
                                        registrationEndDateTime.setHours(23, 59, 59, 999);
                                    }
                                    // If registration end date/time has passed, don't show the button
                                    if (registrationEndDateTime < new Date()) {
                                        return null;
                                    }
                                }
                                return (
                                    <a
                                        href={event.registrationLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md text-sm"
                                    >
                                        Register Now <ExternalLink className="w-4 h-4" />
                                    </a>
                                );
                            })()}
                            {!isPastEvent && (
                                <button
                                    onClick={() => setIsRsvpModalOpen(true)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md text-sm"
                                >
                                    <Plus className="w-4 h-4" /> RSVP
                                </button>
                            )}
                            {event.eventWhatsappLink && (
                                <a
                                    href={event.eventWhatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all text-sm"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    WhatsApp
                                </a>
                            )}
                        </div>

                        {/* Posted Info */}
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                            Posted by {event.authorName} on {new Date(event.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* RSVP Modal */}
            <RSVPModal
                isOpen={isRsvpModalOpen}
                onClose={() => setIsRsvpModalOpen(false)}
                event={{
                    id: event.id || '',
                    title: event.title,
                    date: event.date,
                    time: event.time || 'Time not specified',
                    location: event.location || 'Location not specified',
                    attendees: event.rsvps || 0
                }}
                clubName={event.clubName}
            />
        </>
    );
}
