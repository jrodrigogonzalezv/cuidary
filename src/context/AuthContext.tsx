import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from '@react-native-firebase/auth';
import { doc, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, db } from '@/lib/firebase';
import '@/lib/googleSignIn';
import type { UserProfile, UserRole } from '@/types/models';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; name: string; phone: string; role: UserRole }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeProfile: (params: { role: UserRole; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      profileUnsubscribe?.();
      if (nextUser) {
        setLoading(true);
        profileUnsubscribe = onSnapshot(
          doc(db, 'users', nextUser.uid),
          (snapshot) => {
            setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
            setLoading(false);
          },
          () => setLoading(false),
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      profileUnsubscribe?.();
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signUp: async ({ email, password, name, phone, role }) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const newProfile: UserProfile = {
          uid: credential.user.uid,
          role,
          name,
          phone,
          email,
          createdAt: Date.now(),
        };
        await setDoc(doc(db, 'users', credential.user.uid), newProfile);
        setProfile(newProfile);
      },
      signInWithGoogle: async () => {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult.data?.idToken ?? (signInResult as unknown as { idToken?: string }).idToken;
        if (!idToken) throw new Error('No se obtuvo el token de Google');
        const googleCredential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, googleCredential);
      },
      completeProfile: async ({ role, phone }) => {
        if (!user) throw new Error('No hay sesión activa');
        const newProfile: UserProfile = {
          uid: user.uid,
          role,
          name: user.displayName ?? '',
          phone,
          email: user.email ?? '',
          createdAt: Date.now(),
        };
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setProfile(newProfile);
      },
      signOut: async () => {
        await firebaseSignOut(auth);
        await GoogleSignin.signOut();
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
