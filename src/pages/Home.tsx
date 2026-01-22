import { useState, useEffect } from 'react';
import { Calendar, Bell, Users, Search, Edit, MapPin, Clock, Shield, Megaphone, Info, Plus, ExternalLink } from 'lucide-react';
import { Page } from '../types/page';
import { FirestorePost, FirestoreClub, FirestoreNotification } from '../types/auth';
import { getPosts, getNotifications, getClubs } from '../lib/firestoreService';
import ClubCard from '../components/ClubCard';
import MiniCalendar from '../components/MiniCalendar';
import WeeklyEvents from '../components/WeeklyEvents';
import RSVPModal from '../components/RSVPModal';

interface HomeProps {
  onNavigate: (page: Page) => void;
  onNavigateToClub: (clubId: string) => void;
  onNavigateToEvent: (eventId: string) => void;
  onNavigateToPost: (postId: string) => void;
  onNavigateToNotification: (notification: FirestoreNotification) => void;
}
import ImageModal from '../components/ImageModal';

export default function Home({ onNavigate, onNavigateToClub, onNavigateToPost, onNavigateToNotification }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<FirestorePost[]>([]);
  const [clubs, setClubs] = useState<FirestoreClub[]>([]);
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<FirestorePost[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<FirestoreClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rsvpEvent, setRsvpEvent] = useState<FirestorePost | null>(null);

  // Image Modal State
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openImageModal = (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    setModalImage(imageUrl);
    setIsModalOpen(true);
  };


  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [postsData, clubsData, notificationsData] = await Promise.all([
          getPosts(),
          getClubs(),
          getNotifications()
        ]);

        // Sync member counts for all clubs
        const { syncClubMemberCount } = await import('../lib/firestoreService');
        const clubsWithSyncedCounts = await Promise.all(
          clubsData.map(async (club) => {
            if (club.id) {
              const actualCount = await syncClubMemberCount(club.id);
              return { ...club, members: actualCount };
            }
            return club;
          })
        );

        setPosts(postsData);
        setClubs(clubsWithSyncedCounts);
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSearch = () => {
    const lowerQuery = searchQuery.toLowerCase();
    const matchingClubs = clubs.filter(club =>
      club.name.toLowerCase().includes(lowerQuery) ||
      club.description.toLowerCase().includes(lowerQuery)
    );
    const matchingPosts = posts.filter(post =>
      post.title.toLowerCase().includes(lowerQuery) ||
      post.content.toLowerCase().includes(lowerQuery) ||
      post.type.toLowerCase().includes(lowerQuery)
    );

    setFilteredClubs(matchingClubs);
    setFilteredPosts(matchingPosts);
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'event': return 'from-blue-500 to-cyan-500';
      case 'announcement': return 'from-purple-500 to-pink-500';
      default: return 'from-amber-500 to-orange-500';
    }
  };

  // Filter to show only upcoming/incomplete events on home page
  const upcomingPosts = posts.filter(post => new Date(post.date) >= new Date());

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col min-h-[calc(100vh-80px)]">
      <div className="flex-grow">
        {/* Dashboard Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="/wce-logo.png"
              alt="Walchand College of Engineering Logo"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Walchand College of Engineering, Sangli
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Club & event management portal</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" id="tour-stats-grid">
          <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Clubs</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{clubs.length || '50'}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Upcoming Events</span>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{upcomingPosts.length}</div>
          </div>
        </div>

        {/* Quick Actions & Search */}
        {/* Quick Actions & Search */}
        <div className="mb-8" id="tour-quick-actions">
          {/* Navigation Buttons */}
          <div className="flex justify-center gap-6 mb-8">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex items-center gap-3 shadow-sm hover:shadow-md"
            >
              <Users className="w-5 h-5" />
              View All Clubs
            </button>
            <button
              onClick={() => onNavigate('notifications')}
              className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex items-center gap-3 shadow-sm hover:shadow-md"
            >
              <Bell className="w-5 h-5" />
              Notifications
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clubs, events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Search Results for Clubs */}
        {filteredClubs.length > 0 && (
          <div className="mb-16">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Search Results - Clubs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map((club) => (
                <ClubCard key={club.id} club={club as any} onClick={() => onNavigateToClub(club.id!)} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events and Notifications Section */}
        <div className="mb-16" id="tour-upcoming-events">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {filteredPosts.length > 0 ? 'Search Results' : 'Upcoming Events'}
                </h2>
                <button
                  onClick={() => onNavigate('events')}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View All Events
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (filteredPosts.length > 0 ? filteredPosts : upcomingPosts).length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <Edit className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No upcoming events. Check back soon!</p>
                </div>
              ) : (
                (filteredPosts.length > 0 ? filteredPosts : upcomingPosts).slice(0, 5).map((post) => {
                  const club = clubs.find(c => c.name === post.clubName); // Try to find club for icon
                  return (
                    <div
                      key={post.id}
                      onClick={() => post.id && onNavigateToPost(post.id)}
                      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {/* Card Header: Club Info & Date */}
                      <div className="bg-slate-50 dark:bg-slate-700/30 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold bg-gradient-to-br ${getEventColor(post.type)} text-white`}>
                            {club?.image ? (
                              <img src={club.image} alt={club.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Calendar className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{post.clubName}</h4>
                          </div>
                        </div>
                        {new Date(post.date) >= new Date() && (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Card Body: Split Layout */}
                      <div className="p-0 flex flex-col sm:flex-row">
                        {/* Left: Cover Image OR Styled Event Title (when no image) */}
                        {post.coverImage ? (
                          <div className="sm:w-2/5 h-48 sm:h-auto relative bg-slate-200 dark:bg-slate-700 group/image overflow-hidden"
                            onClick={(e) => openImageModal(e, post.coverImage!)}>
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
                          <div className={`sm:w-1/3 p-5 flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br ${getEventColor(post.type)}`}>
                            {/* Decorative floating circles */}
                            <div className="absolute top-2 right-2 w-16 h-16 bg-white/10 rounded-full blur-sm" />
                            <div className="absolute bottom-4 left-2 w-10 h-10 bg-white/10 rounded-full blur-sm" />
                            <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-white/15 rounded-full" />

                            {/* Event type icon */}
                            <div className="relative z-10 w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              {post.type === 'event' ? (
                                <Calendar className="w-7 h-7 text-white" />
                              ) : post.type === 'announcement' ? (
                                <Bell className="w-7 h-7 text-white" />
                              ) : (
                                <Info className="w-7 h-7 text-white" />
                              )}
                            </div>

                            {/* Event type label */}
                            <span className="relative z-10 text-xs font-bold text-white/90 uppercase tracking-widest">
                              {post.type}
                            </span>
                          </div>
                        )}

                        {/* Right: Details */}
                        <div className={`${post.coverImage ? 'sm:w-3/5' : 'sm:w-2/3'} p-6 flex flex-col justify-center`}>
                          {/* Always show title on the right now */}
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                            {post.title}
                          </h3>


                          {/* Related Event Badge for Announcements */}
                          {post.type === 'announcement' && post.relatedEventTitle && post.relatedEventId && (
                            <div className="mb-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToPost(post.relatedEventId!);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                              >
                                <Calendar className="w-3 h-3" />
                                View Related Event: {post.relatedEventTitle}
                              </button>
                            </div>
                          )}

                          <div className="space-y-3 mb-4">
                            {/* Date */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Date</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {new Date(post.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            {/* Time */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Time</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  {post.time || 'All Day'}
                                </p>
                              </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Venue</p>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                  {post.location || 'Campus'}
                                </p>
                              </div>
                            </div>

                            {/* Registration */}
                            {(post.registrationStart || post.registrationEnd) && (
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0">
                                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Registration</p>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {post.registrationStart && new Date(post.registrationStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    {post.registrationStartTime && ` ${post.registrationStartTime}`}
                                    {(post.registrationStart || post.registrationStartTime) && (post.registrationEnd || post.registrationEndTime) && ' - '}
                                    {post.registrationEnd && new Date(post.registrationEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    {post.registrationEndTime && ` ${post.registrationEndTime}`}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {post.type === 'event' && (
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRsvpEvent(post);
                                }}
                                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold text-sm transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                RSVP
                              </button>
                              {post.registrationLink && (
                                <a
                                  href={post.registrationLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm transition-all transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Register
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-1" id="tour-notifications-panel">
              <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h3>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No notifications yet.</p>
                ) : (
                  <div className="space-y-4">
                    {notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-xl transition-all hover:scale-105 cursor-pointer ${!notif.read
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-l-4 border-red-500'
                          : 'bg-slate-50 dark:bg-slate-700/50'
                          }`}
                        onClick={() => onNavigateToNotification(notif)}
                      >
                        <div className="flex gap-3 items-center">
                          {notif.type === 'system' ? (
                            <Shield className={`w-5 h-5 flex-shrink-0 ${!notif.read ? 'text-yellow-500' : 'text-slate-600 dark:text-slate-400'}`} />
                          ) : notif.type === 'announcement' ? (
                            <Megaphone className={`w-5 h-5 flex-shrink-0 ${!notif.read ? 'text-purple-600' : 'text-slate-600 dark:text-slate-400'}`} />
                          ) : notif.type === 'event' ? (
                            <Calendar className={`w-5 h-5 flex-shrink-0 ${!notif.read ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}`} />
                          ) : (
                            <Bell className={`w-5 h-5 flex-shrink-0 ${!notif.read ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'}`} />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                              {notif.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Campus Calendar & Weekly Events Section */}
        <div className="mb-16" id="tour-calendar-section">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Campus Calendar</h2>
          <div className="flex flex-col lg:flex-row gap-8 h-auto lg:h-[460px]">
            {/* Left: MiniCalendar - Fixed Content Width */}
            <div className="w-full lg:w-auto flex-none">
              <div className="w-full lg:w-[350px] h-full">
                <MiniCalendar
                  events={posts}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
              </div>
            </div>

            {/* Right: Weekly Events - Takes Remaining Space */}
            <div className="flex-1 h-full min-w-0">
              <WeeklyEvents
                events={posts}
                onNavigateToPost={onNavigateToPost}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Setup Admin Link (remove after initial setup) */}
      <div className="mt-auto text-center py-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onNavigate('setupAdmin')}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          ⚙️ Initial Setup (Create Super Admin)
        </button>
      </div>

      {/* RSVP Modal */}
      {rsvpEvent && (
        <RSVPModal
          isOpen={!!rsvpEvent}
          onClose={() => setRsvpEvent(null)}
          event={{
            id: rsvpEvent.id || '',
            title: rsvpEvent.title,
            date: rsvpEvent.date,
            time: rsvpEvent.time || 'Time not specified',
            location: rsvpEvent.location || 'Location not specified',
            attendees: rsvpEvent.rsvps || 0
          }}
          clubName={rsvpEvent.clubName}
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
