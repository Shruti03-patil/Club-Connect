import { useState, useEffect } from 'react';
import { Shield, Users, Calendar, Trash2, Edit, Search, TrendingUp, Bell, Plus, UserPlus, X, Send } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { FirestoreClub, FirestorePost, FirestoreNotification } from '../types/auth';
import {
  getClubs,
  createClub,
  deleteClub,
  createClubSecretary,
  createClubPresident,
  createClubTreasurer,
  getPosts,
  deletePost,
  getNotifications,
  createNotification,
  deleteNotification,
} from '../lib/firestoreService';



// Admin Image Upload Component with Cloudinary
function AdminImageUploader({ clubId, currentImage, onSuccess }: { clubId: string; currentImage?: string; onSuccess: (url: string) => void }) {
  const [previewUrl, setPreviewUrl] = useState(currentImage || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openUploadWidget = () => {
    if (typeof window === 'undefined' || !(window as any).cloudinary) {
      setError('Upload widget not available. Please refresh the page.');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError('Cloudinary configuration missing. Please check environment variables.');
      return;
    }

    const widget = (window as any).cloudinary.createUploadWidget(
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
      setError('Please upload an image');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const { updateClubImage } = await import('../lib/firestoreService');
      const result = await updateClubImage(clubId, url);

      if (result.success) {
        onSuccess(url);
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
      <div className="relative w-40 h-40 mx-auto">
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


const CLUB_CATEGORIES = ['technical', 'academic', 'cultural', 'sports'] as const;
const GRADIENT_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-purple-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-red-500 to-rose-500',
  'from-indigo-500 to-blue-500',
];


export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'clubs' | 'posts' | 'notifications'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [clubs, setClubs] = useState<FirestoreClub[]>([]);
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showCreateSecretaryModal, setShowCreateSecretaryModal] = useState(false);
  const [showCreatePresidentModal, setShowCreatePresidentModal] = useState(false);
  const [showCreateTreasurerModal, setShowCreateTreasurerModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<FirestoreClub | null>(null);

  // Form states
  const [newClub, setNewClub] = useState({
    name: '',
    description: '',
    category: 'technical' as const,
    icon: '🎯',
    image: '/club-default.jpg',
  });

  const [newSecretary, setNewSecretary] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Generic state for President/Treasurer creation
  const [newRoleUser, setNewRoleUser] = useState({
    email: '',
    password: '',
    name: '',
  });

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'system' as const,
  });

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load data on mount and tab change
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'clubs' || activeTab === 'overview') {
        const clubsData = await getClubs();
        setClubs(clubsData);
      }
      if (activeTab === 'posts' || activeTab === 'overview') {
        const postsData = await getPosts();
        setPosts(postsData);
      }
      if (activeTab === 'notifications' || activeTab === 'overview') {
        const notificationsData = await getNotifications();
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Club handlers
  const handleCreateClub = async () => {
    setFormMessage(null);
    if (!newClub.name || !newClub.description) {
      setFormMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const randomColor = GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)];
    const clubId = await createClub({
      ...newClub,
      color: randomColor,
      members: 0,
      upcomingEvents: 0,
    });

    if (clubId) {
      setFormMessage({ type: 'success', text: 'Club created successfully!' });
      setNewClub({ name: '', description: '', category: 'technical', icon: '🎯', image: '/club-default.jpg' });
      setTimeout(() => {
        setShowCreateClubModal(false);
        setFormMessage(null);
        loadData();
      }, 1500);
    } else {
      setFormMessage({ type: 'error', text: 'Failed to create club' });
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    if (!confirm('Are you sure you want to delete this club? This action cannot be undone.')) return;

    const success = await deleteClub(clubId);
    if (success) {
      loadData();
    } else {
      alert('Failed to delete club');
    }
  };

  // Secretary handlers
  const handleCreateSecretary = async () => {
    setFormMessage(null);
    if (!newSecretary.email || !newSecretary.password || !newSecretary.name || !selectedClub) {
      setFormMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (newSecretary.password.length < 6) {
      setFormMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    const result = await createClubSecretary(
      newSecretary.email,
      newSecretary.password,
      newSecretary.name,
      selectedClub.id!,
      selectedClub.name
    );

    if (result.success) {
      setFormMessage({ type: 'success', text: `Secretary created for ${selectedClub.name}!` });
      setNewSecretary({ email: '', password: '', name: '' });
      setTimeout(() => {
        setShowCreateSecretaryModal(false);
        setSelectedClub(null);
        setFormMessage(null);
        loadData();
      }, 1500);
    } else {
      setFormMessage({ type: 'error', text: result.error || 'Failed to create secretary' });
    }
  };

  // President handlers
  const handleCreatePresident = async () => {
    setFormMessage(null);
    if (!newRoleUser.email || !newRoleUser.password || !newRoleUser.name || !selectedClub) {
      setFormMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (newRoleUser.password.length < 6) {
      setFormMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    const result = await createClubPresident(
      newRoleUser.email,
      newRoleUser.password,
      newRoleUser.name,
      selectedClub.id!,
      selectedClub.name
    );

    if (result.success) {
      setFormMessage({ type: 'success', text: `President created for ${selectedClub.name}!` });
      setNewRoleUser({ email: '', password: '', name: '' });
      setTimeout(() => {
        setShowCreatePresidentModal(false);
        setSelectedClub(null);
        setFormMessage(null);
        loadData();
      }, 1500);
    } else {
      setFormMessage({ type: 'error', text: result.error || 'Failed to create president' });
    }
  };

  // Treasurer handlers
  const handleCreateTreasurer = async () => {
    setFormMessage(null);
    if (!newRoleUser.email || !newRoleUser.password || !newRoleUser.name || !selectedClub) {
      setFormMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (newRoleUser.password.length < 6) {
      setFormMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    const result = await createClubTreasurer(
      newRoleUser.email,
      newRoleUser.password,
      newRoleUser.name,
      selectedClub.id!,
      selectedClub.name
    );

    if (result.success) {
      setFormMessage({ type: 'success', text: `Treasurer created for ${selectedClub.name}!` });
      setNewRoleUser({ email: '', password: '', name: '' });
      setTimeout(() => {
        setShowCreateTreasurerModal(false);
        setSelectedClub(null);
        setFormMessage(null);
        loadData();
      }, 1500);
    } else {
      setFormMessage({ type: 'error', text: result.error || 'Failed to create treasurer' });
    }
  };

  // Post handlers
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const success = await deletePost(postId);
    if (success) {
      loadData();
    } else {
      alert('Failed to delete post');
    }
  };

  // Notification handlers
  const handleCreateNotification = async () => {
    setFormMessage(null);
    if (!newNotification.title || !newNotification.message) {
      setFormMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    const notificationId = await createNotification({
      ...newNotification,
      read: false,
    });

    if (notificationId) {
      setFormMessage({ type: 'success', text: 'Notification sent!' });
      setNewNotification({ title: '', message: '', type: 'system' });
      setTimeout(() => {
        setShowNotificationModal(false);
        setFormMessage(null);
        loadData();
      }, 1500);
    } else {
      setFormMessage({ type: 'error', text: 'Failed to send notification' });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const success = await deleteNotification(notificationId);
    if (success) {
      loadData();
    }
  };

  const openSecretaryModal = (club: FirestoreClub) => {
    setSelectedClub(club);
    setNewSecretary({ email: '', password: '', name: '' }); // Reset specific secretary state if any, though we use newSecretary
    setShowCreateSecretaryModal(true);
  };

  const openPresidentModal = (club: FirestoreClub) => {
    setSelectedClub(club);
    setNewRoleUser({ email: '', password: '', name: '' });
    setShowCreatePresidentModal(true);
  };

  const openTreasurerModal = (club: FirestoreClub) => {
    setSelectedClub(club);
    setNewRoleUser({ email: '', password: '', name: '' });
    setShowCreateTreasurerModal(true);
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white">
            Admin Dashboard
          </h1>
        </div>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Welcome back, {user?.name}. Manage your platform from here.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{clubs.length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Total Clubs</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{posts.filter(p => p.type === 'event').length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Active Events</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{posts.length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Total Posts</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Bell className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{notifications.filter(n => !n.read).length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Unread Notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'clubs', label: 'Manage Clubs', icon: Users },
            { id: 'posts', label: 'Manage Posts', icon: Edit },
            { id: 'notifications', label: 'Notifications', icon: Bell }
          ].map((tab) => {
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                  {posts.length === 0 && clubs.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400">No recent activity. Start by creating a club!</p>
                  ) : (
                    <div className="space-y-4">
                      {posts.slice(0, 5).map((post) => (
                        <div key={post.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className={`w-2 h-2 ${post.type === 'event' ? 'bg-blue-500' : 'bg-purple-500'} rounded-full`}></div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{post.title}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{post.clubName} • {post.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Clubs Tab */}
              {activeTab === 'clubs' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search clubs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => setShowCreateClubModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create Club
                    </button>
                  </div>

                  {filteredClubs.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">No clubs found. Create your first club!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredClubs.map((club) => (
                        <div key={club.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${club.color} flex items-center justify-center text-2xl overflow-hidden`}>
                              {club.image ? (
                                <img
                                  src={club.image}
                                  alt={club.name}
                                  className="w-full h-full object-contain p-2 bg-white"
                                />
                              ) : (
                                club.icon
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white">{club.name}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">{club.category}</p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{club.description}</p>
                          <div className="space-y-1 mb-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{club.members} members</p>
                            {club.secretaryEmail && (
                              <p className="text-sm text-green-600 dark:text-green-400">Sec: {club.secretaryEmail}</p>
                            )}
                            {club.presidentEmail && (
                              <p className="text-sm text-purple-600 dark:text-purple-400">Pres: {club.presidentEmail}</p>
                            )}
                            {club.treasurerEmail && (
                              <p className="text-sm text-amber-600 dark:text-amber-400">Treas: {club.treasurerEmail}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 mb-4">
                            {!club.secretaryEmail && (
                              <button
                                onClick={() => openSecretaryModal(club)}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2"
                              >
                                <UserPlus className="w-4 h-4" />
                                Add Secretary
                              </button>
                            )}
                            {!club.presidentEmail && (
                              <button
                                onClick={() => openPresidentModal(club)}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2"
                              >
                                <UserPlus className="w-4 h-4" />
                                Add President
                              </button>
                            )}
                            {!club.treasurerEmail && (
                              <button
                                onClick={() => openTreasurerModal(club)}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2"
                              >
                                <UserPlus className="w-4 h-4" />
                                Add Treasurer
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => { setSelectedClub(club); setShowImageUploadModal(true); }}
                              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Image
                            </button>
                            <button
                              onClick={() => handleDeleteClub(club.id!)}
                              className="bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Posts Tab */}
              {activeTab === 'posts' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Posts</h3>
                  </div>

                  {posts.length === 0 ? (
                    <div className="text-center py-12">
                      <Edit className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">No posts yet. Club secretaries can create posts.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <div key={post.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${post.type === 'event'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                                  }`}>
                                  {post.type}
                                </span>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {post.clubName} • {post.authorName}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 dark:text-white mb-2">{post.title}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{post.date}</p>
                            </div>
                            <div className="flex gap-2">
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
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">System Notifications</h3>
                    <button
                      onClick={() => setShowNotificationModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send Notification
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">No notifications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-xl border ${notification.read
                            ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{notification.title}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{notification.message}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-500">
                                {notification.createdAt instanceof Date
                                  ? notification.createdAt.toLocaleString()
                                  : new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteNotification(notification.id!)}
                              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Club Modal */}
      {showCreateClubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create New Club</h3>
              <button onClick={() => { setShowCreateClubModal(false); setFormMessage(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {formMessage && (
              <div className={`p-3 rounded-lg mb-4 ${formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Club Name *</label>
                <input
                  type="text"
                  value={newClub.name}
                  onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., GDSC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description *</label>
                <textarea
                  rows={3}
                  value={newClub.description}
                  onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the club"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                <select
                  value={newClub.category}
                  onChange={(e) => setNewClub({ ...newClub, category: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CLUB_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Icon (emoji)</label>
                <input
                  type="text"
                  value={newClub.icon}
                  onChange={(e) => setNewClub({ ...newClub, icon: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="🎯"
                />
              </div>

              <button
                onClick={handleCreateClub}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                Create Club
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Secretary Modal */}
      {showCreateSecretaryModal && selectedClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Secretary for {selectedClub.name}</h3>
              <button onClick={() => { setShowCreateSecretaryModal(false); setSelectedClub(null); setFormMessage(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {formMessage && (
              <div className={`p-3 rounded-lg mb-4 ${formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={newSecretary.name}
                  onChange={(e) => setNewSecretary({ ...newSecretary, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Secretary Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={newSecretary.email}
                  onChange={(e) => setNewSecretary({ ...newSecretary, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="secretary@club.wce.ac.in"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password *</label>
                <input
                  type="password"
                  value={newSecretary.password}
                  onChange={(e) => setNewSecretary({ ...newSecretary, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <button
                onClick={handleCreateSecretary}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Create Secretary Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create President Modal */}
      {showCreatePresidentModal && selectedClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create President for {selectedClub.name}</h3>
              <button onClick={() => { setShowCreatePresidentModal(false); setSelectedClub(null); setFormMessage(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {formMessage && (
              <div className={`p-3 rounded-lg mb-4 ${formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={newRoleUser.name}
                  onChange={(e) => setNewRoleUser({ ...newRoleUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="President Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={newRoleUser.email}
                  onChange={(e) => setNewRoleUser({ ...newRoleUser, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="president@club.wce.ac.in"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password *</label>
                <input
                  type="password"
                  value={newRoleUser.password}
                  onChange={(e) => setNewRoleUser({ ...newRoleUser, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <button
                onClick={handleCreatePresident}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Create President Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Treasurer Modal */}
      {showCreateTreasurerModal && selectedClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Treasurer for {selectedClub.name}</h3>
              <button onClick={() => { setShowCreateTreasurerModal(false); setSelectedClub(null); setFormMessage(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {formMessage && (
              <div className={`p-3 rounded-lg mb-4 ${formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={newRoleUser.name}
                  onChange={(e) => setNewRoleUser({ ...newRoleUser, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Treasurer Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={newRoleUser.email}
                  onChange={(e) => setNewRoleUser({ ...newRoleUser, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="treasurer@club.wce.ac.in"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password *</label>
                <input
                  type="password"
                  value={newRoleUser.password}
                  onChange={(e) => setNewRoleUser({ ...newRoleUser, password: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <button
                onClick={handleCreateTreasurer}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Create Treasurer Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Send Notification</h3>
              <button onClick={() => { setShowNotificationModal(false); setFormMessage(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {formMessage && (
              <div className={`p-3 rounded-lg mb-4 ${formMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notification title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message *</label>
                <textarea
                  rows={4}
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notification message..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
                <select
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="system">System</option>
                  <option value="announcement">Announcement</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <button
                onClick={handleCreateNotification}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageUploadModal && selectedClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Update Club Image
              </h3>
              <button
                onClick={() => { setShowImageUploadModal(false); setSelectedClub(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Change profile picture for <span className="font-semibold">{selectedClub.name}</span>
            </p>

            <AdminImageUploader
              clubId={selectedClub.id!}
              currentImage={selectedClub.image}
              onSuccess={(url) => {
                setClubs(prev => prev.map(c => c.id === selectedClub.id ? { ...c, image: url } : c));
                setShowImageUploadModal(false);
                setSelectedClub(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
