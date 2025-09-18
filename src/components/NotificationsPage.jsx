import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertTriangle, 
  User, 
  FileText, 
  Car,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import Sidebar from './layout/Sidebar';

const NotificationsPage = ({ user, db }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch notifications from Firebase
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        let notificationsSnapshot;
        
        try {
          const notificationsQuery = query(
            collection(db, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          notificationsSnapshot = await getDocs(notificationsQuery);
        } catch (createdAtError) {
          // Fallback to 'time' field if createdAt doesn't exist
          const notificationsQuery = query(
            collection(db, 'notifications'),
            orderBy('time', 'desc'),
            limit(50)
          );
          notificationsSnapshot = await getDocs(notificationsQuery);
        }
        
        const notificationsData = notificationsSnapshot.docs.map(doc => {
          const notification = { id: doc.id, ...doc.data() };
          
          // Format time for display
          let displayDate = null;
          if (notification.createdAt) {
            displayDate = notification.createdAt.toDate ? notification.createdAt.toDate() : new Date(notification.createdAt);
          } else if (notification.time) {
            displayDate = notification.time.toDate ? notification.time.toDate() : new Date(notification.time);
          }
          
          if (displayDate) {
            notification.timeFormatted = displayDate.toLocaleString();
          }
          
          return notification;
        });
        
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [db]);

  useEffect(() => {
    let filtered = notifications;

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter(notif => {
        if (filter === 'unread') return !notif.read;
        if (filter === 'read') return notif.read;
        return notif.type === filter;
      });
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(notif => 
        notif.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter, searchTerm]);

  const getNotificationColor = (type) => {
    switch (type) {
      case 'booking_completed':
        return '#4caf50';
      case 'booking_cancelled':
        return '#f44336';
      case 'feedback':
      case 'review':
        return '#ff9800';
      case 'new_booking':
      case 'booking_created':
        return '#1976d2';
      default:
        return '#1976d2';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_completed':
        return <Check size={16} className="text-white" />;
      case 'booking_cancelled':
        return <X size={16} className="text-white" />;
      case 'feedback':
      case 'review':
        return <AlertTriangle size={16} className="text-white" />;
      case 'new_booking':
      case 'booking_created':
        return <FileText size={16} className="text-white" />;
      case 'new_account':
        return <User size={16} className="text-white" />;
      default:
        return <Bell size={16} className="text-white" />;
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleSelectNotification = (id) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: Timestamp.now()
      });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notification => 
          updateDoc(doc(db, 'notifications', notification.id), {
            read: true,
            readAt: Timestamp.now()
          })
        )
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(
        notifications.map(notification => 
          deleteDoc(doc(db, 'notifications', notification.id))
        )
      );
      
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const handleDeleteSelected = async (selectedIds) => {
    try {
      await Promise.all(
        selectedIds.map(id => deleteDoc(doc(db, 'notifications', id)))
      );
      
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Error deleting selected notifications:', error);
    }
  };

  const filterButtons = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
    { key: 'read', label: 'Read', count: notifications.filter(n => n.read).length },
    { key: 'booking_created', label: 'Bookings', count: notifications.filter(n => n.type?.includes('booking')).length },
    { key: 'new_account', label: 'Accounts', count: notifications.filter(n => n.type === 'new_account').length }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage="notifications" />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your notifications and alerts</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  Mark All Read
                </button>
                <button
                  onClick={() => {
                    setDeleteTarget('all');
                    setShowDeleteModal(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Filters and Search */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {filterButtons.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      filter === key 
                        ? 'bg-white text-blue-600 shadow-sm border border-blue-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Selection Toolbar */}
            {selectedNotifications.length > 0 && (
              <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {selectedNotifications.length} selected
                  </span>
                  <button
                    onClick={() => {
                      selectedNotifications.forEach(id => handleMarkAsRead(id));
                      setSelectedNotifications([]);
                    }}
                    className="text-sm hover:underline"
                  >
                    Mark as read
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(selectedNotifications);
                      setShowDeleteModal(true);
                    }}
                    className="text-sm hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <button
                  onClick={() => setSelectedNotifications([])}
                  className="text-white hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm mx-6 my-4">
                  {filteredNotifications.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {/* Select All Header */}
                      <div className="px-6 py-3 bg-gray-50 flex items-center">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                        >
                          {selectedNotifications.length === filteredNotifications.length ? (
                            <CheckSquare size={16} className="mr-2" />
                          ) : (
                            <Square size={16} className="mr-2" />
                          )}
                          Select all
                        </button>
                      </div>

                      {/* Notification Items */}
                      {filteredNotifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`px-6 py-4 hover:bg-gray-50 transition-colors duration-200 ${
                            notification.read 
                              ? 'bg-white' 
                              : 'bg-blue-50 border-l-4 border-blue-500'
                          }`}
                        >
                          <div className="flex items-start space-x-4">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleSelectNotification(notification.id)}
                              className="mt-1"
                            >
                              {selectedNotifications.includes(notification.id) ? (
                                <CheckSquare size={16} className="text-blue-600" />
                              ) : (
                                <Square size={16} className="text-gray-400 hover:text-gray-600" />
                              )}
                            </button>

                            {/* Icon */}
                            <div 
                              className="p-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getNotificationColor(notification.type) }}
                            >
                              {getNotificationIcon(notification.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {notification.title && (
                                    <h4 className={`text-sm font-medium mb-1 ${
                                      notification.read ? 'text-gray-700' : 'text-gray-900'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                  )}
                                  <p className={`text-sm ${
                                    notification.read ? 'text-gray-600' : 'text-gray-800'
                                  }`}>
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center mt-2 space-x-4">
                                    <span className="text-xs text-gray-400">
                                      {notification.timeFormatted || notification.time}
                                    </span>
                                    {!notification.read && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Unread
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-2 ml-4">
                                  {!notification.read && (
                                    <button
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                                      title="Mark as read"
                                    >
                                      <Check size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setDeleteTarget([notification.id]);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Bell size={24} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'Try adjusting your search terms.' : 'You\'re all caught up!'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {deleteTarget === 'all' ? 'Clear All Notifications' : 'Delete Notifications'}
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {deleteTarget === 'all' 
                ? 'Are you sure you want to clear all notifications? This action cannot be undone.'
                : Array.isArray(deleteTarget) && deleteTarget.length > 1
                ? `Are you sure you want to delete ${deleteTarget.length} selected notifications? This action cannot be undone.`
                : 'Are you sure you want to delete this notification? This action cannot be undone.'
              }
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteTarget === 'all') {
                    handleClearAll();
                  } else {
                    handleDeleteSelected(deleteTarget);
                  }
                  setShowDeleteModal(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                {deleteTarget === 'all' ? 'Clear All' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;