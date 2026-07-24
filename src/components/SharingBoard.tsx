import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser, Note } from '../types';
import { MessageSquare, Paperclip, Send, User as UserIcon, Trash2, File, Download, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SharingBoardProps {
  currentUser: AppUser | null;
  onRequireAuth: () => void;
}

export function SharingBoard({ currentUser, onRequireAuth }: SharingBoardProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Note);
      setNotes(data);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 1024 * 1024) {
        alert('Maaf, ukuran file terlalu besar (Maksimal 1MB).');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!text.trim() && !file) return;

    setIsSubmitting(true);
    try {
      let fileData = '';
      if (file) {
        fileData = await toBase64(file);
      }

      const id = crypto.randomUUID();
      const newNote: Partial<Note> = {
        id,
        text: text.trim(),
        author: isAnonymous ? 'Anonim' : (currentUser.displayName || 'Anonim'),
        authorId: currentUser.uid,
        authorPhoto: isAnonymous ? undefined : currentUser.photoURL,
        createdAt: Date.now(),
      };

      if (file) {
        newNote.fileName = file.name;
        newNote.fileType = file.type;
      }
      if (fileData) {
        newNote.fileData = fileData;
      }

      await setDoc(doc(db, 'notes', id), newNote as Note);
      setText('');
      setFile(null);
      setIsAnonymous(false);
      setIsComposing(false);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Gagal mengirim catatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'notes', deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <div className="bg-gradient-to-bl from-white to-orange-50/50 rounded-2xl shadow-sm border border-orange-100 overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-orange-100 bg-white/50 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-500" />
          Sharing Info & Catatan
        </h3>
        {!isComposing && (
          <button
            onClick={() => {
              if (!currentUser) onRequireAuth();
              else setIsComposing(true);
            }}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 bg-white px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm transition-colors"
          >
            + Tulis Info
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {notes.length === 0 && !isComposing ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">Belum ada info. Jadilah yang pertama berbagi!</p>
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={note.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {note.author === 'Anonim' || !note.authorPhoto ? (
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden", note.author === 'Anonim' ? 'bg-gray-400' : 'bg-orange-500')}>
                      {note.author === 'Anonim' ? <UserIcon className="w-4 h-4" /> : note.author.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <img
                      src={note.authorPhoto}
                      alt={note.author}
                      className="w-8 h-8 rounded-full object-cover border border-orange-200 shadow-sm shrink-0"
                    />
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-800">{note.author}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {currentUser?.uid === note.authorId && (
                  <button onClick={() => setDeleteId(note.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {note.text && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-3 rounded-2xl rounded-tl-sm border border-gray-100">
                  <p className="text-gray-800 text-sm whitespace-pre-wrap font-medium">{note.text}</p>
                </div>
              )}

              {note.fileName && note.fileData && (
                <a
                  href={note.fileData}
                  download={note.fileName}
                  className="mt-3 flex items-center gap-3 p-3 rounded-2xl rounded-tl-sm border border-orange-100 bg-white/50 hover:bg-gray-100 transition-colors group cursor-pointer shadow-sm"
                >
                  <div className="bg-white p-2 rounded-md shadow-sm">
                    <File className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-gray-800 truncate">{note.fileName}</p>
                    <p className="text-xs text-gray-500">Klik untuk mengunduh</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </a>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isComposing && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="border-t border-gray-200 bg-white p-4"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Bagikan info, hasil bimbingan, atau tips di sini..."
              className="w-full text-sm border border-orange-200 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none h-24 mb-3"
            />
            
            {file && (
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200 mb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <File className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-500 hover:text-orange-500 transition-colors flex items-center gap-1 text-sm"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="hidden sm:inline">Lampirkan File</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-orange-200 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-xs text-gray-600">Kirim sbg Anonim</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!text.trim() && !file)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm",
                    (isSubmitting || (!text.trim() && !file)) ? "opacity-50 cursor-not-allowed" : "hover:bg-orange-600"
                  )}
                >
                  {isSubmitting ? 'Mengirim...' : (
                    <>
                      Kirim <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-100"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
              <p className="text-gray-600 text-sm mb-6">
                Apakah Anda yakin ingin menghapus info ini? 
                Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
