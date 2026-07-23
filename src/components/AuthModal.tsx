import { useState, useEffect, FormEvent } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser } from '../types';
import { X, Loader2, User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialName?: string;
  onSuccess: (user: AppUser) => void;
}

export function AuthModal({ isOpen, onClose, initialMode = 'login', initialName = '', onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setName(initialName);
      setPassword('');
      setError('');
    }
  }, [isOpen, initialMode, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('Nama dan PIN harus diisi');
      return;
    }

    if (password.length < 6) {
      setError('PIN minimal 6 angka');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const normalizedName = name.trim().toLowerCase();
      const userRef = doc(db, 'users', normalizedName);

      if (mode === 'register') {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setError('Nama ini sudah digunakan. Silakan masuk atau gunakan nama lain.');
          setIsLoading(false);
          return;
        }
        await setDoc(userRef, {
          name: name.trim(),
          pin: password,
          createdAt: Date.now()
        });
        onSuccess({ uid: normalizedName, displayName: name.trim() });
        onClose();
      } else {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setError('Nama tidak ditemukan. Silakan buat akun.');
          setIsLoading(false);
          return;
        }
        const userData = userSnap.data();
        if (userData.pin !== password) {
          setError('PIN salah.');
          setIsLoading(false);
          return;
        }
        onSuccess({ uid: normalizedName, displayName: userData.name });
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'login' ? 'Masuk' : 'Buat Akun'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Pengguna</label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Contoh: Maung Tekpend"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">PIN (Minimal 6 Angka)</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Masukkan 6 digit angka"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-70 mt-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button type="button" onClick={() => setMode('register')} className="text-orange-600 font-semibold hover:underline">
                  Buat Akun Baru
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-orange-600 font-semibold hover:underline">
                  Masuk di sini
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
