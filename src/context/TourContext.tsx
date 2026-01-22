import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useNavigation } from './NavigationContext';
import { getClubs } from '../lib/firestoreService';

interface TourContextType {
    startTour: () => void;
    isTourActive: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
    const [isTourActive, setIsTourActive] = useState(false);
    const { navigateToPage, navigateToClub } = useNavigation();
    const driverObj = useRef<any>(null);
    const [firstClubId, setFirstClubId] = useState<string | null>(null);

    // Fetch a sample club ID for the tour
    useEffect(() => {
        const fetchClubInit = async () => {
            try {
                const clubs = await getClubs();
                if (clubs.length > 0) {
                    setFirstClubId(clubs[0].id || null);
                }
            } catch (error) {
                console.error("Error fetching clubs for tour:", error);
            }
        };
        fetchClubInit();
    }, []);

    const waitForElement = (selector: string): Promise<void> => {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve();
            }

            const observer = new MutationObserver((mutations, obs) => {
                if (document.querySelector(selector)) {
                    obs.disconnect();
                    resolve();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });

            // Fallback timeout
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 5000);
        });
    };

    const steps: DriveStep[] = [
        // --- HOME PAGE ---
        {
            element: '#tour-logo',
            popover: {
                title: 'Welcome to Club Connect',
                description: 'I am Jarvis, your AI Campus Guide. I will take you on a tour of the Platform.',
                side: 'bottom',
                align: 'start'
            },
            onHighlightStarted: async () => {
                navigateToPage('home');
                await waitForElement('#tour-logo');
            }
        },
        {
            element: '#tour-stats-grid',
            popover: {
                title: 'Campus Overview',
                description: 'Here you can see live statistics about Active Clubs, Students, and Upcoming Events.',
                side: 'bottom'
            },
            onHighlightStarted: () => {
            }
        },
        {
            element: '#tour-quick-actions',
            popover: {
                title: 'Quick Navigation',
                description: 'Use these shortcuts to jump to specific sections instantly.',
                side: 'top'
            },
            onHighlightStarted: () => {
            }
        },
        {
            element: '#tour-upcoming-events',
            popover: {
                title: 'Featured Events',
                description: 'Stay updated with the latest campus happenings right here.',
                side: 'top'
            },
            onHighlightStarted: () => {
            }
        },
        {
            element: '#tour-calendar-section',
            popover: {
                title: 'Campus Calendar',
                description: 'Plan your schedule efficiently with the interactive calendar.',
                side: 'top'
            },
            onHighlightStarted: () => {
            }
        },

        // --- DASHBOARD PAGE ---
        {
            element: '#tour-dashboard-stats',
            popover: {
                title: 'Your Dashboard',
                description: 'Welcome to your personal command center. Here you can find all clubs.',
                side: 'bottom'
            },
            onHighlightStarted: async () => {
                navigateToPage('dashboard');
                await waitForElement('#tour-dashboard-stats');
            }
        },

        // --- CLUB DETAIL PAGE (Dynamic Member Board) ---
        ...(firstClubId ? [{
            element: '#tour-member-board',
            popover: {
                title: 'Club Member Board',
                description: 'Meet the dedicated team behind the club. You can see their roles and profiles here.',
                side: 'left' as const
            },
            onHighlightStarted: async () => {
                navigateToClub(firstClubId);
                await waitForElement('#tour-member-board');
            }
        }] : []),

        // --- EVENTS PAGE ---
        {
            element: '#tour-events-filter',
            popover: {
                title: 'Event Filters',
                description: 'Filter events by "Upcoming", "Completed", or by specific clubs.',
                side: 'bottom'
            },
            onHighlightStarted: async () => {
                navigateToPage('events');
                await waitForElement('#tour-events-filter');
            }
        },

        // --- ANNOUNCEMENTS PAGE ---
        {
            element: '#tour-announcements-list',
            popover: {
                title: '📢 Announcements',
                description: 'The official news feed. Stay informed about crucial updates.',
                side: 'top'
            },
            onHighlightStarted: async () => {
                navigateToPage('announcements');
                await waitForElement('#tour-announcements-list');
            }
        },

        // --- HEADER ELEMENTS ---
        {
            element: '#tour-dark-mode-toggle',
            popover: {
                title: 'Light & Dark Mode',
                description: 'Toggle between themes to suit your preference.',
                side: 'bottom',
                align: 'end'
            },
            onHighlightStarted: async () => {
                // Ensure header is visible
            }
        },
        {
            element: '#tour-notifications',
            popover: {
                title: 'Notification Center',
                description: 'Your hub for real-time alerts and messages.',
                side: 'bottom',
                align: 'end'
            },
            onHighlightStarted: async () => {
            }
        },
        {
            element: '#tour-profile',
            popover: {
                title: 'User Profile',
                description: 'Manage your account settings and preferences here.',
                side: 'bottom',
                align: 'end'
            },
            onHighlightStarted: () => {
            }
        },

        // --- AI ASSISTANT ---
        {
            element: '#tour-ai-assistant',
            popover: {
                title: 'I am Here',
                description: 'And finally, I am always here to assist you. Click to chat!',
                side: 'left'
            },
            onHighlightStarted: () => {
            }
        },
    ];

    const startTour = () => {
        setIsTourActive(true);

        driverObj.current = driver({
            showProgress: true,
            steps: steps,
            popoverClass: 'jarvis-theme', // Custom class for "cool" styling
            onDestroyStarted: () => {
                setIsTourActive(false);
                window.speechSynthesis.cancel();
                driverObj.current?.destroy();
            },
        });

        driverObj.current.drive();
    };

    return (
        <TourContext.Provider value={{ startTour, isTourActive }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}
