import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ArrowLeft, ChevronDown, Sparkles, Bell, Filter, Settings } from 'lucide-react';
import { FirestorePost, FirestoreClub, User } from '../types/auth';
import { getPosts, getClubs } from '../lib/firestoreService';

interface EventsProps {
    onBack: () => void;
    onNavigateToPost: (postId: string) => void;
    user?: User | null;
    onManageEvent?: (eventId: string) => void;
}

import ImageModal from '../components/ImageModal';

// ... existing imports

export default function Events({ onBack, onNavigateToPost, user, onManageEvent }: EventsProps) {
    // ... existing state
    const [posts, setPosts] = useState<FirestorePost[]>([]);
    const [clubs, setClubs] = useState<FirestoreClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(15);
    const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
    const [clubFilter, setClubFilter] = useState<string>('all');

    // Image Modal State
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openImageModal = (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation();
        setModalImage(imageUrl);
        setIsModalOpen(true);
    };

    // ... existing useEffect and helpers


    useEffect(() => {
        const loadData = async () => {
            try {
                const [postsData, clubsData] = await Promise.all([
                    getPosts(),
                    getClubs()
                ]);
                // Filter only events (not announcements) and sort by date (newest first)
                const events = postsData
                    .filter(p => p.type === 'event')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setPosts(events);
                setClubs(clubsData);
            } catch (error) {
                console.error('Error loading events:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const getEventColor = (type: string) => {
        switch (type) {
            case 'event': return 'from-blue-500 to-cyan-500';
            case 'announcement': return 'from-purple-500 to-pink-500';
            default: return 'from-amber-500 to-orange-500';
        }
    };

    const loadMoreEvents = () => {
        setVisibleCount(prev => prev + 5);
    };

    // Filter posts based on status and club
    const filteredPosts = posts.filter(post => {
        const now = new Date();
        const postDate = new Date(post.date);

        // Status filter
        if (statusFilter === 'upcoming' && postDate < now) return false;
        if (statusFilter === 'completed' && postDate >= now) return false;

        // Club filter
        if (clubFilter !== 'all' && post.clubName !== clubFilter) return false;

        return true;
    });

    const visiblePosts = filteredPosts.slice(0, visibleCount);
    const hasMorePosts = visibleCount < filteredPosts.length;

    // Get all club names from backend for the dropdown
    const allClubNames = clubs.map(c => c.name).sort();

    // Reset visible count when filters change
    const handleStatusFilterChange = (status: 'all' | 'upcoming' | 'completed') => {
        setStatusFilter(status);
        setVisibleCount(15);
    };

    const handleClubFilterChange = (club: string) => {
        setClubFilter(club);
        setVisibleCount(15);
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </button>

                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">All Events</h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            {filteredPosts.length === posts.length
                                ? `Browse all ${posts.length} events from clubs`
                                : `Showing ${filteredPosts.length} of ${posts.length} events`
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4" id="tour-events-filter">
                {/* Status Filter Tabs */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button
                        onClick={() => handleStatusFilterChange('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'all'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => handleStatusFilterChange('upcoming')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'upcoming'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => handleStatusFilterChange('completed')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'completed'
                            ? 'bg-slate-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                    >
                        Completed
                    </button>
                </div>

                {/* Club Filter Dropdown */}
                <div className="relative flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <select
                        value={clubFilter}
                        onChange={(e) => handleClubFilterChange(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                    >
                        <option value="all">All Clubs</option>
                        {allClubNames.map((clubName: string) => (
                            <option key={clubName} value={clubName}>{clubName}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Events List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                        {posts.length === 0 ? 'No events or announcements yet.' : 'No events match your filters.'}
                    </p>
                    {posts.length > 0 && (
                        <button
                            onClick={() => { setStatusFilter('all'); setClubFilter('all'); }}
                            className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {visiblePosts.map((post) => {
                        const club = clubs.find(c => c.name === post.clubName);
                        const isUpcoming = new Date(post.date) >= new Date();

                        // Check permissions
                        const canManage = user && (
                            user.role === 'admin' ||
                            ((user.role === 'club-secretary' || user.role === 'president' || user.role === 'treasurer') && user.clubId === post.clubId)
                        );

                        return (
                            <div
                                key={post.id}
                                onClick={() => post.id && onNavigateToPost(post.id)}
                                className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer relative"
                            >
                                <div className="flex flex-col sm:flex-row sm:h-36">
                                    {/* Left: Cover Image or Styled Icon - Same size for both */}
                                    {post.coverImage ? (
                                        <div
                                            className="sm:w-1/4 h-40 sm:h-full relative bg-slate-200 dark:bg-slate-700 flex-shrink-0 group/image overflow-hidden"
                                            onClick={(e) => openImageModal(e, post.coverImage!)}
                                        >
                                            <img
                                                src={post.coverImage}
                                                alt={post.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover/image:scale-110 cursor-zoom-in"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100 duration-300 pointer-events-none">
                                                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Click to expand</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`sm:w-1/4 h-40 sm:h-full flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br ${getEventColor(post.type)} flex-shrink-0`}>
                                            {/* Decorative floating circles */}
                                            <div className="absolute top-2 right-2 w-12 h-12 bg-white/10 rounded-full blur-sm" />
                                            <div className="absolute bottom-3 left-2 w-8 h-8 bg-white/10 rounded-full blur-sm" />

                                            {/* Event type icon */}
                                            <div className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                {post.type === 'event' ? (
                                                    <Calendar className="w-6 h-6 text-white" />
                                                ) : post.type === 'announcement' ? (
                                                    <Bell className="w-6 h-6 text-white" />
                                                ) : (
                                                    <Sparkles className="w-6 h-6 text-white" />
                                                )}
                                            </div>

                                            {/* Event type label */}
                                            <span className="relative z-10 text-xs font-bold text-white/90 uppercase tracking-wider">
                                                {post.type}
                                            </span>
                                        </div>
                                    )}

                                    {/* Right: Details - Same width for both */}
                                    <div className="sm:w-3/4 p-5 flex flex-col justify-center">
                                        {/* Header with club info and status */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-gradient-to-br ${getEventColor(post.type)} text-white overflow-hidden`}>
                                                    {club?.image ? (
                                                        <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Calendar className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{post.clubName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {canManage && onManageEvent && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            post.id && onManageEvent(post.id);
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-semibold border border-slate-200 dark:border-slate-600"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                        Manage
                                                    </button>
                                                )}
                                                {isUpcoming && (
                                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold px-2 py-1 rounded-full uppercase">
                                                        Upcoming
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {post.title}
                                        </h3>

                                        {/* Details row */}
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4 text-blue-500" />
                                                <span>{new Date(post.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                <span>{post.time || 'All Day'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-blue-500" />
                                                <span>{post.location || 'Campus'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Load More Button */}
                    {hasMorePosts && (
                        <div className="text-center pt-6">
                            <button
                                onClick={loadMoreEvents}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                <ChevronDown className="w-5 h-5" />
                                Load More Events ({filteredPosts.length - visibleCount} remaining)
                            </button>
                        </div>
                    )}

                    {/* End of list message */}
                    {!hasMorePosts && filteredPosts.length > 0 && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <p className="text-sm">You've reached the end • {filteredPosts.length} events shown</p>
                        </div>
                    )}
                </div>
            )}
            {/* Image Modal */}
            <ImageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                imageUrl={modalImage || ''}
            />
        </div>
    );
}
