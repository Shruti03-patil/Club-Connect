import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    Timestamp,
    collectionGroup,
    where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    FirestoreClub,
    FirestorePost,
    FirestoreNotification,
    FirestoreUser,
    ClubMember,
    EventRSVP,
} from '../types/auth';

// ==================== CLUBS ====================

export const getClubs = async (): Promise<FirestoreClub[]> => {
    try {
        const clubsRef = collection(db, 'clubs');
        const q = query(clubsRef, orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as FirestoreClub[];
    } catch (error) {
        console.error('Error fetching clubs:', error);
        return [];
    }
};

export const createClub = async (clubData: Omit<FirestoreClub, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
        const clubsRef = collection(db, 'clubs');
        const docRef = await addDoc(clubsRef, {
            ...clubData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating club:', error);
        return null;
    }
};

export const updateClub = async (clubId: string, clubData: Partial<FirestoreClub>): Promise<boolean> => {
    try {
        const clubRef = doc(db, 'clubs', clubId);
        await updateDoc(clubRef, {
            ...clubData,
            updatedAt: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error('Error updating club:', error);
        return false;
    }
};

export const deleteClub = async (clubId: string): Promise<boolean> => {
    try {
        const clubRef = doc(db, 'clubs', clubId);
        await deleteDoc(clubRef);
        return true;
    } catch (error) {
        console.error('Error deleting club:', error);
        return false;
    }
};

// Update club profile image URL (no file upload - just saves a URL)
export const updateClubImage = async (
    clubId: string,
    imageUrl: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const updateSuccess = await updateClub(clubId, { image: imageUrl });
        if (!updateSuccess) {
            return { success: false, error: 'Failed to update club image' };
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error updating club image:', error);
        return { success: false, error: error.message || 'Failed to update image' };
    }
};

// ==================== CLUB SECRETARIES ====================

export const createClubSecretary = async (
    email: string,
    password: string,
    name: string,
    clubId: string,
    clubName: string
): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
        // Import required functions for secondary app
        const { initializeApp, deleteApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword: createUser } = await import('firebase/auth');

        // Get the current Firebase config
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        // Create a secondary app instance to create the user without affecting current session
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // Create user with secondary auth instance
            const userCredential = await createUser(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // Create Firestore user profile with club-secretary role
            const userProfile: FirestoreUser = {
                email,
                name,
                role: 'club-secretary',
                clubId,
                clubName,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, 'users', uid), userProfile);

            // Update the club with secretary info
            await updateClub(clubId, {
                secretaryId: uid,
                secretaryEmail: email,
            });

            // Add secretary as a club member with 'secretary' role
            const membersRef = collection(db, 'clubs', clubId, 'members');
            await addDoc(membersRef, {
                name,
                email,
                role: 'secretary',
                joinedAt: Timestamp.now(),
            });

            // Update member count to 1 (secretary is the first member)
            const clubRef = doc(db, 'clubs', clubId);
            const clubDoc = await getDoc(clubRef);
            if (clubDoc.exists()) {
                const currentMembers = clubDoc.data().members || 0;
                await updateDoc(clubRef, {
                    members: currentMembers + 1,
                    updatedAt: Timestamp.now(),
                });
            }

            // Delete the secondary app instance
            await deleteApp(secondaryApp);

            return { success: true, userId: uid };
        } catch (innerError: any) {
            // Clean up secondary app on error
            await deleteApp(secondaryApp);
            throw innerError;
        }
    } catch (error: any) {
        console.error('Error creating club secretary:', error);
        return { success: false, error: error.message || 'Failed to create secretary' };
    }
};

export const createClubPresident = async (
    email: string,
    password: string,
    name: string,
    clubId: string,
    clubName: string
): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
        // Import required functions for secondary app
        const { initializeApp, deleteApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword: createUser } = await import('firebase/auth');

        // Get the current Firebase config
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        // Create a secondary app instance to create the user without affecting current session
        const secondaryApp = initializeApp(firebaseConfig, 'PresidentApp');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // Create user with secondary auth instance
            const userCredential = await createUser(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // Create Firestore user profile with president role
            const userProfile: FirestoreUser = {
                email,
                name,
                role: 'president',
                clubId,
                clubName,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, 'users', uid), userProfile);

            // Update the club with president info
            await updateClub(clubId, {
                presidentId: uid,
                presidentEmail: email,
            });

            // Add president as a club member
            const membersRef = collection(db, 'clubs', clubId, 'members');
            await addDoc(membersRef, {
                name,
                email,
                role: 'president',
                joinedAt: Timestamp.now(),
            });

            // Update member count
            const clubRef = doc(db, 'clubs', clubId);
            const clubDoc = await getDoc(clubRef);
            if (clubDoc.exists()) {
                const currentMembers = clubDoc.data().members || 0;
                await updateDoc(clubRef, {
                    members: currentMembers + 1,
                    updatedAt: Timestamp.now(),
                });
            }

            // Delete the secondary app instance
            await deleteApp(secondaryApp);

            return { success: true, userId: uid };
        } catch (innerError: any) {
            // Clean up secondary app on error
            await deleteApp(secondaryApp);
            throw innerError;
        }
    } catch (error: any) {
        console.error('Error creating club president:', error);
        return { success: false, error: error.message || 'Failed to create president' };
    }
};

