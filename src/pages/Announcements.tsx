import { useState, useEffect } from 'react';
import { Calendar, ArrowLeft, ChevronDown, Megaphone, Filter } from 'lucide-react';
import { FirestorePost, FirestoreClub } from '../types/auth';
import { getPosts, getClubs } from '../lib/firestoreService';

interface AnnouncementsProps {
    onBack: () => void;
    onNavigateToPost: (postId: string) => void;
}

import ImageModal from '../components/ImageModal';

// ... existing imports

export default function Announcements({ onBack, onNavigateToPost }: AnnouncementsProps) {
    // ... existing state
    const [posts, setPosts] = useState<FirestorePost[]>([]);
    const [clubs, setClubs] = useState<FirestoreClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(15);
    const [clubFilter, setClubFilter] = useState<string>('all');

    // Image Modal State
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openImageModal = (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation();
        setModalImage(imageUrl);
        setIsModalOpen(true);
    };

    // ... existing useEffect


    useEffect(() => {
        const loadData = async () => {
            try {
                const [postsData, clubsData] = await Promise.all([
                    getPosts(),
                    getClubs()
                ]);
                // Filter only announcements and sort by date (newest first)
                const announcements = postsData
                    .filter(p => p.type === 'announcement')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setPosts(announcements);
                setClubs(clubsData);
            } catch (error) {
                console.error('Error loading announcements:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const loadMore = () => {
        setVisibleCount(prev => prev + 5);
    };

    // Filter posts based on club
    const filteredPosts = posts.filter(post => {
        if (clubFilter !== 'all' && post.clubName !== clubFilter) return false;
        return true;
    });

    const visiblePosts = filteredPosts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredPosts.length;

    // Get all club names from backend for the dropdown
    const allClubNames = clubs.map(c => c.name).sort();

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
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                        <Megaphone className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">All Announcements</h1>
                        <p className="text-slate-600 dark:text-slate-400">Stay updated with notifications from all clubs</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-8">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter by:</span>
                    </div>

                    {/* Club Filter */}
                    <div className="relative">
                        <select
                            value={clubFilter}
                            onChange={(e) => handleClubFilterChange(e.target.value)}
                            className="appearance-none bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium px-4 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="all">All Clubs</option>
                            {allClubNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Results count */}
                    <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
                        Showing {visiblePosts.length} of {filteredPosts.length} announcements
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="text-center py-20">
                    <Megaphone className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">No Announcements Found</h3>
                    <p className="text-slate-500 dark:text-slate-500">
                        {clubFilter !== 'all'
                            ? 'Try changing the filter to see more announcements'
                            : 'Check back later for announcements from clubs'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Announcements List */}
                    <div className="space-y-4" id="tour-announcements-list">
                        {visiblePosts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => onNavigateToPost(post.id!)}
                                className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all cursor-pointer"
                            >
                                <div className="flex flex-col sm:flex-row">
                                    {/* Left: Cover Image or Styled Icon */}
                                    {post.coverImage ? (
                                        <div
                                            className="sm:w-1/4 h-40 sm:h-auto relative bg-slate-200 dark:bg-slate-700 flex-shrink-0 group/image overflow-hidden"
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
                                        <div className="sm:w-1/4 h-40 sm:h-auto flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 min-h-[120px]">
                                            {/* Decorative floating circles */}
                                            <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full blur-sm" />
                                            <div className="absolute bottom-4 left-4 w-10 h-10 bg-white/10 rounded-full blur-sm" />

                                            {/* Icon */}
                                            <div className="relative z-10 w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <Megaphone className="w-7 h-7 text-white" />
                                            </div>

                                            {/* Type label */}
                                            <span className="relative z-10 text-xs font-bold text-white/90 uppercase tracking-widest">
                                                Announcement
                                            </span>
                                        </div>
                                    )}

                                    {/* Right: Details */}
                                    <div className="sm:w-3/4 p-6 flex flex-col justify-center">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                    {post.title}
                                                </h3>

                                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                                                    {post.content}
                                                </p>

                                                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                                    <span className="font-medium text-purple-600 dark:text-purple-400">{post.clubName}</span>
                                                    <span>•</span>
                                                    <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                </div>
                                            </div>

                                            {/* Related Event Button - Right Side */}
                                            {post.relatedEventTitle && post.relatedEventId && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onNavigateToPost(post.relatedEventId!);
                                                    }}
                                                    className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                                                >
                                                    <Calendar className="w-5 h-5" />
                                                    <span>View Related Event</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More Button */}
                    {hasMore && (
                        <div className="text-center mt-8">
                            <button
                                onClick={loadMore}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
                            >
                                <ChevronDown className="w-5 h-5" />
                                Load More Announcements
                            </button>
                        </div>
                    )}
                </>
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
