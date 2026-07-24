import { AppUser } from '../types';
import { LogIn, LogOut, Camera } from 'lucide-react';

interface AuthButtonProps {
  user: AppUser | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
}

export function AuthButton({ user, onLoginClick, onLogout, onEditProfile }: AuthButtonProps) {
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onEditProfile}
          title="Edit Foto Profil"
          className="flex items-center gap-2 p-1 pr-2.5 rounded-full hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all group cursor-pointer"
        >
          <div className="relative w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm border border-orange-200 overflow-hidden shrink-0 shadow-sm">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              user.displayName?.charAt(0).toUpperCase() || 'U'
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-bold text-gray-800 leading-tight group-hover:text-orange-600 transition-colors">
              {user.displayName}
            </span>
            <span className="text-[10px] text-gray-400 group-hover:text-orange-500 font-medium">Edit Foto</span>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onLoginClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-sm"
    >
      <LogIn className="w-4 h-4" />
      Masuk / Buat Akun
    </button>
  );
}
