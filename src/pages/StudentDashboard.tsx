import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ArrowLeft, CalendarCheck, History, ExternalLink } from 'lucide-react';
import { Page } from '../types/page';
import { useAuth } from '../context/AuthContext';
import { getUserRSVPsByEmail, getPosts } from '../lib/firestoreService';
import { FirestorePost } from '../types/auth';

interface StudentDashboardProps {
    onNavigate: (page: Page) => void;
    onNavigateToPost: (postId: string) => void;
}

interface UserEvent {
    event: FirestorePost;
    rsvpDate: Date;
}

export default function StudentDashboard({ onNavigate, onNavigateToPost }: StudentDashboardProps) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserEvents = async () => {
            if (!user?.email) {
                setIsLoading(false);
                return;
            }

            try {
                // Get user's RSVPs
                const userRSVPs = await getUserRSVPsByEmail(user.email);

                // Get all posts to match event details
                const allPosts = await getPosts();

                // Map RSVPs to events
                const events: UserEvent[] = [];
                for (const { eventId, rsvp } of userRSVPs) {
                    const event = allPosts.find(p => p.id === eventId);
                    if (event) {
                        events.push({
                            event,
                            rsvpDate: rsvp.rsvpedAt,
                        });
                    }
                }

                // Sort by event date
                events.sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());
                setUserEvents(events);
            } catch (error) {
                console.error('Error fetching user events:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserEvents();
    }, [user?.email]);

    const now = new Date();
    const upcomingEvents = userEvents.filter(e => new Date(e.event.date) >= now);
    const pastEvents = userEvents.filter(e => new Date(e.event.date) < now);

    const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => onNavigate('home')}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>

                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Welcome back, <span className="text-blue-600">{user?.name || 'Student'}</span>!
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        View and manage your event registrations
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <CalendarCheck className="w-6 h-6" />
                            <span className="text-lg font-semibold">Upcoming Events</span>
                        </div>
                        <p className="text-4xl font-bold">{upcomingEvents.length}</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <History className="w-6 h-6" />
                            <span className="text-lg font-semibold">Past Events</span>
                        </div>
                        <p className="text-4xl font-bold">{pastEvents.length}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`pb-3 px-2 font-semibold transition-colors relative ${activeTab === 'upcoming'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Upcoming Events ({upcomingEvents.length})
                        {activeTab === 'upcoming' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`pb-3 px-2 font-semibold transition-colors relative ${activeTab === 'past'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Past Events ({pastEvents.length})
                        {activeTab === 'past' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                </div>

                {/* Events List */}
                {displayedEvents.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        {activeTab === 'upcoming' ? (
                            <>
                                <CalendarCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                    No upcoming events
                                </h3>
                                <p className="text-slate-500 dark:text-slate-500 mb-4">
                                    Browse events and RSVP to see them here
                                </p>
                                <button
                                    onClick={() => onNavigate('events')}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                                >
                                    Browse Events
                                </button>
                            </>
                        ) : (
                            <>
                                <History className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                    No past events
                                </h3>
                                <p className="text-slate-500 dark:text-slate-500">
                                    Events you've attended will appear here
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedEvents.map(({ event, rsvpDate }) => (
                            <div
                                key={event.id}
                                className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${activeTab === 'upcoming'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                }`}>
                                                {activeTab === 'upcoming' ? 'Upcoming' : 'Completed'}
                                            </span>
                                            <span className="text-sm text-slate-500">by {event.clubName}</span>
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                                            {event.title}
                                        </h3>

                                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(event.date).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                            {event.time && (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4" />
                                                    {event.time}
                                                </div>
                                            )}
                                            {event.location && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-4 h-4" />
                                                    {event.location}
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-400 mt-3">
                                            RSVP'd on {rsvpDate.toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => event.id && onNavigateToPost(event.id)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                        >
                                            View Details
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
