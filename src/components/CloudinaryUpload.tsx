import { useState } from 'react';
import { Upload, X, Image, Video, FileText, Link } from 'lucide-react';
import { Attachment } from '../types/auth';

// Declare the Cloudinary widget type
declare global {
    interface Window {
        cloudinary: {
            createUploadWidget: (
                options: any,
                callback: (error: any, result: any) => void
            ) => {
                open: () => void;
                close: () => void;
            };
        };
    }
}

interface CloudinaryUploadProps {
    clubName: string;
    onUploadComplete: (attachments: Attachment[]) => void;
    existingAttachments?: Attachment[];
    maxFiles?: number;
}

export default function CloudinaryUpload({
    clubName,
    onUploadComplete,
    existingAttachments = [],
    maxFiles = 10
}: CloudinaryUploadProps) {
    const [attachments, setAttachments] = useState<Attachment[]>(existingAttachments);
    const [isUploading, setIsUploading] = useState(false);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    // Sanitize folder name (remove special characters)
    const folderName = clubName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const openUploadWidget = () => {
        if (!window.cloudinary) {
            alert('Cloudinary widget not loaded. Please refresh the page.');
            return;
        }

        if (!cloudName || !uploadPreset) {
            alert('Cloudinary configuration missing. Please check environment variables.');
            return;
        }

        const widget = window.cloudinary.createUploadWidget(
            {
                cloudName: cloudName,
                uploadPreset: uploadPreset,
                folder: `club-connect/${folderName}`,
                sources: ['local', 'url', 'camera'],
                multiple: true,
                maxFiles: maxFiles - attachments.length,
                resourceType: 'auto', // Allow images and videos
                clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf'],
                maxFileSize: 50000000, // 50MB max
                styles: {
                    palette: {
                        window: '#1e293b',
                        windowBorder: '#475569',
                        tabIcon: '#3b82f6',
                        menuIcons: '#94a3b8',
                        textDark: '#f1f5f9',
                        textLight: '#94a3b8',
                        link: '#3b82f6',
                        action: '#3b82f6',
                        inactiveTabIcon: '#64748b',
                        error: '#ef4444',
                        inProgress: '#3b82f6',
                        complete: '#22c55e',
                        sourceBg: '#0f172a'
                    }
                }
            },
            (error: any, result: any) => {
                if (error) {
                    console.error('Upload error:', error);
                    setIsUploading(false);
                    return;
                }

                if (result.event === 'queues-start') {
                    setIsUploading(true);
                }

                if (result.event === 'success') {
                    const info = result.info;
                    const type = getAttachmentType(info.resource_type, info.format);

                    const newAttachment: Attachment = {
                        url: info.secure_url,
                        publicId: info.public_id,
                        type: type,
                        label: info.original_filename || undefined
                    };

                    setAttachments(prev => {
                        const updated = [...prev, newAttachment];
                        onUploadComplete(updated);
                        return updated;
                    });
                }

                if (result.event === 'queues-end') {
                    setIsUploading(false);
                }
            }
        );

        widget.open();
    };

    const getAttachmentType = (resourceType: string, format: string): Attachment['type'] => {
        if (resourceType === 'video') return 'video';
        if (format === 'pdf') return 'pdf';
        if (resourceType === 'image') return 'image';
        return 'link';
    };

    const removeAttachment = (publicId: string) => {
        const updated = attachments.filter(a => a.publicId !== publicId);
        setAttachments(updated);
        onUploadComplete(updated);
    };

    const getAttachmentIcon = (type: Attachment['type']) => {
        switch (type) {
            case 'image': return <Image className="w-4 h-4" />;
            case 'video': return <Video className="w-4 h-4" />;
            case 'pdf': return <FileText className="w-4 h-4" />;
            default: return <Link className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Button */}
            <button
                type="button"
                onClick={openUploadWidget}
                disabled={isUploading || attachments.length >= maxFiles}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Uploading...</span>
                    </>
                ) : (
                    <>
                        <Upload className="w-5 h-5" />
                        <span>Upload Photos/Videos ({attachments.length}/{maxFiles})</span>
                    </>
                )}
            </button>

            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.publicId}
                            className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                        >
                            {attachment.type === 'image' ? (
                                <img
                                    src={attachment.url}
                                    alt={attachment.label || 'Attachment'}
                                    className="w-full h-24 object-cover"
                                />
                            ) : attachment.type === 'video' ? (
                                <video
                                    src={attachment.url}
                                    className="w-full h-24 object-cover"
                                />
                            ) : (
                                <div className="w-full h-24 flex items-center justify-center">
                                    {getAttachmentIcon(attachment.type)}
                                    <span className="ml-2 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]">
                                        {attachment.label || attachment.type.toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Remove button */}
                            <button
                                type="button"
                                onClick={() => removeAttachment(attachment.publicId)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                                <X className="w-3 h-3" />
                            </button>

                            {/* Type indicator */}
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/50 text-white text-xs rounded flex items-center gap-1">
                                {getAttachmentIcon(attachment.type)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
