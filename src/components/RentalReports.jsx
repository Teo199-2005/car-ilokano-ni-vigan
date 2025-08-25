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
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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
        
        // Process rental data
        const rentalData = [];
        for (const doc of rentalsSnapshot.docs) {
          const booking = { id: doc.id, ...doc.data() };
          
          // Map booking fields to rental format
          const rental = {
            id: booking.id,
            transactionId: booking.bookingId || booking.id.substring(0, 8),
            customerName: booking.name || 'N/A',
            customerEmail: booking.email || 'N/A',
            customerPhone: booking.contactNumber || 'N/A',
            vehicleBrand: booking.vehicleBrand || 'N/A',
            vehicleModel: booking.vehicleModel || 'N/A',
            plateNumber: 'N/A', // Not in booking structure
            businessName: booking.ownerName || 'N/A',
            ownerBusinessName: booking.ownerName || 'N/A',
            totalAmount: booking.price || 0,
            status: booking.status || 'pending',
            paymentStatus: 'N/A' // Not in booking structure
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
    setDateRange({
      startDate: '',
      endDate: ''
    });
  };

  // Delete rental record
  const handleDeleteRental = async (rentalId) => {
    if (!window.confirm('Are you sure you want to delete this rental record? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'bookings', rentalId));
      
      // Refresh data after deletion
      const rentalsQuery = query(
        collection(db, 'bookings'),
        orderBy('timestamp', 'desc')
      );
      const rentalsSnapshot = await getDocs(rentalsQuery);
      
      // Process rental data (same logic as in useEffect)
      const rentalData = [];
      for (const docSnap of rentalsSnapshot.docs) {
        const booking = { id: docSnap.id, ...docSnap.data() };
        
        const rental = {
          id: booking.id,
          transactionId: booking.bookingId || booking.id.substring(0, 8),
          customerName: booking.name || 'N/A',
          customerEmail: booking.email || 'N/A',
          customerPhone: booking.contactNumber || 'N/A',
          vehicleBrand: booking.vehicleBrand || 'N/A',
          vehicleModel: booking.vehicleModel || 'N/A',
          plateNumber: 'N/A',
          businessName: booking.ownerName || 'N/A',
          ownerBusinessName: booking.ownerName || 'N/A',
          totalAmount: booking.price || 0,
          status: booking.status || 'pending',
          paymentStatus: 'N/A'
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
      
    } catch (error) {
      console.error('Error deleting rental:', error);
      alert('Error deleting rental record. Please try again.');
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
    
    return matchesSearch && matchesStatus && matchesDateRange;
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
  
  const generateCSV = () => {
    // CSV Header
    const headers = [
      'Rental ID',
      'Car Model',
      'Plate Number',
      'Customer Name',
      'Rental Date',
      'Return Date',
      'Status',
      'Rental Amount'
    ].join(',');
    
    // Summary statistics as CSV comments
    const summaryLines = [
      '# VIGAN CAR RENTAL - RENTAL ANALYTICS REPORT',
      `# Generated on: ${new Date().toLocaleString()}`,
      `# Report Period: ${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Present'}`,
      `# Status Filter: ${filterStatus === 'all' ? 'All Statuses' : filterStatus}`,
      `# Search Term: ${searchTerm || 'None'}`,
      '#',
      '# SUMMARY STATISTICS:',
      `# Total Rentals: ${reportStats.total}`,
      `# Active Rentals: ${reportStats.active}`,
      `# Completed Rentals: ${reportStats.completed}`,
      `# Cancelled Rentals: ${reportStats.cancelled}`,
      `# Overdue Rentals: ${reportStats.overdue}`,
      `# Total Revenue: ₱${reportStats.totalRevenue.toLocaleString()}`,
      `# Average Duration: ${reportStats.averageRentalDuration} days`,
      `# Success Rate: ${reportStats.total > 0 ? Math.round((reportStats.completed / reportStats.total) * 100) : 0}%`,
      `# Total Vehicles: ${vehicleStats.total}`,
      `# Available Vehicles: ${vehicleStats.available}`,
      `# Vehicle Utilization: ${vehicleStats.total > 0 ? Math.round((vehicleStats.rented / vehicleStats.total) * 100) : 0}%`,
      `# Total Users: ${userStats.total} (Owners: ${userStats.owners}, Clients: ${userStats.clients}, Admins: ${userStats.admins})`,
      '#',
      '# DETAILED RECORDS:'
    ];
    
    // CSV Rows
    const rows = filteredReports.map(report => [
      `"${report.transactionId || report.id.substring(0, 8)}"`,
      `"${report.vehicleBrand || ''} ${report.vehicleModel || ''}"`.trim(),
      `"${report.plateNumber || 'N/A'}"`,
      `"${report.customerName || 'N/A'}"`,
      `"${report.startDateFormatted || 'N/A'}"`,
      `"${report.endDateFormatted || 'N/A'}"`,
      `"${report.currentStatus || 'N/A'}"`,
      `"₱${parseFloat(report.totalAmount || 0).toLocaleString()}"`
    ].join(','));
    
    // Combine all parts
    const csv = [...summaryLines, headers, ...rows].join('\n');
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Vigan_Car_Rental_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // PDF export function using jsPDF
  const generatePDF = async () => {
    try {
      // Dynamically import jsPDF to reduce bundle size
      const { jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');
      
      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Header function
      const addHeader = () => {
        // Company letterhead
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('VIGAN CAR RENTAL', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Rental Operations Report', pageWidth / 2, 28, { align: 'center' });
        
        // Header line
        doc.setLineWidth(0.5);
        doc.line(20, 35, pageWidth - 20, 35);
      };
      
      // Footer function
      const addFooter = (pageNum) => {
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
        
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, pageHeight - 12);
        doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 12, { align: 'right' });
        doc.text('Confidential Document', pageWidth / 2, pageHeight - 8, { align: 'center' });
      };
      
      // Add header
      addHeader();
      
      let currentY = 45;
      
      // Report Information
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', 20, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report Period: ${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Present'}`, 20, currentY);
      currentY += 5;
      doc.text(`Status Filter: ${filterStatus === 'all' ? 'All Statuses' : filterStatus.toUpperCase()}`, 20, currentY);
      currentY += 5;
      doc.text(`Search Criteria: ${searchTerm || 'None'}`, 20, currentY);
      currentY += 15;
      
      // Key Performance Indicators
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('KEY PERFORMANCE INDICATORS', 20, currentY);
      currentY += 10;
      
      // Metrics in structured format
      const leftCol = 20;
      const rightCol = pageWidth / 2 + 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Left column
      doc.text(`Total Rental Transactions: ${reportStats.total}`, leftCol, currentY);
      doc.text(`Active Rentals: ${reportStats.active}`, leftCol, currentY + 6);
      doc.text(`Completed Rentals: ${reportStats.completed}`, leftCol, currentY + 12);
      doc.text(`Cancelled Rentals: ${reportStats.cancelled}`, leftCol, currentY + 18);
      doc.text(`Overdue Rentals: ${reportStats.overdue}`, leftCol, currentY + 24);
      
      // Right column
      doc.text(`Total Revenue: ₱${reportStats.totalRevenue.toLocaleString()}`, rightCol, currentY);
      doc.text(`Average Rental Duration: ${reportStats.averageRentalDuration} days`, rightCol, currentY + 6);
      doc.text(`Success Rate: ${reportStats.total > 0 ? Math.round((reportStats.completed / reportStats.total) * 100) : 0}%`, rightCol, currentY + 12);
      doc.text(`Total Fleet Size: ${vehicleStats.total} vehicles`, rightCol, currentY + 18);
      doc.text(`Available Vehicles: ${vehicleStats.available}`, rightCol, currentY + 24);
      
      currentY += 35;
      
      // Operational Analysis
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('OPERATIONAL ANALYSIS', 20, currentY);
      currentY += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Fleet Utilization:', leftCol, currentY);
      currentY += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Vehicle Utilization Rate: ${vehicleStats.total > 0 ? Math.round((vehicleStats.rented / vehicleStats.total) * 100) : 0}%`, leftCol + 10, currentY);
      doc.text(`Vehicles in Service: ${vehicleStats.rented}`, leftCol + 10, currentY + 5);
      doc.text(`Vehicles in Maintenance: ${vehicleStats.maintenance}`, leftCol + 10, currentY + 10);
      
      currentY += 20;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('User Base Analysis:', leftCol, currentY);
      currentY += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Registered Users: ${userStats.total}`, leftCol + 10, currentY);
      doc.text(`Vehicle Owners: ${userStats.owners}`, leftCol + 10, currentY + 5);
      doc.text(`Active Clients: ${userStats.clients}`, leftCol + 10, currentY + 10);
      doc.text(`System Administrators: ${userStats.admins}`, leftCol + 10, currentY + 15);
      
      currentY += 25;
      
      // Rental Records Table
      if (filteredReports.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Detailed Rental Records (${filteredReports.length} entries)`, 14, currentY);
        currentY += 5;
        
        const tableColumn = [
          'ID',
          'Vehicle',
          'Customer',
          'Start Date',
          'End Date',
          'Duration',
          'Status',
          'Amount'
        ];
        
        const tableRows = filteredReports.map(report => [
          report.transactionId?.substring(0, 8) || report.id.substring(0, 8),
          `${report.vehicleBrand || ''} ${report.vehicleModel || ''}`.trim() || 'N/A',
          report.customerName || 'N/A',
          report.startDateFormatted || 'N/A',
          report.endDateFormatted || 'N/A',
          report.duration ? `${report.duration}d` : 'N/A',
          report.currentStatus || 'N/A',
          `₱${parseFloat(report.totalAmount || 0).toLocaleString()}`
        ]);
        
        // Add table
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: currentY + 5,
          margin: { left: 20, right: 20 },
          theme: 'plain',
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'center'
          },
          bodyStyles: {
            fillColor: [255, 255, 255]
          },
          columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' },
            7: { cellWidth: 25, halign: 'right' }
          },
          didDrawPage: (data) => {
            addHeader();
            addFooter(doc.internal.getNumberOfPages());
          }
        });
      } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RENTAL TRANSACTION RECORDS', 20, currentY);
        currentY += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No rental records found matching the specified criteria.', 20, currentY);
        doc.text('Please adjust the report parameters to view available data.', 20, currentY + 6);
      }
      
      // Add footer to first page if no table was added
      if (filteredReports.length === 0) {
        addFooter(1);
      }
      
      // Save the PDF
      doc.save(`Vigan_Car_Rental_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check if jsPDF is installed.');
    }
  };
  
  return (
    <div className="flex h-screen bg-pattern">
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
                onClick={generateCSV}
                className="btn-success px-4 py-2 rounded-md shadow-sm flex items-center"
              >
                <Download size={18} className="mr-2" />
                <span className="hidden md:inline">Export CSV</span>
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
                  <p className="text-xl font-semibold text-green-600">{reportStats.active}</p>
                </div>
                <div className="bg-green-100 rounded-full p-2">
                  <Car size={18} className="text-green-600" />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '150ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Pending</p>
                  <p className="text-xl font-semibold text-purple-600">{reportStats.pending}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-2">
                  <Clock size={18} className="text-purple-600" />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '200ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Completed</p>
                  <p className="text-xl font-semibold text-blue-600">{reportStats.completed}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-2">
                  <CheckCircle size={18} className="text-blue-600" />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '300ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Cancelled</p>
                  <p className="text-xl font-semibold text-red-600">{reportStats.cancelled}</p>
                </div>
                <div className="bg-red-100 rounded-full p-2">
                  <X size={18} className="text-red-600" />
                </div>
              </div>
              <div className="card-glassmorphism rounded-lg p-4 flex items-center justify-between animate-slideUp" style={{ animationDelay: '400ms' }}>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Overdue</p>
                  <p className="text-xl font-semibold text-yellow-600">{reportStats.overdue}</p>
                </div>
                <div className="bg-yellow-100 rounded-full p-2">
                  <Clock size={18} className="text-yellow-600" />
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
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    {/* Available Vehicles List */}
                    <div className="mb-4 p-4 bg-green-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-green-800 mb-2">Available Vehicles ({vehicleStats.available})</h5>
                      <div className="flex flex-wrap gap-2">
                        {vehicles.filter(v => v.status === 'Verified').slice(0, 10).map(vehicle => (
                          <span key={vehicle.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <Car size={12} className="mr-1" />
                            {vehicle.brand} {vehicle.model}
                          </span>
                        ))}
                        {vehicleStats.available > 10 && (
                          <span className="text-xs text-green-600">+{vehicleStats.available - 10} more</span>
                        )}
                      </div>
                    </div>
                    
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
                        {filteredReports.map((report, index) => (
                          <tr key={report.id} className="report-row hover:bg-gray-50" style={{ animationDelay: `${index * 50}ms` }}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FileText size={16} className="text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.transactionId || `#${report.id.substring(0, 8)}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {report.createdAtFormatted || 'N/A'}
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
                                    {report.businessName || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <User size={16} className="text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.customerName || 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {report.customerEmail || report.customerPhone || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Calendar size={16} className="text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.startDateFormatted || 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    to {report.endDateFormatted || 'N/A'}
                                    {report.duration && ` (${report.duration} days)`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ₱{parseFloat(report.totalAmount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {report.paymentStatus || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${report.currentStatus === 'active' ? 'bg-green-100 text-green-800' : 
                                  report.currentStatus === 'completed' ? 'bg-blue-100 text-blue-800' : 
                                  report.currentStatus === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                  report.currentStatus === 'overdue' ? 'bg-yellow-100 text-yellow-800' : 
                                  report.currentStatus === 'pending' ? 'bg-purple-100 text-purple-800' :
                                  report.currentStatus === 'accepted' ? 'bg-indigo-100 text-indigo-800' :
                                  'bg-gray-100 text-gray-800'}`}>
                                {report.currentStatus || 'N/A'}
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
    </div>
  );
};

export default RentalReports;