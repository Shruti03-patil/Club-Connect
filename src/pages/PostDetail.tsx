import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Share2, Image, Upload, FileImage, Plus, MapPin, Clock, ExternalLink, Settings } from 'lucide-react';
import { FirestorePost, User, Attachment } from '../types/auth';
import { getPosts, updatePost } from '../lib/firestoreService';
import AttachmentGallery from '../components/AttachmentGallery';
import CloudinaryUpload from '../components/CloudinaryUpload';
import RSVPModal from '../components/RSVPModal';
import ImageModal from '../components/ImageModal';

interface PostDetailProps {
    postId: string;
    onBack: () => void;
    onNavigateToPost?: (postId: string) => void;
    user?: User | null;
    onManageEvent?: (eventId: string) => void;
}

export default function PostDetail({ postId, onBack, onNavigateToPost, user, onManageEvent }: PostDetailProps) {
    const [post, setPost] = useState<FirestorePost | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isShared, setIsShared] = useState(false);
    const [isEditingPhotos, setIsEditingPhotos] = useState(false);
    const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isRsvpModalOpen, setIsRsvpModalOpen] = useState(false);

    // Image Modal State
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openImageModal = (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation();
        setModalImage(imageUrl);
        setIsModalOpen(true);
    };

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const posts = await getPosts();
                const foundPost = posts.find(p => p.id === postId);
                setPost(foundPost || null);
            } catch (error) {
                console.error('Error fetching post:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    // Check if current user can edit this post logic
    const canManageEvent = user && post && (
        user.role === 'admin' ||
        ((user.role === 'club-secretary' || user.role === 'president' || user.role === 'treasurer') && user.clubId === post.clubId)
    );

    // Check if current user can edit photos (specifically secretary/admin)
    const canEditPhotos = user && post && (
        (user.role === 'club-secretary' && user.clubId === post.clubId) ||
        user.role === 'admin'
    );

    // Check if event is past
    const isPastEvent = post && post.type === 'event' && new Date(post.date) < new Date();

    const handleShare = async () => {
        if (!post) return;

        const shareData = {
            title: post.title,
            text: `Check out: ${post.title} by ${post.clubName}`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                setIsShared(true);
                setTimeout(() => setIsShared(false), 2000);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(`${shareData.title} - ${shareData.url}`);
            setIsShared(true);
            setTimeout(() => setIsShared(false), 2000);
        }
    };

    const handleStartEditPhotos = () => {
        setEditAttachments(post?.eventPhotos || []);
        setIsEditingPhotos(true);
    };

    const handleSavePhotos = async () => {
        if (!post?.id) return;

        setIsSaving(true);
        const success = await updatePost(post.id, { eventPhotos: editAttachments });
        if (success) {
            setPost({ ...post, eventPhotos: editAttachments });
            setIsEditingPhotos(false);
        }
        setIsSaving(false);
    };

    const getTypeColor = (type: string) => {
        return type === 'event'
            ? 'from-blue-500 to-cyan-500'
            : 'from-purple-500 to-pink-500';
    };

    if (isLoading) {
        // ... existing loading state
        return (
            <div className="max-w-4xl mx-auto px-6 py-12 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!post) {
        // ... existing not found state
        return (
            <div className="max-w-4xl mx-auto px-6 py-12">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                </button>
                <p className="text-center text-xl text-slate-600 dark:text-slate-400">Post not found</p>
            </div>
        );
    }

    const totalPhotos = (post.attachments?.length || 0) + (post.eventPhotos?.length || 0);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
                {/* Cover Image */}
                {post.coverImage && (
                    <div
                        className="w-full h-64 sm:h-80 relative bg-slate-200 dark:bg-slate-700 group cursor-zoom-in"
                        onClick={(e) => openImageModal(e, post.coverImage!)}
                    >
                        <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 pointer-events-none">
                            <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm font-medium">Click to expand</span>
                        </div>
                    </div>
                )}

                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r ${getTypeColor(post.type)} text-white`}>
                                    {post.type === 'event' ? 'Event' : 'Announcement'}
                                </span>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    by {post.clubName}
                                </span>
                                {isPastEvent && (
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                                        Completed
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                {post.title}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {canManageEvent && onManageEvent && (
                                <button
                                    onClick={() => post.id && onManageEvent(post.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
                                >
                                    <Settings className="w-4 h-4" />
                                    Manage
                                </button>
                            )}
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                                {isShared ? 'Shared!' : 'Share'}
                            </button>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        {/* Date - Only show for events OR announcements with a date */}
                        {(post.type === 'event' || post.date) && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Date</p>
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                                        {new Date(post.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Time - Only show for events OR announcements with time */}
                        {(post.type === 'event' || post.time) && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Time</p>
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                                        {post.time || 'All Day'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Location - Only show for events OR announcements with location */}
                        {(post.type === 'event' || post.location) && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Venue</p>
                                    {post.locationUrl ? (
                                        <a
                                            href={post.locationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        >
                                            {post.location || 'Campus'}
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    ) : (
                                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                                            {post.location || 'Campus'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Registration */}
                        {(post.registrationStart || post.registrationEnd) && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Registration</p>
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                                        {post.registrationStart && new Date(post.registrationStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {post.registrationStartTime && ` ${post.registrationStartTime}`}
                                        {(post.registrationStart || post.registrationStartTime) && (post.registrationEnd || post.registrationEndTime) && ' - '}
                                        {post.registrationEnd && new Date(post.registrationEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {post.registrationEndTime && ` ${post.registrationEndTime}`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Total Media - Only show for events OR when there are media items */}
                        {(post.type === 'event' || totalPhotos > 0) && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-full shrink-0">
                                    <Image className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Media</p>
                                    <p className="text-base font-semibold text-slate-900 dark:text-white">{totalPhotos} items</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Embedded Google Maps for External Locations */}
                    {post.locationUrl && post.location && (
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Event Location
                            </h3>
                            <a
                                href={post.locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group cursor-pointer"
                            >
                                <div className="relative">
                                    <iframe
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(post.location)}&output=embed`}
                                        className="w-full h-64 pointer-events-none"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                    <div className="absolute inset-0 bg-transparent group-hover:bg-blue-500/10 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            Open in Google Maps
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 flex items-center justify-between">
                                    <span className="font-medium text-slate-900 dark:text-white">{post.location}</span>
                                    <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        Click to open in Maps
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </span>
                                </div>
                            </a>
                        </div>
                    )}

                    {/* Registration Link Button */}
                    {post.registrationLink && (() => {
                        // Check if registration period has ended
                        if (post.registrationEnd) {
                            let registrationEndDateTime = new Date(post.registrationEnd);
                            // If there's an end time, parse and apply it
                            if (post.registrationEndTime) {
                                const timeMatch = post.registrationEndTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
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
                            <div className="mb-6">
                                <a
                                    href={post.registrationLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg"
                                >
                                    <span>Register Now</span>
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            </div>
                        );
                    })()}

                    {/* Event WhatsApp Group Button */}
                    {post.eventWhatsappLink && (
                        <div className="mb-6">
                            <a
                                href={post.eventWhatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                <span>Join Event WhatsApp Group</span>
                            </a>
                        </div>
                    )}

                    {/* RSVP Button for upcoming events */}
                    {post.type === 'event' && !isPastEvent && (
                        <div className="mb-6">
                            <button
                                onClick={() => setIsRsvpModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg"
                            >
                                <Plus className="w-5 h-5" />
                                RSVP for this Event
                            </button>
                        </div>
                    )}

                    {/* View Related Event Button for announcements */}
                    {post.type === 'announcement' && post.relatedEventId && post.relatedEventTitle && onNavigateToPost && (
                        <div className="mb-6">
                            <button
                                onClick={() => onNavigateToPost(post.relatedEventId!)}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg"
                            >
                                <Calendar className="w-6 h-6" />
                                <div className="text-left">
                                    <div className="text-lg">View Related Event</div>
                                    <div className="text-sm text-blue-100 font-normal">{post.relatedEventTitle}</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Description */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Description</h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {post.content}
                        </p>

                        {/* Description Images (uploaded when creating post) */}
                        {post.attachments && post.attachments.length > 0 && (
                            <div className="mt-4">
                                <AttachmentGallery attachments={post.attachments} />
                            </div>
                        )}
                    </div>

                    {/* Event Photos Section (only for events) */}
                    {post.type === 'event' && (
                        <div className="mb-8 pt-6 border-t border-slate-200 dark:border-slate-700">

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileImage className="w-5 h-5" />
                                    Event Photos & Videos ({post.eventPhotos?.length || 0})
                                </h3>

                                {/* Secretary Upload Button for Past Events */}
                                {canEditPhotos && isPastEvent && !isEditingPhotos && (
                                    <button
                                        onClick={handleStartEditPhotos}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Add Event Photos
                                    </button>
                                )}
                            </div>

                            {/* Edit Photos Mode */}
                            {isEditingPhotos ? (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        Upload photos and videos from this event to share with the community.
                                    </p>
                                    <CloudinaryUpload
                                        clubName={post.clubName}
                                        existingAttachments={editAttachments}
                                        onUploadComplete={(attachments) => setEditAttachments(attachments)}
                                        maxFiles={50}
                                    />
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={() => setIsEditingPhotos(false)}
                                            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSavePhotos}
                                            disabled={isSaving}
                                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-all"
                                        >
                                            {isSaving ? 'Saving...' : 'Save Photos'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {post.eventPhotos && post.eventPhotos.length > 0 ? (
                                        <AttachmentGallery attachments={post.eventPhotos} />
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                            <FileImage className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-500 dark:text-slate-400">No event photos yet</p>
                                            {canEditPhotos && isPastEvent && (
                                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                                    Click "Add Event Photos" to upload photos from this event
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Posted Info */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                        Posted by {post.authorName} on {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                </div>

                {/* RSVP Modal */}
                {post && (
                    <RSVPModal
                        isOpen={isRsvpModalOpen}
                        onClose={() => setIsRsvpModalOpen(false)}
                        event={{
                            id: post.id || '',
                            title: post.title,
                            date: post.date,
                            time: post.time || 'Time not specified',
                            location: post.location || 'Location not specified',
                            attendees: post.rsvps || 0
                        }}
                        clubName={post.clubName}
                        user={user}
                    />
                )}
                <ImageModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    imageUrl={modalImage || ''}
                />
            </div>
        </div>
    );
}
