
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { GoogleIcon } from './icons/Icons';
import type { Theme } from '../theme';

interface AuthProps {
  session: Session | null;
  theme: Theme;
}

const Auth: React.FC<AuthProps> = ({ session, theme }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  if (session) {
    const user = session.user;
    const avatarUrl = user.user_metadata?.avatar_url;
    const userInitial = user.email ? user.email[0].toUpperCase() : '?';

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${theme.focusRing}`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="font-bold text-lg text-white">{userInitial}</span>
          )}
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 origin-top-right bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-20 animate-fade-in-down">
            <div className="px-4 py-3">
              <p className="text-sm text-gray-400">Đã đăng nhập với</p>
              <p className="text-sm font-medium text-gray-200 truncate" title={user.email || ''}>
                {user.email}
              </p>
            </div>
            <div className="border-t border-gray-700 my-1"></div>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm text-white font-semibold transition-colors duration-300 border ${theme.bg} ${theme.bgHover} ${theme.border}`}
    >
      <GoogleIcon />
      <span>Đăng nhập</span>
    </button>
  );
};

export default Auth;
