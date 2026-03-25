import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, collection, addDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { db, logout, storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { useAuth } from '../hooks/useAuth';
import { useSiteContent, usePerformances, useGallery, usePartners, useMembers } from '../hooks/useData';
import { Navigate, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Sparkles, Settings, LogOut, Save, Plus, Trash2, ArrowLeft, Image as ImageIcon, Share2, Upload, Crop, Video, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Performance, GalleryItem, Partner, SiteContent, Member } from '../types';
import Cropper from 'react-easy-crop';
import getCroppedImg, { createImage } from '../lib/cropImage';
import { addLog } from '../lib/logger';

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

async function compressImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

async function uploadFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
  if (!storage) {
    addLog('Storage not initialized', 'error');
    throw new Error('Firebase Storage is not initialized. Please check your configuration.');
  }
  
  let fileToUpload: File | Blob = file;
  
  // Compress if it's an image and larger than 500KB
  if (file.type.startsWith('image/') && file.size > 500 * 1024) {
    addLog(`Compressing image: ${file.name} (${file.size} bytes)`);
    try {
      fileToUpload = await compressImage(file, 1024, 1024, 0.6); // More aggressive
      addLog(`Compression successful: ${fileToUpload.size} bytes`);
    } catch (err) {
      addLog(`Compression failed, uploading original: ${err}`, 'error');
    }
  }

  // Sanitize file name
  const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}-${safeName}`;
  const storageRef = ref(storage, fileName);
  
  addLog(`Starting upload: ${fileName} (Size: ${fileToUpload.size} bytes)`);
  
  try {
    // Using uploadBytes for simpler, more robust upload in restricted environments
    const uploadPromise = uploadBytes(storageRef, fileToUpload);
    
    // Set a timeout for the upload (120 seconds)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('업로드 시간이 초과되었습니다. CORS 설정이나 네트워크 상태를 확인해주세요. (120초 경과)')), 120000);
    });

    const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    addLog(`Upload successful! URL: ${downloadURL}`);
    if (onProgress) onProgress(100);
    return downloadURL;
  } catch (error: any) {
    const errData = {
      code: error.code,
      message: error.message,
      name: error.name,
      serverResponse: error.serverResponse
    };
    addLog(`Upload failed: ${JSON.stringify(errData)}`, 'error');
    
    if (error.code === 'storage/unauthorized') {
      throw new Error('업로드 권한이 없습니다. Firebase Storage 보안 규칙을 확인해주세요.');
    } else if (error.code === 'storage/retry-limit-exceeded' || error.message.includes('초과')) {
      throw new Error('업로드 시간이 초과되었습니다. CORS 설정이 되어있는지 확인이 필요합니다.');
    } else {
      throw new Error(`업로드 실패 (${error.code}): ${error.message}`);
    }
  }
}

async function compressBase64(base64: string, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<string> {
  try {
    const img = await createImage(base64);
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    addLog(`compressBase64 failed, returning original: ${err}`, 'info');
    return base64;
  }
}

async function uploadBase64(base64: string, onProgress?: (p: number) => void): Promise<string> {
  if (!storage) {
    addLog('Storage not initialized', 'error');
    throw new Error('Firebase Storage is not initialized. Please check your configuration.');
  }
  
  addLog(`Uploading base64 image, initial length: ${base64.length}`);
  
  try {
    // Compress if it's likely a large image (rough estimate from base64 length)
    // Skip if it's already small enough (roughly < 500KB)
    let processedBase64 = base64;
    if (base64.length > 0.7 * 1024 * 1024) { 
      addLog('Compressing large base64 image...');
      processedBase64 = await compressBase64(base64, 1024, 1024, 0.6); // More aggressive
      addLog(`Compression finished, new length: ${processedBase64.length}`);
    }

    // Convert base64 to Blob for more reliable upload
    const response = await fetch(processedBase64);
    const blob = await response.blob();
    
    addLog(`Converted base64 to blob, size: ${blob.size}`);
    
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, fileName);
    
    addLog(`Starting base64 upload: ${fileName} (Size: ${blob.size} bytes)`);

    try {
      const uploadPromise = uploadBytes(storageRef, blob);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('이미지 업로드 시간이 초과되었습니다. (120초 경과)')), 120000);
      });

      const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      addLog(`Base64 upload successful! URL: ${downloadURL}`);
      if (onProgress) onProgress(100);
      return downloadURL;
    } catch (error: any) {
      addLog(`Base64 upload failed: ${error.code} - ${error.message}`, 'error');
      if (error.code === 'storage/unauthorized') {
        throw new Error('업로드 권한이 없습니다. Firebase Storage 보안 규칙을 확인해주세요.');
      } else if (error.code === 'storage/retry-limit-exceeded' || error.message.includes('초과')) {
        throw new Error('업로드 시간이 초과되었습니다. CORS 설정이나 네트워크를 확인해주세요.');
      } else {
        throw new Error(`업로드 실패: ${error.message}`);
      }
    }
  } catch (err: any) {
    addLog(`uploadBase64 processing failed: ${err}`, 'error');
    throw new Error(`이미지 처리 실패: ${err.message || err}`);
  }
}

function MultiImageUploader({ label, values, onChange, max = 5, aspectRatio }: { label: string, values: string[], onChange: (vals: string[]) => void, max?: number, aspectRatio?: number }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const remaining = max - values.length;
      const toUpload = files.slice(0, remaining);

      if (toUpload.length === 0) {
        alert(`최대 ${max}장까지 업로드 가능합니다.`);
        return;
      }

      setUploading(true);
      setProgress(0);
      try {
        const urls = [];
        for (let i = 0; i < toUpload.length; i++) {
          const file = toUpload[i];
          const url = await uploadFile(file, (p) => {
            // Overall progress calculation
            const overall = ((i / toUpload.length) * 100) + (p / toUpload.length);
            setProgress(overall);
          });
          urls.push(url);
        }
        onChange([...values, ...urls]);
      } catch (error: any) {
        addLog(`Multi upload failed: ${error}`, 'error');
        alert(`이미지 업로드에 실패했습니다: ${error.message || error}`);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    }
  };

  const removeImage = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newValues = [...values];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newValues.length) return;
    [newValues[index], newValues[targetIndex]] = [newValues[targetIndex], newValues[index]];
    onChange(newValues);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label} ({values.length}/{max})</label>
        {values.length < max && (
          <label className="cursor-pointer bg-white/5 hover:bg-white/10 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2">
            <Plus size={12} /> Add Images
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {values.map((url, idx) => (
          <div key={idx} className="relative group aspect-square bg-black rounded-xl border border-white/10 overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button type="button" onClick={() => moveImage(idx, 'up')} disabled={idx === 0} className="p-1 hover:text-purple-400 disabled:opacity-30">
                <ArrowLeft size={14} className="rotate-90" />
              </button>
              <button type="button" onClick={() => moveImage(idx, 'down')} disabled={idx === values.length - 1} className="p-1 hover:text-purple-400 disabled:opacity-30">
                <ArrowLeft size={14} className="-rotate-90" />
              </button>
              <button type="button" onClick={() => removeImage(idx)} className="p-1 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
            {idx === 0 && (
              <div className="absolute top-2 left-2 bg-purple-600 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">Main</div>
            )}
          </div>
        ))}
        {uploading && (
          <div className="aspect-square bg-black rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-purple-500" size={20} />
            <span className="text-[8px] font-bold text-white/50">{Math.round(progress)}%</span>
            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageUploader({ label, value, onChange, aspectRatio }: { label: string, value: string, onChange: (val: string) => void, aspectRatio?: number }) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onCropComplete = useCallback((_area: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const uploadToStorage = async (dataUrl: string) => {
    setUploading(true);
    setProgress(0);
    try {
      const downloadUrl = await uploadBase64(dataUrl, (p) => setProgress(p));
      onChange(downloadUrl);
    } catch (error: any) {
      addLog(`Upload failed: ${error}`, 'error');
      alert(`이미지 업로드에 실패했습니다: ${error.message || error}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        alert('파일이 너무 큽니다. 50MB 이하의 이미지를 사용해주세요.');
        return;
      }

      setUploading(true);
      try {
        let fileToProcess = file;
        // Pre-compress if the file is very large to avoid memory issues in the cropper
        if (file.size > 2 * 1024 * 1024) {
          addLog('Pre-compressing large file for cropper...');
          const compressedBlob = await compressImage(file, 2048, 2048, 0.8);
          fileToProcess = new File([compressedBlob], file.name, { type: 'image/jpeg' });
        }

        const objectUrl = URL.createObjectURL(fileToProcess);
        setImage(objectUrl);
        setShowCropper(true);
      } catch (err) {
        addLog(`File processing failed: ${err}`, 'error');
        alert('파일 처리에 실패했습니다.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleStartCrop = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value) {
      setUploading(true);
      try {
        addLog(`Starting crop for: ${value}`);
        // Try to fetch the image to avoid CORS issues with the cropper
        const response = await fetch(value, { mode: 'cors' });
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImage(objectUrl);
        setShowCropper(true);
      } catch (err) {
        addLog(`Failed to fetch image for cropping, falling back to direct URL: ${err}`, 'info');
        setImage(value);
        setShowCropper(true);
      } finally {
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
      addLog(`Crop failed: ${e}`, 'error');
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
                  if (image && image.startsWith('blob:')) {
                    URL.revokeObjectURL(image);
                  }
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
                    // If it's a blob URL, we need to convert it back or use the original file
                    // For simplicity, we'll fetch it
                    const response = await fetch(image);
                    const blob = await response.blob();
                    const file = new File([blob], 'original.jpg', { type: 'image/jpeg' });
                    await uploadFile(file, (p) => setProgress(p)).then(url => {
                      onChange(url);
                    });
                    
                    if (image.startsWith('blob:')) {
                      URL.revokeObjectURL(image);
                    }
                    setShowCropper(false);
                    setImage(null);
                  }
                }} 
                className="px-10 py-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                {uploading && <Loader2 className="animate-spin" size={14} />}
                {uploading ? `${Math.round(progress)}%` : 'Use Original'}
              </button>
              <button 
                type="button" 
                onClick={async (e) => {
                  await showCroppedImage(e);
                  if (image && image.startsWith('blob:')) {
                    URL.revokeObjectURL(image);
                  }
                }} 
                disabled={uploading}
                className="px-10 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
              >
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Crop size={14} />}
                {uploading ? `${Math.round(progress)}%` : 'Apply Crop'}
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
  const [galleryProgress, setGalleryProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const [deletedMembers, setDeletedMembers] = useState<string[]>([]);
  const [deletedPerformances, setDeletedPerformances] = useState<string[]>([]);
  const [deletedPartners, setDeletedPartners] = useState<string[]>([]);
  const [deletedGallery, setDeletedGallery] = useState<string[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<{time: string, msg: string, type: 'info' | 'error'}[]>([]);

  useEffect(() => {
    const handleLog = (e: any) => {
      const { msg, type } = e.detail;
      const time = new Date().toLocaleTimeString();
      setDebugLogs(prev => [{time, msg, type}, ...prev].slice(0, 50));
    };
    window.addEventListener('app-log', handleLog);
    return () => window.removeEventListener('app-log', handleLog);
  }, []);

  // Check storage initialization
  useEffect(() => {
    // Global error listener for debug console
    const handleError = (event: ErrorEvent) => {
      addLog(`Global Error: ${event.message}`, 'error');
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog(`Unhandled Rejection: ${event.reason}`, 'error');
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    if (!storage) {
      const err = 'Firebase Storage가 초기화되지 않았습니다. 설정을 확인해주세요.';
      setStorageError(err);
      addLog(err, 'error');
    } else if (!storage.app.options.storageBucket) {
      const err = 'Storage Bucket이 설정되지 않았습니다. firebase-applet-config.json을 확인해주세요.';
      setStorageError(err);
      addLog(err, 'error');
    } else {
      addLog(`Storage initialized with bucket: ${storage.app.options.storageBucket}`);
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

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
    addLog(`Manual save triggered for tab: ${activeTab}`);
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
      addLog('Changes saved successfully!');
      
      // Clear deleted lists after successful save
      if (activeTab === 'about') setDeletedMembers([]);
      if (activeTab === 'performances') setDeletedPerformances([]);
      if (activeTab === 'gallery') setDeletedGallery([]);
      if (activeTab === 'network') setDeletedPartners([]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      addLog(`Save failed: ${err.message}`, 'error');
      handleFirestoreError(err, OperationType.WRITE, activeTab);
    } finally {
      setSaving(false);
    }
  };

  const updateLocal = (path: string, val: any) => {
    if (!localContent) return;
    addLog(`Updating local state: ${path} = ${val}`);
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
      images: ['https://picsum.photos/seed/perf/800/450'],
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
      images: [],
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

        {/* Debug Console Toggle */}
        <div className="mt-4 px-4 space-y-2">
          <button 
            type="button"
            onClick={async () => {
              if (!storage) {
                addLog('Storage not initialized', 'error');
                return;
              }
              setTestLoading(true);
              const bucketName = storage.app.options.storageBucket;
              addLog(`Testing Storage connection to bucket: ${bucketName}...`);
              try {
                const testRef = ref(storage, `test/connection-${Date.now()}.txt`);
                const blob = new Blob(['Connection Test'], { type: 'text/plain' });
                await uploadBytes(testRef, blob);
                addLog('Storage Connection Test: SUCCESS! You can upload files.', 'info');
                alert('저장소 연결 성공! 이제 이미지 업로드가 가능합니다.');
              } catch (err: any) {
                addLog(`Storage Connection Test: FAILED - ${err.code}: ${err.message}`, 'error');
                if (err.code === 'storage/retry-limit-exceeded') {
                  addLog('HINT: Firebase Console의 Storage 탭에서 [시작하기]를 눌렀는지 확인해주세요.', 'info');
                }
                alert(`저장소 연결 실패: ${err.message}\n\n1. Firebase Console > Storage 탭에서 [시작하기]를 눌렀는지 확인\n2. Storage Rules가 "allow read, write: if request.auth != null;" 인지 확인`);
              } finally {
                setTestLoading(false);
              }
            }}
            disabled={testLoading}
            className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg text-[8px] font-bold uppercase tracking-widest text-blue-400 border border-blue-500/30 flex items-center justify-center gap-2"
          >
            {testLoading && <Loader2 className="animate-spin" size={10} />}
            Test Storage Connection
          </button>
          <button 
            type="button"
            onClick={() => {
              const el = document.getElementById('debug-console');
              if (el) el.classList.toggle('hidden');
            }}
            className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg text-[8px] font-bold uppercase tracking-widest text-purple-400 border border-purple-500/30"
          >
            Toggle Debug Console
          </button>
          <button 
            type="button"
            onClick={() => addLog('Test Log: Debug console is working!')}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-bold uppercase tracking-widest text-white/30"
          >
            Send Test Log
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-12 overflow-y-auto max-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Debug Console (Visible by default for troubleshooting) */}
          <div id="debug-console" className="mb-8 bg-zinc-900 border-2 border-purple-500/50 rounded-2xl p-4 max-h-60 overflow-y-auto font-mono text-[10px] space-y-1 shadow-2xl shadow-purple-500/10">
            <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-purple-500 font-bold uppercase tracking-widest">Live Debug Console</span>
              </div>
              <button onClick={() => setDebugLogs([])} className="text-white/30 hover:text-white text-[8px] font-bold uppercase tracking-widest">Clear Logs</button>
            </div>
            {debugLogs.length === 0 && <div className="text-white/20 italic">Waiting for logs... Try uploading an image or clicking "Send Test Log"</div>}
            {debugLogs.map((log, i) => (
              <div key={i} className={cn("flex gap-2 py-0.5 border-b border-white/5 last:border-0", log.type === 'error' ? "text-red-400 bg-red-400/5" : "text-white/70")}>
                <span className="opacity-30 flex-shrink-0">[{log.time}]</span>
                <span className="flex-1 break-all">{log.msg}</span>
              </div>
            ))}
          </div>

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
              {storageError && (
                <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest bg-red-400/10 px-4 py-2 rounded-full">
                  <Settings size={12} />
                  {storageError}
                </div>
              )}
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
                          label="Profile Image (Main)" 
                          value={member.image} 
                          onChange={(val) => {
                            setLocalMembers(prev => prev.map(m => m.id === member.id ? { ...m, image: val } : m));
                          }} 
                          aspectRatio={4/5} 
                        />

                        <MultiImageUploader
                          label="Additional Photos"
                          values={member.images || []}
                          onChange={(vals) => {
                            setLocalMembers(prev => prev.map(m => m.id === member.id ? { ...m, images: vals } : m));
                          }}
                          max={10}
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

                    <div className="space-y-6">
                      <MultiImageUploader 
                        label="Content Images (1st is Main)" 
                        values={p.images || (p.image ? [p.image] : [])} 
                        onChange={(vals) => {
                          setLocalPerformances(prev => prev.map(item => item.id === p.id ? { ...item, images: vals, image: vals[0] || '' } : item));
                        }} 
                        max={5}
                      />
                      
                      <div className="grid md:grid-cols-2 gap-8">
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
                      setGalleryProgress(0);
                      try {
                        const newItems = [];
                        for (let i = 0; i < imageFiles.length; i++) {
                          const file = imageFiles[i];
                          const downloadUrl = await uploadFile(file, (p) => {
                            const overall = ((i / imageFiles.length) * 100) + (p / imageFiles.length);
                            setGalleryProgress(overall);
                          });
                          const newId = doc(collection(db, 'gallery')).id;
                          newItems.push({
                            id: newId,
                            imageUrl: downloadUrl,
                            description: file.name.split('.')[0],
                            order: localGallery.length + i
                          });
                        }
                        setLocalGallery(prev => [...prev, ...newItems]);
                      } catch (err: any) {
                        addLog(`Gallery drop upload failed: ${err}`, 'error');
                        alert(`이미지 업로드에 실패했습니다: ${err.message || err}`);
                      } finally {
                        setGalleryUploading(false);
                        setGalleryProgress(0);
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
                        {galleryUploading ? `Uploading ${Math.round(galleryProgress)}%` : 'Drag & Drop Photos Here'}
                      </p>
                      {galleryUploading && (
                        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-2 mx-auto">
                          <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${galleryProgress}%` }} />
                        </div>
                      )}
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
                        setGalleryProgress(0);
                        try {
                          const newItems = [];
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            const downloadUrl = await uploadFile(file, (p) => {
                              const overall = ((i / files.length) * 100) + (p / files.length);
                              setGalleryProgress(overall);
                            });
                            const newId = doc(collection(db, 'gallery')).id;
                            newItems.push({
                              id: newId,
                              imageUrl: downloadUrl,
                              description: file.name.split('.')[0],
                              order: localGallery.length + i
                            });
                          }
                          setLocalGallery(prev => [...prev, ...newItems]);
                        } catch (err: any) {
                          addLog(`Gallery input upload failed: ${err}`, 'error');
                          alert(`이미지 업로드에 실패했습니다: ${err.message || err}`);
                        } finally {
                          setGalleryUploading(false);
                          setGalleryProgress(0);
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
