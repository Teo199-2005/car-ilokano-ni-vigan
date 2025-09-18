import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertTriangle, User, FileText, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TopbarOwner = ({ notifications = [], notificationCount = 0, onMarkAsRead, onMarkAllAsRead, onClearAll }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationColor = (type) => {
    switch (type) {
      case 'booking_completed':
        return '#4caf50'; // Success green
      case 'booking_cancelled':
        return '#f44336'; // Warning red
      case 'feedback':
      case 'review':
        return '#ff9800'; // Orange
      case 'new_booking':
      case 'booking_created':
        return '#1976d2'; // Primary blue
      default:
        return '#1976d2';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_completed':
        return <Check size={14} className="text-white" />;
      case 'booking_cancelled':
        return <X size={14} className="text-white" />;
      case 'feedback':
      case 'review':
        return <AlertTriangle size={14} className="text-white" />;
      case 'new_booking':
      case 'booking_created':
        return <FileText size={14} className="text-white" />;
      case 'new_account':
        return <User size={14} className="text-white" />;
      default:
        return <Bell size={14} className="text-white" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none relative transition-colors duration-200"
      >
        <Bell size={20} />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>
      
      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg border border-gray-200 z-50 notification-dropdown">
          {/* Custom arrow */}
          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
          
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center space-x-2">
              <button 
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors duration-200"
                onClick={() => {
                  onMarkAllAsRead?.();
                }}
              >
                Mark all read
              </button>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              <div className="space-y-1 p-2">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-3 rounded-md cursor-pointer flex items-start transition-all duration-200 hover:bg-gray-50 ${
                      notification.read 
                        ? 'bg-white' 
                        : 'bg-blue-50 border-l-4 border-blue-500'
                    }`}
                    onClick={() => {
                      onMarkAsRead?.(notification.id);
                      navigate('/notifications');
                    }}
                  >
                    {/* Icon */}
                    <div 
                      className="p-2 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: getNotificationColor(notification.type) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          {notification.title && (
                            <div className={`text-xs font-medium mb-1 ${
                              notification.read ? 'text-gray-500' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </div>
                          )}
                          <p className={`text-sm ${
                            notification.read 
                              ? 'text-gray-700' 
                              : 'text-gray-900 font-medium'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full ml-2 mt-1.5 flex-shrink-0"></span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {notification.timeFormatted || notification.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Bell size={20} className="text-gray-400" />
                </div>
                <p className="text-gray-500">No notifications available</p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-center">
              <button 
                className="text-sm text-red-600 hover:text-red-800 focus:outline-none transition-colors duration-200"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all notifications?')) {
                    onClearAll?.();
                  }
                }}
              >
                Clear All Notifications
              </button>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .notification-dropdown {
          width: 360px;
          max-height: 400px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  );
};

export default TopbarOwner;