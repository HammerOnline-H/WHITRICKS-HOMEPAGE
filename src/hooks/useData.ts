import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SiteContent, Performance, GalleryItem, Partner, Member } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const DEFAULT_CONTENT: SiteContent = {
  home: {
    title: "WHITRICKS\n화이트릭스",
    slogan: "SLOGAN LINE 1\nSLOGAN LINE 2",
    bgImage: "https://picsum.photos/seed/magic1/1920/1080",
    logo: "https://lh3.googleusercontent.com/d/1N6OKkcND9Ttft8ibl_R-0WQDr9bL72C4"
  },
  about: {
    history: "WHITRICKS PERFORMANCE HISTORY\nLINE 1\nLINE 2\nLINE 3",
  },
  contact: {
    title: "Let's Connect.",
    description: "Reach out for bookings, collaborations, or just to say hello. We're always open to new magical opportunities.",
    address: "ADDRESS TEXT",
    phone: "010-0000-0000",
    email: "email@example.com",
    youtube: "YOUTUBE_URL",
    instagram: "INSTA_URL",
    naverBlog: "NAVER_BLOG_URL",
    naverPlace: "NAVER_PLACE_URL"
  }
};

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'siteContent/main';
    const unsub = onSnapshot(doc(db, 'siteContent', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setContent(docSnap.data() as SiteContent);
      } else {
        const isAdmin = auth.currentUser?.email === "ham80908090@gmail.com";
        if (isAdmin) {
          setDoc(doc(db, 'siteContent', 'main'), DEFAULT_CONTENT).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, path);
          });
        }
        setContent(DEFAULT_CONTENT);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setContent(DEFAULT_CONTENT);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { content: content as SiteContent, loading };
}

export function usePerformances() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'performances';
    const q = query(collection(db, 'performances'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Performance));
      setPerformances(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return unsub;
  }, []);

  return { performances, loading };
}

export function useGallery() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'gallery';
    const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
      setGallery(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return unsub;
  }, []);

  return { gallery, loading };
}

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'partners';
    const q = query(collection(db, 'partners'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner));
      setPartners(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return unsub;
  }, []);

  return { partners, loading };
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'members';
    const q = query(collection(db, 'members'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
      setMembers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return unsub;
  }, []);

  return { members, loading };
}
