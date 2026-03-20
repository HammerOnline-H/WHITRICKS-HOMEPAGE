import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, collection, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, logout } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { useAuth } from '../hooks/useAuth';
import { useSiteContent, usePerformances, useGallery, usePartners, useMembers } from '../hooks/useData';
import { Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Sparkles, Settings, LogOut, Save, Plus, Trash2, ArrowLeft, Image as ImageIcon, Share2, Upload, Crop, Video } from 'lucide-react';
import { cn } from '../lib/utils';
import { Performance, GalleryItem, Partner, SiteContent, Member } from '../types';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../lib/cropImage';

function ImageUploader({ label, value, onChange, aspectRatio }: { label: string, value: string, onChange: (val: string) => void, aspectRatio?: number }) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);

  const onCropComplete = useCallback((_area: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result as string;
        setImage(result);
        // We don't automatically show cropper anymore, just update the preview
        onChange(result);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleStartCrop = () => {
    if (value) {
      setImage(value);
      setShowCropper(true);
    }
  };

  const showCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(image!, croppedAreaPixels);
      if (croppedImage) {
        onChange(croppedImage);
        setShowCropper(false);
        setImage(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-4">
        <div className="min-w-[80px] h-20 rounded-xl bg-black border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
          {value ? <img src={value} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-white/10"><ImageIcon size={24} /></div>}
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
            <label className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-widest">
              <Upload size={14} />
              Upload
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
            <button 
              type="button"
              onClick={handleStartCrop}
              disabled={!value}
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
              <button onClick={() => setShowCropper(false)} className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-full font-bold text-xs uppercase tracking-widest transition-colors">Cancel</button>
              <button onClick={showCroppedImage} className="px-10 py-4 bg-purple-600 hover:bg-purple-700 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all">
                <Crop size={14} /> Apply Crop
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
  
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'performances' | 'gallery' | 'contact' | 'network'>('home');
  const [saving, setSaving] = useState(false);
  const [localContent, setLocalContent] = useState<SiteContent | null>(null);

  // Initialize local content
  React.useEffect(() => {
    if (content && !localContent) setLocalContent(content);
  }, [content]);

  if (authLoading || contentLoading || perfLoading || galleryLoading || partnersLoading || membersLoading || !localContent) return null;
  if (!user || !isAdmin) return <Navigate to="/login" />;

  const handleUpdateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const path = 'siteContent/main';
    try {
      await setDoc(doc(db, 'siteContent', 'main'), localContent);
      alert('Updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  const updateLocal = (path: string, val: any) => {
    const keys = path.split('.');
    const newContent = { ...localContent };
    let current: any = newContent;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = val;
    setLocalContent(newContent);
  };

  // Collection Handlers
  const addPerformance = async () => {
    const path = 'performances';
    try {
      await addDoc(collection(db, path), { category: 'NEW FIELD', repertoires: 'REPERTOIRE LIST', order: performances.length });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };
  const addGallery = async () => {
    const path = 'gallery';
    try {
      await addDoc(collection(db, path), { imageUrl: 'https://picsum.photos/seed/new/800/600', description: 'PHOTO DESC', order: gallery.length });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };
  const addPartner = async () => {
    const path = 'partners';
    try {
      await addDoc(collection(db, path), { name: 'PARTNER NAME', logo: 'https://picsum.photos/seed/logo/200/200', description: 'DESC', order: partners.length });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };
  const addMember = async () => {
    const path = 'members';
    try {
      await addDoc(collection(db, path), { name: 'NEW MEMBER', bio: 'BIO TEXT', image: 'https://picsum.photos/seed/member/400/500', videoUrl: '', links: [], order: members.length });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
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
            { id: 'performances', icon: Sparkles, label: 'Performances' },
            { id: 'gallery', icon: ImageIcon, label: 'Gallery' },
            { id: 'contact', icon: Share2, label: 'Contact' },
            { id: 'network', icon: Settings, label: 'Network' },
          ].map((tab) => (
            <button
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
          <button onClick={() => logout()} className="w-full flex items-center gap-3 px-4 py-3 text-xs text-red-400 hover:bg-red-400/10 rounded-xl">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleUpdateSite} className="space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold uppercase tracking-tighter">{activeTab} Management</h2>
              {['home', 'about', 'contact'].includes(activeTab) && (
                <button disabled={saving} className="bg-white text-black px-6 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-purple-500 hover:text-white transition-all">
                  <Save size={14} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
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
                        onClick={async () => {
                          const path = 'members';
                          try {
                            for(let i=0; i<5; i++) {
                              await addDoc(collection(db, path), {
                                name: `Member ${members.length + i + 1}`,
                                bio: `This is a sample bio for member ${members.length + i + 1}. They are a key part of the WHITRICKS team.`,
                                image: `https://picsum.photos/seed/member_${Date.now()}_${i}/400/500`,
                                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                                links: ['Instagram', 'Portfolio'],
                                order: members.length + i
                              });
                            }
                          } catch (err) {
                            handleFirestoreError(err, OperationType.CREATE, path);
                          }
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                      >
                        Seed 5 Members
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {members.map((member, idx) => (
                      <div key={member.id} className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 space-y-6 relative group">
                        <button 
                          type="button"
                          onClick={async () => {
                            const path = `members/${member.id}`;
                            try {
                              await deleteDoc(doc(db, 'members', member.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, path);
                            }
                          }}
                          className="absolute top-4 right-4 text-white/20 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Member {idx + 1}</h4>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Name</label>
                          <input 
                            value={member.name} 
                            onChange={async (e) => {
                              const path = `members/${member.id}`;
                              try {
                                await updateDoc(doc(db, 'members', member.id), { name: e.target.value });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.UPDATE, path);
                              }
                            }} 
                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm" 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Bio (Full Text)</label>
                          <textarea 
                            value={member.bio} 
                            onChange={async (e) => {
                              const path = `members/${member.id}`;
                              try {
                                await updateDoc(doc(db, 'members', member.id), { bio: e.target.value });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.UPDATE, path);
                              }
                            }} 
                            rows={6} 
                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm resize-none" 
                          />
                        </div>
                        
                        <ImageUploader 
                          label="Profile Image" 
                          value={member.image} 
                          onChange={async (val) => {
                            const path = `members/${member.id}`;
                            try {
                              await updateDoc(doc(db, 'members', member.id), { image: val });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, path);
                            }
                          }} 
                          aspectRatio={4/5} 
                        />
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-white/30 uppercase">Video URL</label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                              <input 
                                value={member.videoUrl} 
                                onChange={async (e) => {
                                  const path = `members/${member.id}`;
                                  try {
                                    await updateDoc(doc(db, 'members', member.id), { videoUrl: e.target.value });
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.UPDATE, path);
                                  }
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
                </div>
              </div>
            )}

            {activeTab === 'performances' && (
              <div className="space-y-6">
                <button type="button" onClick={addPerformance} className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-xs font-bold text-white/30 hover:text-white hover:border-purple-500 transition-all uppercase tracking-widest">+ Add Performance Category</button>
                {performances.map(p => (
                  <div key={p.id} className="bg-zinc-900 p-6 rounded-2xl border border-white/5 flex gap-4">
                    <div className="flex-1 space-y-4">
                      <input 
                        value={p.category} 
                        onChange={async (e) => {
                          const path = `performances/${p.id}`;
                          try {
                            await updateDoc(doc(db, 'performances', p.id), { category: e.target.value });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, path);
                          }
                        }} 
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-sm font-bold" 
                      />
                      <textarea 
                        value={p.repertoires} 
                        onChange={async (e) => {
                          const path = `performances/${p.id}`;
                          try {
                            await updateDoc(doc(db, 'performances', p.id), { repertoires: e.target.value });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, path);
                          }
                        }} 
                        rows={3} 
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-xs text-white/50 resize-none" 
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={async () => {
                        const path = `performances/${p.id}`;
                        try {
                          await deleteDoc(doc(db, 'performances', p.id));
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, path);
                        }
                      }} 
                      className="text-white/20 hover:text-red-500 transition-colors self-start"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <button type="button" onClick={addGallery} className="flex-1 py-4 border border-dashed border-white/10 rounded-2xl text-xs font-bold text-white/30 hover:text-white hover:border-purple-500 transition-all uppercase tracking-widest">+ Add Gallery Photo</button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      const path = 'gallery';
                      try {
                        for(let i=0; i<30; i++) {
                          await addDoc(collection(db, path), { 
                            imageUrl: `https://picsum.photos/seed/magic_seed_${Date.now()}_${i}/800/${Math.floor(Math.random() * 400) + 600}`, 
                            description: `Sample Magic Photo ${i+1}`, 
                            order: gallery.length + i 
                          });
                        }
                      } catch (err) {
                        handleFirestoreError(err, OperationType.CREATE, path);
                      }
                    }} 
                    className="px-6 py-4 bg-purple-600/20 text-purple-400 rounded-2xl text-xs font-bold hover:bg-purple-600 hover:text-white transition-all uppercase tracking-widest"
                  >
                    Seed 30 Photos
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {gallery.map(g => (
                    <div key={g.id} className="bg-zinc-900 p-6 rounded-2xl border border-white/5 space-y-4">
                      <div className="aspect-video rounded-lg overflow-hidden bg-black">
                        <img src={g.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <ImageUploader 
                        label="Gallery Image" 
                        value={g.imageUrl} 
                        onChange={async (val) => {
                          const path = `gallery/${g.id}`;
                          try {
                            await updateDoc(doc(db, 'gallery', g.id), { imageUrl: val });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, path);
                          }
                        }} 
                      />
                      <div className="flex gap-2">
                        <input 
                          value={g.description} 
                          onChange={async (e) => {
                            const path = `gallery/${g.id}`;
                            try {
                              await updateDoc(doc(db, 'gallery', g.id), { description: e.target.value });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, path);
                            }
                          }} 
                          className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px]" 
                          placeholder="Description" 
                        />
                        <button 
                          type="button" 
                          onClick={async () => {
                            const path = `gallery/${g.id}`;
                            try {
                              await deleteDoc(doc(db, 'gallery', g.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, path);
                            }
                          }} 
                          className="text-white/20 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="grid gap-6 bg-zinc-900/50 p-8 rounded-3xl border border-white/5">
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
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">YouTube URL</label>
                  <input value={localContent.contact.youtube} onChange={e => updateLocal('contact.youtube', e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500" />
                </div>
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-6">
                <button type="button" onClick={addPartner} className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-xs font-bold text-white/30 hover:text-white hover:border-purple-500 transition-all uppercase tracking-widest">+ Add Partner/Network</button>
                <div className="grid md:grid-cols-2 gap-4">
                  {partners.map(p => (
                    <div key={p.id} className="bg-zinc-900 p-6 rounded-2xl border border-white/5 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-full bg-black p-2 flex-shrink-0">
                        <img src={p.logo} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          value={p.name} 
                          onChange={async (e) => {
                            const path = `partners/${p.id}`;
                            try {
                              await updateDoc(doc(db, 'partners', p.id), { name: e.target.value });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, path);
                            }
                          }} 
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-1 text-xs font-bold" 
                        />
                        <input 
                          value={p.description} 
                          onChange={async (e) => {
                            const path = `partners/${p.id}`;
                            try {
                              await updateDoc(doc(db, 'partners', p.id), { description: e.target.value });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, path);
                            }
                          }} 
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-1 text-[10px] text-white/40" 
                        />
                        <ImageUploader 
                          label="Logo" 
                          value={p.logo} 
                          onChange={async (val) => {
                            const path = `partners/${p.id}`;
                            try {
                              await updateDoc(doc(db, 'partners', p.id), { logo: val });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, path);
                            }
                          }} 
                          aspectRatio={1} 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={async () => {
                          const path = `partners/${p.id}`;
                          try {
                            await deleteDoc(doc(db, 'partners', p.id));
                          } catch (err) {
                            handleFirestoreError(err, OperationType.DELETE, path);
                          }
                        }} 
                        className="text-white/20 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
