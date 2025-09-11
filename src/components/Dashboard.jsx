// components/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import Sidebar from './layout/Sidebar';
import { 
  Car, 
  User, 
  UsersRound, 
  TrendingUp, 
  Clock, 
  Calendar, 
  ArrowLeft,
  Activity,
  BarChart2,
  BarChart4,
  Filter,
  Bell,
  MessageSquare,
  Star,
  X,
  Check,
  AlertTriangle,
  DollarSign,
  FileText,
  Users,
  CreditCard,
  PieChart,
  BarChart3,
  TrendingDown,
  Eye,
  MapPin,
  Settings
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { NotificationService } from '../services/notificationService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalCars: 0,
    totalOwners: 0,
    availableCars: 0,
    totalBookings: 0,
    totalReviews: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingBookings: 0,
    completedBookings: 0
  });
  const [chartData, setChartData] = useState({
    monthlyBookings: [],
    statusDistribution: [],
    revenueData: [],
    topBusinesses: [],
    carTypeDistribution: []
  });
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, year
  const [revenueFilter, setRevenueFilter] = useState('month');
  const [recentBookings, setRecentBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const navigate = useNavigate();
  const db = getFirestore();
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  // Function to mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: Timestamp.now()
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [db]);
  

  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch vehicles data
        const vehiclesQuery = collection(db, 'vehicles');
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        const vehiclesData = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalCars = vehiclesData.length;
        const availableCars = vehiclesData.filter(car => car.status === 'Available').length;
        
        // Fetch users data - only count owners and admins (matching User Management display)
        const usersCollection = collection(db, 'users');
        
        // Get owners
        const ownersQuery = query(usersCollection, where('role', '==', 'owner'));
        const ownersSnapshot = await getDocs(ownersQuery);
        const ownersData = ownersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalOwners = ownersData.length;
        
        // Get admins
        const adminsCollection = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsCollection);
        const adminsData = adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalAdmins = adminsData.length;
        
        // Total users = owners + admins (exactly what User Management shows)
        const totalUsers = totalOwners + totalAdmins;
        
        console.log('📊 Dashboard user counts:');
        console.log('- Owners:', totalOwners);
        console.log('- Admins:', totalAdmins);
        console.log('- Total Users (Dashboard):', totalUsers);
        

        
        // Fetch rental data from database
        let bookingsData = [];
        try {
          const rentalsQuery = query(
            collection(db, 'rentals'),
            orderBy('createdAt', 'desc')
          );
          const rentalsSnapshot = await getDocs(rentalsQuery);
          
          if (!rentalsSnapshot.empty) {
            bookingsData = rentalsSnapshot.docs.map(doc => {
              const rental = { id: doc.id, ...doc.data() };
              // Map rental fields to booking format
              return {
                id: rental.id,
                name: rental.customerName || rental.clientName || 'N/A',
                email: rental.customerEmail || rental.clientEmail || 'N/A',
                businessName: rental.ownerBusinessName || rental.businessName || 'N/A',
                startDate: rental.startDate,
                endDate: rental.endDate,
                price: rental.totalAmount || rental.price || 0,
                status: rental.status || 'pending',
                vehicleBrand: rental.vehicleBrand,
                vehicleModel: rental.vehicleModel,
                plateNumber: rental.plateNumber,
                timestamp: rental.createdAt || rental.timestamp
              };
            });
          }
        } catch (error) {
          console.log('Error fetching rentals:', error);
          // Fallback to bookings collection if rentals doesn't exist
          try {
            const bookingsQuery = query(
              collection(db, 'bookings'),
              orderBy('timestamp', 'desc')
            );
            const bookingsSnapshot = await getDocs(bookingsQuery);
            bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (bookingError) {
            console.log('No rental data found:', bookingError);
          }
        }
        
        const totalBookings = bookingsData.length;
        const activeBookings = bookingsData.filter(b => b.status === 'active' || b.status === 'ongoing').length;
        const completedBookings = bookingsData.filter(b => b.status === 'completed').length;
        const cancelledBookings = bookingsData.filter(b => b.status === 'cancelled').length;
        const overdueBookings = bookingsData.filter(b => b.status === 'overdue').length;
        const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
        const totalRevenue = completedBookings > 0 ? bookingsData.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.price || 0), 0) : 0;
        
        // Calculate average rental duration
        const completedRentals = bookingsData.filter(b => b.status === 'completed' && b.startDate && b.endDate);
        let averageDuration = 0;
        if (completedRentals.length > 0) {
          const totalDuration = completedRentals.reduce((sum, rental) => {
            const start = new Date(rental.startDate);
            const end = new Date(rental.endDate);
            const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            return sum + duration;
          }, 0);
          averageDuration = Math.round(totalDuration / completedRentals.length);
        }
        
        // Generate chart data
        const statusDistribution = [
          { name: 'Active', value: activeBookings, color: '#3B82F6' },
          { name: 'Completed', value: completedBookings, color: '#10B981' },
          { name: 'Pending', value: pendingBookings, color: '#F59E0B' },
          { name: 'Cancelled', value: cancelledBookings, color: '#6B7280' },
          { name: 'Overdue', value: overdueBookings, color: '#EF4444' }
        ].filter(item => item.value > 0);
        
        const monthlyBookings = [
          { month: 'Jan', bookings: 12, revenue: 180000 },
          { month: 'Feb', bookings: 19, revenue: 285000 },
          { month: 'Mar', bookings: 15, revenue: 225000 },
          { month: 'Apr', bookings: 22, revenue: 330000 },
          { month: 'May', bookings: 18, revenue: 270000 },
          { month: 'Jun', bookings: totalBookings, revenue: totalRevenue }
        ];
        
        const topBusinesses = [
          { name: "camila's Car Rental", bookings: 3, revenue: 173000 },
          { name: 'Kamie Rental', bookings: 2, revenue: 125000 },
          { name: 'Vigan Auto Rentals', bookings: 8, revenue: 240000 },
          { name: 'City Car Hire', bookings: 5, revenue: 150000 }
        ];
        
        // Calculate car type distribution with all types
        const allCarTypes = ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Pickup', 'Van'];
        const carTypeStats = vehiclesData.reduce((acc, car) => {
          const type = car.carType || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        const carTypeDistribution = allCarTypes.map(type => ({
          type,
          count: carTypeStats[type] || 0,
          percentage: totalCars > 0 ? Math.round(((carTypeStats[type] || 0) / totalCars) * 100) : 0
        })).sort((a, b) => b.count - a.count);
        
        setChartData({
          monthlyBookings,
          statusDistribution,
          revenueData: monthlyBookings,
          topBusinesses,
          carTypeDistribution
        });
        
        // Format booking dates
        bookingsData.forEach(booking => {
          if (booking.startDate) {
            booking.startDateFormatted = new Date(booking.startDate).toLocaleDateString();
          }
          if (booking.endDate) {
            booking.endDateFormatted = new Date(booking.endDate).toLocaleDateString();
          }
        });
        
        setRecentBookings(bookingsData);
        
        // Fetch reviews with user information
        let reviewsData = [];
        let totalReviews = 0;
        try {
          const reviewsQuery = query(
            collection(db, 'reviews'),
            orderBy('timestamp', 'desc'),
            limit(5)
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          
          // Get all user IDs from reviews to fetch user data
          const userIds = new Set();
          reviewsSnapshot.docs.forEach(doc => {
            const review = doc.data();
            if (review.userId) userIds.add(review.userId);
            if (review.ownerId) userIds.add(review.ownerId);
          });
          
          // Fetch user information for all users involved in reviews
          const usersData = {};
          if (userIds.size > 0) {
            const usersQuery = collection(db, 'users');
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.docs.forEach(doc => {
              const userData = { id: doc.id, ...doc.data() };
              if (userIds.has(doc.id)) {
                usersData[doc.id] = userData;
              }
            });
          }
          
          reviewsData = reviewsSnapshot.docs.map(doc => {
            const review = { id: doc.id, ...doc.data() };
            // Format timestamp
            if (review.timestamp) {
              review.timeFormatted = new Date(review.timestamp.seconds * 1000).toLocaleDateString();
            }
            
            // Add user information
            if (review.userId && usersData[review.userId]) {
              review.reviewerInfo = usersData[review.userId];
            }
            if (review.ownerId && usersData[review.ownerId]) {
              review.ownerInfo = usersData[review.ownerId];
            }
            
            return review;
          });
          setReviews(reviewsData);
          totalReviews = reviewsData.length;
        } catch (error) {
          console.log('No reviews collection found or other error:', error);
          setReviews([]);
        }
        
        // Fetch notifications directly from database
        let notificationsData = [];
        try {
          // Try to fetch with createdAt first (newer notifications)
          let notificationsSnapshot;
          try {
            const notificationsQuery = query(
              collection(db, 'notifications'),
              orderBy('createdAt', 'desc'),
              limit(10)
            );
            notificationsSnapshot = await getDocs(notificationsQuery);
          } catch (createdAtError) {
            // Fallback to 'time' field if createdAt doesn't exist
            console.log('Trying with time field instead of createdAt');
            const notificationsQuery = query(
              collection(db, 'notifications'),
              orderBy('time', 'desc'),
              limit(10)
            );
            notificationsSnapshot = await getDocs(notificationsQuery);
          }
          
          notificationsData = notificationsSnapshot.docs.map(doc => {
            const notification = { id: doc.id, ...doc.data() };
            
            // Format time for display - check multiple timestamp fields
            let displayDate = null;
            if (notification.createdAt) {
              displayDate = notification.createdAt.toDate ? notification.createdAt.toDate() : new Date(notification.createdAt);
            } else if (notification.time) {
              displayDate = notification.time.toDate ? notification.time.toDate() : new Date(notification.time);
            } else if (notification.updatedAt) {
              displayDate = notification.updatedAt.toDate ? notification.updatedAt.toDate() : new Date(notification.updatedAt);
            }
            
            if (displayDate) {
              notification.timeFormatted = displayDate.toLocaleString();
              notification.sortDate = displayDate; // For sorting
            }
            
            return notification;
          });
          
          // Sort by date to ensure newest first
          notificationsData.sort((a, b) => {
            const dateA = a.sortDate || new Date(0);
            const dateB = b.sortDate || new Date(0);
            return dateB - dateA;
          });
          
          // Count unread notifications
          const unreadCount = notificationsData.filter(n => !n.read).length;
          setNotificationCount(unreadCount);
          
          console.log('📢 Fetched notifications:', notificationsData.length);
          console.log('📢 Unread notifications:', unreadCount);
          
        } catch (error) {
          console.log('Error fetching notifications:', error);
        }
        
        setNotifications(notificationsData);
        
        // Set all stats
        setStats({
          totalCars,
          totalOwners,
          totalUsers,
          availableCars,
          totalBookings,
          totalReviews,
          totalRevenue,
          monthlyRevenue: totalRevenue * 0.3,
          pendingBookings,
          completedBookings,
          activeBookings,
          cancelledBookings,
          overdueBookings,
          averageDuration,
          successRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0
        });
        
        // Finish loading
        setLoading(false);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [db]);

  

  // Add custom styles for the dashboard
  useEffect(() => {
    const styles = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(45, 55, 72, 0.3);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(45, 55, 72, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(45, 55, 72, 0);
        }
      }
      
      .card-glassmorphism {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      }
      
      .card-glassmorphism-dark {
        background: rgba(45, 55, 72, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }
      
      .bg-pattern {
        background-color: #f5f5f5;
        background-image: radial-gradient(#e0e0e0 1px, transparent 1px);
        background-size: 20px 20px;
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.5s ease-out forwards;
      }
      
      .animate-slideUp {
        animation: slideUp 0.5s ease-out forwards;
      }
      
      .animate-pulse-subtle {
        animation: pulse 2s infinite;
      }
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
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
      
      .stat-card {
        transition: all 0.3s ease;
      }
      
      .stat-card:hover {
        transform: translateY(-5px);
      }
      
      .stat-icon {
        transition: all 0.3s ease;
      }
      
      .stat-card:hover .stat-icon {
        transform: scale(1.1);
      }
      
      .table-row {
        transition: all 0.2s ease;
      }
      
      .table-row:hover {
        background-color: rgba(243, 244, 246, 0.7);
      }

      .notification-item {
        transition: all 0.2s ease;
      }
      
      .notification-item:hover {
        background-color: rgba(243, 244, 246, 0.7);
      }
      
      @keyframes notification-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
        }
        70% {
          box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
        }
      }
      
      .notification-pulse {
        animation: notification-pulse 2s infinite;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  
  
  
  // Function to get status color and text with updated colors
  const getStatusDisplay = (status) => {
    switch(status?.toLowerCase()) {
      case 'accepted':
        return { 
          bgColor: 'text-white', 
          textColor: 'text-white', 
          text: 'Accepted',
          style: { backgroundColor: '#4CAF50' }
        };
      case 'pending':
        return { 
          bgColor: 'text-black', 
          textColor: 'text-black', 
          text: 'Pending',
          style: { backgroundColor: '#FFC107' }
        };
      case 'completed':
        return { 
          bgColor: 'text-white', 
          textColor: 'text-white', 
          text: 'Completed',
          style: { backgroundColor: '#2196F3' }
        };
      case 'overdue':
        return { 
          bgColor: 'text-white', 
          textColor: 'text-white', 
          text: 'Overdue',
          style: { backgroundColor: '#9E9E9E' }
        };
      case 'cancelled':
        return { 
          bgColor: 'bg-red-100', 
          textColor: 'text-red-800', 
          text: 'Cancelled'
        };
      default:
        return { 
          bgColor: 'bg-gray-100', 
          textColor: 'text-gray-800', 
          text: status || 'Unknown'
        };
    }
  };

  

  // Function to render star rating
  const renderStarRating = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          className={i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
        />
      );
    }
    return stars;
  };

  return (
    <div className="flex h-screen bg-pattern">
      <Sidebar currentPage="dashboard" />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-0' : 'ml-0 lg:ml-64'}`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button 
                onClick={toggleSidebar}
                className="mr-4 p-1 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none lg:hidden"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center text-sm text-gray-500">
                <Clock size={16} className="mr-1" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none relative"
                >
                  <Bell size={20} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">Notifications</h3>
                      <div className="flex items-center space-x-2">
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            // Mark all notifications as read
                            notifications.filter(n => !n.read).forEach(notification => {
                              if (notification.id && !notification.id.startsWith('booking-') && !notification.id.startsWith('client-') && !notification.id.startsWith('low-availability')) {
                                markNotificationAsRead(notification.id);
                              }
                            });
                            // For fallback notifications, just update local state
                            setNotifications(notifications.map(n => ({ ...n, read: true })));
                            setNotificationCount(0);
                          }}
                        >
                          Mark all read
                        </button>
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="space-y-1 p-2">
                          {notifications.map((notification) => (
                            <div 
                              key={notification.id} 
                              className={`p-3 rounded-md notification-item cursor-pointer flex items-start ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
                              onClick={() => {
                                if (notification.id && !notification.id.startsWith('booking-') && !notification.id.startsWith('client-') && !notification.id.startsWith('low-availability')) {
                                  markNotificationAsRead(notification.id);
                                } else {
                                  // For fallback notifications, just update local state
                                  const updatedNotifications = notifications.map(n => 
                                    n.id === notification.id ? { ...n, read: true } : n
                                  );
                                  setNotifications(updatedNotifications);
                                  setNotificationCount(updatedNotifications.filter(n => !n.read).length);
                                }
                                
                                // Navigate to route if available
                                if (notification.routePath) {
                                  navigate(notification.routePath);
                                }
                              }}
                            >
                              <div className={`p-2 rounded-full ${
                                notification.type === 'warning' ? 'bg-yellow-100' :
                                notification.type === 'new_account' ? 'bg-green-100' :
                                notification.type === 'booking_completed' ? 'bg-blue-100' :
                                notification.type === 'booking_created' ? 'bg-purple-100' :
                                notification.read ? 'bg-gray-100' : 'bg-blue-100'
                              } mr-3 flex-shrink-0`}>
                                {notification.type === 'warning' ? (
                                  <AlertTriangle size={14} className="text-yellow-600" />
                                ) : notification.type === 'new_account' ? (
                                  <User size={14} className="text-green-600" />
                                ) : notification.type === 'booking_completed' ? (
                                  <Check size={14} className="text-blue-600" />
                                ) : notification.type === 'booking_created' ? (
                                  <FileText size={14} className="text-purple-600" />
                                ) : (
                                  <Bell size={14} className={notification.read ? 'text-gray-600' : 'text-blue-600'} />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div>
                                    {notification.title && (
                                      <div className={`text-xs font-medium ${notification.read ? 'text-gray-500' : 'text-gray-700'} mb-1`}>
                                        {notification.title}
                                      </div>
                                    )}
                                    <p className={`text-sm ${notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                                      {notification.message}
                                    </p>
                                  </div>
                                  {!notification.read && (
                                    <span className="h-2 w-2 bg-blue-500 rounded-full ml-2 mt-1.5 flex-shrink-0"></span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">{notification.timeFormatted || notification.time}</span>
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
                    
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-center">
                        <button 
                          className="text-sm text-red-600 hover:text-red-800 focus:outline-none"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to clear all notifications?')) {
                              setNotifications([]);
                              setNotificationCount(0);
                            }
                          }}
                        >
                          Clear All Notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Admin Profile */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center space-x-2 p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium">{user?.name || 'Admin User'}</div>
                    <div className="text-xs text-gray-500">{user?.role || 'Administrator'}</div>
                  </div>
                </button>
                
                {/* Profile Dropdown */}
                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-lg font-medium">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user?.name || 'Admin User'}</div>
                          <div className="text-sm text-gray-500">{user?.email || 'admin@vigancarrental.com'}</div>
                          <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block mt-1">
                            {user?.role || 'Administrator'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button 
                        onClick={() => navigate('/profile')}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                      >
                        <User size={16} className="mr-2" />
                        View Profile
                      </button>
                      <button 
                        onClick={() => navigate('/settings')}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                      >
                        <Settings size={16} className="mr-2" />
                        Settings
                      </button>
                      <hr className="my-2" />
                      <button 
                        onClick={() => {
                          // Add logout logic here
                          navigate('/login');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md flex items-center"
                      >
                        <ArrowLeft size={16} className="mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
          <div className="container px-4 sm:px-6 py-8 mx-auto">
            {/* Dashboard Header */}
            <div className="mb-8 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Car Rental Dashboard</h2>
              <p className="text-gray-500">Overview of rental activity and statistics</p>
            </div>
            
            {loading ? (
              <div className="flex justify-center my-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
              </div>
            ) : (
              <>
                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                  {/* Total Bookings */}
                  <div onClick={() => navigate('/reports')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp h-32" style={{ animationDelay: '50ms' }}>
                      <div className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase mb-2">Total Bookings</h6>
                            <span className="text-3xl font-bold text-blue-600">{stats.totalBookings}</span>
                          </div>
                          <div className="p-3 bg-blue-100 rounded-full stat-icon">
                            <FileText size={24} className="text-blue-600" />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Total Cars */}
                  <div onClick={() => navigate('/cars')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp h-32" style={{ animationDelay: '100ms' }}>
                      <div className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase mb-2">Total Cars</h6>
                            <span className="text-3xl font-bold text-purple-600">{stats.totalCars}</span>
                          </div>
                          <div className="p-3 bg-purple-100 rounded-full stat-icon">
                            <Car size={24} className="text-purple-600" />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Car Owners */}
                  <div onClick={() => navigate('/users')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp h-32" style={{ animationDelay: '150ms' }}>
                      <div className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase mb-2">Car Owners</h6>
                            <span className="text-3xl font-bold text-orange-600">{stats.totalOwners}</span>
                          </div>
                          <div className="p-3 bg-orange-100 rounded-full stat-icon">
                            <UsersRound size={24} className="text-orange-600" />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Total Users */}
                  <div onClick={() => navigate('/users')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp h-32" style={{ animationDelay: '200ms' }}>
                      <div className="p-6 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase mb-2">Total Users</h6>
                            <span className="text-3xl font-bold text-indigo-600">{stats.totalUsers}</span>
                          </div>
                          <div className="p-3 bg-indigo-100 rounded-full stat-icon">
                            <Users size={24} className="text-indigo-600" />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-8"></div>

                {/* Analytics Row - 4 Equal Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                  {/* Monthly Bookings Chart - Wider */}
                  <div className="lg:col-span-2 card-glassmorphism rounded-lg p-6 animate-slideUp" style={{ animationDelay: '300ms' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                        <BarChart3 size={20} className="mr-2 text-blue-600" />
                        {timeFilter === 'week' ? 'Weekly' : timeFilter === 'year' ? 'Yearly' : 'Monthly'} Bookings
                      </h4>
                      <div className="flex space-x-2">
                        <button onClick={() => setTimeFilter('week')} className={`px-3 py-1 text-xs rounded ${timeFilter === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Week</button>
                        <button onClick={() => setTimeFilter('month')} className={`px-3 py-1 text-xs rounded ${timeFilter === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Month</button>
                        <button onClick={() => setTimeFilter('year')} className={`px-3 py-1 text-xs rounded ${timeFilter === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Year</button>
                      </div>
                    </div>
                    <div style={{ height: '300px' }}>
                      <Bar
                        data={{
                          labels: chartData.monthlyBookings.map(d => d.month),
                          datasets: [{
                            label: 'Bookings',
                            data: chartData.monthlyBookings.map(d => d.bookings),
                            backgroundColor: '#3B82F6',
                            borderRadius: 6,
                            borderSkipped: false
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false }
                          },
                          scales: {
                            y: { beginAtZero: true, grid: { display: false } },
                            x: { grid: { display: false } }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Most Rented Car Types */}
                  <div className="card-glassmorphism rounded-lg p-6 animate-slideUp" style={{ animationDelay: '350ms' }}>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                        <Car size={32} className="mr-2 text-purple-600" />
                        Most Rented Car Types
                      </h4>
                      <div className="flex space-x-1">
                        <button onClick={() => setRevenueFilter('week')} className={`px-2 py-1 text-xs rounded ${revenueFilter === 'week' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Week</button>
                        <button onClick={() => setRevenueFilter('month')} className={`px-2 py-1 text-xs rounded ${revenueFilter === 'month' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Month</button>
                        <button onClick={() => setRevenueFilter('year')} className={`px-2 py-1 text-xs rounded ${revenueFilter === 'year' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'}`}>Year</button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {chartData.carTypeDistribution.map((item, index) => {
                        const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280', '#EC4899'];
                        return (
                          <div key={item.type}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: colors[index] }}></div>
                                <span className={`text-sm font-medium ${item.count === 0 ? 'text-gray-400' : 'text-gray-700'}`}>{item.type}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs font-semibold ${item.count === 0 ? 'text-gray-400' : 'text-gray-600'}`}>{item.count}</span>
                                <span className={`text-xs ${item.count === 0 ? 'text-gray-400' : 'text-gray-500'}`}>{item.percentage}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Booking Status Distribution */}
                  <div className="card-glassmorphism rounded-lg p-6 animate-slideUp" style={{ animationDelay: '400ms' }}>
                    <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                      <PieChart size={20} className="mr-2 text-indigo-600" />
                      Booking Status Distribution
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-gray-700">Active</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{stats.activeBookings}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-gray-700">Completed</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">{stats.completedBookings}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-xs font-medium text-gray-700">Pending</span>
                        </div>
                        <span className="text-sm font-bold text-yellow-600">{stats.pendingBookings}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-xs font-medium text-gray-700">Overdue</span>
                        </div>
                        <span className="text-sm font-bold text-red-600">{stats.overdueBookings}</span>
                      </div>
                    </div>
                  </div>
                </div>




              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;