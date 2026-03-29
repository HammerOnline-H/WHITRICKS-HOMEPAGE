import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useIsAdmin } from './useData';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Create user profile if it doesn't exist
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              displayName: user.displayName,
              role: user.email === "ham80908090@gmail.com" ? 'admin' : 'user',
              createdAt: serverTimestamp()
            });
          }
        } catch (err) {
          // We don't want to throw here as it's a background task
          console.error('Error creating user profile:', err);
        }
      }
      setUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading: loading || adminLoading, isAdmin };
}
