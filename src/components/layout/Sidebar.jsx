// components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Car,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ currentPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [siteTitle, setSiteTitle] = useState(() => {
    // Load from localStorage first, then fallback to null to show loading
    const cached = localStorage.getItem('siteTitle');
    return cached || null;
  });
  const [logoUrl, setLogoUrl] = useState(() => {
    // Load from localStorage first
    return localStorage.getItem('logoUrl') || '';
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
 

  // Debug initial state
  useEffect(() => {
    console.log('🚀 Sidebar component mounted');
    console.log('📝 Initial siteTitle:', siteTitle);
    console.log('🖼️ Initial logoUrl:', logoUrl);
    console.log('💾 localStorage siteTitle:', localStorage.getItem('siteTitle'));
    console.log('💾 localStorage logoUrl:', localStorage.getItem('logoUrl'));
  }, []);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch site settings with real-time updates and caching
  useEffect(() => {
    let unsubscribe;
    
    const setupSettingsListener = () => {
      try {
        console.log('🔧 Setting up Firebase settings listener...');
        const settingsRef = doc(db, 'settings', 'app');
        
        // Set up real-time listener
        unsubscribe = onSnapshot(settingsRef, 
          (doc) => {
            console.log('📡 Firebase snapshot received, doc exists:', doc.exists());
            setIsLoading(false);
            
            if (doc.exists()) {
              const data = doc.data();
              console.log('📄 Settings data from Firebase:', data);
              
              // Update title
              if (data.siteTitle) {
                console.log('📝 Updating site title to:', data.siteTitle);
                setSiteTitle(data.siteTitle);
                localStorage.setItem('siteTitle', data.siteTitle);
              }
              
              // Update logo - handle both empty string and undefined
              if (data.hasOwnProperty('logoUrl')) {
                console.log('🖼️ Updating logo to:', data.logoUrl);
                setLogoUrl(data.logoUrl || '');
                localStorage.setItem('logoUrl', data.logoUrl || '');
              }
            } else {
              console.log('📄 Settings document does not exist, creating default...');
              // Document doesn't exist, create it with default values
              const defaultSettings = {
                siteTitle: 'Vigan Car Rental',
                logoUrl: '',
                contactEmail: '',
                contactPhone: '',
                address: '',
                maxLoginAttempts: 5,
                disableDuration: 1,
                enableEmailNotifications: true,
                darkMode: false,
                currency: 'PHP',
                rentalTerms: ''
              };
              
              // Set the default title immediately
              setSiteTitle(defaultSettings.siteTitle);
              localStorage.setItem('siteTitle', defaultSettings.siteTitle);
              
              // Create the document
              setDoc(settingsRef, defaultSettings).then(() => {
                console.log('✅ Default settings document created');
              }).catch((error) => {
                console.error('❌ Error creating default settings:', error);
              });
            }
          },
          (error) => {
            console.error('❌ Error in Firebase listener:', error);
            setIsLoading(false);
            // Keep cached values on error
          }
        );
        
      } catch (error) {
        console.error('❌ Error setting up settings listener:', error);
        setIsLoading(false);
      }
    };

    // Set up the listener immediately
    setupSettingsListener();

    // Listen for immediate settings updates from Settings component
    const handleSettingsUpdate = (event) => {
      const updatedSettings = event.detail;
      console.log('⚡ Immediate settings update received:', updatedSettings);
      
      if (updatedSettings.siteTitle) {
        console.log('⚡ Immediately updating title to:', updatedSettings.siteTitle);
        setSiteTitle(updatedSettings.siteTitle);
        localStorage.setItem('siteTitle', updatedSettings.siteTitle);
      }
      
      if (updatedSettings.hasOwnProperty('logoUrl')) {
        console.log('⚡ Immediately updating logo to:', updatedSettings.logoUrl);
        setLogoUrl(updatedSettings.logoUrl || '');
        localStorage.setItem('logoUrl', updatedSettings.logoUrl || '');
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, [db]);
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Clear cached settings on logout
      localStorage.removeItem('siteTitle');
      localStorage.removeItem('logoUrl');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} />, id: 'dashboard' },
    { name: 'Vehicles', path: '/cars', icon: <Car size={20} />, id: 'cars' },
    { name: 'User Management', path: '/users', icon: <Users size={20} />, id: 'users' },
    { name: 'Total Bookings', path: '/reports', icon: <FileText size={20} />, id: 'reports' },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} />, id: 'settings' },
  ];

  // Logo component with loading state
  const LogoComponent = ({ size = 32, className = "" }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // Show loading skeleton while loading
    if (isLoading) {
      return (
        <div 
          className={`bg-gray-700 rounded animate-pulse ${className}`}
          style={{ height: `${size}px`, width: `${size}px` }}
        />
      );
    }
    
    if (logoUrl && !imageError) {
      return (
        <div className="relative">
          <img
            src={logoUrl}
            alt={siteTitle}
            className={`object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
            style={{ height: `${size}px`, width: `${size}px` }}
            onLoad={() => {
              setImageLoaded(true);
              console.log('✅ Logo loaded successfully');
            }}
            onError={(e) => {
              console.warn('❌ Logo failed to load, showing default');
              setImageError(true);
              setImageLoaded(false);
            }}
          />
          {/* Show default logo while custom logo loads */}
          {!imageLoaded && !imageError && (
            <div 
              className={`absolute inset-0 bg-gray-700 rounded animate-pulse ${className}`}
              style={{ height: `${size}px`, width: `${size}px` }}
            />
          )}
        </div>
      );
    }
    
    // Default logo SVG
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={`text-gray-300 transition-all duration-300 ${className}`}
        fill="currentColor"
      >
        {/* Car Rental Logo Design */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3"/>
        
        {/* Car Body */}
        <path d="M25 45 L35 35 L65 35 L75 45 L75 65 L70 65 L70 70 L60 70 L60 65 L40 65 L40 70 L30 70 L30 65 L25 65 Z" 
              fill="currentColor"/>
        
        {/* Windows */}
        <path d="M32 38 L38 42 L62 42 L68 38 L65 35 L35 35 Z" 
              fill="none" stroke="white" strokeWidth="1.5"/>
        
        {/* Wheels */}
        <circle cx="35" cy="65" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="65" cy="65" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="35" cy="65" r="4" fill="currentColor"/>
        <circle cx="65" cy="65" r="4" fill="currentColor"/>
        
        {/* Headlights */}
        <circle cx="75" cy="50" r="3" fill="white"/>
        <circle cx="75" cy="55" r="2" fill="white"/>
        
        {/* Brand Text */}
        <text x="50" y="25" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">
          RENTAL
        </text>
      </svg>
    );
  };

  // Title component with loading state
  const TitleComponent = ({ className = "" }) => {
    if (isLoading && !siteTitle) {
      return (
        <div className={`h-6 bg-gray-700 rounded animate-pulse w-32 ${className}`} />
      );
    }
    
    const displayTitle = siteTitle || 'Vigan Car Rental';
    
    return (
      <span className={`text-lg font-semibold text-gray-100 site-title transition-all duration-300 ${className}`}>
        {displayTitle}
      </span>
    );
  };

  // Add custom animation styles
  useEffect(() => {
    const styles = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes slideInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes slideInLeft {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .animate-fadeIn {
        animation: fadeIn 0.3s ease forwards;
      }

      .animate-slideIn {
        animation: slideIn 0.4s ease forwards;
      }

      .animate-slideInUp {
        animation: slideInUp 0.4s ease forwards;
      }

      .animate-slideInLeft {
        animation: slideInLeft 0.3s ease forwards;
      }

      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      .hover\\:scale-102:hover {
        transform: scale(1.02);
      }

      .hover\\:scale-110:hover {
        transform: scale(1.1);
      }

      .active\\:scale-95:active {
        transform: scale(0.95);
      }

      .active\\:scale-98:active {
        transform: scale(0.98);
      }
      
      .sidebar-toggle {
        position: absolute;
        top: 50%;
        right: -12px;
        transform: translateY(-50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #1a202c;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        z-index: 30;
        transition: all 0.2s ease;
      }
      
      .sidebar-toggle:hover {
        background-color: #2d3748;
      }

      .logo-container {
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo-container:hover {
        transform: scale(1.05);
      }

      .site-title {
        transition: all 0.3s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);
  
  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 z-20 p-4">
        <button
          onClick={toggleMenu}
          className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none transition-colors duration-200 transform active:scale-95 hover:scale-105"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Sidebar for desktop */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-gray-900 border-r border-gray-800 shadow-lg transition-all duration-300 relative ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Toggle button inside sidebar */}
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          {isSidebarCollapsed ? 
            <ChevronRight size={16} className="text-gray-300" /> : 
            <ChevronLeft size={16} className="text-gray-300" />
          }
        </div>
        
        <div className="flex items-center justify-center h-16 border-b border-gray-800 px-4">
          <div className="flex items-center animate-fadeIn logo-container">
            <LogoComponent size={32} className="flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div className="ml-3 flex-1 min-w-0">
                <TitleComponent />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item, index) => (
              <div
                key={item.id}
                className="animate-slideIn opacity-0"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
              >
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                    currentPage === item.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title={isSidebarCollapsed ? item.name : ''}
                >
                  <span className={isSidebarCollapsed ? '' : 'mr-3'}>{item.icon}</span>
                  {!isSidebarCollapsed && item.name}
                </Link>
              </div>
            ))}
          </nav>
          
          <div className="px-4 py-4 border-t border-gray-800">
            <button
              onClick={handleSignOut}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-all duration-200 hover:scale-102 active:scale-98 ${isSidebarCollapsed ? 'justify-center' : ''}`}
              title={isSidebarCollapsed ? 'Log Out' : ''}
            >
              <LogOut size={20} className={isSidebarCollapsed ? '' : 'mr-3'} />
              {!isSidebarCollapsed && 'Log Out'}
            </button>
          </div>
          

        </div>
      </div>
      
      {/* Mobile Sidebar */}
      {isMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 z-10 bg-black bg-opacity-70 animate-fadeIn" 
            onClick={toggleMenu}
          />
          
          <div 
            className="lg:hidden fixed inset-y-0 left-0 w-64 bg-gray-900 shadow-xl z-20 animate-slideInLeft" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-16 border-b border-gray-800 px-4">
              <div className="flex items-center logo-container">
                <LogoComponent size={32} />
                <div className="ml-3 flex-1 min-w-0">
                  <TitleComponent />
                </div>
              </div>
              <button 
                onClick={toggleMenu}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col flex-1 overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="animate-slideInUp opacity-0"
                    style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                  >
                    <Link
                      to={item.path}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                        currentPage === item.id
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                      onClick={toggleMenu}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  </div>
                ))}
              </nav>
              
              <div className="px-4 py-4 border-t border-gray-800">
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-all duration-200 hover:scale-102 active:scale-98"
                >
                  <LogOut size={20} className="mr-3" />
                  Log Out
                </button>
              </div>
              

            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;