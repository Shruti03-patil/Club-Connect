import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, Users } from 'lucide-react';
import ClubCard from '../components/ClubCard';
import { FirestoreClub } from '../types/auth';
import { getClubs, getPosts } from '../lib/firestoreService';

interface DashboardProps {
  onNavigateToClub: (clubId: string) => void;
}

export default function Dashboard({ onNavigateToClub }: DashboardProps) {
  const [clubs, setClubs] = useState<FirestoreClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'technical', 'cultural', 'sports', 'academic'];

  // Fetch clubs and posts from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clubsData, postsData] = await Promise.all([
          getClubs(),
          getPosts()
        ]);

        // Calculate total events for each club
        const clubsWithCounts = clubsData.map(club => {
          const clubEventsCount = postsData.filter(post =>
            post.clubId === club.id
          ).length;

          return {
            ...club,
            upcomingEvents: clubEventsCount // Overwrite with total count
          };
        });

        setClubs(clubsWithCounts);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredClubs = clubs.filter((club) => {
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || club.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12" id="tour-dashboard-stats">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-4xl font-black text-slate-900 dark:text-white">
            Explore Clubs
          </h1>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search clubs, events, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-lg"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400 ml-2" />
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${selectedCategory === category
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-2">
            {clubs.length === 0 ? 'No clubs yet' : 'No clubs found matching your criteria'}
          </p>
          {clubs.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Clubs will appear here once an admin creates them.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredClubs.length} {filteredClubs.length === 1 ? 'club' : 'clubs'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <ClubCard key={club.id} club={club} onClick={() => onNavigateToClub(club.id!)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
