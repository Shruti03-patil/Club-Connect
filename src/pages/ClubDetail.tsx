import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, MapPin, Clock, CheckCircle, Archive, Plus, Instagram } from 'lucide-react';
import { FirestoreClub, FirestorePost, Attachment } from '../types/auth';
import { getPosts } from '../lib/firestoreService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import RSVPModal from '../components/RSVPModal';
import ImageModal from '../components/ImageModal';

interface DisplayEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  status: 'past' | 'upcoming';
  description: string;
  attachments?: Attachment[];
  eventPhotos?: Attachment[];
}

interface ClubDetailProps {
  clubId: string;
  onBack: () => void;
  onNavigateToMember: (member: any) => void;
  onNavigateToPost: (postId: string) => void;
}
//...
export default function ClubDetail({ clubId, onBack, onNavigateToMember, onNavigateToPost }: ClubDetailProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [rsvpModal, setRsvpModal] = useState<{ isOpen: boolean; event: DisplayEvent | null }>({
    isOpen: false,
    event: null
  });
  const [club, setClub] = useState<FirestoreClub | null>(null);
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [members, setMembers] = useState<Array<{ id?: string; name: string; email: string; role: string; joinedAt: Date }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Image Modal State
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openImageModal = (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    setModalImage(imageUrl);
    setIsModalOpen(true);
  };


  // Fetch club and posts from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch club
        const clubRef = doc(db, 'clubs', clubId);
        const clubDoc = await getDoc(clubRef);

        if (clubDoc.exists()) {
          // Sync member count with actual subcollection count
          const { syncClubMemberCount } = await import('../lib/firestoreService');
          const actualCount = await syncClubMemberCount(clubId);

          setClub({
            id: clubDoc.id,
            ...clubDoc.data(),
            members: actualCount, // Use synced count
            createdAt: clubDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: clubDoc.data().updatedAt?.toDate() || new Date(),
          } as FirestoreClub);
        }

        // Fetch posts for this club
        const allPosts = await getPosts();
        const clubPosts = allPosts.filter(p => p.clubId === clubId);
        setPosts(clubPosts);

        // Fetch club members
        const { getClubMembers } = await import('../lib/firestoreService');
        const clubMembers = await getClubMembers(clubId);
        setMembers(clubMembers);
      } catch (error) {
        console.error('Error fetching club data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clubId]);

  // Convert posts to display events
  const getEventsFromPosts = (): DisplayEvent[] => {
    const now = new Date();
    return posts.map(post => {
      const postDate = new Date(post.date);
      const isPast = postDate < now;

      return {
        id: post.id || '',
        title: post.title,
        date: post.date,
        time: post.time || 'Time not specified',
        location: post.location || 'Location not specified',
        attendees: post.rsvps || 0,
        status: isPast ? 'past' as const : 'upcoming' as const,
        description: post.content,
        attachments: post.attachments,
        eventPhotos: post.eventPhotos
      };
    });
  };

  // Helper to parse time string (e.g., "2:00 PM - 5:00 PM") into minutes from midnight
  const parseTime = (timeStr: string): number => {
    try {
      // specific regex to match the first time "HH:MM AM/PM"
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;

      let [_, hours, minutes, period] = match;
      let h = parseInt(hours, 10);
      const m = parseInt(minutes, 10);

      if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (period.toUpperCase() === 'AM' && h === 12) h = 0;

      return h * 60 + m;
    } catch (e) {
      return 0;
    }
  };

  const events = getEventsFromPosts();

  // Get unique years from past events for the filter
  const pastYears = Array.from(new Set(
    events
      .filter(e => e.status === 'past')
      .map(e => new Date(e.date).getFullYear().toString())
  )).sort((a, b) => parseInt(b) - parseInt(a));

  const filteredEvents = events.filter(event => {
    if (event.status !== activeTab) return false;
    if (activeTab === 'past' && selectedYear !== 'All') {
      const eventYear = new Date(event.date).getFullYear().toString();
      return eventYear === selectedYear;
    }
    return true;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const timeA = parseTime(a.time);
    const timeB = parseTime(b.time);

    if (activeTab === 'upcoming') {
      // Ascending date, then ascending time
      if (dateA !== dateB) return dateA - dateB;
      return timeA - timeB;
    } else {
      // Descending date, then descending time
      if (dateA !== dateB) return dateB - dateA;
      return timeB - timeA;
    }
  });

  // Helper function to format role display
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'president': 'President',
      'vice-president': 'Vice President',
      'treasurer': 'Treasurer',
      'secretary': 'Secretary',
      'coordinator': 'Coordinator',
      'member': 'Member',
    };
    return roleMap[role] || role;
  };

  // Helper function to get avatar emoji based on role
  const getRoleAvatar = (role: string) => {
    const avatarMap: Record<string, string> = {
      'president': '👔',
      'vice-president': '🎖️',
      'treasurer': '💰',
      'secretary': '📝',
      'coordinator': '🎯',
      'member': '👤',
    };
    return avatarMap[role] || '👤';
  };

  const handleRSVP = (event: DisplayEvent) => {
    setRsvpModal({ isOpen: true, event });
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
      <div className="max-w-7xl mx-auto px-6 py-12">
        <p className="text-center text-xl text-slate-600 dark:text-slate-400">Club not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline block mx-auto">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      {/* Club Header */}
      <div className={`h-48 bg-gradient-to-r ${club.color} rounded-2xl relative mb-8 overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center">
              {club.image ? (
                <img
                  src={club.image}
                  alt={club.name}
                  className="w-full h-full object-contain p-2 bg-white rounded-xl"
                />
              ) : (
                <span className="text-5xl">{club.icon}</span>
              )}
            </div>
            <h1 className="text-3xl font-black">{club.name}</h1>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        {/* Left Side - 70% */}
        <div className="lg:col-span-5 space-y-8">
          {/* Club Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {club.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Members</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{club.members}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Posts</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{posts.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Category</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white capitalize">{club.category}</p>
                </div>
              </div>
            </div>

            {/* WhatsApp Community Link */}
            {club.whatsappLink && (
              <div className="mt-6">
                <a
                  href={club.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Join WhatsApp Community
                </a>
              </div>
            )}

            {/* Instagram Page Link */}
            {club.instagramLink && (
              <div className="mt-4">
                <a
                  href={club.instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  <Instagram className="w-6 h-6" />
                  Follow on Instagram
                </a>
              </div>
            )}
          </div>

          {/* Posts Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Posts & Events</h2>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('upcoming')}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'upcoming'
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setActiveTab('past')}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'past'
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      Past Events
                    </button>
                  </div>

                  {activeTab === 'past' && pastYears.length > 0 && (
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      <option value="All">All Years</option>
                      {pastYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 relative max-h-[800px] overflow-y-auto custom-scrollbar">
              {sortedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    No {activeTab} events {selectedYear !== 'All' ? `in ${selectedYear}` : ''}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-500">
                    {activeTab === 'upcoming'
                      ? 'Check back later for upcoming events!'
                      : 'Past events will appear here.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-0 relative">
                  {/* Vertical Timeline Line - hidden on very small screens if needed, but keeping for timeline effect */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />

                  {sortedEvents.map((event) => {
                    // Find the corresponding post for cover image
                    const post = posts.find(p => p.id === event.id);
                    const isUpcoming = activeTab === 'upcoming';

                    return (
                      <div key={event.id} className="relative pl-12 pb-8 last:pb-0">
                        {/* Timeline Dot */}
                        <div className={`absolute left-[11px] top-6 w-3 h-3 rounded-full border-2 ${isUpcoming
                          ? 'bg-white border-green-500 dark:border-green-400'
                          : 'bg-white border-slate-400 dark:border-slate-500'
                          } z-10 box-content`} />

                        <div
                          onClick={() => onNavigateToPost(event.id)}
                          className="group bg-slate-50 dark:bg-slate-700/50 rounded-xl overflow-hidden hover:shadow-lg transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
                        >
                          <div className="flex flex-col sm:flex-row sm:h-32">
                            {/* Left: Cover Image or Styled Icon */}
                            {post?.coverImage ? (
                              <div
                                className="sm:w-1/4 h-32 sm:h-full relative bg-slate-200 dark:bg-slate-700 flex-shrink-0 group/image overflow-hidden"
                                onClick={(e) => openImageModal(e, post.coverImage!)}
                              >
                                <img
                                  src={post.coverImage}
                                  alt={event.title}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover/image:scale-110 cursor-zoom-in"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100 duration-300 pointer-events-none">
                                  <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Click to expand</span>
                                </div>
                              </div>
                            ) : (
                              <div className="sm:w-1/4 h-32 sm:h-full flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0">
                                {/* Decorative floating circles */}
                                <div className="absolute top-2 right-2 w-10 h-10 bg-white/10 rounded-full blur-sm" />
                                <div className="absolute bottom-2 left-2 w-6 h-6 bg-white/10 rounded-full blur-sm" />

                                {/* Event type icon */}
                                <div className="relative z-10 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                  <Calendar className="w-5 h-5 text-white" />
                                </div>

                                {/* Event type label */}
                                <span className="relative z-10 text-xs font-bold text-white/90 uppercase tracking-wider">
                                  Event
                                </span>
                              </div>
                            )}

                            {/* Right: Details */}
                            <div className="sm:w-3/4 p-4 flex flex-col justify-center">
                              {/* Header with status */}
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                  {event.title}
                                </h3>
                                {isUpcoming ? (
                                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ml-2">
                                    Upcoming
                                  </span>
                                ) : (
                                  <span className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ml-2 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Completed
                                  </span>
                                )}
                              </div>

                              {/* Details row */}
                              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{event.date}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{event.time}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                  <span className="line-clamp-1">{event.location}</span>
                                </div>
                              </div>

                              {/* Bottom row: Attendees and photos */}
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>{event.attendees} attending</span>
                                </div>
                                {((event.attachments?.length || 0) + (event.eventPhotos?.length || 0)) > 0 && (
                                  <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                    📷 {(event.attachments?.length || 0) + (event.eventPhotos?.length || 0)} photos
                                  </span>
                                )}
                                {isUpcoming && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRSVP(event); }}
                                    className="ml-auto px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg text-xs font-semibold transition-all transform hover:scale-105 shadow flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    RSVP
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - 30% */}
        <div className="lg:col-span-2" id="tour-member-board">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                {club.image ? (
                  <img
                    src={club.image}
                    alt={club.name}
                    className="w-full h-full object-contain p-2 bg-white rounded-xl"
                  />
                ) : (
                  <span className="text-3xl">{club.icon}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {club.name} - Member Board
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Meet the dedicated members who make {club.name} thrive
            </p>

            {/* Member list */}
            <div className="space-y-4">
              {members.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No members yet
                </p>
              ) : (
                members.slice(0, 6).map((member, index) => (
                  <div key={member.id || index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-sm">
                      {getRoleAvatar(member.role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {getRoleDisplay(member.role)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => onNavigateToMember(club)}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              View Full Board
            </button>
          </div>
        </div>
      </div>

      {/* RSVP Modal */}
      {rsvpModal.event && (
        <RSVPModal
          isOpen={rsvpModal.isOpen}
          onClose={() => setRsvpModal({ isOpen: false, event: null })}
          event={rsvpModal.event}
          clubName={club.name}
        />
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
