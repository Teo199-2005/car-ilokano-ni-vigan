// components/AdminProfile.js
import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  updateEmail, 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './layout/Sidebar';
import { 
  Save, 
  X, 
  UserCircle, 
  Camera, 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Shield, 
  Clock,
  Upload,
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';

const AdminProfile = ({ user }) => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    contact: '',
    username: '',
    address: '',
    profileImage: '',
  });
  
  const [originalProfile, setOriginalProfile] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  
  const db = getFirestore();
  const auth = getAuth();
  const storage = getStorage();
  
  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  // Test Firebase Storage connection and permissions
  useEffect(() => {
    const testStorageConnection = async () => {
      try {
        console.log('🔥 Testing Firebase Storage Connection...');
        console.log('📦 Storage bucket:', storage.app.options.storageBucket);
        console.log('👤 Current user:', {
          uid: user?.uid,
          email: user?.email,
          isAuthenticated: !!user,
          hasAccessToken: !!user?.accessToken,
          emailVerified: user?.emailVerified
        });
        
        // Test creating a storage reference using existing folder structure
        const testRef = ref(storage, `profile_images/${user?.uid}/test.txt`);
        console.log('📁 Test storage path:', testRef.fullPath);
        console.log('🗂️ Storage bucket from ref:', testRef.bucket);
        
        // Check Firebase Auth current user
        const currentUser = auth.currentUser;
        console.log('🔐 Auth current user:', {
          uid: currentUser?.uid,
          email: currentUser?.email,
          emailVerified: currentUser?.emailVerified,
          isAnonymous: currentUser?.isAnonymous,
          providerData: currentUser?.providerData
        });
        
        // Get ID token to check claims
        if (currentUser) {
          try {
            const idTokenResult = await currentUser.getIdTokenResult();
            console.log('🎫 ID Token claims:', idTokenResult.claims);
            console.log('🕐 Token expiration:', idTokenResult.expirationTime);
          } catch (tokenError) {
            console.error('❌ Error getting ID token:', tokenError);
          }
        }
        
        // Check if user is properly authenticated
        if (!user) {
          console.warn('⚠️ No user object found - authentication may be incomplete');
        } else if (!user.uid) {
          console.warn('⚠️ User object missing UID - authentication incomplete');
        } else {
          console.log('✅ User authentication looks good');
        }
        
      } catch (error) {
        console.error('❌ Storage connection error:', error);
      }
    };
    
    if (user) {
      testStorageConnection();
    }
  }, [user, storage, auth]);
  
  // Fetch admin profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user) {
          console.log('👤 Fetching profile for user:', user.uid);
          
          // Try to find admin in Firestore
          const adminRef = doc(db, 'admins', user.uid);
          const adminSnap = await getDoc(adminRef);
          
          let profileData;
          
          if (adminSnap.exists()) {
            profileData = {
              ...adminSnap.data(),
              email: user.email || adminSnap.data().email || '',
            };
            console.log('✅ Admin profile found in Firestore:', profileData);
          } else {
            // If admin doc doesn't exist, create default profile
            profileData = {
              name: user.displayName || '',
              email: user.email || '',
              contact: '',
              username: user.email?.split('@')[0] || 'admin',
              address: '',
              profileImage: user.photoURL || '',
              role: 'admin',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            
            // Create the admin document
            await setDoc(adminRef, profileData);
            console.log('✅ Created new admin profile:', profileData);
          }
          
          setProfile(profileData);
          setOriginalProfile(profileData);
          setImagePreview(profileData.profileImage || '');
        }
      } catch (error) {
        console.error('❌ Error fetching profile:', error);
        setError('Failed to load profile: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user, db]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('📝 Profile input change:', name, '=', value);
    
    setProfile({
      ...profile,
      [name]: value
    });
    
    // Clear success message when user starts editing
    if (success) {
      setSuccess(false);
    }
  };
  
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      console.log('🖼️ Image selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      setImageFile(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uploadImage = async () => {
    if (!imageFile) {
      return profile.profileImage; // Return existing image URL if no new image
    }
    
    return new Promise((resolve, reject) => {
      setUploading(true);
      setUploadProgress(0);
      
      const fileId = uuidv4();
      // Use the existing folder structure that matches your current rules
      const fileName = `profile_images/${user.uid}/admin_${fileId}_${imageFile.name}`;
      const storageRef = ref(storage, fileName);
      
      console.log('📤 Uploading image to:', fileName);
      console.log('👤 User ID:', user.uid);
      console.log('🔐 User auth status:', !!user);
      console.log('📦 Storage bucket:', storage.app.options.storageBucket);
      
      const uploadTask = uploadBytesResumable(storageRef, imageFile);
      
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
          console.error('User auth token:', user?.accessToken ? 'Present' : 'Missing');
          
          setUploading(false);
          setUploadProgress(0);
          
          let errorMessage = 'Upload failed';
          if (error.code === 'storage/unauthorized') {
            errorMessage = `Upload failed: Not authorized. This could be due to:
            
1. Firebase Storage security rules need to be updated
2. User authentication issues
3. Incorrect storage path permissions

Please check your Firebase Storage rules in the Firebase Console.`;
          } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload was canceled';
          } else if (error.code === 'storage/unknown') {
            errorMessage = 'Upload failed: Unknown error. Please check your internet connection and Firebase configuration.';
          } else {
            errorMessage = `Upload failed: ${error.message}`;
          }
          
          reject(new Error(errorMessage));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Upload successful! Download URL:', downloadURL);
            setUploading(false);
            setUploadProgress(0);
            resolve(downloadURL);
          } catch (error) {
            console.error('❌ Error getting download URL:', error);
            setUploading(false);
            setUploadProgress(0);
            reject(new Error(`Failed to get download URL: ${error.message}`));
          }
        }
      );
    });
  };
  
  // Test upload function to diagnose issues
  const testUpload = async () => {
    try {
      console.log('🧪 Testing upload permissions...');
      
      // Create a simple test file
      const testContent = new Blob(['test content'], { type: 'text/plain' });
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      
      const testPath = `profile_images/${user.uid}/test_${Date.now()}.txt`;
      const testRef = ref(storage, testPath);
      
      console.log('📤 Testing upload to path:', testPath);
      console.log('👤 User auth state:', {
        uid: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified
      });
      
      const uploadTask = uploadBytesResumable(testRef, testFile);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('🧪 Test upload progress:', Math.round(progress) + '%');
        },
        (error) => {
          console.error('❌ Test upload failed:', error);
          setError(`Test upload failed: ${error.message}. This confirms the Firebase Storage rules need to be updated.`);
        },
        async () => {
          console.log('✅ Test upload successful!');
          // Clean up test file
          try {
            await deleteObject(testRef);
            console.log('🧹 Test file cleaned up');
          } catch (cleanupError) {
            console.warn('⚠️ Could not clean up test file:', cleanupError);
          }
          showNotification('Firebase Storage test successful!', 'success');
        }
      );
      
    } catch (error) {
      console.error('❌ Test upload error:', error);
      setError(`Test failed: ${error.message}`);
    }
  };
  
  const deleteOldImage = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('firebase')) return;
    
    try {
      // Extract the path from the URL
      const imagePath = imageUrl.split('/o/')[1]?.split('?')[0];
      if (imagePath) {
        const decodedPath = decodeURIComponent(imagePath);
        const imageRef = ref(storage, decodedPath);
        await deleteObject(imageRef);
        console.log('🗑️ Old image deleted from storage:', decodedPath);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete old image:', error);
      // Don't fail the whole operation if we can't delete the old image
    }
  };
  
  const validatePasswordChange = () => {
    if (newPassword && newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    
    if (newPassword && newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    
    setPasswordError('');
    return true;
  };
  
  const validateProfile = () => {
    const errors = [];
    
    if (!profile.name.trim()) {
      errors.push('Name is required');
    }
    
    if (!profile.email.trim()) {
      errors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(profile.email)) {
      errors.push('Email format is invalid');
    }
    
    if (!profile.username.trim()) {
      errors.push('Username is required');
    }
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      return false;
    }
    
    setError('');
    return true;
  };
  
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!validateProfile()) return;
    if (!validatePasswordChange()) return;
    
    setError('');
    setSuccess(false);
    setSaving(true);
    
    try {
      // Check if email is being changed or password is being set
      const emailChanged = user.email !== profile.email;
      
      if (emailChanged || newPassword) {
        // If email or password is changing, we need to reauthenticate
        setShowReauthModal(true);
        setSaving(false);
        return;
      }
      
      // Update profile in Firestore
      await updateProfileInFirestore();
      
      setSuccess(true);
      showNotification('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      setError('Failed to update profile: ' + error.message);
      showNotification('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const updateProfileInFirestore = async () => {
    try {
      console.log('💾 Updating profile in Firestore...');
      
      // Upload image if a new one was selected
      let imageUrl = profile.profileImage;
      if (imageFile) {
        // Delete old image if it exists
        if (originalProfile.profileImage) {
          await deleteOldImage(originalProfile.profileImage);
        }
        
        // Upload new image
        imageUrl = await uploadImage();
        console.log('🖼️ New image uploaded:', imageUrl);
      }
      
      // Update admin document in Firestore
      const adminRef = doc(db, 'admins', user.uid);
      const updatedProfile = {
        name: profile.name.trim(),
        email: profile.email.trim(),
        contact: profile.contact.trim(),
        username: profile.username.trim(),
        address: profile.address.trim(),
        profileImage: imageUrl,
        role: 'admin',
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(adminRef, updatedProfile);
      console.log('✅ Profile updated in Firestore');
      
      // Update local state
      const newProfile = { ...profile, profileImage: imageUrl };
      setProfile(newProfile);
      setOriginalProfile(newProfile);
      setImageFile(null);
      setImagePreview(imageUrl);
      
    } catch (error) {
      console.error('❌ Error updating profile in Firestore:', error);
      throw error;
    }
  };
  
  const handleReauthenticate = async (e) => {
    e.preventDefault();
    
    setPasswordError('');
    setSaving(true);
    
    try {
      console.log('🔐 Reauthenticating user...');
      
      // Create credential
      const credential = EmailAuthProvider.credential(user.email, password);
      
      // Reauthenticate user
      await reauthenticateWithCredential(user, credential);
      console.log('✅ Reauthentication successful');
      
      // Check if email is being changed
      if (user.email !== profile.email) {
        console.log('📧 Updating email from', user.email, 'to', profile.email);
        await updateEmail(user, profile.email);
      }
      
      // Check if password is being changed
      if (newPassword && validatePasswordChange()) {
        console.log('🔑 Updating password');
        await updatePassword(user, newPassword);
      }
      
      // Update Firestore
      await updateProfileInFirestore();
      
      // Reset password fields
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal and show success
      setShowReauthModal(false);
      setSuccess(true);
      showNotification('Profile updated successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Error during reauthentication:', error);
      
      let errorMessage = 'Authentication failed. Please check your current password.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use by another account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      
      setPasswordError(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  
  const removeImage = async () => {
    try {
      if (profile.profileImage) {
        await deleteOldImage(profile.profileImage);
      }
      
      setProfile({ ...profile, profileImage: '' });
      setImageFile(null);
      setImagePreview('');
      
      showNotification('Image removed', 'success');
    } catch (error) {
      console.error('❌ Error removing image:', error);
      setError('Failed to remove image');
    }
  };
  
  // Notification system
  const [notification, setNotification] = useState(null);
  
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };
  
  // Custom styles for the admin interface
  useEffect(() => {
    const styles = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
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
      
      .animate-fadein {
        animation: fadeIn 0.5s ease-out forwards;
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
      
      .btn-danger {
        background: #e53e3e;
        color: white;
        transition: all 0.2s ease;
      }
      
      .btn-danger:hover {
        background: #c53030;
        transform: translateY(-1px);
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  return (
    <div className="flex h-screen bg-pattern">
      <Sidebar currentPage="profile" />
      
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
              <h1 className="text-xl font-semibold text-gray-800">Admin Profile</h1>
            </div>
            
            <div className="flex items-center">
              <div className="hidden md:flex items-center mr-4 text-sm text-gray-500">
                <Clock size={16} className="mr-1" />
                Last login: {new Date().toLocaleDateString()}
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {imagePreview || profile.profileImage ? (
                  <img 
                    src={imagePreview || profile.profileImage} 
                    alt="Profile" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <UserCircle className="text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
          <div className="container px-4 sm:px-6 py-8 mx-auto">
            {/* Dashboard Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Account Settings</h2>
              <p className="text-gray-500">Manage your personal information and account security</p>
              
             
            </div>
            
            {loading ? (
              <div className="flex justify-center my-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadein">
                {/* Profile Summary Card */}
                <div className="card-glassmorphism rounded-lg overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Summary</h3>
                    
                    <div className="flex flex-col items-center">
                      <div className="relative mb-6">
                        {imagePreview || profile.profileImage ? (
                          <img
                            src={imagePreview || profile.profileImage}
                            alt="Profile"
                            className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-md"
                          />
                        ) : (
                          <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-md">
                            <UserCircle size={64} className="text-gray-400" />
                          </div>
                        )}
                        
                        <div className="absolute bottom-0 right-0 flex gap-1">
                          <label htmlFor="profile-image" className="bg-gray-800 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-gray-700 transition-all">
                            <Camera size={16} />
                            <input
                              type="file"
                              id="profile-image"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageChange}
                            />
                          </label>
                          
                          {(imagePreview || profile.profileImage) && (
                            <button
                              onClick={removeImage}
                              className="bg-red-600 text-white p-2 rounded-full shadow-md hover:bg-red-700 transition-all"
                              title="Remove image"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Upload Progress */}
                      {uploading && (
                        <div className="w-full mb-4">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 text-center mt-1">
                            Uploading... {Math.round(uploadProgress)}%
                          </p>
                        </div>
                      )}
                      
                      <h4 className="text-xl font-semibold text-gray-800">{profile.name || 'Admin User'}</h4>
                      <p className="text-gray-500 mb-4">@{profile.username || 'admin'}</p>
                      
                      <div className="w-full space-y-3 mt-2">
                        <div className="flex items-center text-gray-600">
                          <Mail size={16} className="mr-2" />
                          <span className="text-sm">{profile.email}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Phone size={16} className="mr-2" />
                          <span className="text-sm">{profile.contact || 'Not specified'}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <MapPin size={16} className="mr-2" />
                          <span className="text-sm">{profile.address || 'Not specified'}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600">
                          <Shield size={16} className="mr-2" />
                          <span className="text-sm">Administrator</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Edit Profile Card */}
                <div className="card-glassmorphism rounded-lg overflow-hidden xl:col-span-2">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Profile</h3>
                    
                    {error && (
                      <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <div className="flex items-center">
                          <AlertCircle size={16} className="text-red-400 mr-2" />
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      </div>
                    )}
                    
                    {success && (
                      <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
                        <div className="flex items-center">
                          <Check size={16} className="text-green-400 mr-2" />
                          <p className="text-sm text-green-600">Profile updated successfully</p>
                        </div>
                      </div>
                    )}
                    
                    <form onSubmit={handleSaveProfile}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User size={16} className="text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="name"
                              name="name"
                              value={profile.name}
                              onChange={handleInputChange}
                              className="input-field pl-10 pr-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                              placeholder="John Doe"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail size={16} className="text-gray-400" />
                            </div>
                            <input
                              type="email"
                              id="email"
                              name="email"
                              value={profile.email}
                              onChange={handleInputChange}
                              className="input-field pl-10 pr-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                              placeholder="admin@example.com"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                            Username *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <UserCircle size={16} className="text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="username"
                              name="username"
                              value={profile.username}
                              onChange={handleInputChange}
                              className="input-field pl-10 pr-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                              placeholder="admin_user"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Number
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone size={16} className="text-gray-400" />
                            </div>
                            <input
                              type="text"
                              id="contact"
                              name="contact"
                              value={profile.contact}
                              onChange={handleInputChange}
                              className="input-field pl-10 pr-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                              placeholder="+1 (555) 000-0000"
                            />
                          </div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          <div className="relative">
                            <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                              <MapPin size={16} className="text-gray-400" />
                            </div>
                            <textarea
                              id="address"
                              name="address"
                              rows="3"
                              value={profile.address}
                              onChange={handleInputChange}
                              className="input-field pl-10 pr-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                              placeholder="Enter your address"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-6 mb-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-4">Change Password</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                              New Password
                            </label>
                            <input
                              type="password"
                              id="newPassword"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="input-field px-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                              placeholder="Leave blank to keep current"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              id="confirmPassword"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="input-field px-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                              placeholder="Leave blank to keep current"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="btn-primary py-2 px-6 rounded-md shadow-sm focus:outline-none flex items-center"
                          disabled={saving || uploading}
                        >
                          {saving ? (
                            <div className="flex items-center">
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              Saving...
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Save size={16} className="mr-2" />
                              Save Changes
                            </div>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Reauthentication Modal */}
      {showReauthModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 text-center">
            <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm transition-opacity" 
                 onClick={() => setShowReauthModal(false)}></div>
            
            <div className="card-glassmorphism rounded-lg overflow-hidden shadow-xl transform transition-all max-w-lg w-full p-6 z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Authentication Required</h3>
                <button onClick={() => setShowReauthModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Please enter your current password to confirm these changes
              </p>
              
              {passwordError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3 rounded">
                  <div className="flex items-center">
                    <AlertCircle size={16} className="text-red-400 mr-2" />
                    <p className="text-sm text-red-600">{passwordError}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleReauthenticate}>
                <div className="mb-6">
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field px-3 py-2 block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReauthModal(false);
                      setPassword('');
                      setPasswordError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary py-2 px-4 rounded-md shadow-sm focus:outline-none flex items-center"
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Authenticating...
                      </div>
                    ) : (
                      'Authenticate'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg z-50 ${
          notification.type === 'success'
            ? 'bg-green-50 border-l-4 border-green-500 text-green-700'
            : notification.type === 'error'
            ? 'bg-red-50 border-l-4 border-red-500 text-red-700'
            : 'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' && (
              <Check size={20} className="mr-2 text-green-500" />
            )}
            {notification.type === 'error' && (
              <AlertCircle size={20} className="mr-2 text-red-500" />
            )}
            <p>{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;