import { AppUser } from '../types';
import { LogIn, LogOut } from 'lucide-react';

export function AuthButton({ user, onLoginClick, onLogout }: { user: AppUser | null, onLoginClick: () => void, onLogout: () => void }) {
  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm border border-orange-200 uppercase">
            {user.displayName?.charAt(0) || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700">{user.displayName}</span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut className="w-4 h-4" />
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
