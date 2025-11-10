
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { GoogleIcon } from './icons/Icons';
import type { Theme } from '../theme';

interface AuthProps {
  session: Session | null;
  theme: Theme;
}

const UserIcon: React.FC = () => (
    <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);


const Auth: React.FC<AuthProps> = ({ session, theme }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsDropdownOpen(false);
  };
  
  const userAvatar = session?.user?.user_metadata?.avatar_url;

  if (session) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-colors"
          aria-label="Mở menu người dùng"
        >
          {userAvatar ? (
            <img className="h-10 w-10 rounded-full" src={userAvatar} alt="User avatar" />
          ) : (
            <UserIcon />
          )}
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20 animate-fade-in-down">
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                <p className="font-semibold">Đã đăng nhập với</p>
                <p className="truncate">{session.user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                Đăng xuất
              </button>
            </div>
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
