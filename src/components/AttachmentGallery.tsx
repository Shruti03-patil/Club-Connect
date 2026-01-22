import { useState } from 'react';
import { X, Play, FileText, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Attachment } from '../types/auth';

interface AttachmentGalleryProps {
    attachments: Attachment[];
    className?: string;
}

export default function AttachmentGallery({ attachments, className = '' }: AttachmentGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    if (!attachments || attachments.length === 0) return null;

    const images = attachments.filter(a => a.type === 'image');
    const videos = attachments.filter(a => a.type === 'video');
    const others = attachments.filter(a => a.type !== 'image' && a.type !== 'video');
    const mediaItems = [...images, ...videos];

    const openLightbox = (index: number) => {
        setSelectedIndex(index);
        setIsVideoPlaying(false);
    };

    const closeLightbox = () => {
        setSelectedIndex(null);
        setIsVideoPlaying(false);
    };

    const goToPrevious = () => {
        if (selectedIndex !== null && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
            setIsVideoPlaying(false);
        }
    };

    const goToNext = () => {
        if (selectedIndex !== null && selectedIndex < mediaItems.length - 1) {
            setSelectedIndex(selectedIndex + 1);
            setIsVideoPlaying(false);
        }
    };

    return (
        <div className={className}>
            {/* Media Grid */}
            {mediaItems.length > 0 && (
                <div className={`grid gap-2 ${mediaItems.length === 1 ? 'grid-cols-1' :
                        mediaItems.length === 2 ? 'grid-cols-2' :
                            'grid-cols-3'
                    }`}>
                    {mediaItems.slice(0, 6).map((item, index) => (
                        <div
                            key={item.publicId}
                            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => openLightbox(index)}
                        >
                            {item.type === 'image' ? (
                                <img
                                    src={item.url}
                                    alt={item.label || 'Image'}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="relative w-full h-full bg-slate-900">
                                    <video
                                        src={item.url}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                            <Play className="w-6 h-6 text-slate-900 ml-1" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Show +X overlay for extra items */}
                            {index === 5 && mediaItems.length > 6 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white text-2xl font-bold">+{mediaItems.length - 6}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Other attachments (PDFs, links) */}
            {others.length > 0 && (
                <div className="mt-3 space-y-2">
                    {others.map((item) => (
                        <a
                            key={item.publicId}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            {item.type === 'pdf' ? (
                                <FileText className="w-4 h-4 text-red-500" />
                            ) : (
                                <ExternalLink className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                {item.label || (item.type === 'pdf' ? 'View PDF' : 'Open Link')}
                            </span>
                        </a>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedIndex !== null && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Navigation arrows */}
                    {selectedIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                            className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}
                    {selectedIndex < mediaItems.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); goToNext(); }}
                            className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}

                    {/* Media content */}
                    <div
                        className="max-w-4xl max-h-[90vh] px-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {mediaItems[selectedIndex].type === 'image' ? (
                            <img
                                src={mediaItems[selectedIndex].url}
                                alt={mediaItems[selectedIndex].label || 'Image'}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                            />
                        ) : (
                            <video
                                src={mediaItems[selectedIndex].url}
                                controls
                                autoPlay={isVideoPlaying}
                                className="max-w-full max-h-[85vh] rounded-lg"
                                onPlay={() => setIsVideoPlaying(true)}
                            />
                        )}
                    </div>

                    {/* Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white text-sm rounded-full">
                        {selectedIndex + 1} / {mediaItems.length}
                    </div>
                </div>
            )}
        </div>
    );
}
