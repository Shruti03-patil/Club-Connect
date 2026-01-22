import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AuthContextType, AuthState, User, FirestoreUser } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Fetch user profile from Firestore
const fetchUserProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  try {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as FirestoreUser;
      return {
        id: firebaseUser.uid,
        email: data.email || firebaseUser.email || '',
        name: data.name || firebaseUser.displayName || 'User',
        role: data.role || 'user',
        clubId: data.clubId,
        clubName: data.clubName,
      };
    } else {
      // Create a default user profile if it doesn't exist
      const defaultProfile: FirestoreUser = {
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(userDocRef, defaultProfile);

      return {
        id: firebaseUser.uid,
        email: defaultProfile.email,
        name: defaultProfile.name,
        role: defaultProfile.role,
      };
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start as loading to check auth state
  });

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch their profile
        const userProfile = await fetchUserProfile(firebaseUser);
        setAuthState({
          user: userProfile,
          isAuthenticated: userProfile !== null,
          isLoading: false,
        });
      } else {
        // User is signed out
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userProfile = await fetchUserProfile(userCredential.user);

      if (userProfile) {
        setAuthState({
          user: userProfile,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Create user profile in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userProfile: FirestoreUser = {
        email: email,
        name: name,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(userDocRef, userProfile);

      setAuthState({
        user: {
          id: userCredential.user.uid,
          email: email,
          name: name,
          role: 'user',
        },
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Sign up error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));

      // Map Firebase errors to user-friendly messages
      let errorMessage = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }

      return { success: false, error: errorMessage };
    }
  };

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);

      // fetchUserProfile will create the profile if it doesn't exist
      const userProfile = await fetchUserProfile(userCredential.user);

      if (userProfile) {
        setAuthState({
          user: userProfile,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Failed to create user profile' };
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));

      let errorMessage = 'Failed to sign in with Google';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site.';
      }

      return { success: false, error: errorMessage };
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (authState.user) {
      setAuthState(prev => ({
        ...prev,
        user: { ...prev.user!, ...userData },
      }));
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    signUp,
    signInWithGoogle,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
