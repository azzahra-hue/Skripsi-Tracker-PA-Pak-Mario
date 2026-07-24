import React, { useState, ChangeEvent } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser } from '../types';
import { X, Camera, Loader2, User as UserIcon, Check } from 'lucide-react';
import { resizeProfileImage } from '../lib/imageUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onUpdateUser: (updatedUser: AppUser) => void;
}

export function ProfileModal({ isOpen, onClose, currentUser, onUpdateUser }: ProfileModalProps) {
  const [photoURL, setPhotoURL] = useState<string>(currentUser.photoURL || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setError('');
        const resized = await resizeProfileImage(e.target.files[0], 250);
        setPhotoURL(resized);
      } catch (err) {
        console.error('Error resizing photo:', err);
        setError('Gagal memproses gambar foto profil.');
      }
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        photoURL: photoURL || ''
      });

      const updated = {
        ...currentUser,
        photoURL: photoURL || undefined
      };

      onUpdateUser(updated);
      setSuccessMsg('Foto profil berhasil diperbarui!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating profile photo:', err);
      setError('Gagal menyimpan foto profil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">Edit Foto Profil</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {error && (
            <div className="w-full mb-4 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="w-full mb-4 p-2.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100 flex items-center gap-1.5 justify-center">
              <Check className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-orange-100 border-2 border-orange-300 overflow-hidden flex items-center justify-center shadow-md">
              {photoURL ? (
                <img src={photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-orange-500" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>

          <p className="font-bold text-gray-900 text-sm mb-1">{currentUser.displayName}</p>
          <p className="text-xs text-gray-400 mb-6">Pilih foto diri Anda (Opsional)</p>

          <div className="w-full flex items-center gap-3">
            {photoURL && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="flex-1 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
              >
                Hapus Foto
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
