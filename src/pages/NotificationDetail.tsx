import { ArrowLeft, Bell, Calendar, ExternalLink } from 'lucide-react';
import { FirestoreNotification } from '../types/auth';

interface NotificationDetailProps {
    notification: FirestoreNotification;
    onBack: () => void;
    onNavigateToPost?: (postId: string) => void;
}

export default function NotificationDetail({ notification, onBack, onNavigateToPost }: NotificationDetailProps) {
    const isRelatedContentAvailable = !!notification.relatedId && !!onNavigateToPost;

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-6"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 shadow-md ${notification.type === 'event' ? 'text-blue-600' :
                                notification.type === 'announcement' ? 'text-purple-600' : 'text-slate-600'
                            }`}>
                            <Bell className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${notification.type === 'event' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                        notification.type === 'announcement' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}>
                                    {notification.type}
                                </span>
                                <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                    {notification.createdAt instanceof Date
                                        ? notification.createdAt.toLocaleDateString(undefined, { dateStyle: 'long' })
                                        : new Date(notification.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })
                                    }
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                {notification.title}
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="prose dark:prose-invert max-w-none mb-8">
                        <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {notification.message}
                        </p>
                    </div>

                    {/* Action Button */}
                    {isRelatedContentAvailable && (
                        <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={() => onNavigateToPost!(notification.relatedId!)}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105"
                            >
                                <span>View Related {notification.type === 'event' ? 'Event' : 'Post'}</span>
                                <ExternalLink className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
