import React from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { GoogleIcon } from './icons/Icons';
import type { Theme } from '../theme';

interface AuthProps {
  session: Session | null;
  theme: Theme;
}

const Auth: React.FC<AuthProps> = ({ session, theme }) => {
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

  if (session) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-sm text-gray-300 hidden md:block">{session.user.email}</div>
        <button
          onClick={handleLogout}
          className="px-3 py-2 bg-gray-700 text-gray-300 rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors"
        >
          Đăng xuất
        </button>
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
