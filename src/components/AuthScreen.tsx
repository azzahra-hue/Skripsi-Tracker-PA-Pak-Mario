import { useState, FormEvent, ChangeEvent } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppUser } from '../types';
import { Loader2, User as UserIcon, Lock, FileSpreadsheet, ArrowRight, Eye, EyeOff, Camera, Phone, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { resizeProfileImage } from '../lib/imageUtils';

export function AuthScreen({ onSuccess, onGuest }: { onSuccess: (user: AppUser) => void, onGuest: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isForgotPin, setIsForgotPin] = useState(false);
  const [forgotPinSuccess, setForgotPinSuccess] = useState('');
  const [forgotPinWaUrl, setForgotPinWaUrl] = useState('');

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resized = await resizeProfileImage(e.target.files[0], 250);
        setPhotoURL(resized);
      } catch (err) {
        console.error('Failed resizing photo:', err);
        setError('Gagal memproses gambar foto profil.');
      }
    }
  };

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

      if (!isLogin) {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setError('Nama ini sudah digunakan. Silakan masuk atau gunakan nama lain.');
          setIsLoading(false);
          return;
        }
        await setDoc(userRef, {
          name: name.trim(),
          pin: password,
          photoURL: photoURL || '',
          whatsappNumber: whatsappNumber || '',
          createdAt: Date.now()
        });
        onSuccess({ uid: normalizedName, displayName: name.trim(), photoURL: photoURL || undefined, whatsappNumber: whatsappNumber || undefined });
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
        onSuccess({ uid: normalizedName, displayName: userData.name, photoURL: userData.photoURL || undefined });
      }
    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatWhatsAppNumber = (rawNumber: string) => {
    let cleaned = rawNumber.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  const handleForgotPinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama harus diisi untuk memulihkan PIN');
      return;
    }
    if (!whatsappNumber.trim()) {
      setError('Nomor WhatsApp terdaftar harus diisi untuk memulihkan PIN');
      return;
    }

    setIsLoading(true);
    setError('');
    setForgotPinSuccess('');
    setForgotPinWaUrl('');

    try {
      const normalizedName = name.trim().toLowerCase();
      const userRef = doc(db, 'users', normalizedName);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError('Nama pengguna tidak ditemukan. Silakan periksa kembali.');
        setIsLoading(false);
        return;
      }

      const userData = userSnap.data();
      if (!userData.whatsappNumber) {
        setError('Akun ini belum mendaftarkan nomor WhatsApp. Silakan hubungi Admin.');
        setIsLoading(false);
        return;
      }

      const cleanInputPhone = formatWhatsAppNumber(whatsappNumber);
      const cleanRegisteredPhone = formatWhatsAppNumber(userData.whatsappNumber);

      if (cleanInputPhone !== cleanRegisteredPhone) {
        setError('Nomor WhatsApp tidak cocok dengan nomor terdaftar pada akun ini.');
        setIsLoading(false);
        return;
      }

      const message = `Halo *${userData.name || name.trim()}*,\n\nBerikut adalah informasi PIN akun Skripsi Anda:\n\n🔑 *PIN Anda:* ${userData.pin}\n\nSilakan gunakan PIN ini untuk masuk kembali ke aplikasi. Jaga kerahasiaan PIN Anda!`;
      const waUrl = `https://wa.me/${cleanRegisteredPhone}?text=${encodeURIComponent(message)}`;

      setForgotPinWaUrl(waUrl);
      setForgotPinSuccess(`Nomor WhatsApp terverifikasi! Tautan WhatsApp telah dibuka secara otomatis. Klik tombol hijau di bawah ini jika WhatsApp tidak terbuka otomatis.`);
      
      // Open WhatsApp in a new window/tab
      window.open(waUrl, '_blank');
      setIsLoading(false);

    } catch (err: any) {
      console.error(err);
      setError('Terjadi kesalahan saat memulihkan PIN.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Branding */}
        <div className="md:w-1/2 bg-orange-500 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute top-1/2 -right-24 w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shadow-sm">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Skripsi Tracker</h1>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              Pantau Progress Skripsi Lebih Mudah
            </h2>
            <p className="text-orange-100 text-lg leading-relaxed">
              Sistem monitoring proposal skripsi kolaboratif. Lihat progress, kelola bab, dan jadwalkan bimbingan dalam satu tempat.
            </p>
          </div>
          
          <div className="mt-12 relative z-10">
            <button 
              onClick={onGuest}
              className="group flex items-center gap-2 text-white font-medium hover:text-orange-100 transition-colors"
            >
              Lanjutkan sebagai Tamu (Hanya Lihat)
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="md:w-1/2 p-8 md:p-12 bg-white relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-8 right-8 flex bg-gray-100 p-1 rounded-lg">
            {!isForgotPin && (
              <>
                <button 
                  onClick={() => { setIsLogin(true); setError(''); setForgotPinSuccess(''); }}
                  className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                >
                  Masuk
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); setForgotPinSuccess(''); }}
                  className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", !isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                >
                  Daftar
                </button>
              </>
            )}
            {isForgotPin && (
              <button 
                onClick={() => { setIsForgotPin(false); setIsLogin(true); setError(''); setForgotPinSuccess(''); }}
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-all bg-white text-gray-900 shadow-sm"
              >
                Kembali
              </button>
            )}
          </div>

          <div className="mt-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={isForgotPin ? 'forgot' : (isLogin ? 'login' : 'register')}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {isForgotPin ? 'Lupa PIN?' : (isLogin ? 'Selamat Datang Kembali!' : 'Buat Akun Baru')}
                </h3>
                <p className="text-gray-500 mb-8">
                  {isForgotPin ? 'Masukkan nama Anda untuk memulihkan PIN via WhatsApp.' : (isLogin ? 'Masukkan nama dan PIN untuk melanjutkan.' : 'Daftarkan nama Anda untuk mulai mengelola skripsi.')}
                </p>

                {error && (
                  <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start gap-2">
                    <span className="shrink-0">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {forgotPinSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 text-sm rounded-2xl border border-emerald-200 flex flex-col gap-3 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 text-emerald-600 font-bold text-base mt-0.5">✓</span>
                      <div>
                        <h4 className="font-bold text-emerald-900 text-sm">Verifikasi Berhasil!</h4>
                        <p className="text-xs text-emerald-700 leading-relaxed mt-0.5">{forgotPinSuccess}</p>
                      </div>
                    </div>

                    {forgotPinWaUrl && (
                      <div className="pt-1 flex flex-col gap-2">
                        <a
                          href={forgotPinWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                        >
                          <Phone className="w-4 h-4" />
                          Buka WhatsApp Pemulihan PIN
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPin(false);
                            setForgotPinSuccess('');
                            setForgotPinWaUrl('');
                          }}
                          className="text-xs text-center text-gray-600 hover:text-gray-800 underline mt-1"
                        >
                          Sudah terima PIN? Masuk ke Akun
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={isForgotPin ? handleForgotPinSubmit : handleSubmit} className="space-y-5">
                  {!isLogin && !isForgotPin && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Foto Profil <span className="text-gray-400 font-normal text-xs">(Opsional)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full bg-orange-100 border border-orange-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                          {photoURL ? (
                            <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-6 h-6 text-orange-500" />
                          )}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors border border-gray-200">
                          <Camera className="w-3.5 h-3.5 text-gray-500" />
                          {photoURL ? 'Ganti Foto' : 'Pilih Foto'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                        {photoURL && (
                          <button
                            type="button"
                            onClick={() => setPhotoURL('')}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="Contoh: Maung Tekpend"
                        required
                      />
                    </div>
                  </div>

                  {(!isLogin || isForgotPin) && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {isForgotPin ? (
                          <>Nomor WhatsApp Terdaftar <span className="text-red-500">*</span></>
                        ) : (
                          <>Nomor WhatsApp <span className="text-gray-400 font-normal text-xs">(Opsional)</span></>
                        )}
                      </label>
                      <div className="relative">
                        <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                          placeholder={isForgotPin ? "Masukkan nomor WhatsApp terdaftar Anda" : "Contoh: 08123456789"}
                          required={isForgotPin}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                        {isForgotPin 
                          ? "* Pemulihan PIN hanya diproses jika Nama dan Nomor WhatsApp cocok dengan data akun."
                          : "* Disarankan untuk diisi. Nomor ini digunakan untuk pemulihan jika Anda lupa PIN."}
                      </p>
                    </div>
                  )}

                  {!isForgotPin && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">PIN (Minimal 6 Angka)</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={password}
                          onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                          placeholder="Masukkan 6 digit angka"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {isLogin && (
                        <div className="mt-2 text-right">
                          <button
                            type="button"
                            onClick={() => { setIsForgotPin(true); setError(''); setForgotPinSuccess(''); }}
                            className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                          >
                            Lupa PIN?
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-70 mt-2 shadow-sm shadow-orange-200"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {isForgotPin ? 'Pulihkan PIN' : (isLogin ? 'Masuk' : 'Buat Akun')}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