export const createClubTreasurer = async (
    email: string,
    password: string,
    name: string,
    clubId: string,
    clubName: string
): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
        // Import required functions for secondary app
        const { initializeApp, deleteApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword: createUser } = await import('firebase/auth');

        // Get the current Firebase config
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        // Create a secondary app instance to create the user without affecting current session
        const secondaryApp = initializeApp(firebaseConfig, 'TreasurerApp');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // Create user with secondary auth instance
            const userCredential = await createUser(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // Create Firestore user profile with treasurer role
            const userProfile: FirestoreUser = {
                email,
                name,
                role: 'treasurer',
                clubId,
                clubName,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, 'users', uid), userProfile);

            // Update the club with treasurer info
            await updateClub(clubId, {
                treasurerId: uid,
                treasurerEmail: email,
            });

            // Add treasurer as a club member
            const membersRef = collection(db, 'clubs', clubId, 'members');
            await addDoc(membersRef, {
                name,
                email,
                role: 'treasurer',
                joinedAt: Timestamp.now(),
            });

            // Update member count
            const clubRef = doc(db, 'clubs', clubId);
            const clubDoc = await getDoc(clubRef);
            if (clubDoc.exists()) {
                const currentMembers = clubDoc.data().members || 0;
                await updateDoc(clubRef, {
                    members: currentMembers + 1,
                    updatedAt: Timestamp.now(),
                });
            }

            // Delete the secondary app instance
            await deleteApp(secondaryApp);

            return { success: true, userId: uid };
        } catch (innerError: any) {
            // Clean up secondary app on error
            await deleteApp(secondaryApp);
            throw innerError;
        }
    } catch (error: any) {
        console.error('Error creating club treasurer:', error);
        return { success: false, error: error.message || 'Failed to create treasurer' };
    }
};

// Update user profile (name, bio/description)
export const updateUserProfile = async (
    userId: string,
    profileData: { name?: string; bio?: string }
): Promise<{ success: boolean; error?: string }> => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...profileData,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating user profile:', error);
        return { success: false, error: error.message || 'Failed to update profile' };
    }
};

// Get user profile data
export const getUserProfile = async (userId: string): Promise<FirestoreUser | null> => {
    try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return {
                ...docSnap.data(),
                createdAt: docSnap.data().createdAt?.toDate() || new Date(),
                updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
            } as FirestoreUser;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

// ==================== POSTS ====================

export const getPosts = async (): Promise<FirestorePost[]> => {
    try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as FirestorePost[];
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
};

export const createPost = async (postData: Omit<FirestorePost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
        const postsRef = collection(db, 'posts');
        const docRef = await addDoc(postsRef, {
            ...postData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating post:', error);
        return null;
    }
};

// Interface for event collision info
export interface EventCollision {
    title: string;
    time: string;
    clubName: string;
}

// Check for event time collisions on a given date and start time
export const checkEventTimeCollision = async (
    date: string,
    startTime: string
): Promise<EventCollision[]> => {
    try {
        const allPosts = await getPosts();

        // Filter to only events on the same date with a time field
        const eventsOnSameDate = allPosts.filter(post =>
            post.type === 'event' &&
            post.date === date &&
            post.time
        );

        // If no start time provided, return empty (no collision check needed)
        if (!startTime) {
            return [];
        }

        // Convert the new event's start time to minutes for comparison
        const [newHours, newMinutes] = startTime.split(':').map(Number);
        const newStartMinutes = newHours * 60 + newMinutes;

        const collisions: EventCollision[] = [];

        for (const event of eventsOnSameDate) {
            // Parse the existing event's time (format: "2:30 PM" or "2:30 PM - 5:00 PM")
            const timeStr = event.time!;
            const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);

            if (timeMatch) {
                let existingHours = parseInt(timeMatch[1]);
                const existingMinutes = parseInt(timeMatch[2]);
                const period = timeMatch[3].toUpperCase();

                // Convert to 24h format
                if (period === 'PM' && existingHours !== 12) {
                    existingHours += 12;
                } else if (period === 'AM' && existingHours === 12) {
                    existingHours = 0;
                }

                const existingStartMinutes = existingHours * 60 + existingMinutes;

                // Check if times are within 30 minutes of each other (overlap)
                if (Math.abs(newStartMinutes - existingStartMinutes) < 30) {
                    collisions.push({
                        title: event.title,
                        time: event.time!,
                        clubName: event.clubName,
                    });
                }
            }
        }

        return collisions;
    } catch (error) {
        console.error('Error checking event time collision:', error);
        return [];
    }
};

export const deletePost = async (postId: string): Promise<boolean> => {
    try {
        const postRef = doc(db, 'posts', postId);
        await deleteDoc(postRef);
        return true;
    } catch (error) {
        console.error('Error deleting post:', error);
        return false;
    }
};

export const updatePost = async (postId: string, postData: Partial<FirestorePost>): Promise<boolean> => {
    try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            ...postData,
            updatedAt: Timestamp.now(),
        });
        return true;
    } catch (error) {
        console.error('Error updating post:', error);
        return false;
    }
};

