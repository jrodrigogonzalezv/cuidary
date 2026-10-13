import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification } from '@/types/models';

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('uid', '==', user.uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as AppNotification)
          .sort((a, b) => b.createdAt - a.createdAt);
        setItems(list);
        list.filter((n) => !n.read).forEach((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {}));
      },
      () => setItems([]),
    );
  }, [user]);

  return items;
}
