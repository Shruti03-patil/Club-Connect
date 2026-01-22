import { useState, useEffect, useRef } from 'react';
import { Settings, Users, Calendar, Bell, Edit, Plus, Trash2, Send, Image, Link, CheckCircle, Instagram, Sparkles, Settings2 } from 'lucide-react';
import { Page } from '../types/page';
import { User, FirestoreClub, FirestorePost, Attachment } from '../types/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getPosts, createPost, deletePost, createNotification, updatePost, checkEventTimeCollision, EventCollision, getEventRSVPs } from '../lib/firestoreService';
import { sendEventUpdateEmails, isEmailConfigured } from '../lib/emailService';
import CloudinaryUpload from '../components/CloudinaryUpload';
import AttachmentGallery from '../components/AttachmentGallery';
import MemberManager from '../components/MemberManager';
import LocationPickerModal from '../components/LocationPickerModal';
import ImageModal from '../components/ImageModal';
import { useNavigation } from '../context/NavigationContext';

// Notification Sender Component
function NotificationSender({ club }: { club: FirestoreClub }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const notificationId = await createNotification({
        title: `${club.name}: ${title}`,
        message,
        type: 'club',
        clubId: club.id,
        read: false
      });

      if (notificationId) {
        setResult({ type: 'success', text: 'Notification sent successfully!' });
        setTitle('');
        setMessage('');
      } else {
        setResult({ type: 'error', text: 'Failed to send notification' });
      }
    } catch (error) {
      setResult({ type: 'error', text: 'Failed to send notification' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Send Notifications</h3>

      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Send New Notification</h4>

        {result && (
          <div className={`p-3 rounded-lg mb-4 ${result.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
            {result.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your notification message..."
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Notification
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Image URL Input Component
function ImageUploader({ clubId, currentImage, onImageUpdated }: { clubId: string; currentImage?: string; onImageUpdated: (url: string) => void }) {
  const [previewUrl, setPreviewUrl] = useState(currentImage || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const openUploadWidget = () => {
    if (typeof window === 'undefined' || !window.cloudinary) {
      setError('Upload widget not available. Please refresh the page.');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError('Cloudinary configuration missing. Please check environment variables.');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        folder: `club_profiles/${clubId}`,
        sources: ['local', 'camera', 'url'],
        multiple: false,
        maxFiles: 1,
        cropping: true,
        croppingAspectRatio: 1,
        resourceType: 'image',
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
        maxFileSize: 5000000, // 5MB
      },
      (error: any, result: any) => {
        if (error) {
          setError('Upload failed. Please try again.');
          setIsUploading(false);
          return;
        }
        if (result.event === 'success') {
          const uploadedUrl = result.info.secure_url;
          setPreviewUrl(uploadedUrl);
          setIsUploading(false);
          // Auto-save the image
          handleSave(uploadedUrl);
        }
      }
    );

    setIsUploading(true);
    setError(null);
    widget.open();
  };

  const handleSave = async (urlToSave?: string) => {
    const url = urlToSave || previewUrl;
    if (!url.trim()) {
      setError('Please upload or enter an image URL');
      return;
    }

    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const { updateClubImage } = await import('../lib/firestoreService');
      const result = await updateClubImage(clubId, url);

      if (result.success) {
        onImageUpdated(url);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Failed to update image');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update image');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-32 h-32 mx-auto">
        <img
          src={previewUrl || currentImage || '/club-default.jpg'}
          alt="Club profile"
          className="w-full h-full object-cover rounded-lg border-2 border-slate-300 dark:border-slate-600"
          onError={(e) => { (e.target as HTMLImageElement).src = '/club-default.jpg'; }}
        />
        {(isUploading || isSaving) && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400 text-center">Image updated!</p>
      )}

      <button
        onClick={openUploadWidget}
        disabled={isUploading || isSaving}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Upload from Device'}
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Supports JPG, PNG, GIF, WebP (max 5MB)
      </p>
    </div>
  );
}

interface ClubSecretaryDashboardProps {
  onNavigate: (page: Page) => void;
  onNavigateToPost: (postId: string) => void;
  user?: User | null;
}

export default function ClubSecretaryDashboard({ onNavigate, onNavigateToPost, user }: ClubSecretaryDashboardProps) {
  const [club, setClub] = useState<FirestoreClub | null>(null);
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Image Modal State
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openImageModal = (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    setModalImage(imageUrl);
    setIsModalOpen(true);
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'posts' | 'notifications' | 'events'>('overview');
  const { navigateToManagement } = useNavigation();
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isReadOnly = user?.role === 'treasurer';

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'announcement' as 'event' | 'announcement',
    date: new Date().toISOString().split('T')[0],
    startHour: '',
    startMinute: '',
    startPeriod: 'AM' as 'AM' | 'PM',
    endHour: '',
    endMinute: '',
    endPeriod: 'PM' as 'AM' | 'PM',
    location: '',
    locationType: 'campus' as 'campus' | 'external',
    locationUrl: '',
    registrationStart: '',
    registrationStartTime: '',
    registrationEnd: '',
    registrationEndTime: '',
    coverImage: '',
    registrationLink: '',
    responseSpreadsheetUrl: '',
    eventWhatsappLink: '',
    relatedEventId: '',
    attachments: [] as Attachment[]
  });

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);

  // Collision warning state
  const [showCollisionWarning, setShowCollisionWarning] = useState(false);
  const [collisionEvents, setCollisionEvents] = useState<EventCollision[]>([]);

  // Location Picker Modal state
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Edit Registration Link state
  const [editingRegistrationLink, setEditingRegistrationLink] = useState<{ postId: string; currentLink: string } | null>(null);
  const [newRegistrationLink, setNewRegistrationLink] = useState('');

  // WhatsApp Link state
  const [whatsappLink, setWhatsappLink] = useState('');
  const [isEditingWhatsapp, setIsEditingWhatsapp] = useState(false);
  const [whatsappSaving, setWhatsappSaving] = useState(false);

  // Edit Event WhatsApp Link state
  const [editingEventWhatsapp, setEditingEventWhatsapp] = useState<{ postId: string; currentLink: string } | null>(null);
  const [newEventWhatsappLink, setNewEventWhatsappLink] = useState('');

  // Instagram Link state
  const [instagramLink, setInstagramLink] = useState('');
  const [isEditingInstagram, setIsEditingInstagram] = useState(false);
  const [instagramSaving, setInstagramSaving] = useState(false);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedContent, setAiGeneratedContent] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateCaption = async () => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setFormMessage({ type: 'error', text: 'Gemini API Key is missing in .env' });
      return;
    }

    setIsGeneratingAi(true);
    setAiGeneratedContent('');

    try {
      let promptText = `Write a creative and engaging caption for a club post.
      context:
      Title: ${newPost.title}
      Type: ${newPost.type}
      Date: ${newPost.date}
      User Instructions: ${aiPrompt}`;

      if (newPost.type === 'event') {
        promptText += `\nTime: ${newPost.startHour}:${newPost.startMinute} ${newPost.startPeriod}`;
        promptText += `\nLocation: ${newPost.location}`;
      }

      // Dynamic import
      const { getGeminiChatCompletion, generateImageCaption } = await import('../lib/geminiService');

      let text = '';

      if (newPost.coverImage) {
        // Fetch image and convert to base64
        try {
          const response = await fetch(newPost.coverImage);
          const blob = await response.blob();
          const base64Image = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.split(',')[1]);
            };
          });

          text = await generateImageCaption(base64Image, promptText);
        } catch (imgError) {
          console.error("Error processing image for AI:", imgError);
          // Fallback to text only
          // @ts-ignore
          text = await getGeminiChatCompletion([{ role: "user", content: promptText }]);
        }
      } else {
        // @ts-ignore
        text = await getGeminiChatCompletion([{ role: "user", content: promptText }]);
      }

      setAiGeneratedContent(text);
    } catch (error: any) {
      console.error("AI Generation Error Full:", error);
      let errorMessage = 'Failed to generate content.';

      if (error.message?.includes('API key')) {
        errorMessage = 'Invalid or missing API Key.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Daily or minute quota exceeded on Gemini.';
      } else {
        // Show actual error for debugging
        errorMessage = `Error: ${error.message}`;
      }

      setFormMessage({ type: 'error', text: `${errorMessage}` });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const useAiCaption = () => {
    setNewPost({ ...newPost, content: aiGeneratedContent });
    setAiGeneratedContent('');
    setAiPrompt('');
  };

  // Ref to prevent duplicate member additions in React Strict Mode
  const secretaryAddedRef = useRef(false);

  // Fetch club data from Firestore
  useEffect(() => {
    const fetchClubData = async () => {
      if (!user?.clubId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch club document
        const clubRef = doc(db, 'clubs', user.clubId);
        const clubDoc = await getDoc(clubRef);

        if (clubDoc.exists()) {
          const clubData = {
            id: clubDoc.id,
            ...clubDoc.data(),
            createdAt: clubDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: clubDoc.data().updatedAt?.toDate() || new Date(),
          } as FirestoreClub;
          setClub(clubData);
          setWhatsappLink(clubData.whatsappLink || '');
          setInstagramLink(clubData.instagramLink || '');

          // Check if secretary is already a member, if not add them (only once)
          const { getClubMembers, addClubMember, syncClubMemberCount } = await import('../lib/firestoreService');
          const members = await getClubMembers(user.clubId);
          const secretaryExists = members.some(m => m.email === user.email);

          if (!secretaryExists && user.email && user.name && !secretaryAddedRef.current) {
            secretaryAddedRef.current = true; // Mark as added to prevent duplicate
            await addClubMember(user.clubId, {
              name: user.name,
              email: user.email,
              role: 'secretary',
            });
          }

          // Always sync member count with actual subcollection count
          const actualCount = await syncClubMemberCount(user.clubId);

          // Refetch club data to get updated member count
          const updatedClubDoc = await getDoc(clubRef);
          if (updatedClubDoc.exists()) {
            setClub({
              id: updatedClubDoc.id,
              ...updatedClubDoc.data(),
              members: actualCount, // Use the synced count
              createdAt: updatedClubDoc.data().createdAt?.toDate() || new Date(),
              updatedAt: updatedClubDoc.data().updatedAt?.toDate() || new Date(),
            } as FirestoreClub);
          }
        }

        // Fetch posts for this club
        const allPosts = await getPosts();
        const clubPosts = allPosts.filter(p => p.clubId === user.clubId);
        setPosts(clubPosts);
      } catch (error) {
        console.error('Error fetching club data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubData();
  }, [user?.clubId]);

  const handleCreatePost = async (forceCreate: boolean = false) => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      setFormMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    if (!club || !user) return;

    // Build time string from 12-hour format
    let timeString: string | undefined;
    if (newPost.startHour && newPost.startMinute) {
      timeString = `${newPost.startHour}:${newPost.startMinute} ${newPost.startPeriod}`;
      if (newPost.endHour && newPost.endMinute) {
        timeString += ` - ${newPost.endHour}:${newPost.endMinute} ${newPost.endPeriod}`;
      }
    }

    // Check for time collision if it's an event with a start time (unless forceCreate is true)
    if (!forceCreate && newPost.type === 'event' && newPost.startHour) {
      // Convert to 24h for collision check
      let startHour24 = parseInt(newPost.startHour);
      if (newPost.startPeriod === 'PM' && startHour24 !== 12) startHour24 += 12;
      if (newPost.startPeriod === 'AM' && startHour24 === 12) startHour24 = 0;
      const startTime24 = `${startHour24.toString().padStart(2, '0')}:${newPost.startMinute}`;

      const collisions = await checkEventTimeCollision(newPost.date, startTime24);
      if (collisions.length > 0) {
        setCollisionEvents(collisions);
        setShowCollisionWarning(true);
        return; // Stop here, wait for user to confirm or cancel
      }
    }

    const postId = await createPost({
      title: newPost.title,
      content: newPost.content,
      type: newPost.type,
      date: newPost.date,
      ...(timeString ? { time: timeString } : {}),
      ...(newPost.location ? { location: newPost.location } : {}),
      locationType: newPost.locationType,
      ...(newPost.locationUrl ? { locationUrl: newPost.locationUrl } : {}),
      ...(newPost.coverImage ? { coverImage: newPost.coverImage } : {}),
      ...(newPost.registrationStart ? { registrationStart: newPost.registrationStart } : {}),
      ...(newPost.registrationStartTime ? { registrationStartTime: newPost.registrationStartTime } : {}),
      ...(newPost.registrationEnd ? { registrationEnd: newPost.registrationEnd } : {}),
      ...(newPost.registrationEndTime ? { registrationEndTime: newPost.registrationEndTime } : {}),
      clubId: club.id!,
      clubName: club.name,
      authorId: user.id,
      authorName: user.name,
      status: 'published',
      rsvps: 0,
      registrationLink: newPost.registrationLink,
      responseSpreadsheetUrl: newPost.responseSpreadsheetUrl,
      eventWhatsappLink: newPost.eventWhatsappLink,
      ...(newPost.relatedEventId ? {
        relatedEventId: newPost.relatedEventId,
        relatedEventTitle: posts.find(p => p.id === newPost.relatedEventId)?.title || ''
      } : {}),
      ...(newPost.attachments.length > 0 ? { attachments: newPost.attachments } : {})
    });

    if (postId) {
      setFormMessage({ type: 'success', text: 'Post created successfully!' });
      setNewPost({
        title: '',
        content: '',
        type: 'announcement',
        date: new Date().toISOString().split('T')[0],
        startHour: '',
        startMinute: '',
        startPeriod: 'AM',
        endHour: '',
        endMinute: '',
        endPeriod: 'PM',
        location: '',
        locationType: 'campus',
        locationUrl: '',
        registrationStart: '',
        registrationStartTime: '',
        registrationEnd: '',
        registrationEndTime: '',
        coverImage: '',
        registrationLink: '',
        responseSpreadsheetUrl: '',
        eventWhatsappLink: '',
        relatedEventId: '',
        attachments: []
      });

      // Refresh posts
      const allPosts = await getPosts();
      setPosts(allPosts.filter(p => p.clubId === user.clubId));

      // Create a notification for the new post
      await createNotification({
        title: newPost.type === 'event' ? `New Event from ${club.name}` : `New Announcement from ${club.name}`,
        message: `${newPost.title} - ${newPost.content.substring(0, 100)}${newPost.content.length > 100 ? '...' : ''}`,
        type: newPost.type, // 'event' or 'announcement'
        read: false,
        clubId: club.id!,
        relatedId: postId,
      });

      // Send email notifications to RSVPed attendees if this is an announcement linked to an event
      if (newPost.type === 'announcement' && newPost.relatedEventId && isEmailConfigured()) {
        try {
          const rsvps = await getEventRSVPs(newPost.relatedEventId);
          if (rsvps.length > 0) {
            const relatedEvent = posts.find(p => p.id === newPost.relatedEventId);
            const attendees = rsvps.map(rsvp => ({ name: rsvp.name, email: rsvp.email }));
            await sendEventUpdateEmails(
              attendees,
              relatedEvent?.title || 'Event',
              `New announcement: ${newPost.title}`,
              club.name
            );
            console.log(`Sent ${rsvps.length} email notifications for event announcement`);
          }
        } catch (emailError) {
          console.error('Failed to send event announcement emails:', emailError);
          // Don't fail the post creation if emails fail
        }
      }

      setTimeout(() => {
        setIsCreatePostModalOpen(false);
        setFormMessage(null);
        setShowCollisionWarning(false);
        setCollisionEvents([]);
      }, 1500);
    } else {
      setFormMessage({ type: 'error', text: 'Failed to create post' });
    }
  };

  // Handle collision warning confirmation
  const handleConfirmCollision = () => {
    setShowCollisionWarning(false);
    handleCreatePost(true); // Force create, bypassing collision check
  };

  const handleCancelCollision = () => {
    setShowCollisionWarning(false);
    setCollisionEvents([]);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const success = await deletePost(postId);
    if (success && user?.clubId) {
      const allPosts = await getPosts();
      setPosts(allPosts.filter(p => p.clubId === user.clubId));
    }
  };

  const handleEditPhotos = (post: FirestorePost) => {
    setEditingPostId(post.id!);
    setEditAttachments(post.eventPhotos || []);  // Use eventPhotos for post-event uploads
  };

  const handleSavePhotos = async () => {
    if (!editingPostId) return;

    const success = await updatePost(editingPostId, { eventPhotos: editAttachments });  // Save to eventPhotos
    if (success && user?.clubId) {
      const allPosts = await getPosts();
      setPosts(allPosts.filter(p => p.clubId === user.clubId));
      setEditingPostId(null);
      setEditAttachments([]);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Club not found</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Your account is not linked to any club. Please contact the administrator.
        </p>
        <button onClick={() => onNavigate('home')} className="text-blue-600 hover:underline">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${club.color} flex items-center justify-center text-2xl overflow-hidden`}>
            {club.image && club.image.startsWith('http') ? (
              <img src={club.image} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              club.icon
            )}
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white">
              {club.name} Management
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Welcome back, {user?.name}. Manage your club from here.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{club.members}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Members</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{posts.filter(p => p.type === 'event' && new Date(p.date) >= new Date()).length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Upcoming Events</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Edit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{posts.length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Published Posts</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <CheckCircle className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{posts.filter(p => p.type === 'event' && new Date(p.date) < new Date()).length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Past Events</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Settings },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'events', label: 'Events', icon: Calendar, treasurerOnly: true },
            { id: 'posts', label: 'Manage Posts', icon: Edit },
            { id: 'notifications', label: 'Send Notifications', icon: Bell }
          ].filter(tab => {
            // Treasurer sees: overview, members, events
            if (isReadOnly) {
              return tab.id === 'overview' || tab.id === 'members' || tab.treasurerOnly;
            }
            // Non-treasurer (secretary/president) sees all except treasurerOnly tabs
            return !tab.treasurerOnly;
          }).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Club Overview</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4">Club Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Name:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{club.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Category:</span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">{club.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Total Members:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{club.members}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Total Posts:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{posts.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4">Club Profile Picture</h4>
                  {isReadOnly ? (
                    <div className="relative w-32 h-32 mx-auto">
                      <img
                        src={club.image || '/club-default.jpg'}
                        alt="Club profile"
                        className="w-full h-full object-cover rounded-lg border-2 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                  ) : (
                    <ImageUploader clubId={club.id!} currentImage={club.image} onImageUpdated={(url) => setClub({ ...club, image: url })} />
                  )}
                </div>
              </div>

              {/* WhatsApp Community Link Section */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp Community
                  </h4>
                  {!isEditingWhatsapp && club.whatsappLink && (
                    <a
                      href={club.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                    >
                      Open Link
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>

                {isEditingWhatsapp ? (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-white"
                      placeholder="https://chat.whatsapp.com/... or https://whatsapp.com/channel/..."
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Paste your WhatsApp group or community invite link here.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditingWhatsapp(false);
                          setWhatsappLink(club.whatsappLink || '');
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!club.id) return;
                          setWhatsappSaving(true);
                          try {
                            const { updateClub } = await import('../lib/firestoreService');
                            await updateClub(club.id, { whatsappLink });
                            setClub({ ...club, whatsappLink });
                            setIsEditingWhatsapp(false);
                          } catch (error) {
                            console.error('Error saving WhatsApp link:', error);
                          } finally {
                            setWhatsappSaving(false);
                          }
                        }}
                        disabled={whatsappSaving}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {whatsappSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          'Save Link'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {club.whatsappLink ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 truncate">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm truncate">{club.whatsappLink}</span>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => setIsEditingWhatsapp(true)}
                            className="text-sm text-green-600 dark:text-green-400 hover:underline flex-shrink-0 ml-2"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ) : (
                      !isReadOnly && (
                        <button
                          onClick={() => setIsEditingWhatsapp(true)}
                          className="w-full px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-green-500 hover:text-green-600 dark:hover:border-green-500 dark:hover:text-green-400 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Add WhatsApp Community Link
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Instagram Link Section */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    Instagram Page
                  </h4>
                  {!isEditingInstagram && club.instagramLink && (
                    <a
                      href={club.instagramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
                    >
                      Open Link
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>

                {isEditingInstagram ? (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={instagramLink}
                      onChange={(e) => setInstagramLink(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                      placeholder="https://instagram.com/..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditingInstagram(false);
                          setInstagramLink(club.instagramLink || '');
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!club.id) return;
                          setInstagramSaving(true);
                          try {
                            const { updateClub } = await import('../lib/firestoreService');
                            await updateClub(club.id, { instagramLink });
                            setClub({ ...club, instagramLink });
                            setIsEditingInstagram(false);
                          } catch (error) {
                            console.error('Error saving Instagram link:', error);
                          } finally {
                            setInstagramSaving(false);
                          }
                        }}
                        disabled={instagramSaving}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {instagramSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          'Save Link'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {club.instagramLink ? (
                      <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <div className="flex items-center gap-2 text-pink-700 dark:text-pink-400 truncate">
                          <Instagram className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{club.instagramLink}</span>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => setIsEditingInstagram(true)}
                            className="p-1 hover:bg-pink-200 dark:hover:bg-pink-800 rounded-full transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                        <Instagram className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                          Add an Instagram page link
                        </p>
                        {!isReadOnly && (
                          <button
                            onClick={() => setIsEditingInstagram(true)}
                            className="text-sm font-semibold text-pink-600 dark:text-pink-400 hover:underline"
                          >
                            Add Link
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 mt-6">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4">Upcoming Events</h4>
                {posts.filter(p => p.type === 'event' && new Date(p.date) >= new Date()).length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400">No upcoming events. Create your first event!</p>
                ) : (
                  <div className="space-y-3">
                    {posts
                      .filter(p => p.type === 'event' && new Date(p.date) >= new Date())
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 3)
                      .map((post) => (
                        <div key={post.id} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1">{post.title}</p>
                          <span className="text-xs text-slate-400">{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && club && (
            <MemberManager clubId={club.id!} clubName={club.name} isReadOnly={isReadOnly} />
          )}

          {/* Events Tab - For Treasurer */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Events</h3>

              {posts.filter(p => p.type === 'event').length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No events yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts
                    .filter(p => p.type === 'event')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((post) => {
                      const isPast = new Date(post.date) < new Date();
                      return (
                        <div
                          key={post.id}
                          className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isPast
                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  }`}>
                                  {isPast ? 'Past Event' : 'Upcoming'}
                                </span>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {new Date(post.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                {post.time && (
                                  <span className="text-sm text-slate-500 dark:text-slate-400">
                                    • {post.time}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">
                                {post.title}
                              </h4>
                              {post.location && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-2">
                                  📍 {post.location}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                {post.rsvps !== undefined && post.rsvps > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {post.rsvps} RSVPs
                                  </span>
                                )}
                                {(post as any).eventBudget && (post as any).eventBudget.length > 0 && (
                                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    💰 Budget tracked
                                  </span>
                                )}
                                {(post as any).eventTasks && (post as any).eventTasks.length > 0 && (
                                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                    ✓ {(post as any).eventTasks.filter((t: any) => t.status === 'completed').length}/{(post as any).eventTasks.length} tasks
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => post.id && navigateToManagement(post.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2 font-medium"
                            >
                              <Settings2 className="w-4 h-4" />
                              Manage
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}


          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Posts</h3>
                <button
                  onClick={() => setIsCreatePostModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Post
                </button>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <Edit className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No posts yet. Create your first post!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => post.id && onNavigateToPost(post.id)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${post.type === 'event'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                              }`}>
                              {post.type}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{post.date}</span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{post.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{post.content}</p>
                          {post.rsvps && post.rsvps > 0 && (
                            <p className="text-sm text-green-600 dark:text-green-400">{post.rsvps} RSVPs</p>
                          )}
                          {post.attachments && post.attachments.length > 0 && (
                            <div className="mt-3">
                              <AttachmentGallery attachments={post.attachments} />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-col">
                          {post.type === 'event' && new Date(post.date) < new Date() && (
                            <button
                              onClick={() => handleEditPhotos(post)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                              title="Add Event Photos"
                            >
                              <Image className="w-4 h-4" />
                              Add Photos ({post.eventPhotos?.length || 0})
                            </button>
                          )}
                          {post.type === 'event' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRegistrationLink({ postId: post.id!, currentLink: post.registrationLink || '' });
                                setNewRegistrationLink(post.registrationLink || '');
                              }}
                              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${post.registrationLink
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                                }`}
                              title={post.registrationLink ? 'Edit Registration Link' : 'Add Registration Link'}
                            >
                              <Link className="w-4 h-4" />
                              {post.registrationLink ? 'Edit Link' : 'Add Link'}
                            </button>
                          )}
                          {post.type === 'event' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEventWhatsapp({ postId: post.id!, currentLink: post.eventWhatsappLink || '' });
                                setNewEventWhatsappLink(post.eventWhatsappLink || '');
                              }}
                              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${post.eventWhatsappLink
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                                }`}
                              title={post.eventWhatsappLink ? 'Edit WhatsApp Group' : 'Add WhatsApp Group'}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              {post.eventWhatsappLink ? 'Edit Group' : 'Add Group'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePost(post.id!)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
          }

          {/* Notifications Tab */}
          {
            activeTab === 'notifications' && (
              <NotificationSender club={club} />
            )
          }
        </div >
      </div >

      {/* Create Post Modal */}
      {
        isCreatePostModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create New Post</h3>
                <button
                  onClick={() => { setIsCreatePostModalOpen(false); setFormMessage(null); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {formMessage && (
                <div className={`p-3 rounded-lg mb-4 ${formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {formMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Post title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Content
                    </label>
                    <textarea
                      rows={4}
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Post content"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Type
                    </label>
                    <select
                      value={newPost.type}
                      onChange={(e) => setNewPost({ ...newPost, type: e.target.value as 'event' | 'announcement' })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {newPost.type === 'event' ? 'Event Date' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={newPost.date}
                      onChange={(e) => setNewPost({ ...newPost, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Related Event - Only for Announcements */}
                  {newPost.type === 'announcement' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Related to Event (Optional)
                      </label>
                      <select
                        value={newPost.relatedEventId}
                        onChange={(e) => {
                          setNewPost({
                            ...newPost,
                            relatedEventId: e.target.value
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No related event</option>
                        {posts
                          .filter(p => p.type === 'event' && new Date(p.date) >= new Date())
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(event => (
                            <option key={event.id} value={event.id}>
                              {event.title} ({new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                            </option>
                          ))
                        }
                      </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Link this announcement to an upcoming event
                      </p>
                    </div>
                  )}

                  {/* Registration Period - Only for Events */}
                  {newPost.type === 'event' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
                        📅 Registration Period
                      </label>

                      {/* Registration Opens */}
                      <div className="mb-4">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">Registration Opens</span>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={newPost.registrationStart}
                            onChange={(e) => setNewPost({ ...newPost, registrationStart: e.target.value })}
                            className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="time"
                            value={newPost.registrationStartTime}
                            onChange={(e) => setNewPost({ ...newPost, registrationStartTime: e.target.value })}
                            className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Registration Closes */}
                      <div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">Registration Closes</span>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={newPost.registrationEnd}
                            onChange={(e) => setNewPost({ ...newPost, registrationEnd: e.target.value })}
                            className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="time"
                            value={newPost.registrationEndTime}
                            onChange={(e) => setNewPost({ ...newPost, registrationEndTime: e.target.value })}
                            className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                        Set when registration opens and closes for this event
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Time (Optional)
                    </label>

                    {/* Start Time Row */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400 w-12">From:</span>
                      <select
                        value={newPost.startHour}
                        onChange={(e) => setNewPost({ ...newPost, startHour: e.target.value })}
                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">--</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-slate-500">:</span>
                      <select
                        value={newPost.startMinute}
                        onChange={(e) => setNewPost({ ...newPost, startMinute: e.target.value })}
                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">--</option>
                        <option value="00">00</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                      <select
                        value={newPost.startPeriod}
                        onChange={(e) => setNewPost({ ...newPost, startPeriod: e.target.value as 'AM' | 'PM' })}
                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>

                    {/* End Time Row */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400 w-12">To:</span>
                      <select
                        value={newPost.endHour}
                        onChange={(e) => setNewPost({ ...newPost, endHour: e.target.value })}
                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">--</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-slate-500">:</span>
                      <select
                        value={newPost.endMinute}
                        onChange={(e) => setNewPost({ ...newPost, endMinute: e.target.value })}
                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">--</option>
                        <option value="00">00</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                      <select
                        value={newPost.endPeriod}
                        onChange={(e) => setNewPost({ ...newPost, endPeriod: e.target.value as 'AM' | 'PM' })}
                        className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Leave empty if no specific time
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Location (Optional)
                    </label>

                    {/* Location Type Toggle */}
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="locationType"
                          checked={newPost.locationType === 'campus'}
                          onChange={() => setNewPost({ ...newPost, locationType: 'campus', locationUrl: '' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">In Campus</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="locationType"
                          checked={newPost.locationType === 'external'}
                          onChange={() => setNewPost({ ...newPost, locationType: 'external' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Outside Campus</span>
                      </label>
                    </div>

                    {/* In-Campus: Simple text input */}
                    {newPost.locationType === 'campus' && (
                      <input
                        type="text"
                        value={newPost.location}
                        onChange={(e) => setNewPost({ ...newPost, location: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Main Auditorium, Room 101, Campus Ground"
                      />
                    )}

                    {/* Outside Campus: Interactive Map Picker */}
                    {newPost.locationType === 'external' && (
                      <div className="space-y-3">
                        {/* Location Search Input */}
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={newPost.location}
                            onChange={(e) => {
                              const location = e.target.value;
                              setNewPost({
                                ...newPost,
                                location,
                                // Auto-generate Google Maps URL from location name
                                locationUrl: location ? `https://www.google.com/maps/search/${encodeURIComponent(location)}` : ''
                              });
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search location (e.g., Central Park, NYC)"
                          />
                        </div>

                        {/* Interactive Map */}
                        <div className="rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600">
                          {/* Map Header */}
                          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                              </svg>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {newPost.location ? `Selected: ${newPost.location}` : 'Click on map to select location'}
                              </span>
                            </div>
                            {newPost.location && (
                              <button
                                type="button"
                                onClick={() => {
                                  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(newPost.location)}`;
                                  window.open(searchUrl, '_blank');
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                Open in Google Maps
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Embedded Map - Clickable */}
                          <div
                            className="relative cursor-pointer group"
                            onClick={() => setShowLocationPicker(true)}
                          >
                            <iframe
                              src={`https://maps.google.com/maps?q=${encodeURIComponent(newPost.location || 'India')}&z=12&output=embed`}
                              className="w-full h-64 pointer-events-none"
                              style={{ border: 0 }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                            {/* Overlay with click prompt */}
                            <div className="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                                <span className="font-medium">Click to search & select location</span>
                              </div>
                            </div>
                          </div>

                          {/* Map Footer with instructions */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              💡 <strong>Tip:</strong> Click on the map to open the location search window. You can search for places and confirm the exact location to add to your event.
                            </p>
                          </div>
                        </div>

                        {/* Optional: Paste custom Google Maps URL */}
                        <details className="group">
                          <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                            ⚙️ Advanced: Paste a custom Google Maps link
                          </summary>
                          <div className="mt-2">
                            <input
                              type="url"
                              value={newPost.locationUrl}
                              onChange={(e) => setNewPost({ ...newPost, locationUrl: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Paste custom Google Maps URL (optional)"
                            />
                          </div>
                        </details>

                        {/* Selected Location Confirmation */}
                        {newPost.location && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                              Location selected: {newPost.location}
                            </span>
                          </div>
                        )}
                      </div>


                    )}


                  </div>

                  {/* Registration Link - For all Events */}
                  {newPost.type === 'event' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Registration Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={newPost.registrationLink}
                        onChange={(e) => setNewPost({ ...newPost, registrationLink: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        placeholder="https://forms.gle/..."
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Direct link to registration form or external event page.
                        </p>
                        <a
                          href="https://docs.google.com/forms/d/19TusTlc1nhbdLPidDZ0goDn4tRqDZOs2ZaDozTlz9Wc/copy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Google Form
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Response Spreadsheet URL - For all Events */}
                  {newPost.type === 'event' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Response Spreadsheet URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={newPost.responseSpreadsheetUrl}
                        onChange={(e) => setNewPost({ ...newPost, responseSpreadsheetUrl: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Paste the Google Sheets URL that collects your form responses for quick access.
                      </p>
                    </div>
                  )}

                  {/* Event WhatsApp Group Link - For all Events */}
                  {newPost.type === 'event' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Event WhatsApp Group (Optional)
                      </label>
                      <input
                        type="url"
                        value={newPost.eventWhatsappLink}
                        onChange={(e) => setNewPost({ ...newPost, eventWhatsappLink: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-white"
                        placeholder="https://chat.whatsapp.com/..."
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        WhatsApp group link for event participants. You can add this later too.
                      </p>
                    </div>
                  )}

                  {/* Cover Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cover Image (Required for new design)
                    </label>
                    <div className="mb-4">
                      {newPost.coverImage && (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3 border border-slate-200 dark:border-slate-700 group cursor-zoom-in"
                          onClick={(e) => openImageModal(e, newPost.coverImage)}>
                          <img
                            src={newPost.coverImage}
                            alt="Cover Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 pointer-events-none">
                            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm shadow-sm">Click to expand</span>
                          </div>

                          <button
                            onClick={() => setNewPost({ ...newPost, coverImage: '' })}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                            title="Remove cover image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <CloudinaryUpload
                        clubName={club.name}
                        existingAttachments={[]}
                        onUploadComplete={(attachments) => {
                          // We only take the first image if multiple selected or just the one
                          if (attachments.length > 0) {
                            setNewPost({ ...newPost, coverImage: attachments[0].url });
                          }
                        }}
                        maxFiles={1}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Upload a high-quality cover image for the home page card. Landscape orientation works best.
                      </p>
                    </div>
                  </div>

                  {/* File Upload (Description Images) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description Images (Optional)
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Add promotional images for your post. Event photos can be added later.
                    </p>
                    <CloudinaryUpload
                      clubName={club.name}
                      existingAttachments={newPost.attachments}
                      onUploadComplete={(attachments) => setNewPost({ ...newPost, attachments })}
                      maxFiles={10}
                    />
                  </div>
                </div>

                {/* AI Assistant Column */}
                <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white">AI Assistant</h4>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Instructions (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Make it funny, mention free food..."
                      />
                    </div>

                    <button
                      onClick={handleGenerateCaption}
                      disabled={isGeneratingAi || !newPost.title}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isGeneratingAi ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Caption
                        </>
                      )}
                    </button>

                    {aiGeneratedContent && (
                      <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Generated Preview
                        </label>
                        <div className="bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/50 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 max-h-60 overflow-y-auto">
                          {aiGeneratedContent}
                        </div>
                        <button
                          onClick={useAiCaption}
                          className="w-full mt-2 py-2 border border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg font-medium text-sm transition-all"
                        >
                          Use This Caption
                        </button>
                      </div>
                    )}

                    {!aiGeneratedContent && (
                      <div className="mt-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        <p>Enter a title and details, then click Generate to create a caption.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setIsCreatePostModalOpen(false); setFormMessage(null); }}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreatePost()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  Create Post
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Collision Warning Modal */}
      {
        showCollisionWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Time Collision Warning</h3>
              </div>

              <p className="text-slate-600 dark:text-slate-300 mb-4">
                There {collisionEvents.length === 1 ? 'is' : 'are'} already {collisionEvents.length} event{collisionEvents.length === 1 ? '' : 's'} scheduled around the same time:
              </p>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
                {collisionEvents.map((event, index) => (
                  <div key={index} className="flex flex-col mb-2 last:mb-0">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">{event.title}</span>
                    <span className="text-sm text-amber-600 dark:text-amber-400">{event.time} - {event.clubName}</span>
                  </div>
                ))}
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Do you still want to create this event?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelCollision}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirmCollision}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-all"
                >
                  Create Anyway
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Photos Modal */}
      {
        editingPostId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Event Photos</h3>
                <button
                  onClick={() => { setEditingPostId(null); setEditAttachments([]); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <CloudinaryUpload
                clubName={club.name}
                existingAttachments={editAttachments}
                onUploadComplete={(attachments) => setEditAttachments(attachments)}
                maxFiles={20}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setEditingPostId(null); setEditAttachments([]); }}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePhotos}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  Save Photos
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Registration Link Modal */}
      {
        editingRegistrationLink && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingRegistrationLink.currentLink ? 'Edit Registration Link' : 'Add Registration Link'}
                </h3>
                <button
                  onClick={() => { setEditingRegistrationLink(null); setNewRegistrationLink(''); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Registration Link
                  </label>
                  <input
                    type="url"
                    value={newRegistrationLink}
                    onChange={(e) => setNewRegistrationLink(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    placeholder="https://forms.gle/..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paste a link to your registration form.
                  </p>
                  <a
                    href="https://docs.google.com/forms/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Create Google Form
                  </a>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setEditingRegistrationLink(null); setNewRegistrationLink(''); }}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (editingRegistrationLink) {
                      const success = await updatePost(editingRegistrationLink.postId, { registrationLink: newRegistrationLink });
                      if (success) {
                        // Update local state
                        setPosts(posts.map(p =>
                          p.id === editingRegistrationLink.postId
                            ? { ...p, registrationLink: newRegistrationLink }
                            : p
                        ));
                        setEditingRegistrationLink(null);
                        setNewRegistrationLink('');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  Save Link
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Event WhatsApp Link Modal */}
      {
        editingEventWhatsapp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {editingEventWhatsapp.currentLink ? 'Edit WhatsApp Group' : 'Add WhatsApp Group'}
                </h3>
                <button
                  onClick={() => { setEditingEventWhatsapp(null); setNewEventWhatsappLink(''); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    WhatsApp Group Link
                  </label>
                  <input
                    type="url"
                    value={newEventWhatsappLink}
                    onChange={(e) => setNewEventWhatsappLink(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-white"
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Paste your WhatsApp group invite link for event participants.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setEditingEventWhatsapp(null); setNewEventWhatsappLink(''); }}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (editingEventWhatsapp) {
                      const success = await updatePost(editingEventWhatsapp.postId, { eventWhatsappLink: newEventWhatsappLink });
                      if (success) {
                        // Update local state
                        setPosts(posts.map(p =>
                          p.id === editingEventWhatsapp.postId
                            ? { ...p, eventWhatsappLink: newEventWhatsappLink }
                            : p
                        ));
                        setEditingEventWhatsapp(null);
                        setNewEventWhatsappLink('');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                >
                  Save Link
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        initialLocation={newPost.location}
        onLocationSelect={(location, locationUrl) => {
          setNewPost({ ...newPost, location, locationUrl });
          setShowLocationPicker(false);
        }}
      />
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={modalImage || ''}
      />
    </div>
  );
}
