import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { 
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { auth, firestoreDb } from '../firebase';
import { toggleUserFavoriteExerciseInFirestore } from '../firebase/firestoreService';
import type { UserProfile, UserRole, Club } from '../types';

export const MAIN_ADMIN_EMAIL = 'thorsten.weber7@gmail.com';

export function isMainAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === MAIN_ADMIN_EMAIL.toLowerCase();
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  currentClub: Club | null;
  favoriteExerciseIds: string[];
  toggleFavoriteExercise: (exerciseId: string) => Promise<void>;
  isExerciseFavorite: (exerciseId: string) => boolean;
  loading: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  isClubAdmin: boolean;
  isClubCoach: boolean;
  isSinglePro: boolean;
  isSingleStandard: boolean;
  isTrialUser: boolean;
  hasProAccess: boolean;
  canEditPeriodization: boolean;
  canEditAdvancedDataEntry: boolean;
  clubId?: string;
  clubName?: string;
  isEmailVerified: boolean;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  trialDaysRemaining: number;
  isBlocked: boolean;
  isAccessGranted: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, details?: { firstName: string; lastName: string; role?: UserRole }) => Promise<void>;
  updateUserProfile: (data: { firstName: string; lastName: string; clubName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Monitor Auth state & Sync Firestore user profile
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(firestoreDb, 'users', firebaseUser.uid);

        // Ensure profile exists in Firestore
        try {
          const docSnap = await getDoc(userDocRef);
          const isBootstrap = isMainAdminEmail(firebaseUser.email);
          const now = Date.now();

          let matchedClubId: string | undefined;
          let matchedClubName: string | undefined;
          let matchedRole: UserRole | undefined;

          // Check if this email is pre-configured in any club as admin or coach
          if (firebaseUser.email) {
            try {
              const normEmail = firebaseUser.email.toLowerCase().trim();
              const clubsCol = collection(firestoreDb, 'clubs');
              const clubsSnap = await getDocs(clubsCol);
              
              clubsSnap.forEach(cDoc => {
                const cData = cDoc.data() as Club;
                if (cData.adminEmail?.toLowerCase().trim() === normEmail) {
                  matchedRole = isBootstrap ? 'master_admin' : 'club_admin';
                  matchedClubId = cDoc.id;
                  matchedClubName = cData.name;
                  if (cData.adminUid !== firebaseUser.uid) {
                    updateDoc(doc(firestoreDb, 'clubs', cDoc.id), { adminUid: firebaseUser.uid }).catch(console.warn);
                  }
                } else if (cData.coachEmails?.some(e => e.toLowerCase().trim() === normEmail)) {
                  matchedRole = isBootstrap ? 'master_admin' : 'club_coach';
                  matchedClubId = cDoc.id;
                  matchedClubName = cData.name;
                  if (!cData.coachUids?.includes(firebaseUser.uid)) {
                    updateDoc(doc(firestoreDb, 'clubs', cDoc.id), {
                      coachUids: Array.from(new Set([...(cData.coachUids || []), firebaseUser.uid]))
                    }).catch(console.warn);
                  }
                }
              });
            } catch (clubErr) {
              console.warn('Error checking club assignment during auth sync:', clubErr);
            }
          }

          if (!docSnap.exists()) {
            let preConfiguredProfile: UserProfile | null = null;
            if (firebaseUser.email) {
              try {
                const normEmail = firebaseUser.email.toLowerCase().trim();
                const uCol = collection(firestoreDb, 'users');
                const uSnap = await getDocs(query(uCol, where('email', '==', normEmail)));
                if (!uSnap.empty) {
                  const pDoc = uSnap.docs[0];
                  preConfiguredProfile = pDoc.data() as UserProfile;
                  if (pDoc.id !== firebaseUser.uid) {
                    await setDoc(userDocRef, { ...preConfiguredProfile, uid: firebaseUser.uid });
                    deleteDoc(pDoc.ref).catch(console.warn);
                  }
                }
              } catch (e) {
                console.warn('Error checking pre-configured profile:', e);
              }
            }

            if (preConfiguredProfile) {
              setUserProfile({ ...preConfiguredProfile, uid: firebaseUser.uid });
            } else {
              const initialRole: UserRole = isBootstrap ? 'master_admin' : (matchedRole || 'trial_user');
              const trialExpires = isBootstrap 
                ? now + 3650 * 24 * 60 * 60 * 1000 // 10 years for admin
                : now + 14 * 24 * 60 * 60 * 1000;   // 14 days for trial user

              const defaultFirst = isBootstrap ? 'Thorsten' : '';
              const defaultLast = isBootstrap ? 'Weber' : '';
              const defaultDisplay = isBootstrap 
                ? 'Thorsten Weber' 
                : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Trainer');

              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                firstName: defaultFirst,
                lastName: defaultLast,
                displayName: defaultDisplay,
                role: initialRole,
                clubId: matchedClubId,
                clubName: matchedClubName,
                createdAt: now,
                trialExpiresAt: trialExpires,
                subscriptionExpiresAt: isBootstrap ? now + 3650 * 24 * 60 * 60 * 1000 : null,
                isBlocked: false,
                favoriteExerciseIds: []
              };

              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
            }
          } else {
            const data = docSnap.data() as UserProfile;
            // Force master_admin role and admin name if main admin email
            if (isBootstrap) {
              const adminUpdates: Partial<UserProfile> = {};
              if (data.role !== 'master_admin' && data.role !== 'admin') {
                adminUpdates.role = 'master_admin';
                data.role = 'master_admin';
              }
              if (!data.firstName && !data.lastName) {
                adminUpdates.firstName = 'Thorsten';
                adminUpdates.lastName = 'Weber';
                adminUpdates.displayName = 'Thorsten Weber';
                data.firstName = 'Thorsten';
                data.lastName = 'Weber';
                data.displayName = 'Thorsten Weber';
              }
              if (matchedClubId && (!data.clubId || data.clubId !== matchedClubId || data.clubName !== matchedClubName)) {
                adminUpdates.clubId = matchedClubId;
                adminUpdates.clubName = matchedClubName;
                data.clubId = matchedClubId;
                data.clubName = matchedClubName;
              }
              if (Object.keys(adminUpdates).length > 0) {
                await setDoc(userDocRef, adminUpdates, { merge: true });
              }
            } else if (matchedClubId && (!data.clubId || data.role === 'user')) {
              // Automatically sync club assignment if pre-configured in a club
              const clubUpdates: Partial<UserProfile> = {
                clubId: matchedClubId,
                clubName: matchedClubName,
                role: matchedRole || 'club_coach'
              };
              await setDoc(userDocRef, clubUpdates, { merge: true });
              data.clubId = matchedClubId;
              data.clubName = matchedClubName;
              data.role = matchedRole || 'club_coach';
            }
            setUserProfile(data);
          }
        } catch (err) {
          console.error('Error syncing user profile with Firestore:', err);
        }

        // Realtime listener for subscription / role changes
        unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (isMainAdminEmail(firebaseUser.email) && data.role !== 'master_admin' && data.role !== 'admin') {
              data.role = 'master_admin';
            }
            setUserProfile(data);
          }
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Realtime subscription to the user's Club (if assigned to one)
  useEffect(() => {
    if (!userProfile?.clubId) {
      setCurrentClub(null);
      return;
    }

    const clubDocRef = doc(firestoreDb, 'clubs', userProfile.clubId);
    const unsubClub = onSnapshot(clubDocRef, (snap) => {
      if (snap.exists()) {
        setCurrentClub({ ...snap.data(), id: snap.id } as Club);
      } else {
        setCurrentClub(null);
      }
    }, (err) => {
      console.warn('Error fetching club document:', err);
    });

    return () => unsubClub();
  }, [userProfile?.clubId]);

  // Compute Access Rights & Roles
  const now = Date.now();
  const isBootstrapAdminUser = isMainAdminEmail(user?.email);
  const isMasterAdmin = isBootstrapAdminUser || userProfile?.role === 'master_admin' || userProfile?.role === 'admin';
  const isClubAdmin = userProfile?.role === 'club_admin' || 
    Boolean(currentClub && (currentClub.adminUid === user?.uid || currentClub.adminEmail?.toLowerCase().trim() === user?.email?.toLowerCase().trim())) ||
    Boolean(isMasterAdmin && (userProfile?.clubId || currentClub));
  const isClubCoach = userProfile?.role === 'club_coach' || 
    Boolean(currentClub && currentClub.coachEmails?.some(e => e.toLowerCase().trim() === user?.email?.toLowerCase().trim()));
  const isSinglePro = userProfile?.role === 'single_pro';
  const isSingleStandard = userProfile?.role === 'single_standard' || userProfile?.role === 'user';
  const isTrialUser = userProfile?.role === 'trial_user';
  const isAdmin = isMasterAdmin || isClubAdmin;
  const isEmailVerified = Boolean(user?.emailVerified || isBootstrapAdminUser);
  const isBlocked = !!userProfile?.isBlocked;

  const isSubscriptionActive = !!userProfile?.subscriptionExpiresAt && userProfile.subscriptionExpiresAt > now;
  const isTrialActive = !isSubscriptionActive && (userProfile?.trialExpiresAt ? userProfile.trialExpiresAt > now : false);

  const trialTimeLeftMs = Math.max(0, (userProfile?.trialExpiresAt || 0) - now);
  const trialDaysRemaining = Math.max(0, Math.ceil(trialTimeLeftMs / (24 * 60 * 60 * 1000)));

  // PRO access granted to Master Admin, Club Admin, Club Coach, Single Pro, or anyone with active subscription or active trial
  const hasProAccess = isMasterAdmin || isClubAdmin || isClubCoach || isSinglePro || isSubscriptionActive || isTrialActive;
  const canEditPeriodization = hasProAccess;
  const canEditAdvancedDataEntry = hasProAccess;

  // Access is granted if email is verified AND user is admin OR member of a club OR single pro OR single standard OR has active subscription/trial, and is not blocked
  const isAccessGranted = isEmailVerified && (isMasterAdmin || isClubAdmin || isClubCoach || isSinglePro || isSingleStandard || isSubscriptionActive || isTrialActive) && !isBlocked;

  // Favorite Exercises
  const favoriteExerciseIds = useMemo<string[]>(() => {
    if (userProfile?.favoriteExerciseIds && Array.isArray(userProfile.favoriteExerciseIds)) {
      return userProfile.favoriteExerciseIds;
    }
    const localKey = `nl_user_favorites_${user?.uid || 'guest'}`;
    try {
      const s = localStorage.getItem(localKey);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  }, [userProfile?.favoriteExerciseIds, user?.uid]);

  const toggleFavoriteExercise = async (exerciseId: string) => {
    const uid = user?.uid || 'guest';
    const updated = await toggleUserFavoriteExerciseInFirestore(uid, exerciseId);
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        favoriteExerciseIds: updated
      });
    }
  };

  const isExerciseFavorite = (exerciseId: string): boolean => {
    return favoriteExerciseIds.includes(exerciseId);
  };

  // Actions
  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const register = async (email: string, pass: string, details?: { firstName: string; lastName: string; role?: UserRole }) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      const fName = details?.firstName?.trim() || '';
      const lName = details?.lastName?.trim() || '';
      const fullName = (fName && lName) ? `${fName} ${lName}` : (cred.user.email?.split('@')[0] || 'Trainer');

      try {
        await updateProfile(cred.user, { displayName: fullName });
      } catch (err) {
        console.warn('Error updating Firebase auth profile on register:', err);
      }

      const now = Date.now();
      const isBootstrap = isMainAdminEmail(cred.user.email);
      const initialRole: UserRole = isBootstrap ? 'master_admin' : (details?.role || 'trial_user');
      const trialExpires = isBootstrap 
        ? now + 3650 * 24 * 60 * 60 * 1000 // 10 years for admin
        : now + 14 * 24 * 60 * 60 * 1000;   // 14 days for trial user

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        firstName: isBootstrap ? (fName || 'Thorsten') : fName,
        lastName: isBootstrap ? (lName || 'Weber') : lName,
        displayName: isBootstrap ? 'Thorsten Weber' : fullName,
        role: initialRole,
        createdAt: now,
        trialExpiresAt: trialExpires,
        subscriptionExpiresAt: isBootstrap ? now + 3650 * 24 * 60 * 60 * 1000 : (initialRole === 'single_pro' ? now + 365 * 24 * 60 * 60 * 1000 : null),
        isBlocked: false,
        favoriteExerciseIds: []
      };

      const userDocRef = doc(firestoreDb, 'users', cred.user.uid);
      await setDoc(userDocRef, newProfile);
      setUserProfile(newProfile);

      await sendEmailVerification(cred.user);
    }
  };

  const updateUserProfile = async (data: { firstName: string; lastName: string; clubName?: string }) => {
    if (!user) return;
    const fName = data.firstName.trim();
    const lName = data.lastName.trim();
    const fullName = `${fName} ${lName}`.trim();

    try {
      await updateProfile(user, { displayName: fullName });
    } catch (err) {
      console.warn('Error updating Firebase auth profile:', err);
    }

    const userDocRef = doc(firestoreDb, 'users', user.uid);
    const updateData: Partial<UserProfile> = {
      firstName: fName,
      lastName: lName,
      displayName: fullName
    };
    if (data.clubName !== undefined) {
      updateData.clubName = data.clubName.trim() || undefined;
    }
    await setDoc(userDocRef, updateData, { merge: true });

    if (userProfile) {
      setUserProfile({
        ...userProfile,
        ...updateData
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setCurrentClub(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const reloadUser = async (): Promise<boolean> => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const reloaded = auth.currentUser;
      setUser({ ...reloaded } as User);
      return reloaded.emailVerified;
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        currentClub,
        favoriteExerciseIds,
        toggleFavoriteExercise,
        isExerciseFavorite,
        loading,
        isAdmin,
        isMasterAdmin,
        isClubAdmin,
        isClubCoach,
        isSinglePro,
        isSingleStandard,
        isTrialUser,
        hasProAccess,
        canEditPeriodization,
        canEditAdvancedDataEntry,
        clubId: userProfile?.clubId,
        clubName: currentClub?.name || userProfile?.clubName,
        isEmailVerified,
        isTrialActive,
        isSubscriptionActive,
        trialDaysRemaining,
        isBlocked,
        isAccessGranted,
        login,
        register,
        updateUserProfile,
        logout,
        resetPassword,
        resendVerificationEmail,
        reloadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
