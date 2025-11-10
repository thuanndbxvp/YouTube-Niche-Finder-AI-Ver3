import React from 'react';
import type { Notification as NotificationType } from '../types';
import Notification from './Notification';

interface NotificationCenterProps {
  notifications: NotificationType[];
  onRemove: (id: number) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 left-4 z-[100] space-y-3 w-full max-w-sm">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default NotificationCenter;