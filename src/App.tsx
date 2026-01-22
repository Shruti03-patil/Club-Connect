import { DarkModeProvider } from './context/DarkModeContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { TourProvider } from './context/TourContext';
import Header from './components/Header';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ClubDetail from './pages/ClubDetail';
import MemberBoardDetail from './pages/MemberBoardDetail';
import Notifications from './pages/Notifications';
import UserProfile from './pages/UserProfile';
import PostDetail from './pages/PostDetail';
import NotificationDetail from './pages/NotificationDetail';
import Events from './pages/Events';
import Announcements from './pages/Announcements';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import StudentDashboard from './pages/StudentDashboard';
import EventManagement from './pages/EventManagement';
import AdminDashboard from './pages/AdminDashboard';
import ClubSecretaryDashboard from './pages/ClubSecretaryDashboard';
import SetupAdmin from './pages/SetupAdmin';
import StudentAIAssistant from './components/StudentAIAssistant';

function AppContent() {
  const {
    currentPage,
    previousPage,
    selectedClub,
    selectedMember,
    selectedEvent,
    selectedPost,
    selectedManagementEventId,
    navigateToPage,
    navigateToClub,
    navigateToMemberBoard,
    navigateToEvent,
    navigateToPost,
    navigateToManagement,
    navigateToNotification,
    handleLogout
  } = useNavigation();

  const { user, logout } = useAuth();

  const onLogoutClick = () => handleLogout(logout);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-200">
      {currentPage !== 'login' && currentPage !== 'signUp' && currentPage !== 'adminLogin' && currentPage !== 'setupAdmin' && currentPage !== 'eventManagement' && (
        <Header
          currentPage={currentPage}
          onNavigate={navigateToPage}
          onLogout={onLogoutClick}
          user={user}
        />
      )}

      {/* Main Pages */}
      {currentPage === 'home' && <Home onNavigate={navigateToPage} onNavigateToClub={navigateToClub} onNavigateToEvent={navigateToEvent} onNavigateToPost={navigateToPost} onNavigateToNotification={navigateToNotification} />}
      {currentPage === 'dashboard' && <Dashboard onNavigateToClub={navigateToClub} />}
      {currentPage === 'club' && selectedClub && (
        <ClubDetail clubId={selectedClub} onBack={() => navigateToPage('dashboard')} onNavigateToMember={navigateToMemberBoard} onNavigateToPost={navigateToPost} />
      )}
      {currentPage === 'memberBoard' && selectedMember && (
        <MemberBoardDetail club={selectedMember} onBack={() => navigateToPage('club')} />
      )}
      {currentPage === 'notifications' && (
        <Notifications onBack={() => navigateToPage('dashboard')} onNavigateToNotification={navigateToNotification} />
      )}
      {currentPage === 'userProfile' && (
        <UserProfile onBack={() => navigateToPage('dashboard')} />
      )}
      {currentPage === 'event' && selectedEvent && (
        <PostDetail postId={selectedEvent} onBack={() => navigateToPage(previousPage)} onNavigateToPost={navigateToPost} user={user} onManageEvent={navigateToManagement} />
      )}
      {currentPage === 'post' && selectedPost && (
        <PostDetail postId={selectedPost} onBack={() => navigateToPage(previousPage)} onNavigateToPost={navigateToPost} user={user} onManageEvent={navigateToManagement} />
      )}
      {currentPage === 'events' && (
        <Events onBack={() => navigateToPage('home')} onNavigateToPost={navigateToPost} user={user} onManageEvent={navigateToManagement} />
      )}
      {currentPage === 'announcements' && (
        <Announcements onBack={() => navigateToPage('home')} onNavigateToPost={navigateToPost} />
      )}


      {currentPage === 'notification' && selectedPost && (
        <NotificationDetail notification={selectedPost as any} onBack={() => navigateToPage('home')} onNavigateToPost={navigateToPost} />
      )}

      {currentPage === 'adminDashboard' && (
        <AdminDashboard />
      )}
      {currentPage === 'clubSecretaryDashboard' && (
        <ClubSecretaryDashboard onNavigate={navigateToPage} onNavigateToPost={navigateToPost} user={user} />
      )}

      {currentPage === 'studentDashboard' && (
        <StudentDashboard onNavigate={navigateToPage} onNavigateToPost={navigateToPost} />
      )}

      {currentPage === 'eventManagement' && selectedManagementEventId && (
        <EventManagement eventId={selectedManagementEventId} onBack={() => navigateToPage('home')} user={user} />
      )}

      {/* Login Modal for Club Secretary, President, Treasurer, and Admin */}
      {currentPage === 'login' && (
        <LoginPage onNavigate={navigateToPage} />
      )}

      {/* Sign Up Page for Students */}
      {currentPage === 'signUp' && (
        <SignUpPage onNavigate={navigateToPage} />
      )}

      {/* Setup Admin Page */}
      {currentPage === 'setupAdmin' && (
        <SetupAdmin onNavigate={navigateToPage} />
      )}

      {/* AI Assistant Widget - Global */}
      <StudentAIAssistant
        onNavigateToClub={navigateToClub}
        onNavigateToEvent={navigateToEvent}
      />
    </div>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <NavigationProvider>
          <TourProvider>
            <AppContent />
          </TourProvider>
        </NavigationProvider>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
