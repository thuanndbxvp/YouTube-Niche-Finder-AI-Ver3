
import React, { useState, useEffect } from 'react';
import { LockClosedIcon, KeyIcon } from './icons/Icons';
import { themes } from '../theme';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (password?: string) => void;
  mode: 'login' | 'change';
  verifyPassword: (password: string) => boolean;
  theme: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess, mode, verifyPassword, theme }) => {
  const [password, setPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const currentTheme = themes[theme] || themes.teal;


  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setOldPassword('');
      setNewPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = () => {
    if (verifyPassword(password)) {
      onSuccess();
    } else {
      setError('Mật khẩu không chính xác.');
    }
  };

  const handleChange = () => {
    if (!verifyPassword(oldPassword)) {
      setError('Mật khẩu cũ không chính xác.');
      return;
    }
    if (newPassword.length < 6) {
        setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
        return;
    }
    onSuccess(newPassword);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleChange();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
            <div className="flex items-center space-x-3 mb-4">
                 <div className="text-teal-400 p-2 bg-gray-700 rounded-full">
                    {mode === 'login' ? <LockClosedIcon /> : <KeyIcon />}
                </div>
                <div>
                    <h2 className={`text-xl font-bold bg-gradient-to-r ${currentTheme.gradient} text-transparent bg-clip-text`}>{mode === 'login' ? 'Yêu cầu Mật khẩu' : 'Đổi Mật khẩu'}</h2>
                    <p className="text-sm text-gray-400">
                        {mode === 'login' ? 'Vui lòng nhập mật khẩu để tiếp tục.' : 'Nhập mật khẩu cũ và mới.'}
                    </p>
                </div>
            </div>
          
            {mode === 'login' && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className={`w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300`}
                autoFocus
              />
            )}

            {mode === 'change' && (
              <div className="space-y-3">
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Mật khẩu cũ"
                  className={`w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300`}
                  autoFocus
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                  className={`w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 ${currentTheme.focusRing} ${currentTheme.border} outline-none transition-all duration-300`}
                />
              </div>
            )}
            
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-md text-sm text-white transition-colors ${currentTheme.bg} ${currentTheme.bgHover}`}
              >
                {mode === 'login' ? 'Xác nhận' : 'Lưu'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
