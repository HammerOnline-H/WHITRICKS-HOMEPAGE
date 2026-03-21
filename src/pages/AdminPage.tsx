import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, collection, addDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, logout, storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { useAuth } from '../hooks/useAuth';
import { useSiteContent, usePerformances, useGallery, usePartners, useMembers } from '../hooks/useData';
import { Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Sparkles, Settings, LogOut, Save, Plus, Trash2, ArrowLeft, Image as ImageIcon, Share2, Upload, Crop, Video, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Performance, GalleryItem, Partner, SiteContent, Member } from '../types';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../lib/cropImage';

function LocalInput({ value, onSave, className, placeholder, textarea = false, rows = 3 }: any) {
  const [localValue, setLocalValue] = React.useState(value);
  
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const Component = textarea ? 'textarea' : 'input';

  return (
    <Component
      value={localValue}
      onChange={(e: any) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) {
          onSave(localValue);
        }
      }}
      className={className}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

async function uploadFile(file: File): Promise<string> {
  const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

function ImageUploader({ label, value, onChange, aspectRatio }: { label: string, value: string, onChange: (val: string) => void, aspectRatio?: number }) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_area: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const uploadToStorage = async (dataUrl: string) => {
    setUploading(true);
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], "cropped.png", { type: "image/png" });
      const downloadUrl = await uploadFile(file);
      onChange(downloadUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', async () => {
        const result = reader.result as string;
        setImage(result);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleStartCrop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value) {
      setUploading(true);
      try {
        console.log('Starting crop for:', value);
        // Try to fetch the image to avoid CORS issues with the cropper
        const response = await fetch(value, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result as string);
          setShowCropper(true);
          setUploading(false);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Failed to fetch image for cropping, falling back to direct URL:', err);
        setImage(value);
        setShowCropper(true);
        setUploading(false);
      }
    } else {
      alert('이미지가 설정되어 있지 않습니다.');
    }
  };

  const showCroppedImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploading(true);
    try {
      const croppedImage = await getCroppedImg(image!, croppedAreaPixels);
      if (croppedImage) {
        await uploadToStorage(croppedImage);
        setShowCropper(false);
        setImage(null);
      }
    } catch (e) {
      console.error(e);
      alert('이미지 크롭에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-4">
        <div className="min-w-[80px] h-20 rounded-xl bg-black border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center p-2 relative">
          {value ? <img src={value} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-white/10"><ImageIcon size={24} /></div>}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input 
            type="text" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            placeholder="Image URL or Upload"
            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500"
          />
          <div className="flex gap-2">
            <label className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest",
              uploading && "opacity-50 cursor-not-allowed"
            )}>
              <Upload size={14} />
              {uploading ? 'Uploading...' : 'Upload'}
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
            </label>
            <button 
              type="button"
              onClick={handleStartCrop}
              disabled={!value || uploading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <Crop size={14} />
              Crop
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCropper && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6">
            <div className="relative w-full max-w-4xl h-[60vh] bg-zinc-900 rounded-3xl overflow-hidden mb-8 shadow-2xl border border-white/5">
              <Cropper
                image={image!}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                zoomWithScroll={true}
              />
            </div>
            
            <div className="w-full max-w-md space-y-6 mb-8">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  value={zoom} 
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-purple-500 bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <p className="text-center text-[10px] text-white/20 uppercase tracking-widest">Use mouse scroll or slider to zoom</p>
            </div>

            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCropper(false);
                }} 
                className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-full font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={uploading}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (image) {
                    await uploadToStorage(image);
                    setShowCropper(false);
                    setImage(null);
                  }
                }} 
                className="px-10 py-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                {uploading && <Loader2 className="animate-spin" size={14} />}
                Use Original
              </button>
              <button 
                type="button" 
                onClick={showCroppedImage} 
                disabled={uploading}
                className="px-10 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
              >
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Crop size={14} />}
                {uploading ? 'Processing...' : 'Apply Crop'}
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { content, loading: contentLoading } = useSiteContent();
  const { performances, loading: perfLoading } = usePerformances();
  const { gallery, loading: galleryLoading } = useGallery();
  const { partners, loading: partnersLoading } = usePartners();
  const { members, loading: membersLoading } = useMembers();
  
  const [localContent, setLocalContent] = useState<SiteContent | null>(null);
  const [localMembers, setLocalMembers] = useState<Member[]>([]);
  const [localPerformances, setLocalPerformances] = useState<Performance[]>([]);
  const [localPartners, setLocalPartners] = useState<Partner[]>([]);
  const [localGallery, setLocalGallery] = useState<GalleryItem[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [saving, setSaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deletedMembers, setDeletedMembers] = useState<string[]>([]);
  const [deletedPerformances, setDeletedPerformances] = useState<string[]>([]);
  const [deletedPartners, setDeletedPartners] = useState<string[]>([]);
  const [deletedGallery, setDeletedGallery] = useState<string[]>([]);

  // Initialize local content
  React.useEffect(() => {
    if (content && !localContent) setLocalContent(content);
  }, [content, localContent]);

  useEffect(() => {
    if (members.length > 0 && localMembers.length === 0) {
      setLocalMembers(members);
    }
  }, [members, localMembers]);

  useEffect(() => {
    if (performances.length > 0 && localPerformances.length === 0) {
      setLocalPerformances(performances);
    }
  }, [performances, localPerformances]);

  useEffect(() => {
    if (partners.length > 0 && localPartners.length === 0) {
      setLocalPartners(partners);
    }
  }, [partners, localPartners]);

  useEffect(() => {
    if (gallery.length > 0 && localGallery.length === 0) {
      setLocalGallery(gallery);
    }
  }, [gallery, localGallery]);

  if (authLoading || contentLoading || perfLoading || galleryLoading || partnersLoading || membersLoading || !localContent) return null;
  if (!user || !isAdmin) return <Navigate to="/login" />;

  const handleUpdateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Manual save triggered for tab:', activeTab);
    setSaving(true);
    try {
      const batch = writeBatch(db);

      if (['home', 'about', 'contact'].includes(activeTab)) {
        if (localContent) {
          batch.set(doc(db, 'siteContent', 'main'), localContent);
        }
        
        if (activeTab === 'about') {
          localMembers.forEach(m => {
            const { id, ...data } = m;
            batch.set(doc(db, 'members', id), data);
          });
          deletedMembers.forEach(id => {
            batch.delete(doc(db, 'members', id));
          });
        }
      } else if (activeTab === 'performances') {
        localPerformances.forEach(p => {
          const { id, ...data } = p;
          batch.set(doc(db, 'performances', id), data);
        });
        deletedPerformances.forEach(id => {
          batch.delete(doc(db, 'performances', id));
        });
      } else if (activeTab === 'gallery') {
        localGallery.forEach(g => {
          const { id, ...data } = g;
          batch.set(doc(db, 'gallery', id), data);
        });
        deletedGallery.forEach(id => {
          batch.delete(doc(db, 'gallery', id));
        });
      } else if (activeTab === 'network') {
        localPartners.forEach(p => {
          const { id, ...data } = p;
          batch.set(doc(db, 'partners', id), data);
        });
        deletedPartners.forEach(id => {
          batch.delete(doc(db, 'partners', id));
        });
      }

      await batch.commit();
      
      // Clear deleted lists after successful save
      if (activeTab === 'about') setDeletedMembers([]);
      if (activeTab === 'performances') setDeletedPerformances([]);
      if (activeTab === 'gallery') setDeletedGallery([]);
      if (activeTab === 'network') setDeletedPartners([]);

      console.log('Changes saved successfully!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, activeTab);
    } finally {
      setSaving(false);
    }
  };

  const updateLocal = (path: string, val: any) => {
    if (!localContent) return;
    console.log(`Updating local state: ${path} = ${val}`);
    const keys = path.split('.');
    const newContent = JSON.parse(JSON.stringify(localContent));
    let current: any = newContent;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = val;
    setLocalContent(newContent);
  };

  // Collection Handlers
  const addPerformance = () => {
    const newId = doc(collection(db, 'performances')).id;
    const newItem = { 
      id: newId,
      title: 'NEW PERFORMANCE', 
      description: 'PERFORMANCE DESCRIPTION', 
      image: 'https://picsum.photos/seed/perf/800/450',
      order: localPerformances.length 
    };
    setLocalPerformances([...localPerformances, newItem]);
  };

  const addGallery = () => {
    const newId = doc(collection(db, 'gallery')).id;
    const newItem = { 
      id: newId,
      imageUrl: 'https://picsum.photos/seed/new/800/600', 
      description: 'PHOTO DESC', 
      order: localGallery.length 
    };
    setLocalGallery([...localGallery, newItem]);
  };

  const addPartner = () => {
    const newId = doc(collection(db, 'partners')).id;
    const newItem = { 
      id: newId,
      name: 'PARTNER NAME', 
      logo: 'https://picsum.photos/seed/logo/200/200', 
      description: 'DESC', 
      order: localPartners.length 
    };
    setLocalPartners([...localPartners, newItem]);
  };

  const addMember = () => {
    const newId = doc(collection(db, 'members')).id;
    const newItem = { 
      id: newId,
      name: 'NEW MEMBER', 
      bio: 'BIO TEXT', 
      image: 'https://picsum.photos/seed/member/400/500', 
      videoUrl: '', 
      links: [], 
      order: localMembers.length 
    };
    setLocalMembers([...localMembers, newItem]);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-white/5 p-6 flex flex-col">
        <div className="flex items-center gap-2 font-bold text-xl mb-12">
          <Settings className="w-5 h-5 text-purple-500" />
          <span>WHITRICKS</span>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'home', icon: LayoutDashboard, label: 'Home' },
            { id: 'about', icon: Users, label: 'About' },
            { id: 'performances', icon: Sparkles, label: 'Contents' },
            { id: 'gallery', icon: ImageIcon, label: 'Gallery' },
            { id: 'contact', icon: Share2, label: 'Contact' },
            { id: 'network', icon: Settings, label: 'Network' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                activeTab === tab.id ? "bg-purple-600 text-white" : "text-white/50 hover:bg-white/5"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-xs text-white/50 hover:text-white">
            <ArrowLeft size={16} /> View Website
          </Link>
          <button type="button" onClick={() => logout()} className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-400 hover:bg-red-400/10 rounded-xl">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleUpdateSite} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
                e.preventDefault();
              }
            }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold uppercase tracking-tighter">
                {activeTab === 'performances' ? 'Contents' : activeTab} Management
              </h2>
              {['home', 'about', 'performances', 'gallery', 'contact', 'network'].includes(activeTab) && (
                <div className="flex items-center gap-4">
                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest"
                      >
                        저장 성공
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <button type="submit" disabled={saving} className="bg-white text-black px-6 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-500 hover:text-white transition-all">
                    <Save size={14} /> {saving ? 'SAVING...' : 'SAVE'}
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'home' && (
              <div className="grid gap-8 bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Team Name (Supports 2 Lines)</label>
                  <textarea value={localContent.home.title} onChange={e => updateLocal('home.title', e.target.value)} rows={2} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Slogan (Supports 2 Lines)</label>
                  <textarea value={localContent.home.slogan} onChange={e => updateLocal('home.slogan', e.target.value)} rows={2} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 resize-none" />
                </div>
                <ImageUploader label="Team Logo" value={localContent.home.logo || ''} onChange={val => updateLocal('home.logo', val)} aspectRatio={undefined} />
                <ImageUploader label="Hero Background Image" value={localContent.home.bgImage} onChange={val => updateLocal('home.bgImage', val)} aspectRatio={16/9} />
                
                <div className="pt-8 border-t border-white/5 flex justify-end">
                  <button type="submit" disabled={saving} className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">
                    <Save size={14} /> {saving ? 'SAVING...' : 'SAVE HOME CHANGES'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-12">
                <div className="space-y-2 bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Performance History (Full Text)</label>
                  <textarea value={localContent.about.history} onChange={e => updateLocal('about.history', e.target.value)} rows={8} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 resize-none" />
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold uppercase tracking-tighter">Team Members</h3>
                    <div className="flex gap-4">
                      <button 
                        type="button" 
                        onClick={addMember}
                        className="px-4 py-2 bg-purple-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                      >
                        <Plus size={14} /> Add Member
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newItems: Member[] = [];
                          for(let i=0; i<5; i++) {
                            const newId = doc(collection(db, 'members')).id;
                            newItems.push({
                              id: newId,
                              name: `Member ${localMembers.length + i + 1}`,
                              bio: `This is a sample bio for member ${localMembers.length + i + 1}. They are a key part of the WHITRICKS team.`,
                              image: `https://picsum.photos/seed/member_${Date.now()}_${i}/400/500`,
                              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                              links: ['Instagram', 'Portfolio'],
                              order: localMembers.length + i
                            });
                          }
                          setLocalMembers(prev => [...prev, ...newItems]);
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                      >
                        Seed 5 Members
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {localMembers.map((member, idx) => (
                      <div key={member.id} className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6 relative group">
                        <button 
                          type="button"
                          onClick={() => {
                            if (!confirm('정말 삭제하시겠습니까?')) return;
                            setDeletedMembers(prev => [...prev, member.id]);
                            setLocalMembers(prev => prev.filter(m => m.id !== member.id));
                          }}
                          className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Member {idx + 1}</h4>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Name</label>
                          <LocalInput 
                            value={member.name} 
                            onSave={async (val: string) => {
                              setLocalMembers(prev => prev.map(m => m.id === member.id ? { ...m, name: val } : m));
                            }} 
                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm" 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Bio (Full Text)</label>
                          <LocalInput 
                            value={member.bio} 
                            textarea
                            onSave={async (val: string) => {
                              setLocalMembers(prev => prev.map(m => m.id === member.id ? { ...m, bio: val } : m));
                            }} 
                            rows={6} 
                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm resize-none" 
                          />
                        </div>
                        
                        <ImageUploader 
                          label="Profile Image" 
                          value={member.image} 
                          onChange={(val) => {
                            setLocalMembers(prev => prev.map(m => m.id === member.id ? { ...m, image: val } : m));
                          }} 
                          aspectRatio={4/5} 
                        />
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Video URL</label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                              <LocalInput 
                                value={member.videoUrl} 
                                onSave={async (val: string) => {
                                  setLocalMembers(prev => prev.map(m => m.id === member.id ? { ...m, videoUrl: val } : m));
                                }} 
                                className="w-full bg-black border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm" 
                                placeholder="YouTube/Vimeo URL"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-12 border-t border-white/5 flex justify-end">
                    <button type="submit" disabled={saving} className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">
                      <Save size={14} /> {saving ? 'SAVING...' : 'SAVE ABOUT CHANGES'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performances' && (
              <div className="space-y-6">
                <button type="button" onClick={addPerformance} className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-xs font-bold text-white/30 hover:text-white hover:border-purple-500 transition-all uppercase tracking-widest">+ Add Performance</button>
                {localPerformances.map(p => (
                  <div key={p.id} className="bg-zinc-900 p-8 rounded-3xl border border-white/5 space-y-6 relative">
                    <button 
                      type="button" 
                      onClick={() => {
                        if (!confirm('정말 삭제하시겠습니까?')) return;
                        setDeletedPerformances(prev => [...prev, p.id]);
                        setLocalPerformances(prev => prev.filter(item => item.id !== p.id));
                      }} 
                      className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <ImageUploader 
                          label="Performance Image" 
                          value={p.image} 
                          onChange={(val) => {
                            setLocalPerformances(prev => prev.map(item => item.id === p.id ? { ...item, image: val } : item));
                          }} 
                          aspectRatio={16/9} 
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Title</label>
                          <LocalInput 
                            value={p.title} 
                            onSave={async (val: string) => {
                              setLocalPerformances(prev => prev.map(item => item.id === p.id ? { ...item, title: val } : item));
                            }} 
                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-sm font-bold" 
                            placeholder="Performance Title"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Description</label>
                          <LocalInput 
                            value={p.description} 
                            textarea
                            onSave={async (val: string) => {
                              setLocalPerformances(prev => prev.map(item => item.id === p.id ? { ...item, description: val } : item));
                            }} 
                            rows={4} 
                            className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-xs text-white/50 resize-none" 
                            placeholder="Performance Description"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {localPerformances.length > 0 && (
                  <div className="pt-12 border-t border-white/5 flex justify-end">
                    <button type="submit" disabled={saving} className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">
                      <Save size={14} /> {saving ? 'SAVING...' : 'SAVE CONTENTS CHANGES'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div 
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.add('border-purple-500', 'bg-purple-500/5');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-purple-500', 'bg-purple-500/5');
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('border-purple-500', 'bg-purple-500/5');
                      
                      const files = Array.from(e.dataTransfer.files);
                      const imageFiles = files.filter(f => f.type.startsWith('image/'));
                      
                      if (imageFiles.length === 0) return;

                      setGalleryUploading(true);
                      try {
                        const newItems: GalleryItem[] = [];
                        for (const file of imageFiles) {
                          const downloadUrl = await uploadFile(file);
                          const newId = doc(collection(db, 'gallery')).id;
                          newItems.push({
                            id: newId,
                            imageUrl: downloadUrl,
                            description: file.name.split('.')[0],
                            order: localGallery.length + newItems.length
                          });
                        }
                        setLocalGallery(prev => [...prev, ...newItems]);
                      } catch (err) {
                        console.error('Gallery drop upload failed:', err);
                        alert('이미지 업로드에 실패했습니다.');
                      } finally {
                        setGalleryUploading(false);
                      }
                    }}
                    className={cn(
                      "flex-1 py-12 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all group cursor-pointer hover:border-purple-500/50",
                      galleryUploading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-purple-500 transition-colors">
                      {galleryUploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                        {galleryUploading ? 'Uploading...' : 'Drag & Drop Photos Here'}
                      </p>
                      <p className="text-[10px] text-white/20 mt-1 uppercase tracking-widest">Multiple files supported</p>
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                      id="gallery-upload"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        
                        setGalleryUploading(true);
                        try {
                          const newItems: GalleryItem[] = [];
                          for (const file of files) {
                            const downloadUrl = await uploadFile(file);
                            const newId = doc(collection(db, 'gallery')).id;
                            newItems.push({
                              id: newId,
                              imageUrl: downloadUrl,
                              description: file.name.split('.')[0],
                              order: localGallery.length + newItems.length
                            });
                          }
                          setLocalGallery(prev => [...prev, ...newItems]);
                        } catch (err) {
                          console.error('Gallery input upload failed:', err);
                          alert('이미지 업로드에 실패했습니다.');
                        } finally {
                          setGalleryUploading(false);
                        }
                      }}
                    />
                    <label htmlFor="gallery-upload" className="mt-2 px-6 py-2 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer">Or Browse Files</label>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => {
                      const newItems: GalleryItem[] = [];
                      for(let i=0; i<30; i++) {
                        const newId = doc(collection(db, 'gallery')).id;
                        newItems.push({ 
                          id: newId,
                          imageUrl: `https://picsum.photos/seed/magic_seed_${Date.now()}_${i}/800/${Math.floor(Math.random() * 400) + 600}`, 
                          description: `Sample Magic Photo ${i+1}`, 
                          order: localGallery.length + i 
                        });
                      }
                      setLocalGallery(prev => [...prev, ...newItems]);
                    }} 
                    className="px-6 py-4 bg-purple-600/20 text-purple-400 rounded-2xl text-xs font-bold hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest self-start"
                  >
                    Seed 30
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {localGallery.map(g => (
                    <div key={g.id} className="bg-zinc-900 p-6 rounded-2xl border border-white/5 space-y-4">
                      <div className="aspect-video rounded-lg overflow-hidden bg-black">
                        <img src={g.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <ImageUploader 
                        label="Gallery Image" 
                        value={g.imageUrl} 
                        onChange={(val) => {
                          setLocalGallery(prev => prev.map(item => item.id === g.id ? { ...item, imageUrl: val } : item));
                        }} 
                      />
                      <div className="space-y-2">
                        <LocalInput 
                          value={g.description} 
                          onSave={async (val: string) => {
                            setLocalGallery(prev => prev.map(item => item.id === g.id ? { ...item, description: val } : item));
                          }} 
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px]" 
                          placeholder="Description" 
                        />
                        <div className="flex justify-between items-center pt-2">
                          <button 
                            type="button" 
                            onClick={() => {
                              if (!confirm('정말 삭제하시겠습니까?')) return;
                              setDeletedGallery(prev => [...prev, g.id]);
                              setLocalGallery(prev => prev.filter(item => item.id !== g.id));
                            }}
                            className="text-white/20 hover:text-red-500 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-12 border-t border-white/5 flex justify-end">
                  <button type="submit" disabled={saving} className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">
                    <Save size={14} /> {saving ? 'SAVING...' : 'SAVE GALLERY CHANGES'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="grid gap-6 bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Section Title (e.g. Let's Connect.)</label>
                  <input value={localContent.contact.title} onChange={e => updateLocal('contact.title', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" placeholder="Let's Connect." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Description</label>
                  <textarea 
                    value={localContent.contact.description} 
                    onChange={e => updateLocal('contact.description', e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 min-h-[100px]" 
                    placeholder="Reach out for bookings, collaborations, or just to say hello..."
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Email</label>
                    <input value={localContent.contact.email} onChange={e => updateLocal('contact.email', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Phone</label>
                    <input value={localContent.contact.phone} onChange={e => updateLocal('contact.phone', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Address</label>
                  <input value={localContent.contact.address} onChange={e => updateLocal('contact.address', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">YouTube URL</label>
                    <input value={localContent.contact.youtube} onChange={e => updateLocal('contact.youtube', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Instagram URL</label>
                    <input value={localContent.contact.instagram} onChange={e => updateLocal('contact.instagram', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Naver Blog URL</label>
                    <input value={localContent.contact.naverBlog} onChange={e => updateLocal('contact.naverBlog', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Naver Place URL</label>
                    <input value={localContent.contact.naverPlace} onChange={e => updateLocal('contact.naverPlace', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex justify-end">
                  <button type="submit" disabled={saving} className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">
                    <Save size={14} /> {saving ? 'SAVING...' : 'SAVE CONTACT CHANGES'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-6">
                <button type="button" onClick={addPartner} className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-xs font-bold text-white/30 hover:text-white hover:border-purple-500 transition-all uppercase tracking-widest">+ Add Partner/Network</button>
                <div className="grid md:grid-cols-2 gap-4">
                  {localPartners.map(p => (
                    <div key={p.id} className="bg-zinc-900 p-6 rounded-2xl border border-white/5 flex gap-4 items-center relative">
                      <div className="w-16 h-16 rounded-full bg-black p-2 flex-shrink-0">
                        <img src={p.logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <LocalInput 
                          value={p.name} 
                          onSave={async (val: string) => {
                            setLocalPartners(prev => prev.map(item => item.id === p.id ? { ...item, name: val } : item));
                          }} 
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-1 text-xs font-bold" 
                        />
                        <LocalInput 
                          value={p.description} 
                          onSave={async (val: string) => {
                            setLocalPartners(prev => prev.map(item => item.id === p.id ? { ...item, description: val } : item));
                          }} 
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-1 text-[10px] text-white/40" 
                        />
                        <ImageUploader 
                          label="Logo" 
                          value={p.logo} 
                          onChange={(val) => {
                            setLocalPartners(prev => prev.map(item => item.id === p.id ? { ...item, logo: val } : item));
                          }} 
                          aspectRatio={1} 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (!confirm('정말 삭제하시겠습니까?')) return;
                          setDeletedPartners(prev => [...prev, p.id]);
                          setLocalPartners(prev => prev.filter(item => item.id !== p.id));
                        }} 
                        className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-12 border-t border-white/5 flex justify-end">
                  <button type="submit" disabled={saving} className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">
                    <Save size={14} /> {saving ? 'SAVING...' : 'SAVE NETWORK CHANGES'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
