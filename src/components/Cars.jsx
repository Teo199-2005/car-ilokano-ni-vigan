import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './layout/Sidebar';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X, 
  Upload, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Eye,
  Calendar,
  Settings,
  User,
  Car,
  Fuel,
  Users,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Import your Firebase storage instance
import { storage } from '../firebase'; // Update this path to match your firebase config file location

// Peso icon component
const PesoIcon = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 4v16" />
    <path d="M6 4h8a4 4 0 0 1 0 8H6" />
    <line x1="3" y1="8" x2="15" y2="8" />
    <line x1="3" y1="12" x2="15" y2="12" />
  </svg>
);

const Cars = ({ user, db }) => {
  // State variables
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [currentCar, setCurrentCar] = useState(null);
  const [carToDelete, setCarToDelete] = useState(null);
  const [carToView, setCarToView] = useState(null);
  const [mainImageUpload, setMainImageUpload] = useState(null);
  const [angleImageUploads, setAngleImageUploads] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [carsPerPage] = useState(6);
  const [uploadError, setUploadError] = useState(null);
  const [userStatus, setUserStatus] = useState('');
  const [approvedOwners, setApprovedOwners] = useState([]);
  const [pendingOwners, setPendingOwners] = useState([]);
  const [rejectedOwners, setRejectedOwners] = useState([]);
  const [selectedOwnerDetails, setSelectedOwnerDetails] = useState(null);
  const [showDocumentAlert, setShowDocumentAlert] = useState(false);
  const [documentAlertMessage, setDocumentAlertMessage] = useState('');
  
  // Form state matching your database structure
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    price: '',
    hourlyRate: '',
    mainImageUrl: '',
    angleImageUrls: [],
    capacity: '4',
    carType: 'Sedan',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    status: 'Available',
    description: '',
    carNumber: '',
    minRentalPeriod: '24',
    securityDeposit: '',
    fuelReturnPolicy: 'same',
    businessName: ''
  });
  
  // Test Firebase Storage connection on component mount
  useEffect(() => {
    const testStorageConnection = () => {
      try {
        console.log('🔥 Testing Firebase Storage Connection...');
        console.log('📦 Storage bucket:', storage.app.options.storageBucket);
        
        if (storage.app.options.storageBucket === 'car-rental1-3c82a.firebasestorage.app') {
          console.log('✅ Storage bucket correctly configured!');
        } else {
          console.log('❌ Storage bucket mismatch');
          console.log('Expected: car-rental1-3c82a.firebasestorage.app');
          console.log('Actual:', storage.app.options.storageBucket);
        }
        
        console.log('👤 User authentication check:');
        console.log('User object:', user);
        if (user) {
          console.log('User ID (uid):', user.uid);
          console.log('User ID (id):', user.id);
          console.log('User email:', user.email);
          console.log('User role:', user.role);
        } else {
          console.log('❌ No user object found');
        }
        
      } catch (error) {
        console.error('❌ Storage connection error:', error);
      }
    };
    
    testStorageConnection();
  }, [user]);
  
  // Fetch all owners by status with business names
  const fetchOwnersByStatus = async () => {
    try {
      console.log('🔄 Fetching business owners...');
      const usersCollection = collection(db, 'users');
      const ownersQuery = query(usersCollection, where('role', '==', 'owner'));
      const ownersSnapshot = await getDocs(ownersQuery);
      
      const approved = [];
      const pending = [];
      const rejected = [];
      
      ownersSnapshot.docs.forEach(doc => {
        const ownerData = {
          id: doc.id,
          ...doc.data()
        };
        
        // Only include owners that have a business name
        if (ownerData.businessName && ownerData.businessName.trim() !== '') {
          switch (ownerData.status) {
            case 'approved':
              approved.push(ownerData);
              break;
            case 'pending':
              pending.push(ownerData);
              break;
            case 'rejected':
              rejected.push(ownerData);
              break;
            default:
              pending.push(ownerData); // Default to pending if status is unclear
          }
        } else {
          console.warn('⚠️ Owner without business name found:', ownerData.email);
        }
      });
      
      // Sort owners by business name for better UX
      approved.sort((a, b) => a.businessName.localeCompare(b.businessName));
      pending.sort((a, b) => a.businessName.localeCompare(b.businessName));
      rejected.sort((a, b) => a.businessName.localeCompare(b.businessName));
      
      console.log('📋 Business owners fetched by status:', {
        approved: approved.length,
        pending: pending.length,
        rejected: rejected.length
      });
      
      console.log('✅ Approved business owners:', approved.map(o => o.businessName));
      console.log('⏳ Pending business owners:', pending.map(o => o.businessName));
      console.log('❌ Rejected business owners:', rejected.map(o => o.businessName));
      
      setApprovedOwners(approved);
      setPendingOwners(pending);
      setRejectedOwners(rejected);
      
    } catch (error) {
      console.error('❌ Error fetching owners by status:', error);
      setApprovedOwners([]);
      setPendingOwners([]);
      setRejectedOwners([]);
    }
  };
  
  // Check if owner has valid documents
  const validateOwnerDocuments = (owner) => {
    if (!owner) return false;
    
    // Check for business permit
    const hasPermit = (owner.businessPermitURL && owner.businessPermitURL.trim() !== '' && owner.businessPermitURL !== 'undefined') ||
                     (owner.businessPermitUrl && owner.businessPermitUrl.trim() !== '' && owner.businessPermitUrl !== 'undefined');
    
    // Check for business registration
    const hasRegistration = (owner.businessRegistrationURL && owner.businessRegistrationURL.trim() !== '' && owner.businessRegistrationURL !== 'undefined') ||
                           (owner.registrationFileUrl && owner.registrationFileUrl.trim() !== '' && owner.registrationFileUrl !== 'undefined');
    
    // Owner needs BOTH permit AND registration to be considered complete
    const hasValidDocuments = hasPermit && hasRegistration;
    
    console.log('📄 Document validation for', owner.businessName, ':', {
      businessPermitURL: owner.businessPermitURL || 'missing',
      businessPermitUrl: owner.businessPermitUrl || 'missing', 
      businessRegistrationURL: owner.businessRegistrationURL || 'missing',
      registrationFileUrl: owner.registrationFileUrl || 'missing',
      hasPermit,
      hasRegistration,
      hasValidDocuments
    });
    
    return hasValidDocuments;
  };

  // Get document status for display
  const getDocumentStatusIcon = (owner) => {
    if (!owner) return null;
    
    const hasDocuments = validateOwnerDocuments(owner);
    
    if (hasDocuments) {
      return <CheckCircle size={16} className="text-green-500 ml-1" />;
    } else {
      return <AlertCircle size={16} className="text-orange-500 ml-1" />;
    }
  };

  // Get document status text
  const getDocumentStatusText = (owner) => {
    if (!owner) return '';
    
    const hasDocuments = validateOwnerDocuments(owner);
    return hasDocuments ? ' ✓ Documents Complete' : ' ⚠️ Missing Documents';
  };
  
  // Handle business name selection change with enhanced validation
  const handleBusinessNameChange = (e) => {
    const selectedBusinessName = e.target.value;
    setFormData({
      ...formData,
      businessName: selectedBusinessName
    });
    
    // Find selected owner details
    const selectedOwner = [...approvedOwners, ...pendingOwners, ...rejectedOwners]
      .find(owner => owner.businessName === selectedBusinessName);
    
    setSelectedOwnerDetails(selectedOwner);

    // Show document alert if owner has missing documents
    if (selectedOwner) {
      const hasDocuments = validateOwnerDocuments(selectedOwner);
      const ownerStatus = selectedOwner.status;

      if (ownerStatus !== 'approved') {
        setShowDocumentAlert(true);
        if (ownerStatus === 'pending') {
          setDocumentAlertMessage(`⏳ ${selectedBusinessName} account is pending approval. Cannot add vehicles until approved.`);
        } else if (ownerStatus === 'rejected') {
          setDocumentAlertMessage(`❌ ${selectedBusinessName} account has been rejected. Cannot add vehicles.`);
        }
      } else if (!hasDocuments) {
        setShowDocumentAlert(true);
        setDocumentAlertMessage(`⚠️ ${selectedBusinessName} is missing required documents (Business Permit & Registration). Please ask the owner to upload these documents before adding vehicles.`);
      } else {
        setShowDocumentAlert(false);
        setDocumentAlertMessage('');
      }
    } else {
      setShowDocumentAlert(false);
      setDocumentAlertMessage('');
    }
    
    // Clear business name error if it exists
    if (formErrors.businessName) {
      setFormErrors({
        ...formErrors,
        businessName: null
      });
    }
  };
  
  // Get owner status info for display
  const getOwnerStatusInfo = (businessName) => {
    if (!businessName) return null;
    
    const approvedOwner = approvedOwners.find(owner => owner.businessName === businessName);
    if (approvedOwner) {
      const hasDocuments = validateOwnerDocuments(approvedOwner);
      return {
        status: 'approved',
        hasDocuments,
        owner: approvedOwner,
        message: hasDocuments ? 
          'Owner is approved and has valid documents' : 
          'Owner is approved but missing required documents'
      };
    }
    
    const pendingOwner = pendingOwners.find(owner => owner.businessName === businessName);
    if (pendingOwner) {
      const hasDocuments = validateOwnerDocuments(pendingOwner);
      return {
        status: 'pending',
        hasDocuments,
        owner: pendingOwner,
        message: hasDocuments ?
          'Owner account is pending approval' :
          'Owner account is pending approval and missing required documents'
      };
    }
    
    const rejectedOwner = rejectedOwners.find(owner => owner.businessName === businessName);
    if (rejectedOwner) {
      return {
        status: 'rejected',
        hasDocuments: false,
        owner: rejectedOwner,
        message: 'Owner account has been rejected'
      };
    }
    
    return null;
  };

  // Check if user can perform actions - simplified logic
  const canPerformActions = () => {
    return userStatus === 'active' || user?.role === 'admin';
  };
  
  // Fetch cars data and user status on component mount
  useEffect(() => {
    const fetchData = async () => {
      await fetchCars();
      await fetchOwnersByStatus();
      
      // Check if the user is an owner and has approved status
      if (user && user.role === 'owner') {
        try {
          const userId = user.uid || user.id;
          if (userId) {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserStatus(userData.status || 'pending');
              console.log('👤 User status:', userData.status || 'pending');
            } else {
              console.log('👤 User document not found in Firestore');
              setUserStatus('pending');
            }
          }
        } catch (error) {
          console.error('Error fetching user status:', error);
          setUserStatus('pending');
        }
      } else if (user && user.role === 'admin') {
        setUserStatus('active');
      }
    };
    
    fetchData();
  }, [db, user]);
  
  // Filter cars based on search term and owner filter
  useEffect(() => {
    try {
      let filtered = cars;
      
      // Apply search filter
      if (searchTerm !== '') {
        filtered = filtered.filter(car => {
          const brandMatch = car.brand ? car.brand.toLowerCase().includes(searchTerm.toLowerCase()) : false;
          const modelMatch = car.model ? car.model.toLowerCase().includes(searchTerm.toLowerCase()) : false;
          const carNumberMatch = car.carNumber ? car.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) : false;
          const businessNameMatch = car.businessName ? car.businessName.toLowerCase().includes(searchTerm.toLowerCase()) : false;
          
          return brandMatch || modelMatch || carNumberMatch || businessNameMatch;
        });
      }
      
      // Apply owner filter
      if (ownerFilter !== '') {
        filtered = filtered.filter(car => car.businessName === ownerFilter);
      }
      
      setFilteredCars(filtered);
    } catch (error) {
      console.error('Error filtering cars:', error);
      setFilteredCars(cars);
    }
    setCurrentPage(1);
  }, [searchTerm, ownerFilter, cars]);
  
  // Function to fetch cars from Firestore
  const fetchCars = async () => {
    try {
      setLoading(true);
      const vehiclesCollection = collection(db, 'vehicles');
      const vehiclesSnapshot = await getDocs(vehiclesCollection);
      
      if (vehiclesSnapshot.empty) {
        console.log('No vehicles found in database');
        setCars([]);
        setFilteredCars([]);
      } else {
        const vehiclesList = vehiclesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Fetched vehicles:', vehiclesList);
        
        setCars(vehiclesList);
        setFilteredCars(vehiclesList);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setSubmitError('Error fetching vehicles');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Enter key press for form submission
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    console.log('📝 Form input change:', name, '=', value);
    
    if (name === 'price' || name === 'hourlyRate' || name === 'securityDeposit') {
      const numValue = value.replace(/[^\d]/g, '');
      setFormData({
        ...formData,
        [name]: numValue
      });
    } else if (name === 'businessName') {
      handleBusinessNameChange(e);
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };
  
  // Validate the form with enhanced business owner validation
  const validateForm = () => {
    const errors = {};
    
    // Required fields validation
    if (!formData.brand.trim()) errors.brand = 'Brand is required';
    if (!formData.model.trim()) errors.model = 'Model is required';
    if (!formData.price.trim()) errors.price = 'Daily price is required';
    if (!formData.hourlyRate.trim()) errors.hourlyRate = 'Hourly rate is required';
    if (!formData.carNumber.trim()) errors.carNumber = 'Car number is required';
    if (!formData.businessName.trim()) errors.businessName = 'Business name is required';
    
    // Enhanced Business owner validation
    if (formData.businessName.trim()) {
      const ownerStatusInfo = getOwnerStatusInfo(formData.businessName);
      
      if (!ownerStatusInfo) {
        errors.businessName = 'Selected business owner not found in system';
      } else {
        console.log('🔍 Validating business owner:', {
          businessName: formData.businessName,
          status: ownerStatusInfo.status,
          hasDocuments: ownerStatusInfo.hasDocuments,
          owner: ownerStatusInfo.owner
        });
        
        if (ownerStatusInfo.status === 'pending') {
          errors.businessName = `Cannot add vehicles: "${formData.businessName}" account is pending approval`;
        } else if (ownerStatusInfo.status === 'rejected') {
          errors.businessName = `Cannot add vehicles: "${formData.businessName}" account has been rejected`;  
        } else if (ownerStatusInfo.status === 'approved' && !ownerStatusInfo.hasDocuments) {
          errors.businessName = `Cannot add vehicles: "${formData.businessName}" must upload required documents (business permit & registration)`;
        } else if (ownerStatusInfo.status === 'approved' && ownerStatusInfo.hasDocuments) {
          console.log('✅ Business owner validation passed');
          // This is the only case where we allow vehicle addition
        }
      }
    }
    
    // Image validation - require main image for new vehicles
    if (!currentCar && !formData.mainImageUrl && !mainImageUpload) {
      errors.mainImageUrl = 'Main image is required';
    }
    
    // Numeric validations
    if (formData.price.trim()) {
      const price = parseInt(formData.price);
      if (isNaN(price) || price <= 0) {
        errors.price = 'Price must be a valid positive number';
      }
    }
    
    if (formData.hourlyRate.trim()) {
      const hourlyRate = parseInt(formData.hourlyRate);
      if (isNaN(hourlyRate) || hourlyRate <= 0) {
        errors.hourlyRate = 'Hourly rate must be a valid positive number';
      }
    }
    
    if (formData.securityDeposit.trim()) {
      const deposit = parseInt(formData.securityDeposit);
      if (isNaN(deposit) || deposit < 0) {
        errors.securityDeposit = 'Security deposit must be a valid number';
      }
    }
    
    console.log('🔍 Form validation result:', { 
      errors, 
      hasErrors: Object.keys(errors).length > 0,
      businessOwnerCheck: formData.businessName ? getOwnerStatusInfo(formData.businessName) : null
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle main image file input change
  const handleMainImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file');
        return;
      }
      
      console.log('Main image selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      setMainImageUpload(file);
      if (formErrors.mainImageUrl) {
        setFormErrors({
          ...formErrors,
          mainImageUrl: null
        });
      }
      setUploadError(null);
    }
  };

  // Handle angle images file input change
  const handleAngleImagesChange = (e) => {
    if (e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Validate all files are images
      const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        setUploadError('Please select only valid image files');
        return;
      }
      
      // Limit to 5 angle images
      if (files.length > 5) {
        setUploadError('Maximum 5 angle images allowed');
        return;
      }
      
      console.log('Angle images selected:', files.map(f => f.name));
      setAngleImageUploads(files);
      setUploadError(null);
    }
  };
  
  // Upload single image to Firebase Storage
  const uploadSingleImage = async (file, path) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('File size exceeds 5MB limit'));
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file'));
        return;
      }
      
      console.log('📤 Uploading image:', file.name, 'to path:', path);
      
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log('📊 Upload progress:', Math.round(progress) + '%');
        },
        (error) => {
          console.error('❌ Upload error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          // Provide more specific error messages
          let errorMessage = 'Upload failed';
          if (error.code === 'storage/unauthorized') {
            errorMessage = 'Upload failed: Not authorized. Please check your permissions.';
          } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload was canceled';
          } else if (error.code === 'storage/unknown') {
            errorMessage = 'Upload failed: Unknown error occurred';
          } else {
            errorMessage = `Upload failed: ${error.message}`;
          }
          
          reject(new Error(errorMessage));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Upload successful!');
            console.log('🔗 Download URL:', downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error('❌ Error getting download URL:', error);
            reject(new Error(`Failed to get download URL: ${error.message}`));
          }
        }
      );
    });
  };

  // Upload all images (main + angles)
  const uploadImages = async () => {
    try {
      const userId = user.uid || user.id;
      const vehicleId = currentCar?.id || uuidv4();
      const basePath = `vehicles/${userId}/${vehicleId}`;
      
      let mainImageUrl = formData.mainImageUrl || '';
      let angleImageUrls = [...(formData.angleImageUrls || [])];
      
      // Upload main image if new one is selected
      if (mainImageUpload) {
        console.log('🖼️ Uploading main image...');
        mainImageUrl = await uploadSingleImage(mainImageUpload, `${basePath}/main_${uuidv4()}`);
        console.log('✅ Main image uploaded:', mainImageUrl);
      }
      
      // Upload angle images if new ones are selected
      if (angleImageUploads.length > 0) {
        console.log('🖼️ Uploading angle images...');
        const anglePromises = angleImageUploads.map((file, index) => 
          uploadSingleImage(file, `${basePath}/angle_${index}_${uuidv4()}`)
        );
        angleImageUrls = await Promise.all(anglePromises);
        console.log('✅ Angle images uploaded:', angleImageUrls);
      }
      
      setUploadProgress(0);
      return { mainImageUrl, angleImageUrls };
    } catch (error) {
      setUploadProgress(0);
      console.error('❌ Image upload failed:', error);
      throw error;
    }
  };
  
  // Handle form submission with enhanced business owner validation
  const handleSubmit = async () => {
    // Check if user is properly authenticated
    if (!user) {
      setUploadError('You must be logged in to add vehicles');
      return;
    }

    if (!user.uid && !user.id) {
      setUploadError('User authentication error - missing user ID');
      console.error('User object:', user);
      return;
    }
    
    // Check if account is pending for regular owners
    if (userStatus !== 'active' && user.role === 'owner') {
      setUploadError('Your account is still pending approval. You cannot add vehicles until your account is approved by an administrator.');
      return;
    }
    
    // Additional business owner validation before form validation
    if (user.role === 'admin' && formData.businessName) {
      const ownerStatusInfo = getOwnerStatusInfo(formData.businessName);
      console.log('🔍 Pre-submit business owner validation:', ownerStatusInfo);
      
      if (!ownerStatusInfo) {
        setUploadError(`Business owner "${formData.businessName}" not found in system`);
        return;
      }
      
      if (ownerStatusInfo.status === 'pending') {
        setUploadError(`Cannot add vehicles: Business owner "${formData.businessName}" account is pending approval. Please approve the account first.`);
        return;
      }
      
      if (ownerStatusInfo.status === 'rejected') {
        setUploadError(`Cannot add vehicles: Business owner "${formData.businessName}" account has been rejected. Please review and approve the account if needed.`);
        return;
      }
      
      if (ownerStatusInfo.status === 'approved' && !ownerStatusInfo.hasDocuments) {
        setUploadError(`Cannot add vehicles: Business owner "${formData.businessName}" must upload required documents (business permit and registration) before adding vehicles.`);
        return;
      }
      
      console.log('✅ Business owner validation passed, proceeding with vehicle creation');
    }
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setUploadError(null);
      console.log('💾 Submitting form...');
      console.log('👤 User object:', user);
      console.log('🏢 Selected business:', formData.businessName);
      
      // Use uid or id, whichever is available
      const userId = user.uid || user.id;
      
      // Get current vehicle number for new vehicles
      let vehicleNumber = currentCar?.vehicleNumber || 1;
      if (!currentCar) {
        // For new vehicles, get the next vehicle number
        try {
          const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
          const maxVehicleNumber = vehiclesSnapshot.docs.reduce((max, doc) => {
            const data = doc.data();
            return Math.max(max, data.vehicleNumber || 0);
          }, 0);
          vehicleNumber = maxVehicleNumber + 1;
          console.log('📊 Next vehicle number:', vehicleNumber);
        } catch (error) {
          console.warn('Could not get vehicle number, using default:', error);
          vehicleNumber = 1;
        }
      }
      
      // Upload images
      let imageUrls;
      try {
        imageUrls = await uploadImages();
        console.log('🖼️ Final image URLs:', imageUrls);
      } catch (error) {
        console.error('❌ Image upload failed:', error);
        setUploadError(`Failed to upload images: ${error.message}`);
        setLoading(false);
        return;
      }
      
      // Get owner info from selected business
      const ownerStatusInfo = getOwnerStatusInfo(formData.businessName);
      let ownerInfo = {};
      
      if (user.role === 'admin' && ownerStatusInfo) {
        ownerInfo = {
          uid: ownerStatusInfo.owner.id,
          userId: ownerStatusInfo.owner.id,
          users: ownerStatusInfo.owner.businessName,
          ownerFullName: ownerStatusInfo.owner.fullName || ownerStatusInfo.owner.email
        };
        console.log('🏢 Using selected business owner info:', ownerInfo);
      } else {
        ownerInfo = {
          uid: userId,
          userId: userId,
          users: formData.businessName.trim(),
          ownerFullName: user.fullName || user.email || ''
        };
        console.log('👤 Using current user as owner:', ownerInfo);
      }
      
      // Prepare vehicle data matching your database structure
      const vehicleData = {
        // Basic information
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        carNumber: formData.carNumber.trim(),
        carType: formData.carType,
        capacity: formData.capacity,
        status: formData.status,
        description: formData.description.trim(),
        businessPermitNumber: formData.businessPermitNumber.trim(),
        
        // Pricing
        price: parseInt(formData.price) || 0,
        hourlyRate: formData.hourlyRate.trim(),
        securityDeposit: formData.securityDeposit.trim(),
        
        // Technical specifications
        transmission: formData.transmission,
        fuelType: formData.fuelType,
        fuelReturnPolicy: formData.fuelReturnPolicy,
        minRentalPeriod: formData.minRentalPeriod,
        
        // Images
        mainImageUrl: imageUrls.mainImageUrl,
        angleImageUrls: imageUrls.angleImageUrls,
        
        // Business information
        businessName: formData.businessName.trim(),
        
        // Owner information
        ...ownerInfo,
        
        // System fields
        vehicleNumber: vehicleNumber,
        updatedAt: new Date().toISOString()
      };
      
      console.log('💾 Final vehicle data to save:', vehicleData);
      
      if (currentCar) {
        // Update existing vehicle
        const vehicleDocRef = doc(db, 'vehicles', currentCar.id);
        await updateDoc(vehicleDocRef, vehicleData);
        console.log('✅ Vehicle updated successfully');
        setSubmitSuccess(`Vehicle updated successfully for ${formData.businessName}`);
        setTimeout(() => setSubmitSuccess(null), 3000);
      } else {
        // Add new vehicle
        vehicleData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'vehicles'), vehicleData);
        console.log('✅ Vehicle added successfully with ID:', docRef.id);
        setSubmitSuccess(`Vehicle added successfully for ${formData.businessName}`);
        setTimeout(() => setSubmitSuccess(null), 3000);
      }
      
      resetForm();
      await fetchCars();
      setIsModalOpen(false);
      
    } catch (error) {
      console.error('❌ Error saving vehicle:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      setUploadError(`Failed to save vehicle: ${error.message}`);
      setSubmitError('Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete car
  const deleteCar = async () => {
    if (!carToDelete) return;
    
    if (userStatus !== 'active' && user.role === 'owner') {
      setUploadError('Your account needs approval before you can delete vehicles');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🗑️ Deleting vehicle:', carToDelete.brand, carToDelete.model);
      
      await deleteDoc(doc(db, 'vehicles', carToDelete.id));
      
      // Delete main image
      if (carToDelete.mainImageUrl) {
        try {
          const imagePath = carToDelete.mainImageUrl.split('/o/')[1]?.split('?')[0];
          if (imagePath) {
            const decodedPath = decodeURIComponent(imagePath);
            const imageRef = ref(storage, decodedPath);
            await deleteObject(imageRef);
            console.log('🗑️ Main image deleted from storage');
          }
        } catch (storageError) {
          console.error('❌ Error deleting main image from storage:', storageError);
        }
      }

      // Delete angle images
      if (carToDelete.angleImageUrls && carToDelete.angleImageUrls.length > 0) {
        for (const imageUrl of carToDelete.angleImageUrls) {
          try {
            const imagePath = imageUrl.split('/o/')[1]?.split('?')[0];
            if (imagePath) {
              const decodedPath = decodeURIComponent(imagePath);
              const imageRef = ref(storage, decodedPath);
              await deleteObject(imageRef);
              console.log('🗑️ Angle image deleted from storage');
            }
          } catch (storageError) {
            console.error('❌ Error deleting angle image from storage:', storageError);
          }
        }
      }
      
      await fetchCars();
      setIsDeleteModalOpen(false);
      setCarToDelete(null);
      setSubmitSuccess('Vehicle deleted successfully');
      setTimeout(() => setSubmitSuccess(null), 3000);
      
    } catch (error) {
      console.error('❌ Error deleting vehicle:', error);
      setSubmitError('Failed to delete vehicle');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      brand: '',
      model: '',
      price: '',
      hourlyRate: '',
      mainImageUrl: '',
      angleImageUrls: [],
      capacity: '4',
      carType: 'Sedan',
      transmission: 'Automatic',
      fuelType: 'Gasoline',
      status: 'Available',
      description: '',
      carNumber: '',
      minRentalPeriod: '24',
      securityDeposit: '',
      fuelReturnPolicy: 'same',
      businessName: '',
      businessPermitNumber: ''
    });
    setMainImageUpload(null);
    setAngleImageUploads([]);
    setUploadProgress(0);
    setFormErrors({});
    setCurrentCar(null);
    setUploadError(null);
    setSelectedOwnerDetails(null);
    setShowDocumentAlert(false);
    setDocumentAlertMessage('');
  };
  
  // Open modal to add new car
  const openAddModal = () => {
    if (!user) {
      setSubmitError('You must be logged in to add vehicles');
      return;
    }
    
    if (userStatus !== 'active' && user.role === 'owner') {
      setSubmitError('Your account is still pending approval. You cannot add vehicles until approved.');
      return;
    }
    
    console.log('📝 Opening add modal for user:', user.uid || user.id);
    console.log('👤 User status:', userStatus, 'Role:', user.role);
    
    resetForm();
    setIsModalOpen(true);
    
    // Clear any previous errors
    setFormErrors({});
    setUploadError(null);
  };
  
  // Open modal to edit car
  const openEditModal = (car) => {
    if (userStatus !== 'active' && user.role === 'owner') {
      setSubmitError('Your account needs approval before you can edit vehicles');
      return;
    }
    
    console.log('✏️ Editing car:', car);
    
    setCurrentCar(car);
    setFormData({
      brand: car.brand || '',
      model: car.model || '',
      price: car.price?.toString() || '',
      hourlyRate: car.hourlyRate || '',
      mainImageUrl: car.mainImageUrl || '',
      angleImageUrls: car.angleImageUrls || [],
      capacity: car.capacity || '4',
      carType: car.carType || 'Sedan',
      transmission: car.transmission || 'Automatic',
      fuelType: car.fuelType || 'Gasoline',
      status: car.status || 'Available',
      description: car.description || '',
      carNumber: car.carNumber || '',
      minRentalPeriod: car.minRentalPeriod || '24',
      securityDeposit: car.securityDeposit || '',
      fuelReturnPolicy: car.fuelReturnPolicy || 'same',
      businessName: car.businessName || '',
      businessPermitNumber: car.businessPermitNumber || ''
    });
    
    // Set selected owner details for editing
    if (car.businessName) {
      const ownerDetails = [...approvedOwners, ...pendingOwners, ...rejectedOwners]
        .find(owner => owner.businessName === car.businessName);
      setSelectedOwnerDetails(ownerDetails);
    }
    
    setIsModalOpen(true);
  };
  
  // Open delete confirmation modal
  const openDeleteModal = (car) => {
    if (userStatus !== 'active' && user.role === 'owner') {
      setSubmitError('Your account needs approval before you can delete vehicles');
      return;
    }
    
    setCarToDelete(car);
    setIsDeleteModalOpen(true);
  };

  // Open view details modal
  const openViewDetailsModal = (car) => {
    console.log('👁️ Viewing car details:', car);
    setCarToView(car);
    setIsViewDetailsOpen(true);
  };
  
  // Pagination logic
  const indexOfLastCar = currentPage * carsPerPage;
  const indexOfFirstCar = indexOfLastCar - carsPerPage;
  const currentCars = filteredCars.slice(indexOfFirstCar, indexOfLastCar);
  const totalPages = Math.ceil(filteredCars.length / carsPerPage);
  
  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
  // Simple error display
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  
  return (
    <>
      {/* Add CSS Styles for Modal Fix */}
      <style jsx>{`
        /* Responsive Modal - No zoom required */
        .responsive-modal {
          width: 95vw;
          max-width: 95vw;
        }

        /* Breakpoints for different screen sizes */
        @media (min-width: 640px) {
          .responsive-modal {
            width: 90vw;
            max-width: 90vw;
          }
        }

        @media (min-width: 768px) {
          .responsive-modal {
            width: 85vw;
            max-width: 85vw;
          }
        }

        @media (min-width: 1024px) {
          .responsive-modal {
            width: 80vw;
            max-width: 80vw;
          }
        }

        @media (min-width: 1280px) {
          .responsive-modal {
            width: 75vw;
            max-width: 75vw;
          }
        }

        @media (min-width: 1536px) {
          .responsive-modal {
            width: 70vw;
            max-width: 70vw;
          }
        }

        /* Modal content responsive fixes */
        .modal-content-fix {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .upload-section-fix {
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          min-height: 0;
        }

        .upload-grid-fix {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          align-items: start;
        }

        /* Upload grid responsive */
        @media (min-width: 768px) {
          .upload-grid-fix {
            gap: 1.25rem;
          }
        }

        @media (min-width: 1024px) {
          .upload-grid-fix {
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }
        }

        /* Modal container responsive height */
        .modal-container-fix {
          max-height: 85vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        @media (max-height: 700px) {
          .modal-container-fix {
            max-height: 90vh;
          }
        }

        @media (max-height: 600px) {
          .modal-container-fix {
            max-height: 95vh;
          }
        }

        .upload-area-fix {
          display: block;
          flex-shrink: 0;
        }

        .upload-area-fix * {
          margin: 0;
        }

        .file-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        /* Responsive spacing */
        @media (max-width: 640px) {
          .file-input-container {
            gap: 0.5rem;
          }
        }

        .conditional-display {
          display: none;
        }

        .conditional-display.show {
          display: block;
          flex-shrink: 0;
        }

        /* Form section responsive spacing */
        @media (max-width: 768px) {
          .space-y-8 > * + * {
            margin-top: 1.5rem !important;
          }
        }

        @media (max-width: 640px) {
          .space-y-8 > * + * {
            margin-top: 1rem !important;
          }
        }

        /* Grid responsive adjustments */
        @media (max-width: 768px) {
          .md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          
          .lg\\:grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
          
          .lg\\:grid-cols-4 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          
          .md\\:grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .lg\\:grid-cols-4 {
            grid-template-columns: 1fr !important;
          }
        }

        /* Responsive padding */
        @media (max-width: 768px) {
          .sm\\:p-8 {
            padding: 1rem !important;
          }
          
          .p-6 {
            padding: 1rem !important;
          }
        }

        @media (max-width: 640px) {
          .px-6 {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          
          .py-4 {
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
          }
        }

        /* Gap responsive adjustments */
        @media (max-width: 768px) {
          .gap-4 {
            gap: 0.75rem !important;
          }
          
          .gap-6 {
            gap: 1rem !important;
          }
        }

        @media (max-width: 640px) {
          .gap-4 {
            gap: 0.5rem !important;
          }
          
          .gap-6 {
            gap: 0.75rem !important;
          }
        }

        /* Text size adjustments for smaller screens */
        @media (max-width: 640px) {
          .text-xl {
            font-size: 1.125rem !important;
          }
          
          .text-lg {
            font-size: 1rem !important;
          }
        }

        /* Button responsive */
        @media (max-width: 640px) {
          .sm\\:flex-row-reverse {
            flex-direction: column !important;
          }
          
          .sm\\:ml-3 {
            margin-left: 0 !important;
            margin-bottom: 0.75rem !important;
          }
          
          .sm\\:mt-0 {
            margin-top: 0.75rem !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100">
        <Sidebar currentPage="cars" />
        
        <div className="lg:pl-64 flex flex-col flex-1">
          <div className="py-3">
            <div className="max-w-full mx-auto px-3">
              <h1 className="text-2xl font-semibold text-gray-900">Vehicle Listings</h1>
            </div>
            
            {userStatus === 'pending' && user.role === 'owner' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle size={24} className="text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Your account is pending approval
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          You can view existing vehicles, but you need admin approval before 
                          you can add, edit, or delete vehicles. Please contact the administrator.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="max-w-full mx-auto px-3">
              {/* Search, Filter and Add Car */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center my-2 space-y-2 lg:space-y-0 lg:space-x-4">
                <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 w-full lg:w-auto">
                  {/* Search Input */}
                  <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={18} className="text-gray-500" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Search vehicles, permits..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                        onClick={() => setSearchTerm('')}
                      >
                        <X size={18} className="text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  
                  {/* Owner Filter Dropdown */}
                  <div className="relative w-full md:w-64">
                    <select
                      value={ownerFilter}
                      onChange={(e) => setOwnerFilter(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                    >
                      <option value="">All Owners ({cars.length})</option>
                      {[...new Set(cars.map(car => car.businessName).filter(Boolean))]
                        .sort()
                        .map(owner => {
                          const count = cars.filter(car => car.businessName === owner).length;
                          return (
                            <option key={owner} value={owner}>
                              {owner} ({count})
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                >
                  <Plus size={18} className="mr-2" />
                  Add New Vehicle
                </button>
              </div>
              
              {/* Results Summary */}
              {!loading && (
                <div className="mb-4 text-sm text-gray-600">
                  Showing {filteredCars.length} of {cars.length} vehicles
                  {ownerFilter && ` for ${ownerFilter}`}
                  {searchTerm && ` matching "${searchTerm}"`}
                </div>
              )}
              
              {/* Car List */}
              {loading && cars.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-500">Loading vehicles...</p>
                </div>
              ) : filteredCars.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow p-8 h-64">
                  <Car size={48} className="text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
                  <p className="text-gray-500 text-center mb-4">
                    {searchTerm || ownerFilter ? 
                      'Try adjusting your search or filter criteria' : 
                      'Add your first vehicle to get started'
                    }
                  </p>
                  {(searchTerm || ownerFilter) && (
                    <div className="flex space-x-2">
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Clear search
                        </button>
                      )}
                      {ownerFilter && (
                        <button
                          onClick={() => setOwnerFilter('')}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 mt-1">
                  {currentCars.map((car) => (
                    <div
                      key={car.id}
                      className="bg-white rounded-lg shadow overflow-hidden transition-all duration-200 hover:shadow-lg hover:transform hover:scale-[1.01] min-h-[550px] w-full"
                    >
                      <div className="h-64 w-full overflow-hidden bg-gray-200 relative">
                        {car.mainImageUrl ? (
                          <img
                            src={car.mainImageUrl}
                            alt={`${car.brand} ${car.model}`}
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('✅ Image loaded successfully:', car.mainImageUrl)}
                            onError={(e) => {
                              console.log('❌ Image failed to load:', car.mainImageUrl);
                              e.target.onerror = null;
                              e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Available";
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">No image available</p>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                          #{car.vehicleNumber}
                        </div>
                        {car.status === 'Not Verified' && (
                          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs font-bold py-1 text-center">
                            Not Verified
                          </div>
                        )}
                        {car.status === 'Rented' && (
                          <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 text-white text-xs font-bold py-1 text-center">
                            Rented
                          </div>
                        )}
                        {car.status === 'Maintenance' && (
                          <div className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-xs font-bold py-1 text-center">
                            Maintenance
                          </div>
                        )}
                        {car.status === 'Out of Service' && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gray-500 text-white text-xs font-bold py-1 text-center">
                            Out of Service
                          </div>
                        )}
                      </div>
                      
                      <div className="p-8">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{car.brand} {car.model}</h3>
                            <p className="text-gray-600">{car.carNumber}</p>
                            <p className="text-sm text-gray-500">{car.businessName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-600">₱{car.price}</p>
                            <p className="text-sm text-gray-500">₱{car.hourlyRate}/hr</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                          <div className="flex space-x-3">
                            <span>{car.transmission}</span>
                            <span>•</span>
                            <span>{car.fuelType}</span>
                            <span>•</span>
                            <span>{car.capacity} Seats</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {car.carType}
                          </span>
                          {car.businessPermitNumber && (
                            <span className="text-xs text-gray-500">
                              Permit: {car.businessPermitNumber}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2 flex items-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            car.status === 'Verified' ? 'bg-gray-100 text-black' :
                            car.status === 'Not Verified' ? 'bg-red-100 text-red-800' :
                            car.status === 'Rented' ? 'bg-yellow-100 text-yellow-800' :
                            car.status === 'Maintenance' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {car.status === 'Not Verified' && <AlertTriangle size={12} className="mr-1" />}
                            {car.status}
                          </span>
                        </div>
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => openViewDetailsModal(car)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                          >
                            <Eye size={14} className="mr-1" />
                            View
                          </button>
                          
                          <button
                            onClick={() => openEditModal(car)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                          >
                            <Edit2 size={14} className="mr-1" />
                            Edit
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(car)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-8 space-x-2">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium transition-all duration-200 ${
                      currentPage === 1
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 active:scale-95'
                    }`}
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => paginate(index + 1)}
                        className={`px-3 py-2 border text-sm font-medium rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                          currentPage === index + 1
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium transition-all duration-200 ${
                      currentPage === totalPages
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transform hover:scale-105 active:scale-95'
                    }`}
                  >
                    Next
                    <ChevronRight size={16} className="ml-1" />
                  </button>
                </div>
              )}
              
              {/* Simple Success/Error Messages */}
              {submitSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm z-50">
                  <p className="text-green-700 text-sm flex items-center">
                    <span className="mr-2">✅</span>{submitSuccess}
                  </p>
                </div>
              )}
              {submitError && (
                <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm z-50">
                  <p className="text-red-700 text-sm flex items-center">
                    <span className="mr-2">❌</span>{submitError}
                    <button 
                      onClick={() => setSubmitError(null)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Add/Edit Car Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" onClick={() => setIsModalOpen(false)}>
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle responsive-modal sm:w-full">
                <div className="animate-fadeIn">
                  <div className="bg-white px-6 pt-6 pb-4 sm:p-8 modal-container-fix">
                    <div className="mb-6">
                      <h3 className="text-xl leading-6 font-bold text-gray-900">
                        {currentCar ? 'Edit Vehicle' : 'Add New Vehicle'}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        Fill in the details below to {currentCar ? 'update the' : 'add a new'} vehicle.
                      </p>
                    </div>
                    
                    {uploadError && (
                      <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                        <p className="flex items-center text-sm">
                          <AlertCircle size={16} className="mr-2" />
                          {uploadError}
                        </p>
                      </div>
                    )}
                    
                    <div className="modal-content-fix">
                      <div className="space-y-8">
                        {/* Business Information Section */}
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Users className="mr-2" size={20} />
                            Business Information
                          </h4>
                          
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                                Business Name * 
                                <span className="text-xs text-gray-500 ml-1">
                                  (Select from registered business owners)
                                </span>
                              </label>
                              
                              <select
                                id="businessName"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleInputChange}
                                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer ${
                                  formErrors.businessName ? 'border-red-500' : 'border-gray-300'
                                }`}
                              >
                                <option value="">-- Select Business Name --</option>
                                
                                {/* Show approved owners first (recommended) */}
                                {approvedOwners.length > 0 && (
                                  <optgroup label="✅ Approved Business Owners (Recommended)">
                                    {approvedOwners.map((owner) => {
                                      const hasDocuments = validateOwnerDocuments(owner);
                                      return (
                                        <option 
                                          key={owner.id} 
                                          value={owner.businessName}
                                          className="cursor-pointer"
                                        >
                                          {owner.businessName}
                                          {hasDocuments ? ' ✓ Complete' : ' ⚠️ Missing Docs'}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                )}
                                
                                {/* Show pending owners - clickable but will show warning */}
                                {pendingOwners.length > 0 && (
                                  <optgroup label="⏳ Pending Approval (Cannot Add Vehicles Yet)">
                                    {pendingOwners.map((owner) => (
                                      <option key={owner.id} value={owner.businessName} className="cursor-pointer">
                                        {owner.businessName} - PENDING APPROVAL
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                
                                {/* Show rejected owners - clickable but will show warning */}
                                {rejectedOwners.length > 0 && (
                                  <optgroup label="❌ Rejected (Cannot Add Vehicles)">
                                    {rejectedOwners.map((owner) => (
                                      <option key={owner.id} value={owner.businessName} className="cursor-pointer">
                                        {owner.businessName} - REJECTED
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                
                                {/* Show message if no business owners found */}
                                {approvedOwners.length === 0 && pendingOwners.length === 0 && rejectedOwners.length === 0 && (
                                  <option disabled>No business owners found</option>
                                )}
                              </select>
                              
                              {/* Document Alert Popup */}
                              {showDocumentAlert && documentAlertMessage && (
                                <div className="mt-3 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md animate-pulse">
                                  <div className="flex">
                                    <div className="flex-shrink-0">
                                      <AlertTriangle size={20} className="text-orange-400" />
                                    </div>
                                    <div className="ml-3">
                                      <h3 className="text-sm font-medium text-orange-800">
                                        Document Status Alert
                                      </h3>
                                      <div className="mt-2 text-sm text-orange-700">
                                        <p>{documentAlertMessage}</p>
                                      </div>
                                    </div>
                                    <div className="ml-auto pl-3">
                                      <button
                                        onClick={() => setShowDocumentAlert(false)}
                                        className="inline-flex text-orange-400 hover:text-orange-600"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {formErrors.businessName && (
                                <div className="mt-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                                  <AlertCircle size={14} className="inline mr-1" />
                                  {formErrors.businessName}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Basic Vehicle Information Section */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Car className="mr-2" size={20} />
                            Basic Vehicle Information
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                                Brand *
                              </label>
                              <input
                                type="text"
                                id="brand"
                                name="brand"
                                value={formData.brand}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                                  formErrors.brand ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., Honda, Toyota"
                              />
                              {formErrors.brand && (
                                <p className="mt-1 text-sm text-red-500">{formErrors.brand}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                                Model *
                              </label>
                              <input
                                type="text"
                                id="model"
                                name="model"
                                value={formData.model}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                                  formErrors.model ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., Civic, Camry"
                              />
                              {formErrors.model && (
                                <p className="mt-1 text-sm text-red-500">{formErrors.model}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="carNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                Car Number *
                              </label>
                              <input
                                type="text"
                                id="carNumber"
                                name="carNumber"
                                value={formData.carNumber}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                                  formErrors.carNumber ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., ABC123"
                              />
                              {formErrors.carNumber && (
                                <p className="mt-1 text-sm text-red-500">{formErrors.carNumber}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="businessPermitNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                Business Permit Number
                              </label>
                              <input
                                type="text"
                                id="businessPermitNumber"
                                name="businessPermitNumber"
                                value={formData.businessPermitNumber}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="e.g., BP-2024-001"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="carType" className="block text-sm font-medium text-gray-700 mb-1">
                                Car Type
                              </label>
                              <select
                                id="carType"
                                name="carType"
                                value={formData.carType}
                                onChange={handleInputChange}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                              >
                                <option value="Sedan">Sedan</option>
                                <option value="SUV">SUV</option>
                                <option value="Hatchback">Hatchback</option>
                                <option value="Coupe">Coupe</option>
                                <option value="Convertible">Convertible</option>
                                <option value="Pickup">Pickup</option>
                                <option value="Van">Van</option>
                              </select>
                            </div>
                            
                            <div>
                              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                              >
                                <option value="Available">Available</option>
                                <option value="Unavailable">Unavailable</option>
                              </select>
                            </div>
                            
                            <div>
                              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                                Capacity (Seats)
                              </label>
                              <select
                                id="capacity"
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleInputChange}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                              >
                                <option value="2">2</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9+">9+</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Pricing Information Section */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <PesoIcon className="mr-2" size={20} />
                            Pricing Information
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                                Daily Price (₱) *
                              </label>
                              <input
                                type="text"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                                  formErrors.price ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., 20000"
                              />
                              {formErrors.price && (
                                <p className="mt-1 text-sm text-red-500">{formErrors.price}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                                Hourly Rate (₱) *
                              </label>
                              <input
                                type="text"
                                id="hourlyRate"
                                name="hourlyRate"
                                value={formData.hourlyRate}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                                  formErrors.hourlyRate ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., 5000"
                              />
                              {formErrors.hourlyRate && (
                                <p className="mt-1 text-sm text-red-500">{formErrors.hourlyRate}</p>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="securityDeposit" className="block text-sm font-medium text-gray-700 mb-1">
                                Security Deposit (₱)
                              </label>
                              <input
                                type="text"
                                id="securityDeposit"
                                name="securityDeposit"
                                value={formData.securityDeposit}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                                  formErrors.securityDeposit ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., 15000"
                              />
                              {formErrors.securityDeposit && (
                                <p className="mt-1 text-sm text-red-500">{formErrors.securityDeposit}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Technical Specifications Section */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Settings className="mr-2" size={20} />
                            Technical Specifications
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label htmlFor="transmission" className="block text-sm font-medium text-gray-700 mb-1">
                                Transmission
                              </label>
                              <select
                                id="transmission"
                                name="transmission"
                                value={formData.transmission}
                                onChange={handleInputChange}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                              >
                                <option value="Automatic">Automatic</option>
                                <option value="Manual">Manual</option>
                                <option value="Semi-Automatic">Semi-Automatic</option>
                              </select>
                            </div>
                            
                            <div>
                              <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 mb-1">
                                Fuel Type
                              </label>
                              <select
                                id="fuelType"
                                name="fuelType"
                                value={formData.fuelType}
                                onChange={handleInputChange}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                              >
                                <option value="Gasoline">Gasoline</option>
                                <option value="Diesel">Diesel</option>
                                <option value="Electric">Electric</option>
                                <option value="Hybrid">Hybrid</option>
                              </select>
                            </div>
                            
                            <div>
                              <label htmlFor="fuelReturnPolicy" className="block text-sm font-medium text-gray-700 mb-1">
                                Fuel Return Policy
                              </label>
                              <select
                                id="fuelReturnPolicy"
                                name="fuelReturnPolicy"
                                value={formData.fuelReturnPolicy}
                                onChange={handleInputChange}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                              >
                                <option value="same">Return with Same Level</option>
                                <option value="full">Return Full Tank</option>
                                <option value="empty">Return Empty</option>
                              </select>
                            </div>
                            
                            <div>
                              <label htmlFor="minRentalPeriod" className="block text-sm font-medium text-gray-700 mb-1">
                                Min Rental Period (hours)
                              </label>
                              <input
                                type="text"
                                id="minRentalPeriod"
                                name="minRentalPeriod"
                                value={formData.minRentalPeriod}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="e.g., 24"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Description Section */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FileText className="mr-2" size={20} />
                            Additional Information
                          </h4>
                          
                          <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              id="description"
                              name="description"
                              rows={4}
                              value={formData.description}
                              onChange={handleInputChange}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="Additional details about the vehicle..."
                            />
                          </div>
                        </div>
                      
                        {/* Images Section - FIXED VERSION */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 upload-section-fix">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Upload className="mr-2" size={20} />
                            Vehicle Images
                          </h4>
                          
                          <div className="upload-grid-fix">
                            {/* Main Image Column */}
                            <div className="file-input-container">
                              <label className="block text-sm font-medium text-gray-700">
                                Main Image *
                              </label>
                              
                              {/* Current Image Preview */}
                              {formData.mainImageUrl && (
                                <div className={`conditional-display ${formData.mainImageUrl ? 'show' : ''}`}>
                                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                                    <img
                                      src={formData.mainImageUrl}
                                      alt="Main vehicle preview"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.log('❌ Preview image failed to load:', formData.mainImageUrl);
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                      Current Image
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Upload Area */}
                              <label htmlFor="main-image-upload" className="cursor-pointer upload-area-fix">
                                <div className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                  <div className="text-center">
                                    <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                      {currentCar ? 'Change Main Image' : 'Upload Main Image'}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                                  </div>
                                </div>
                              </label>
                              <input
                                id="main-image-upload"
                                name="main-image-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleMainImageChange}
                                accept="image/*"
                              />
                              
                              {/* Selected File Info */}
                              {mainImageUpload && (
                                <div className={`conditional-display ${mainImageUpload ? 'show' : ''}`}>
                                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                    <div className="flex items-center">
                                      <FileText size={16} className="text-blue-500 mr-2" />
                                      <span className="text-sm text-blue-700 font-medium">
                                        Selected: {mainImageUpload.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">
                                      Size: {(mainImageUpload.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Error Message */}
                              {formErrors.mainImageUrl && (
                                <div className={`conditional-display ${formErrors.mainImageUrl ? 'show' : ''}`}>
                                  <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                    <p className="text-sm text-red-600 flex items-center">
                                      <AlertCircle size={14} className="mr-1" />
                                      {formErrors.mainImageUrl}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Additional Images Column */}
                            <div className="file-input-container">
                              <label className="block text-sm font-medium text-gray-700">
                                Additional Views (Optional - Max 5)
                              </label>
                              
                              {/* Current Additional Images */}
                              {formData.angleImageUrls && formData.angleImageUrls.length > 0 && (
                                <div className={`conditional-display ${formData.angleImageUrls?.length > 0 ? 'show' : ''}`}>
                                  <p className="text-xs text-gray-600 font-medium mb-2">Current Additional Images:</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {formData.angleImageUrls.slice(0, 6).map((url, index) => (
                                      <div key={index} className="relative">
                                        <div className="w-full h-20 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                          <img
                                            src={url}
                                            alt={`Angle ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                          {index + 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Upload Area */}
                              <label htmlFor="angle-images-upload" className="cursor-pointer upload-area-fix">
                                <div className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                  <div className="text-center">
                                    <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                      Upload Additional Images
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">Select up to 5 images</p>
                                  </div>
                                </div>
                              </label>
                              <input
                                id="angle-images-upload"
                                name="angle-images-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleAngleImagesChange}
                                accept="image/*"
                                multiple
                              />
                              
                              {/* Selected Files Info */}
                              {angleImageUploads.length > 0 && (
                                <div className={`conditional-display ${angleImageUploads.length > 0 ? 'show' : ''}`}>
                                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                    <div className="flex items-center mb-2">
                                      <CheckCircle size={16} className="text-green-500 mr-2" />
                                      <span className="text-sm text-green-700 font-medium">
                                        {angleImageUploads.length} files selected
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {angleImageUploads.slice(0, 3).map((file, index) => (
                                        <p key={index} className="text-xs text-green-600">
                                          • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                        </p>
                                      ))}
                                      {angleImageUploads.length > 3 && (
                                        <p className="text-xs text-green-600">
                                          • ... and {angleImageUploads.length - 3} more files
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Upload Progress */}
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className={`conditional-display ${uploadProgress > 0 && uploadProgress < 100 ? 'show' : ''}`}>
                              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-blue-700">Uploading Images...</span>
                                  <span className="text-sm text-blue-600">{Math.round(uploadProgress)}%</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-2.5">
                                  <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modal Footer */}
                  <div className="bg-gray-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse border-t border-gray-200">
                    <button
                      onClick={handleSubmit}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : currentCar ? (
                        <span className="flex items-center">
                          <Check size={16} className="mr-2" />
                          Update Vehicle
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Plus size={16} className="mr-2" />
                          Add Vehicle
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" onClick={() => setIsDeleteModalOpen(false)}>
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertCircle size={20} className="text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Delete Vehicle
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete {carToDelete?.brand} {carToDelete?.model} ({carToDelete?.carNumber})? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={deleteCar}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Delete'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setCarToDelete(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* View Details Modal */}
        {isViewDetailsOpen && carToView && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" onClick={() => setIsViewDetailsOpen(false)}>
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <Eye className="mr-2" size={24} />
                      Vehicle Details
                    </h3>
                    <button
                      onClick={() => setIsViewDetailsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vehicle Images */}
                    <div className="space-y-4">
                      {/* Main Image */}
                      <div className="aspect-w-16 aspect-h-12 rounded-lg overflow-hidden bg-gray-200">
                        {carToView.mainImageUrl ? (
                          <img
                            src={carToView.mainImageUrl}
                            alt={`${carToView.brand} ${carToView.model}`}
                            className="w-full h-64 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Available";
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-64 bg-gray-200 rounded-lg">
                            <p className="text-gray-500">No main image available</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Angle Images */}
                      {carToView.angleImageUrls && carToView.angleImageUrls.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Additional Views</h5>
                          <div className="grid grid-cols-3 gap-2">
                            {carToView.angleImageUrls.map((url, index) => (
                              <div key={index} className="aspect-w-16 aspect-h-12 rounded-md overflow-hidden bg-gray-200">
                                <img
                                  src={url}
                                  alt={`Angle ${index + 1}`}
                                  className="w-full h-20 object-cover rounded-md"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://via.placeholder.com/100x75?text=N/A";
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Status */}
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        carToView.status === 'Verified' 
                          ? 'bg-gray-100 text-black' 
                          : carToView.status === 'Not Verified'
                          ? 'bg-red-100 text-red-800'
                          : carToView.status === 'Rented'
                          ? 'bg-yellow-100 text-yellow-800'
                          : carToView.status === 'Maintenance'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {carToView.status === 'Not Verified' && <AlertTriangle size={14} className="mr-2" />}
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          carToView.status === 'Verified' ? 'bg-gray-400' : 
                          carToView.status === 'Not Verified' ? 'bg-red-400' :
                          carToView.status === 'Rented' ? 'bg-yellow-400' :
                          carToView.status === 'Maintenance' ? 'bg-orange-400' : 'bg-gray-400'
                        }`}></div>
                        {carToView.status}
                      </div>
                    </div>
                    
                    {/* Vehicle Information */}
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Brand:</span>
                            <span className="text-gray-900">{carToView.brand}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Model:</span>
                            <span className="text-gray-900">{carToView.model}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Car #:</span>
                            <span className="text-gray-900">{carToView.carNumber}</span>
                          </div>
                          {carToView.businessPermitNumber && (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 w-20">Permit:</span>
                              <span className="text-gray-900">{carToView.businessPermitNumber}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Type:</span>
                            <span className="text-gray-900">{carToView.carType}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Vehicle #:</span>
                            <span className="text-gray-900">#{carToView.vehicleNumber}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Pricing */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <PesoIcon className="mr-2" size={18} />
                          Pricing
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">Daily Rate:</span>
                            <span className="text-lg font-bold text-blue-600">₱{carToView.price}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">Hourly Rate:</span>
                            <span className="text-gray-900">₱{carToView.hourlyRate}</span>
                          </div>
                          {carToView.securityDeposit && (
                            <div className="flex justify-between py-2 border-b border-gray-100">
                              <span className="font-medium text-gray-700">Security Deposit:</span>
                              <span className="text-gray-900">₱{carToView.securityDeposit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Specifications */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <Settings className="mr-2" size={18} />
                          Specifications
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">Transmission:</span>
                            <span className="text-gray-900">{carToView.transmission}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">Fuel Type:</span>
                            <span className="text-gray-900">{carToView.fuelType}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">Capacity:</span>
                            <span className="text-gray-900">{carToView.capacity} Seats</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">Min Rental:</span>
                            <span className="text-gray-900">{carToView.minRentalPeriod} hours</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-medium text-gray-700">Fuel Policy:</span>
                            <span className="text-gray-900 capitalize">{carToView.fuelReturnPolicy}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Business Information */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <User className="mr-2" size={18} />
                          Business Information
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Business:</span>
                            <span className="text-gray-900">{carToView.businessName}</span>
                          </div>
                          {carToView.uid && (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 w-20">Owner ID:</span>
                              <span className="text-gray-500 text-sm font-mono">{carToView.uid}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Description */}
                      {carToView.description && (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Description</h4>
                          <p className="text-gray-700 text-sm leading-relaxed">{carToView.description}</p>
                        </div>
                      )}
                      
                      {/* Timestamps */}
                      {(carToView.createdAt || carToView.updatedAt) && (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Record Information</h4>
                          <div className="space-y-2 text-sm">
                            {carToView.createdAt && (
                              <div className="flex items-center">
                                <span className="font-medium text-gray-700 w-20">Created:</span>
                                <span className="text-gray-600">
                                  {carToView.createdAt?.toDate ? 
                                    carToView.createdAt.toDate().toLocaleDateString() : 
                                    'Unknown'
                                  }
                                </span>
                              </div>
                            )}
                            {carToView.updatedAt && (
                              <div className="flex items-center">
                                <span className="font-medium text-gray-700 w-20">Updated:</span>
                                <span className="text-gray-600">
                                  {typeof carToView.updatedAt === 'string' ? 
                                    new Date(carToView.updatedAt).toLocaleDateString() :
                                    carToView.updatedAt?.toDate ? 
                                      carToView.updatedAt.toDate().toLocaleDateString() : 
                                      'Unknown'
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Close Button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setIsViewDetailsOpen(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cars;