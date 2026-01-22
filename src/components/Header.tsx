import { LogOut, Bell, User, Sun, Moon, Shield, Settings, PlayCircle } from 'lucide-react';
import { Page } from '../types/page';
import { useDarkMode } from '../context/DarkModeContext';
import { User as UserType } from '../types/auth';
import { useState, useEffect } from 'react';
import { getNotifications } from '../lib/firestoreService';
import { useTour } from '../context/TourContext';

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  user?: UserType | null;
}

export default function Header({ currentPage, onNavigate, onLogout, user }: HeaderProps) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { startTour } = useTour();

  // Fetch unread notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const notifications = await getNotifications();
        const unread = notifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotificationCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')} id="tour-logo">
              <img
                src="/club-connect-logo.png"
                alt="Club Connect Logo"
                className="w-10 h-10 object-contain rounded-md"
              />
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Club-Connect
              </span>
            </div>

            <nav className="flex items-center gap-8">
              <button
                onClick={() => onNavigate('home')}
                className={`text-sm font-medium transition-colors ${currentPage === 'home'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
                  }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                id="tour-dashboard-nav"
                className={`text-sm font-medium transition-colors ${currentPage === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
                  }`}
              >
                All clubs
              </button>
              <button
                onClick={() => onNavigate('events')}
                id="tour-events-nav"
                className={`text-sm font-medium transition-colors ${currentPage === 'events'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
                  }`}
              >
                Events
              </button>
              <button
                onClick={() => onNavigate('announcements')}
                id="tour-announcements-nav"
                className={`text-sm font-medium transition-colors ${currentPage === 'announcements'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
                  }`}
              >
                Announcements
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={startTour}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold transition-all border border-indigo-600/20"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Start Tour
              </button>

              <button
                onClick={toggleDarkMode}
                id="tour-dark-mode-toggle"
                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-slate-600 dark:text-slate-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Notifications for all users */}
              <button
                onClick={() => onNavigate('notifications')}
                id="tour-notifications"
                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative border border-slate-200 dark:border-slate-700"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white font-medium px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {user ? (
                <>
                  {/* Admin-specific controls */}
                  {user.role === 'admin' && (
                    <button
                      onClick={() => onNavigate('adminDashboard')}
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all transform hover:scale-110 animate-bounceIn relative"
                      aria-label="Admin Dashboard"
                    >
                      <Shield className="w-5 h-5 text-amber-600" />
                    </button>
                  )}

                  {/* Club Secretary, President, and Treasurer controls */}
                  {['club-secretary', 'president', 'treasurer'].includes(user.role) && (
                    <button
                      onClick={() => onNavigate('clubSecretaryDashboard')}
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all transform hover:scale-110 animate-bounceIn relative"
                      aria-label="Club Management"
                    >
                      <Settings className="w-5 h-5 text-blue-600" />
                    </button>
                  )}

                  {/* Student Dashboard control */}
                  {user.role === 'user' && (
                    <button
                      onClick={() => onNavigate('studentDashboard')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all text-sm font-medium"
                      aria-label="My Dashboard"
                    >
                      <User className="w-4 h-4" />
                      My Dashboard
                    </button>
                  )}

                  {/* User Menu */}
                  <div className="relative" id="tour-profile">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user.name}</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2">
                        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role.replace('-', ' ')}</p>
                          {user.clubName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.clubName}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Navigate to appropriate dashboard based on role
                            if (['club-secretary', 'president', 'treasurer'].includes(user.role)) {
                              onNavigate('clubSecretaryDashboard');
                            } else if (user.role === 'admin') {
                              onNavigate('adminDashboard');
                            } else {
                              onNavigate('studentDashboard');
                            }
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          {['club-secretary', 'president', 'treasurer'].includes(user.role) && <Settings className="w-4 h-4" />}
                          {user.role === 'admin' && <Shield className="w-4 h-4" />}
                          {user.role === 'user' && <User className="w-4 h-4" />}
                          My Dashboard
                        </button>
                        <button
                          onClick={() => {
                            onNavigate('userProfile');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => {
                            onLogout();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Login Button for Club Secretaries and Admins */
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
