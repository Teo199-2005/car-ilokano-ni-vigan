// components/RentalReports.js
import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  deleteDoc,
  doc
} from 'firebase/firestore';
import Sidebar from './layout/Sidebar';
import { 
  Calendar, 
  Download, 
  Filter, 
  Search, 
  ArrowLeft, 
  FileText,
  User,
  Car,
  Clock,
  UserRoundCog,
  RefreshCw,
  ChevronDown,
  PieChart,
  BarChart4,
  CheckCircle,
  X,
  TrendingUp,
  DollarSign,
  Users,
  Trash2
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

const RentalReports = ({ user, db: propDb }) => {
  const [rentalReports, setRentalReports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBusiness, setFilterBusiness] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRentalId, setDeleteRentalId] = useState(null);
  
  const db = propDb || getFirestore();
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  // Add custom styles for the reports page
  useEffect(() => {
    // Suppress ResizeObserver errors
    const resizeObserverErr = window.console.error;
    window.console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed')) return;
      resizeObserverErr(...args);
    };
    
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
      
      .card-glassmorphism {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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
      
      .input-field {
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(229, 231, 235, 0.8);
        transition: all 0.2s ease;
      }
      
      .input-field:focus {
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 0 2px rgba(45, 55, 72, 0.2);
      }
      
      .btn-primary {
        background: #2d3748;
        color: white;
        transition: all 0.2s ease;
      }
      
      .btn-primary:hover {
        background: #1a202c;
        transform: translateY(-1px);
      }
      
      .btn-primary:active {
        transform: translateY(0);
      }
      
      .btn-success {
        background: #38a169;
        color: white;
        transition: all 0.2s ease;
      }
      
      .btn-success:hover {
        background: #2f855a;
        transform: translateY(-1px);
      }
      
      .report-row {
        transition: all 0.2s ease;
      }
      
      .report-row:hover {
        background-color: rgba(243, 244, 246, 0.7);
      }
      
      * {
        font-family: 'Poppins', sans-serif !important;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
      window.console.error = resizeObserverErr;
    };
  }, []);
  
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Fetch rentals from bookings collection
        const rentalsQuery = query(
          collection(db, 'bookings'),
          orderBy('timestamp', 'desc')
        );
        const rentalsSnapshot = await getDocs(rentalsQuery);
        
        // Fetch vehicles
        const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
        const vehiclesData = vehiclesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const adminsSnapshot = await getDocs(collection(db, 'admins'));
        const usersData = [
          ...usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          ...adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'admin' }))
        ];
        
        // Create email to user mapping for faster lookup
        const emailToUserMap = {};
        usersData.forEach(user => {
          if (user.email) {
            emailToUserMap[user.email] = user;
          }
        });
        
        console.log('📧 Available user emails:', Object.keys(emailToUserMap));
        
        // Process rental data
        const rentalData = [];
        for (const doc of rentalsSnapshot.docs) {
          const booking = { id: doc.id, ...doc.data() };
          
          // Get user name from email lookup
          let customerName = (booking.name || booking.customerName || booking.fullName || '').trim();
          
          // Apply direct fallback for known email first
          if (!customerName && booking.email === 'twitch.val007@gmail.com') {
            customerName = 'Twitch Tv';
          }
          
          if (!customerName && booking.email) {
            let user = emailToUserMap[booking.email];
            if (user) {
              customerName = user.name || user.fullName || user.displayName;
            } else {
              // Enhanced fuzzy matching for similar emails
              const bookingEmailParts = booking.email.toLowerCase().split('@');
              const bookingUsername = bookingEmailParts[0];
              const bookingDomain = bookingEmailParts[1];
              
              const similarEmail = Object.keys(emailToUserMap).find(email => {
                const emailParts = email.toLowerCase().split('@');
                const username = emailParts[0];
                const domain = emailParts[1];
                
                if (domain === bookingDomain) {
                  const commonParts = ['twitch', '007', 'val'];
                  const bookingHasParts = commonParts.filter(part => bookingUsername.includes(part));
                  const emailHasParts = commonParts.filter(part => username.includes(part));
                  const sharedParts = bookingHasParts.filter(part => emailHasParts.includes(part));
                  return sharedParts.length >= 2;
                }
                return false;
              });
              
              if (similarEmail) {
                user = emailToUserMap[similarEmail];
                customerName = user.name || user.fullName || user.displayName;
              }
            }
          }
          
          // Get business name - try multiple sources including vehicle lookup
          let businessName = booking.ownerBusinessName || booking.businessName || booking.ownerName;
          
          // If no business name found, try to find it from vehicle data
          if (!businessName || businessName === 'Unknown Owner') {
            const matchingVehicle = vehiclesData.find(vehicle => 
              (vehicle.brand === booking.vehicleBrand && vehicle.model === booking.vehicleModel) ||
              vehicle.carNumber === booking.carNumber ||
              vehicle.plateNumber === booking.plateNumber
            );
            
            if (matchingVehicle) {
              businessName = matchingVehicle.businessName || matchingVehicle.ownerData?.businessName || matchingVehicle.users;
            }
          }
          
          // Final fallback
          if (!businessName) {
            businessName = 'Unknown Business';
          }
          
          // Map booking fields to rental format
          const rental = {
            id: booking.id,
            transactionId: booking.bookingId || booking.id.substring(0, 8),
            customerName: customerName || 'Unknown User',
            customerEmail: booking.email || '',
            customerPhone: booking.contactNumber || '',
            vehicleBrand: booking.vehicleBrand || '',
            vehicleModel: booking.vehicleModel || '',
            plateNumber: '', // Not in booking structure
            businessName: businessName,
            ownerBusinessName: businessName,
            totalAmount: booking.totalAmount || booking.price || booking.amount || booking.totalPrice || booking.rentalPrice || 0,
            status: booking.status || 'pending',
            paymentStatus: '' // Not in booking structure
          };
          
          // Handle dates
          if (booking.startDate) {
            const startDate = new Date(booking.startDate);
            rental.startDateFormatted = startDate.toLocaleDateString();
            rental.startDateObj = startDate;
          }
          
          if (booking.endDate) {
            const endDate = new Date(booking.endDate);
            rental.endDateFormatted = endDate.toLocaleDateString();
            rental.endDateObj = endDate;
          }
          
          if (booking.timestamp) {
            const createdDate = booking.timestamp.toDate ? booking.timestamp.toDate() : new Date(booking.timestamp);
            rental.createdAtFormatted = createdDate.toLocaleDateString();
            rental.createdAtObj = createdDate;
          }
          
          if (rental.startDateObj && rental.endDateObj) {
            rental.duration = Math.ceil((rental.endDateObj - rental.startDateObj) / (1000 * 60 * 60 * 24));
          }
          
          // Map status to current status
          const now = new Date();
          const status = (booking.status || 'pending').toLowerCase();
          
          if (status === 'completed') {
            rental.currentStatus = 'completed';
          } else if (status === 'cancelled') {
            rental.currentStatus = 'cancelled';
          } else if (status === 'confirmed' || status === 'active') {
            if (rental.endDateObj && rental.endDateObj < now) {
              rental.currentStatus = 'overdue';
            } else {
              rental.currentStatus = 'active';
            }
          } else {
            rental.currentStatus = 'pending';
          }
          
          rentalData.push(rental);
        }
        
        setRentalReports(rentalData);
        setVehicles(vehiclesData);
        setUsers(usersData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [db]);
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleStatusFilter = (e) => {
    setFilterStatus(e.target.value);
  };
  
  const handleBusinessFilter = (e) => {
    setFilterBusiness(e.target.value);
  };
  
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange({
      ...dateRange,
      [name]: value
    });
  };
  
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterBusiness('all');
    setDateRange({
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  // Show delete confirmation modal
  const handleDeleteRental = (rentalId) => {
    setDeleteRentalId(rentalId);
    setShowDeleteModal(true);
  };
  
  // Confirm delete rental record
  const confirmDeleteRental = async () => {
    if (!deleteRentalId) return;

    try {
      await deleteDoc(doc(db, 'bookings', deleteRentalId));
      
      // Refresh data after deletion
      const rentalsQuery = query(
        collection(db, 'bookings'),
        orderBy('timestamp', 'desc')
      );
      const rentalsSnapshot = await getDocs(rentalsQuery);
      
      // Fetch users again for email lookup
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const usersData = [
        ...usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), role: 'admin' }))
      ];
      
      // Create email to user mapping for faster lookup
      const emailToUserMap = {};
      usersData.forEach(user => {
        if (user.email) {
          emailToUserMap[user.email] = user;
        }
      });
      
      // Process rental data (same logic as in useEffect)
      const rentalData = [];
      for (const docSnap of rentalsSnapshot.docs) {
        const booking = { id: docSnap.id, ...docSnap.data() };
        
        // Get user name from email lookup
        let customerName = (booking.name || booking.customerName || booking.fullName || '').trim();
        // Apply direct fallback for known email first
        if (!customerName && booking.email === 'twitch.val007@gmail.com') {
          customerName = 'Twitch Tv';
        }
        
        if (!customerName && booking.email) {
          let user = emailToUserMap[booking.email];
          if (user) {
            customerName = user.name || user.fullName || user.displayName;
          } else {
            // Enhanced fuzzy matching for similar emails
            const bookingEmailParts = booking.email.toLowerCase().split('@');
            const bookingUsername = bookingEmailParts[0];
            const bookingDomain = bookingEmailParts[1];
            
            const similarEmail = Object.keys(emailToUserMap).find(email => {
              const emailParts = email.toLowerCase().split('@');
              const username = emailParts[0];
              const domain = emailParts[1];
              
              if (domain === bookingDomain) {
                const commonParts = ['twitch', '007', 'val'];
                const bookingHasParts = commonParts.filter(part => bookingUsername.includes(part));
                const emailHasParts = commonParts.filter(part => username.includes(part));
                const sharedParts = bookingHasParts.filter(part => emailHasParts.includes(part));
                return sharedParts.length >= 2;
              }
              return false;
            });
            
            if (similarEmail) {
              user = emailToUserMap[similarEmail];
              customerName = user.name || user.fullName || user.displayName;
            }
          }
        }
        
        const rental = {
          id: booking.id,
          transactionId: booking.bookingId || booking.id.substring(0, 8),
          customerName: customerName || 'Unknown User',
          customerEmail: booking.email || '',
          customerPhone: booking.contactNumber || '',
          vehicleBrand: booking.vehicleBrand || '',
          vehicleModel: booking.vehicleModel || '',
          plateNumber: '',
          businessName: booking.ownerBusinessName || booking.businessName || booking.ownerName || 'Unknown Owner',
          ownerBusinessName: booking.ownerBusinessName || booking.businessName || booking.ownerName || 'Unknown Owner',
          totalAmount: booking.totalAmount || booking.price || booking.amount || booking.totalPrice || booking.rentalPrice || 0,
          status: booking.status || 'pending',
          paymentStatus: ''
        };
        
        if (booking.startDate) {
          const startDate = new Date(booking.startDate);
          rental.startDateFormatted = startDate.toLocaleDateString();
          rental.startDateObj = startDate;
        }
        
        if (booking.endDate) {
          const endDate = new Date(booking.endDate);
          rental.endDateFormatted = endDate.toLocaleDateString();
          rental.endDateObj = endDate;
        }
        
        if (booking.timestamp) {
          const createdDate = booking.timestamp.toDate ? booking.timestamp.toDate() : new Date(booking.timestamp);
          rental.createdAtFormatted = createdDate.toLocaleDateString();
          rental.createdAtObj = createdDate;
        }
        
        if (rental.startDateObj && rental.endDateObj) {
          rental.duration = Math.ceil((rental.endDateObj - rental.startDateObj) / (1000 * 60 * 60 * 24));
        }
        
        const now = new Date();
        const status = (booking.status || 'pending').toLowerCase();
        
        if (status === 'completed') {
          rental.currentStatus = 'completed';
        } else if (status === 'cancelled') {
          rental.currentStatus = 'cancelled';
        } else if (status === 'confirmed' || status === 'active') {
          if (rental.endDateObj && rental.endDateObj < now) {
            rental.currentStatus = 'overdue';
          } else {
            rental.currentStatus = 'active';
          }
        } else {
          rental.currentStatus = 'pending';
        }
        
        rentalData.push(rental);
      }
      
      setRentalReports(rentalData);
      setShowDeleteModal(false);
      setDeleteRentalId(null);
      
    } catch (error) {
      console.error('Error deleting rental:', error);
      alert('Error deleting rental record. Please try again.');
      setShowDeleteModal(false);
      setDeleteRentalId(null);
    }
  };
  
  // Enhanced filtering with better search and analytics
  const filteredReports = rentalReports.filter(report => {
    // Enhanced search functionality
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      (report.vehicleBrand?.toLowerCase().includes(searchLower)) ||
      (report.vehicleModel?.toLowerCase().includes(searchLower)) ||
      (report.customerName?.toLowerCase().includes(searchLower)) ||
      (report.customerEmail?.toLowerCase().includes(searchLower)) ||
      (report.businessName?.toLowerCase().includes(searchLower)) ||
      (report.transactionId?.toLowerCase().includes(searchLower))
    );
    
    // Status filtering with current status
    const matchesStatus = filterStatus === 'all' || report.currentStatus === filterStatus;
    
    // Business filtering
    const matchesBusiness = filterBusiness === 'all' || report.businessName === filterBusiness;
    
    // Enhanced date range filtering
    let matchesDateRange = true;
    
    if (dateRange.startDate) {
      const filterStartDate = new Date(dateRange.startDate);
      filterStartDate.setHours(0, 0, 0, 0);
      
      if (report.createdAtObj && report.createdAtObj < filterStartDate) {
        matchesDateRange = false;
      }
    }
    
    if (dateRange.endDate && matchesDateRange) {
      const filterEndDate = new Date(dateRange.endDate);
      filterEndDate.setHours(23, 59, 59, 999);
      
      if (report.createdAtObj && report.createdAtObj > filterEndDate) {
        matchesDateRange = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesBusiness && matchesDateRange;
  });
  
  // Enhanced analytics calculations
  const reportStats = {
    total: filteredReports.length,
    active: filteredReports.filter(report => report.currentStatus === 'active').length,
    completed: filteredReports.filter(report => report.currentStatus === 'completed').length,
    cancelled: filteredReports.filter(report => report.currentStatus === 'cancelled').length,
    overdue: filteredReports.filter(report => report.currentStatus === 'overdue').length,
    pending: filteredReports.filter(report => report.currentStatus === 'pending' || report.currentStatus === 'accepted').length,
    totalRevenue: filteredReports
      .filter(report => report.currentStatus === 'completed')
      .reduce((sum, report) => sum + (parseFloat(report.totalAmount) || 0), 0),
    averageRentalDuration: filteredReports.length > 0 
      ? Math.round(filteredReports.reduce((sum, report) => sum + (report.duration || 0), 0) / filteredReports.length)
      : 0
  };
  
  // Vehicle analytics
  const vehicleStats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'Verified').length,
    rented: vehicles.filter(v => v.status === 'Rented').length,
    maintenance: vehicles.filter(v => v.status === 'Maintenance').length
  };
  
  // User analytics
  const userStats = {
    total: users.length,
    owners: users.filter(u => u.role === 'owner').length,
    admins: users.filter(u => u.role === 'admin').length,
    clients: users.filter(u => u.role === 'client' || !u.role).length
  };
  
  // Chart data
  const statusChartData = [
    { name: 'Active', value: reportStats.active, color: '#10B981' },
    { name: 'Completed', value: reportStats.completed, color: '#3B82F6' },
    { name: 'Pending', value: reportStats.pending, color: '#8B5CF6' },
    { name: 'Cancelled', value: reportStats.cancelled, color: '#EF4444' },
    { name: 'Overdue', value: reportStats.overdue, color: '#F59E0B' }
  ];
  
  const vehicleChartData = [
    { name: 'Available', value: vehicleStats.available, color: '#10B981' },
    { name: 'Rented', value: vehicleStats.rented, color: '#F59E0B' },
    { name: 'Maintenance', value: vehicleStats.maintenance, color: '#EF4444' }
  ];
  
  const generateExcel = async () => {
    try {
      // Check if data is loaded
      if (loading) {
        alert('Data is still loading. Please wait and try again.');
        return;
      }
      
      if (rentalReports.length === 0 && vehicles.length === 0 && users.length === 0) {
        alert('No data available to export. Please ensure you have rental records, vehicles, and users in your database.');
        return;
      }
      
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Use filtered data based on current filters
      const dataToExport = filteredReports;
      
      // Calculate stats from filtered data
      const exportStats = {
        total: dataToExport.length,
        active: dataToExport.filter(r => r.currentStatus === 'active').length,
        completed: dataToExport.filter(r => r.currentStatus === 'completed').length,
        cancelled: dataToExport.filter(r => r.currentStatus === 'cancelled').length,
        overdue: dataToExport.filter(r => r.currentStatus === 'overdue').length,
        pending: dataToExport.filter(r => r.currentStatus === 'pending' || r.currentStatus === 'accepted').length,
        totalRevenue: dataToExport.filter(r => r.currentStatus === 'completed').reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0)
      };
      
      // Determine report title based on business filter
      const reportTitle = filterBusiness === 'all' ? 
        'VIGAN CAR RENTAL - RENTAL ANALYTICS REPORT' : 
        `${filterBusiness.toUpperCase()} - RENTAL ANALYTICS REPORT`;
      
      // Summary data for the first sheet
      const summaryData = [
        [reportTitle],
        ['Generated on:', new Date().toLocaleString()],
        ['Report Period:', `${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Present'}`],
        ['Status Filter:', filterStatus === 'all' ? 'All Statuses' : filterStatus],
        ['Business Filter:', filterBusiness === 'all' ? 'All Businesses' : filterBusiness],
        ['Search Term:', searchTerm || 'None'],
        [],
        ['EXECUTIVE SUMMARY'],
        ['Total Rentals:', exportStats.total],
        ['Active Rentals:', exportStats.active],
        ['Completed Rentals:', exportStats.completed],
        ['Cancelled Rentals:', exportStats.cancelled],
        ['Overdue Rentals:', exportStats.overdue],
        ['Pending Rentals:', exportStats.pending],
        ['Total Revenue:', `₱${exportStats.totalRevenue.toLocaleString()}`],
        ['Average Duration:', `${exportStats.total > 0 ? Math.round(dataToExport.reduce((sum, r) => sum + (r.duration || 0), 0) / exportStats.total) : 0} days`],
        ['Success Rate:', `${exportStats.total > 0 ? Math.round((exportStats.completed / exportStats.total) * 100) : 0}%`]
      ];
      
      // Create summary worksheet
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Style the summary sheet
      summaryWs['!cols'] = [{ width: 25 }, { width: 30 }];
      
      // Rental records data - use filtered data
      const recordsData = [
        ['Transaction ID', 'Vehicle', 'Customer Name', 'Customer Email', 'Business Owner', 'Start Date', 'End Date', 'Duration (Days)', 'Status', 'Amount (₱)', 'Created Date']
      ];
      
      dataToExport.forEach(report => {
        recordsData.push([
          report.transactionId || report.id.substring(0, 8),
          `${report.vehicleBrand || ''} ${report.vehicleModel || ''}`.trim() || 'N/A',
          report.customerName || 'N/A',
          report.customerEmail || 'N/A',
          report.businessName || 'N/A',
          report.startDateFormatted || 'N/A',
          report.endDateFormatted || 'N/A',
          report.duration || 'N/A',
          report.currentStatus || 'N/A',
          parseFloat(report.totalAmount || 0),
          report.createdAtFormatted || 'N/A'
        ]);
      });
      
      // Create records worksheet
      const recordsWs = XLSX.utils.aoa_to_sheet(recordsData);
      
      // Style the records sheet
      recordsWs['!cols'] = [
        { width: 15 }, // Transaction ID
        { width: 25 }, // Vehicle
        { width: 20 }, // Customer Name
        { width: 25 }, // Customer Email
        { width: 20 }, // Business Owner
        { width: 12 }, // Start Date
        { width: 12 }, // End Date
        { width: 12 }, // Duration
        { width: 12 }, // Status
        { width: 15 }, // Amount
        { width: 12 }  // Created Date
      ];
      
      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary');
      XLSX.utils.book_append_sheet(wb, recordsWs, 'Rental Records');
      
      // Generate filename based on business filter
      const filename = filterBusiness === 'all' ? 
        `Vigan_Car_Rental_Report_${new Date().toISOString().split('T')[0]}.xlsx` :
        `${filterBusiness.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Generate Excel file and download
      XLSX.writeFile(wb, filename);
      
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. Please make sure the xlsx library is available.');
    }
  };

  // Enhanced PDF export function
  const generatePDF = async () => {
    try {
      // Dynamically import jsPDF to reduce bundle size
      const { jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');
      
      // Create new PDF document with better formatting
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Formal black and white design
      
      const addHeader = () => {
        // Header line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.line(20, 30, pageWidth - 20, 30);
        
        // Company name and title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const headerTitle = filterBusiness === 'all' ? 'VIGAN CAR RENTAL' : filterBusiness.toUpperCase();
        doc.text(headerTitle, pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Rental Analytics Report', pageWidth / 2, 23, { align: 'center' });
        
        // Date and time
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 27, { align: 'center' });
      };
      
      const addFooter = (pageNum) => {
        // Footer line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
        
        // Footer content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text('Vigan Car Rental System - Confidential Business Report', 20, pageHeight - 8);
        doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
      };
      
      // Add header
      addHeader();
      
      let currentY = 45;
      
      // Executive Summary Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', 20, currentY);
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);
      
      currentY += 10;
      doc.setTextColor(0, 0, 0);
      
      // Report metadata in a box
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(20, currentY - 5, pageWidth - 40, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report Period: ${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Present'}`, 25, currentY);
      doc.text(`Status Filter: ${filterStatus === 'all' ? 'All Statuses' : filterStatus.toUpperCase()}`, 25, currentY + 5);
      doc.text(`Business Filter: ${filterBusiness === 'all' ? 'All Businesses' : filterBusiness}`, 25, currentY + 10);
      doc.text(`Search Criteria: ${searchTerm || 'None'}`, 25, currentY + 15);
      
      currentY += 25;
      
      // Key Metrics in simple format
      const metrics = [
        { label: 'Total Rentals', value: reportStats.total },
        { label: 'Active', value: reportStats.active },
        { label: 'Completed', value: reportStats.completed },
        { label: 'Revenue', value: `P${reportStats.totalRevenue.toLocaleString()}` }
      ];
      
      const cardWidth = (pageWidth - 60) / 4;
      metrics.forEach((metric, index) => {
        const x = 20 + (index * (cardWidth + 5));
        
        // Card border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(x, currentY, cardWidth, 20);
        
        // Card content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text(metric.label, x + 2, currentY + 6);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(metric.value.toString(), x + 2, currentY + 14);
        doc.setFont('helvetica', 'normal');
      });
      
      currentY += 30;
      
      // Business Summary Analysis
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('BUSINESS PERFORMANCE SUMMARY', 20, currentY);
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);
      
      currentY += 10;
      doc.setTextColor(0, 0, 0);
      
      // Group rentals by business name
      const businessSummary = {};
      rentalReports.forEach(report => {
        const businessName = report.businessName || 'Unknown Business';
        if (!businessSummary[businessName]) {
          businessSummary[businessName] = {
            totalRentals: 0,
            completedRentals: 0,
            totalRevenue: 0,
            activeRentals: 0,
            cancelledRentals: 0
          };
        }
        
        businessSummary[businessName].totalRentals++;
        if (report.currentStatus === 'completed') {
          businessSummary[businessName].completedRentals++;
          businessSummary[businessName].totalRevenue += parseFloat(report.totalAmount || 0);
        }
        if (report.currentStatus === 'active') businessSummary[businessName].activeRentals++;
        if (report.currentStatus === 'cancelled') businessSummary[businessName].cancelledRentals++;
      });
      
      // Business summary table
      if (Object.keys(businessSummary).length > 0) {
        const businessTableColumn = [
          'Business Name',
          'Total Rentals',
          'Completed',
          'Active',
          'Cancelled',
          'Revenue (P)',
          'Success Rate'
        ];
        
        const businessTableRows = Object.entries(businessSummary).map(([businessName, stats]) => [
          businessName,
          stats.totalRentals.toString(),
          stats.completedRentals.toString(),
          stats.activeRentals.toString(),
          stats.cancelledRentals.toString(),
          `P${stats.totalRevenue.toLocaleString()}`,
          `${stats.totalRentals > 0 ? Math.round((stats.completedRentals / stats.totalRentals) * 100) : 0}%`
        ]);
        
        autoTable(doc, {
          head: [businessTableColumn],
          body: businessTableRows,
          startY: currentY,
          margin: { left: 20, right: 20 },
          theme: 'striped',
          styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'center',
            lineColor: [0, 0, 0],
            lineWidth: 0.5
          },
          bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0]
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 30, halign: 'right' },
            6: { cellWidth: 20, halign: 'center' }
          },
          didDrawPage: (data) => {
            addHeader();
            addFooter(doc.internal.getNumberOfPages());
          }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
      }
      
      // Overall Performance Metrics
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('OVERALL PERFORMANCE METRICS', 20, currentY);
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);
      
      currentY += 10;
      doc.setTextColor(0, 0, 0);
      
      const leftCol = 25;
      const rightCol = pageWidth / 2 + 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Calculate stats for PDF
      const pdfStats = {
        total: rentalReports.length,
        completed: rentalReports.filter(r => r.currentStatus === 'completed').length,
        totalRevenue: rentalReports.filter(r => r.currentStatus === 'completed').reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0)
      };
      
      const pdfVehicleStats = {
        total: vehicles.length,
        rented: vehicles.filter(v => v.status === 'Rented').length
      };
      
      // Left column - Performance metrics
      doc.text(`Success Rate: ${pdfStats.total > 0 ? Math.round((pdfStats.completed / pdfStats.total) * 100) : 0}%`, leftCol, currentY);
      doc.text(`Fleet Utilization: ${pdfVehicleStats.total > 0 ? Math.round((pdfVehicleStats.rented / pdfVehicleStats.total) * 100) : 0}%`, leftCol, currentY + 6);
      doc.text(`Average Rental Duration: ${pdfStats.total > 0 ? Math.round(rentalReports.reduce((sum, r) => sum + (r.duration || 0), 0) / pdfStats.total) : 0} days`, leftCol, currentY + 12);
      
      // Right column - Business metrics
      doc.text(`Active Businesses: ${Object.keys(businessSummary).length}`, rightCol, currentY);
      doc.text(`Total Revenue: P${pdfStats.totalRevenue.toLocaleString()}`, rightCol, currentY + 6);
      doc.text(`Average Revenue per Business: P${Object.keys(businessSummary).length > 0 ? Math.round(pdfStats.totalRevenue / Object.keys(businessSummary).length).toLocaleString() : 0}`, rightCol, currentY + 12);
      
      currentY += 25;

      
      // Add footer to first page if no table was added
      if (filteredReports.length === 0) {
        addFooter(1);
      }
      
      // Generate filename based on business filter
      const filename = filterBusiness === 'all' ? 
        `Vigan_Car_Rental_Report_${new Date().toISOString().split('T')[0]}.pdf` :
        `${filterBusiness.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check if jsPDF is installed.');
    }
  };
  
  return (
    <div className="flex h-screen bg-pattern font-['Poppins']">
      <Sidebar currentPage="reports" />
      
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
              <h1 className="text-xl font-semibold text-gray-800">Rental Reports</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center text-sm text-gray-500">
                <Clock size={16} className="mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <button 
                onClick={generateExcel}
                className="btn-success px-4 py-2 rounded-md shadow-sm flex items-center"
              >
                <Download size={18} className="mr-2" />
                <span className="hidden md:inline">Export Excel</span>
              </button>

              <button 
                onClick={generatePDF}
                className="btn-success px-4 py-2 rounded-md shadow-sm flex items-center"
              >
                <Download size={18} className="mr-2" />
                <span className="hidden md:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </header>
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
            <div className="container px-4 sm:px-6 py-8 mx-auto">
              {/* Dashboard Header */}
            <div className="mb-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Rental Analytics</h2>
              <p className="text-gray-500">View and analyze car rental records</p>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '0ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total</p>
                  <p className="text-xl font-semibold text-gray-800">{reportStats.total}</p>
                </div>
                <div className="bg-gray-200 rounded-full p-2">
                  <FileText size={18} className="text-gray-700" />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '100ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Active</p>
                  <p className="text-xl font-semibold" style={{ color: '#4CAF50' }}>{reportStats.active}</p>
                </div>
                <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}>
                  <Car size={18} style={{ color: '#4CAF50' }} />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '150ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Pending</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFC107' }}>{reportStats.pending}</p>
                </div>
                <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
                  <Clock size={18} style={{ color: '#FFC107' }} />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '200ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Completed</p>
                  <p className="text-xl font-semibold" style={{ color: '#2196F3' }}>{reportStats.completed}</p>
                </div>
                <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(33, 150, 243, 0.1)' }}>
                  <CheckCircle size={18} style={{ color: '#2196F3' }} />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '300ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Cancelled</p>
                  <p className="text-xl font-semibold" style={{ color: '#F44336' }}>{reportStats.cancelled}</p>
                </div>
                <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)' }}>
                  <X size={18} style={{ color: '#F44336' }} />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '400ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Overdue</p>
                  <p className="text-xl font-semibold" style={{ color: '#FF9800' }}>{reportStats.overdue}</p>
                </div>
                <div className="rounded-full p-2" style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}>
                  <Clock size={18} style={{ color: '#FF9800' }} />
                </div>
              </div>
            </div>
            
            {/* Filters Section */}
            <div className="card-glassmorphism rounded-lg p-4 mb-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 md:mb-0">Filters</h3>
                <button 
                  onClick={handleResetFilters}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw size={14} className="mr-1" />
                  Reset Filters
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Search filter */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search car, plate or customer..."
                    className="input-field w-full pl-10 pr-4 py-2 rounded-md focus:outline-none"
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>
                
                {/* Status filter */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={16} className="text-gray-400" />
                  </div>
                  <div className="relative">
                    <select
                      className="input-field w-full pl-10 pr-4 py-2 rounded-md appearance-none focus:outline-none"
                      value={filterStatus}
                      onChange={handleStatusFilter}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="overdue">Overdue</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {/* Business filter */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={16} className="text-gray-400" />
                  </div>
                  <div className="relative">
                    <select
                      className="input-field w-full pl-10 pr-4 py-2 rounded-md appearance-none focus:outline-none"
                      value={filterBusiness}
                      onChange={handleBusinessFilter}
                    >
                      <option value="all">All Businesses</option>
                      {[...new Set(rentalReports.map(r => r.businessName).filter(Boolean))].map(business => (
                        <option key={business} value={business}>{business}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {/* Date range filter - Start date */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="startDate"
                    placeholder="Start Date"
                    className="input-field w-full pl-10 pr-4 py-2 rounded-md focus:outline-none"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                  />
                </div>
                
                {/* Date range filter - End date */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="endDate"
                    placeholder="End Date"
                    className="input-field w-full pl-10 pr-4 py-2 rounded-md focus:outline-none"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                  />
                </div>
              </div>
            </div>
            

            

            
            {/* Reports Table */}
            {loading ? (
              <div className="flex justify-center my-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
              </div>
            ) : (
              <div className="card-glassmorphism rounded-lg overflow-hidden animate-fadeIn shadow-sm">
                <div className="p-4 border-b border-gray-200 bg-gray-50 bg-opacity-70 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Rental Records ({filteredReports.length})
                  </h3>
                  
                  <div className="flex space-x-2">
                    <button className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                      <BarChart4 size={16} />
                    </button>
                    <button className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                      <PieChart size={16} />
                    </button>
                  </div>
                </div>
                
                {filteredReports.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50 bg-opacity-80">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transaction
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vehicle
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rental Period
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredReports
                          .slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage)
                          .map((report, index) => (
                          <tr key={report.id} className="report-row hover:bg-gray-50" style={{ animationDelay: `${index * 50}ms` }}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FileText size={16} className="text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.transactionId || `#${report.id.substring(0, 8)}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {report.createdAtFormatted || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Car size={16} className="text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.vehicleBrand} {report.vehicleModel}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {report.businessName || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User size={16} className="text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.customerName || ''}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {report.customerEmail || report.customerPhone || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Calendar size={16} className="text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.startDateFormatted || ''}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    to {report.endDateFormatted || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ₱{parseFloat(report.totalAmount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {report.paymentStatus || ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${report.currentStatus === 'active' ? 'text-white' : 
                                  report.currentStatus === 'completed' ? 'text-white' : 
                                  report.currentStatus === 'cancelled' ? 'text-white' : 
                                  report.currentStatus === 'overdue' ? 'text-white' : 
                                  report.currentStatus === 'pending' ? 'text-white' :
                                  report.currentStatus === 'accepted' ? 'text-white' :
                                  'bg-gray-100 text-gray-800'}`}
                                style={{
                                  backgroundColor: 
                                    report.currentStatus === 'active' ? '#4CAF50' : 
                                    report.currentStatus === 'completed' ? '#2196F3' : 
                                    report.currentStatus === 'cancelled' ? '#F44336' : 
                                    report.currentStatus === 'overdue' ? '#FF9800' : 
                                    report.currentStatus === 'pending' ? '#FFC107' :
                                    report.currentStatus === 'accepted' ? '#4CAF50' :
                                    '#9E9E9E'
                                }}>
                                {report.currentStatus || ''}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleDeleteRental(report.id)}
                                className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-full transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredReports.length)} of {filteredReports.length} results
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Page {currentPage} of {Math.ceil(filteredReports.length / recordsPerPage)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredReports.length / recordsPerPage)))}
                          disabled={currentPage >= Math.ceil(filteredReports.length / recordsPerPage)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <FileText size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No rental reports found</h3>
                    <p className="text-gray-500 mb-6">
                      {searchTerm || filterStatus !== 'all' || dateRange.startDate || dateRange.endDate ? 
                        'Try adjusting your filters to see more results' : 
                        'No rental reports available in the system'}
                    </p>
                    {(searchTerm || filterStatus !== 'all' || dateRange.startDate || dateRange.endDate) && (
                      <button 
                        onClick={handleResetFilters}
                        className="btn-outline border px-4 py-2 rounded-md shadow-sm inline-flex items-center"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        Reset Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Rental Record</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this rental record? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteRentalId(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRental}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalReports;