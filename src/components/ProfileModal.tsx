import React, { useState, ChangeEvent } from 'react';
import { doc, updateDoc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser } from '../types';
import { X, Camera, Loader2, User as UserIcon, Check, Phone, Edit3 } from 'lucide-react';
import { resizeProfileImage } from '../lib/imageUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onUpdateUser: (updatedUser: AppUser) => void;
}

export function ProfileModal({ isOpen, onClose, currentUser, onUpdateUser }: ProfileModalProps) {
  const [name, setName] = useState<string>(currentUser.displayName || '');
  const [photoURL, setPhotoURL] = useState<string>(currentUser.photoURL || '');
  const [whatsappNumber, setWhatsappNumber] = useState<string>(currentUser.whatsappNumber || '');
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
    if (!name.trim()) {
      setError('Nama tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const newName = name.trim();
      const newUid = newName.toLowerCase();
      let finalUid = currentUser.uid;

      if (newUid !== currentUser.uid) {
        // Name changed, we need to migrate
        const newRef = doc(db, 'users', newUid);
        const newSnap = await getDoc(newRef);
        
        if (newSnap.exists()) {
          setError('Nama ini sudah digunakan. Silakan pilih nama lain.');
          setIsLoading(false);
          return;
        }

        const oldRef = doc(db, 'users', currentUser.uid);
        const oldSnap = await getDoc(oldRef);
        
        if (oldSnap.exists()) {
          const userData = oldSnap.data();
          
          // 1. Create new user doc
          await setDoc(newRef, {
            ...userData,
            name: newName,
            photoURL: photoURL || '',
            whatsappNumber: whatsappNumber || ''
          });

          // 2. Migrate collections
          const batch = writeBatch(db);
          let opsCount = 0;

          const commitBatch = async () => {
            if (opsCount > 0) {
              await batch.commit();
              opsCount = 0;
            }
          };

          const checkAndCommit = async () => {
            opsCount++;
            if (opsCount >= 450) await commitBatch();
          };

          // Proposals
          const qProposals = query(collection(db, 'proposals'), where('ownerId', '==', currentUser.uid));
          const snapProposals = await getDocs(qProposals);
          for (const d of snapProposals.docs) {
            batch.update(d.ref, { ownerId: newUid, ownerName: newName });
            await checkAndCommit();
          }

          // Notes
          const qNotes = query(collection(db, 'notes'), where('authorId', '==', currentUser.uid));
          const snapNotes = await getDocs(qNotes);
          for (const d of snapNotes.docs) {
            batch.update(d.ref, { authorId: newUid, author: newName });
            await checkAndCommit();
          }

          // Questions
          const qQuestions = query(collection(db, 'questions'), where('authorId', '==', currentUser.uid));
          const snapQuestions = await getDocs(qQuestions);
          for (const d of snapQuestions.docs) {
            batch.update(d.ref, { authorId: newUid, author: newName });
            await checkAndCommit();
          }

          // Answers
          const qAnswers = query(collection(db, 'answers'), where('authorId', '==', currentUser.uid));
          const snapAnswers = await getDocs(qAnswers);
          for (const d of snapAnswers.docs) {
            batch.update(d.ref, { authorId: newUid, author: newName });
            await checkAndCommit();
          }

          // Tasks
          const qTasks = query(collection(db, 'tasks'), where('userId', '==', currentUser.uid));
          const snapTasks = await getDocs(qTasks);
          for (const d of snapTasks.docs) {
            batch.update(d.ref, { userId: newUid });
            await checkAndCommit();
          }

          // Logs
          const qLogs = query(collection(db, 'logs'), where('userId', '==', currentUser.uid));
          const snapLogs = await getDocs(qLogs);
          for (const d of snapLogs.docs) {
            batch.update(d.ref, { userId: newUid });
            await checkAndCommit();
          }

          // Pomodoro
          const qPomodoro = query(collection(db, 'pomodoro_sessions'), where('userId', '==', currentUser.uid));
          const snapPomodoro = await getDocs(qPomodoro);
          for (const d of snapPomodoro.docs) {
            batch.update(d.ref, { userId: newUid });
            await checkAndCommit();
          }

          await commitBatch();

          // 3. Delete old doc
          await deleteDoc(oldRef);
          
          finalUid = newUid;
        }
      } else {
        // Just update existing doc
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          photoURL: photoURL || '',
          whatsappNumber: whatsappNumber || ''
        });
      }

      const updated = {
        ...currentUser,
        uid: finalUid,
        displayName: newName,
        photoURL: photoURL || undefined,
        whatsappNumber: whatsappNumber || undefined
      };

      onUpdateUser(updated);
      setSuccessMsg('Profil berhasil diperbarui!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Gagal menyimpan profil.');
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
          <h3 className="font-bold text-gray-800 text-base">Edit Profil</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col">
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

          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full bg-orange-100 border-2 border-orange-300 overflow-hidden flex items-center justify-center shadow-md">
                {photoURL ? (
                  <img src={photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-orange-500" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105">
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
            {photoURL && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-[10px] font-semibold text-red-500 hover:underline mt-1"
              >
                Hapus Foto
              </button>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nama Pengguna
            </label>
            <div className="relative">
              <Edit3 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="Nama Anda"
                required
              />
            </div>
            <p className="text-[10px] text-orange-600 mt-1.5 leading-relaxed font-medium">
              * Perhatian: Mengubah nama juga akan mengubah nama untuk Masuk (Login).
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nomor WhatsApp (Untuk Pemulihan PIN)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                placeholder="Contoh: 08123456789"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
              * Isi nomor WA untuk jaga-jaga apabila Anda lupa PIN di kemudian hari.
            </p>
          </div>

          <div className="w-full flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
