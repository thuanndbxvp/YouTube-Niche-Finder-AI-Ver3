import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';

interface NotificationProps {
  id: number;
  message: string;
  type: 'success' | 'error';
  onRemove: (id: number) => void;
}

const Notification: React.FC<NotificationProps> = ({ id, message, type, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const isSuccess = type === 'success';

  return (
    <div className={`
      flex items-start p-3 rounded-lg shadow-lg text-white animate-fade-in-down
      ${isSuccess ? 'bg-teal-600' : 'bg-red-600'}
    `}>
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {isSuccess ? <CheckCircleIcon /> : <XCircleIcon />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{isSuccess ? 'Thành công' : 'Lỗi'}</p>
        <p className="text-sm">{message}</p>
      </div>
      <button onClick={() => onRemove(id)} className="ml-4 flex-shrink-0 p-1 rounded-full hover:bg-black/20 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

export default Notification;