// ==================== NOTIFICATIONS ====================

export const getNotifications = async (userId?: string): Promise<FirestoreNotification[]> => {
    try {
        const notificationsRef = collection(db, 'notifications');
        let q;

        if (userId) {
            // Get user-specific notifications and global notifications
            q = query(notificationsRef, orderBy('createdAt', 'desc'));
        } else {
            q = query(notificationsRef, orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as FirestoreNotification[];
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
};

export const getNotification = async (notificationId: string): Promise<FirestoreNotification | null> => {
    try {
        const docRef = doc(db, 'notifications', notificationId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
                createdAt: docSnap.data().createdAt?.toDate() || new Date(),
            } as FirestoreNotification;
        }
        return null;
    } catch (error) {
        console.error('Error fetching notification:', error);
        return null;
    }
};

export const createNotification = async (
    notificationData: Omit<FirestoreNotification, 'id' | 'createdAt'>
): Promise<string | null> => {
    try {
        const notificationsRef = collection(db, 'notifications');
        const docRef = await addDoc(notificationsRef, {
            ...notificationData,
            createdAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

export const deleteNotification = async (notificationId: string): Promise<boolean> => {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await deleteDoc(notificationRef);
        return true;
    } catch (error) {
        console.error('Error deleting notification:', error);
        return false;
    }
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
};

// ==================== CLUB MEMBERS ====================

// Get all members of a club
export const getClubMembers = async (clubId: string): Promise<ClubMember[]> => {
    try {
        const membersRef = collection(db, 'clubs', clubId, 'members');
        const q = query(membersRef, orderBy('joinedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            joinedAt: doc.data().joinedAt?.toDate() || new Date(),
        })) as ClubMember[];
    } catch (error) {
        console.error('Error fetching club members:', error);
        return [];
    }
};

// Sync club member count with actual number of members in subcollection
export const syncClubMemberCount = async (clubId: string): Promise<number> => {
    try {
        const membersRef = collection(db, 'clubs', clubId, 'members');
        const snapshot = await getDocs(membersRef);
        const actualCount = snapshot.size;

        // Update the club's member count
        const clubRef = doc(db, 'clubs', clubId);
        await updateDoc(clubRef, {
            members: actualCount,
            updatedAt: Timestamp.now(),
        });

        return actualCount;
    } catch (error) {
        console.error('Error syncing member count:', error);
        return 0;
    }
};

// Add a member to a club
export const addClubMember = async (
    clubId: string,
    memberData: Omit<ClubMember, 'id' | 'joinedAt'>
): Promise<{ success: boolean; error?: string; memberId?: string }> => {
    try {
        const membersRef = collection(db, 'clubs', clubId, 'members');
        const docRef = await addDoc(membersRef, {
            ...memberData,
            joinedAt: Timestamp.now(),
        });

        // Update member count in club document
        const clubRef = doc(db, 'clubs', clubId);
        const clubDoc = await getDoc(clubRef);
        if (clubDoc.exists()) {
            const currentMembers = clubDoc.data().members || 0;
            await updateDoc(clubRef, {
                members: currentMembers + 1,
                updatedAt: Timestamp.now(),
            });
        }

        return { success: true, memberId: docRef.id };
    } catch (error: any) {
        console.error('Error adding club member:', error);
        return { success: false, error: error.message || 'Failed to add member' };
    }
};

// Update a member's info/role
export const updateClubMember = async (
    clubId: string,
    memberId: string,
    memberData: Partial<ClubMember>
): Promise<boolean> => {
    try {
        const memberRef = doc(db, 'clubs', clubId, 'members', memberId);
        await updateDoc(memberRef, memberData);
        return true;
    } catch (error) {
        console.error('Error updating club member:', error);
        return false;
    }
};

// Remove a member from a club
export const removeClubMember = async (
    clubId: string,
    memberId: string
): Promise<boolean> => {
    try {
        const memberRef = doc(db, 'clubs', clubId, 'members', memberId);
        await deleteDoc(memberRef);

        // Update member count in club document
        const clubRef = doc(db, 'clubs', clubId);
        const clubDoc = await getDoc(clubRef);
        if (clubDoc.exists()) {
            const currentMembers = clubDoc.data().members || 1;
            await updateDoc(clubRef, {
                members: Math.max(0, currentMembers - 1),
                updatedAt: Timestamp.now(),
            });
        }

        return true;
    } catch (error) {
        console.error('Error removing club member:', error);
        return false;
    }
};

// ==================== EVENT RSVPs ====================

// Create an RSVP for an event
export const createEventRSVP = async (
    eventId: string,
    name: string,
    email: string
): Promise<{ success: boolean; error?: string; rsvpId?: string }> => {
    try {
        // Check if email already RSVPed for this event
        const rsvpsRef = collection(db, 'posts', eventId, 'rsvps');
        const snapshot = await getDocs(rsvpsRef);
        const existingRsvp = snapshot.docs.find(doc => doc.data().email === email);

        if (existingRsvp) {
            return { success: false, error: 'You have already RSVPed for this event' };
        }

        // Create RSVP
        const docRef = await addDoc(rsvpsRef, {
            eventId,
            name,
            email,
            rsvpedAt: Timestamp.now(),
        });

        // Update RSVP count on the post
        const postRef = doc(db, 'posts', eventId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const currentRsvps = postDoc.data().rsvps || 0;
            await updateDoc(postRef, {
                rsvps: currentRsvps + 1,
                updatedAt: Timestamp.now(),
            });
        }

        return { success: true, rsvpId: docRef.id };
    } catch (error: any) {
        console.error('Error creating RSVP:', error);
        return { success: false, error: error.message || 'Failed to create RSVP' };
    }
};

// Get all RSVPs for an event
export const getEventRSVPs = async (eventId: string): Promise<EventRSVP[]> => {
    try {
        const rsvpsRef = collection(db, 'posts', eventId, 'rsvps');
        const q = query(rsvpsRef, orderBy('rsvpedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            rsvpedAt: doc.data().rsvpedAt?.toDate() || new Date(),
        })) as EventRSVP[];
    } catch (error) {
        console.error('Error fetching event RSVPs:', error);
        return [];
    }
};

// Get all RSVPs for a user by email (searches across all events)
export const getUserRSVPsByEmail = async (email: string): Promise<{ eventId: string; rsvp: EventRSVP }[]> => {
    try {
        // First get all posts that are events
        const postsRef = collection(db, 'posts');
        const postsSnapshot = await getDocs(postsRef);
        const eventPosts = postsSnapshot.docs.filter(doc => doc.data().type === 'event');

        const userRSVPs: { eventId: string; rsvp: EventRSVP }[] = [];

        // Check each event's RSVPs subcollection for the user's email
        for (const eventDoc of eventPosts) {
            const rsvpsRef = collection(db, 'posts', eventDoc.id, 'rsvps');
            const rsvpsSnapshot = await getDocs(rsvpsRef);

            for (const rsvpDoc of rsvpsSnapshot.docs) {
                if (rsvpDoc.data().email?.toLowerCase() === email.toLowerCase()) {
                    userRSVPs.push({
                        eventId: eventDoc.id,
                        rsvp: {
                            id: rsvpDoc.id,
                            eventId: eventDoc.id,
                            name: rsvpDoc.data().name,
                            email: rsvpDoc.data().email,
                            rsvpedAt: rsvpDoc.data().rsvpedAt?.toDate() || new Date(),
                            attendance: rsvpDoc.data().attendance,
                        },
                    });
                }
            }
        }

        return userRSVPs;
    } catch (error) {
        console.error('Error fetching user RSVPs by email:', error);
        return [];
    }
};

// Delete an RSVP
export const deleteEventRSVP = async (
    eventId: string,
    rsvpId: string
): Promise<boolean> => {
    try {
        const rsvpRef = doc(db, 'posts', eventId, 'rsvps', rsvpId);
        await deleteDoc(rsvpRef);

        // Update RSVP count on the post
        const postRef = doc(db, 'posts', eventId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const currentRsvps = postDoc.data().rsvps || 1;
            await updateDoc(postRef, {
                rsvps: Math.max(0, currentRsvps - 1),
                updatedAt: Timestamp.now(),
            });
        }

        return true;
    } catch (error) {
        console.error('Error deleting RSVP:', error);
        return false;
    }
};

// Get RSVP count for an event
export const getEventRSVPCount = async (eventId: string): Promise<number> => {
    try {
        const rsvpsRef = collection(db, 'posts', eventId, 'rsvps');
        const snapshot = await getDocs(rsvpsRef);
        return snapshot.size;
    } catch (error) {
        console.error('Error getting RSVP count:', error);
        return 0;
    }
};

// Update participant attendance status
export const updateParticipantAttendance = async (
    eventId: string,
    participantId: string,
    attendance: 'present' | 'absent' | 'pending'
): Promise<boolean> => {
    try {
        const rsvpRef = doc(db, 'posts', eventId, 'rsvps', participantId);
        await updateDoc(rsvpRef, { attendance });
        return true;
    } catch (error) {
        console.error('Error updating participant attendance:', error);
        return false;
    }
};

// Add a participant manually (for Google Form responses)
export const addEventParticipant = async (
    eventId: string,
    name: string,
    email: string
): Promise<{ success: boolean; error?: string; participantId?: string }> => {
    try {
        // Check if email already exists for this event
        const rsvpsRef = collection(db, 'posts', eventId, 'rsvps');
        const snapshot = await getDocs(rsvpsRef);
        const existingParticipant = snapshot.docs.find(doc => doc.data().email.toLowerCase() === email.toLowerCase());

        if (existingParticipant) {
            return { success: false, error: 'This email is already registered for this event' };
        }

        // Add participant
        const docRef = await addDoc(rsvpsRef, {
            eventId,
            name,
            email,
            rsvpedAt: Timestamp.now(),
            attendance: 'pending',
        });

        // Update RSVP count on the post
        const postRef = doc(db, 'posts', eventId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const currentRsvps = postDoc.data().rsvps || 0;
            await updateDoc(postRef, {
                rsvps: currentRsvps + 1,
                updatedAt: Timestamp.now(),
            });
        }

        return { success: true, participantId: docRef.id };
    } catch (error: any) {
        console.error('Error adding participant:', error);
        return { success: false, error: error.message || 'Failed to add participant' };
    }
};

// Delete a participant
export const deleteEventParticipant = async (
    eventId: string,
    participantId: string
): Promise<boolean> => {
    try {
        const rsvpRef = doc(db, 'posts', eventId, 'rsvps', participantId);
        await deleteDoc(rsvpRef);

        // Update RSVP count on the post
        const postRef = doc(db, 'posts', eventId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const currentRsvps = postDoc.data().rsvps || 1;
            await updateDoc(postRef, {
                rsvps: Math.max(0, currentRsvps - 1),
                updatedAt: Timestamp.now(),
            });
        }

        return true;
    } catch (error) {
        console.error('Error deleting participant:', error);
        return false;
    }
};

// Get all club memberships for a user by email
export const getUserMemberships = async (email: string): Promise<any[]> => {
    try {
        const membersRef = collectionGroup(db, 'members');
        const q = query(membersRef, where('email', '==', email));
        const snapshot = await getDocs(q);

        const memberships: any[] = [];

        for (const docSnapshot of snapshot.docs) {
            // Check if this is a club member (parent should be 'clubs')
            // ref.parent is the collection ('members'), ref.parent.parent is the club doc
            const clubDocRef = docSnapshot.ref.parent.parent;

            if (clubDocRef && clubDocRef.path.startsWith('clubs/')) {
                const clubDoc = await getDoc(clubDocRef);
                if (clubDoc.exists()) {
                    memberships.push({
                        clubId: clubDoc.id,
                        clubName: clubDoc.data().name,
                        clubImage: clubDoc.data().image,
                        clubIcon: clubDoc.data().icon,
                        clubColor: clubDoc.data().color,
                        role: docSnapshot.data().role,
                        joinedAt: docSnapshot.data().joinedAt?.toDate() || new Date(),
                    });
                }
            }
        }

        return memberships;
    } catch (error) {
        console.error('Error fetching user memberships:', error);
        return [];
    }
};
