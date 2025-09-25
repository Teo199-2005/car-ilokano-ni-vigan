import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from './Notification';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Sidebar from './layout/Sidebar';
import {
  Users,
  Plus,
  Search,
  Filter,
  Archive,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Shield,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  RotateCcw,
  X,
  Save,
  Check,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  FileCheck
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    businessName: '',
    name: '',
    email: '',
    contact: '',
    address: '',
    role: 'owner',
    password: '',
    confirmPassword: '',
    businessPermit: null,
    businessRegistration: null,
    adminProfile: null,
    hasPermit: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);

  const navigate = useNavigate();
  const db = getFirestore();
  
  const showNotification = (type, message) => {
    setNotification({ type, message });
  };
  
  const showConfirm = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };
  const auth = getAuth();
  const storage = getStorage();

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const hasMinLength = password.length >= 8;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasMinLength && hasSpecialChar;
  };

  const validateForm = async () => {
    const errors = {};

    // Required fields
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.contact.trim()) errors.contact = 'Contact is required';
    if (!formData.password.trim()) errors.password = 'Password is required';

    // Email validation
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation
    if (formData.password && !validatePassword(formData.password)) {
      errors.password = 'Password must be 8+ characters with at least one special character';
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) errors.confirmPassword = 'Confirm password is required';
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Check unique email
    if (formData.email && validateEmail(formData.email)) {
      const existingUser = users.find(user => user.email === formData.email);
      if (existingUser) {
        errors.email = 'Email already exists';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Auto-update user status based on rules
  const autoUpdateUserStatus = async (user) => {
    const targetCollection = user.source || (user.role === 'admin' ? 'admins' : 'users');
    let needsUpdate = false;
    const updates = {};

    // Auto-approve and verify admins
    if (user.role === 'admin' && (user.status !== 'approved' || !user.isVerified)) {
      updates.status = 'approved';
      updates.isVerified = true;
      updates.approvedAt = Timestamp.now();
      needsUpdate = true;
    }
    
    // Auto-verify owners: Approved + Has Permit = Verified
    if (user.role === 'owner' && user.status === 'approved') {
      const hasPermits = Boolean(user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url);
      const hasPermitFlag = user.hasPermit !== false; // Default to true if undefined
      const shouldBeVerified = hasPermits && hasPermitFlag;
      
      if (user.isVerified !== shouldBeVerified) {
        updates.isVerified = shouldBeVerified;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.updatedAt = Timestamp.now();
      await updateDoc(doc(db, targetCollection, user.id), updates);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch from users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📄 User ${doc.id} data:`, data);
        return {
          id: doc.id,
          ...data,
          source: 'users'
        };
      });

      // Fetch from admins collection
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const adminsData = adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'admin',
        source: 'admins'
      }));

      const allUsers = [...usersData, ...adminsData];
      
      // Auto-update user verification status
      for (const user of allUsers) {
        await autoUpdateUserStatus(user);
      }
      
      // Refetch after updates
      const updatedUsersSnapshot = await getDocs(collection(db, 'users'));
      const updatedUsersData = updatedUsersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'users'
      }));

      const updatedAdminsSnapshot = await getDocs(collection(db, 'admins'));
      const updatedAdminsData = updatedAdminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'admin',
        source: 'admins'
      }));

      const allUpdatedUsers = [...updatedUsersData, ...updatedAdminsData];
      
      // Remove duplicates based on email and DELETE old duplicates from database
      const uniqueUsers = [];
      const emailGroups = {};
      
      // Group users by email
      allUpdatedUsers.forEach(user => {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = [];
        }
        emailGroups[user.email].push(user);
      });
      
      // Process each email group
      for (const [email, users] of Object.entries(emailGroups)) {
        if (users.length > 1) {
          console.log(`🔍 Found ${users.length} duplicates for email: ${email}`);
          
          // Sort by updatedAt to find the most recent
          users.sort((a, b) => {
            const dateA = a.updatedAt?.toDate?.() || new Date(0);
            const dateB = b.updatedAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
          
          // Keep the most recent one
          const keepUser = users[0];
          const deleteUsers = users.slice(1);
          
          console.log(`✅ Keeping user ${keepUser.id} (most recent)`);
          uniqueUsers.push(keepUser);
          
          // Delete the older duplicates from database
          deleteUsers.forEach(async (userToDelete) => {
            try {
              const targetCollection = userToDelete.source || (userToDelete.role === 'admin' ? 'admins' : 'users');
              await deleteDoc(doc(db, targetCollection, userToDelete.id));
              console.log(`🗑️ Deleted duplicate user ${userToDelete.id} from ${targetCollection}`);
            } catch (error) {
              console.warn(`⚠️ Could not delete duplicate user ${userToDelete.id}:`, error.message);
            }
          });
        } else {
          // No duplicates, add the single user
          uniqueUsers.push(users[0]);
        }
      }
      // Final filter to exclude any users that are in archived collection
      const archivedSnapshot = await getDocs(collection(db, 'archived_users'));
      const archivedEmails = new Set(archivedSnapshot.docs.map(doc => doc.data().email));
      
      const finalUsers = uniqueUsers.filter(user => !archivedEmails.has(user.email));
      
      console.log(`📋 Unique users before final filter: ${uniqueUsers.length}`);
      console.log(`📂 Archived emails to exclude: ${Array.from(archivedEmails).join(', ')}`);
      console.log(`📊 Final users after excluding archived: ${finalUsers.length}`);
      
      setUsers(finalUsers);
      console.log('📋 Fetched users (final):', finalUsers.map(u => ({ id: u.id, name: u.name, email: u.email, businessName: u.businessName })));
      
      // Check for duplicate emails
      const emailCounts = {};
      uniqueUsers.forEach(user => {
        if (user.email) {
          emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
        }
      });
      
      const duplicateEmails = Object.entries(emailCounts).filter(([email, count]) => count > 1);
      if (duplicateEmails.length > 0) {
        console.warn('⚠️ Duplicate emails found:', duplicateEmails);
        duplicateEmails.forEach(([email, count]) => {
          const duplicates = uniqueUsers.filter(u => u.email === email);
          console.warn(`📧 Email ${email} has ${count} users:`, duplicates.map(u => ({ id: u.id, name: u.name, businessName: u.businessName })));
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch archived users
  const fetchArchivedUsers = async () => {
    try {
      console.log('📂 Fetching archived users...');
      const archivedSnapshot = await getDocs(collection(db, 'archived_users'));
      const archivedData = archivedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Remove duplicates from archived users based on email
      const uniqueArchivedUsers = [];
      const seenEmails = new Set();
      
      for (const user of archivedData) {
        if (!seenEmails.has(user.email)) {
          seenEmails.add(user.email);
          uniqueArchivedUsers.push(user);
        } else {
          // Delete duplicate from database
          try {
            await deleteDoc(doc(db, 'archived_users', user.id));
            console.log(`🗑️ Deleted duplicate archived user: ${user.id}`);
          } catch (error) {
            console.warn(`⚠️ Could not delete duplicate archived user ${user.id}:`, error.message);
          }
        }
      }
      
      console.log('📄 Fetched archived users:', uniqueArchivedUsers.length, 'users');
      console.log('📅 Archived users data:', uniqueArchivedUsers.map(u => ({ id: u.id, name: u.name, email: u.email })));
      setArchivedUsers(uniqueArchivedUsers);
    } catch (error) {
      console.error('❌ Error fetching archived users:', error);
    }
  };

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      let businessPermitURL = '';
      let businessRegistrationURL = '';
      let adminProfileURL = '';

      if (formData.role === 'owner') {
        // Upload business permit if provided
        if (formData.businessPermit) {
          const permitRef = ref(storage, `business-permits/${userCredential.user.uid}`);
          await uploadBytes(permitRef, formData.businessPermit);
          businessPermitURL = await getDownloadURL(permitRef);
        }

        // Upload business registration if provided
        if (formData.businessRegistration) {
          const registrationRef = ref(storage, `business-registrations/${userCredential.user.uid}`);
          await uploadBytes(registrationRef, formData.businessRegistration);
          businessRegistrationURL = await getDownloadURL(registrationRef);
        }
      } else if (formData.role === 'admin') {
        // Upload admin profile if provided
        if (formData.adminProfile) {
          const profileRef = ref(storage, `admin-profiles/${userCredential.user.uid}`);
          await uploadBytes(profileRef, formData.adminProfile);
          adminProfileURL = await getDownloadURL(profileRef);
        }
      }

      // Determine status and verification based on role and permits
      // Since admin is creating the user, default to approved status
      let status = 'approved';
      let isVerified = false;
      
      if (formData.role === 'admin') {
        status = 'approved';
        isVerified = true;
      } else if (formData.role === 'owner') {
        status = 'approved'; // Admin-created owners are approved by default
        isVerified = businessPermitURL || businessRegistrationURL; // Verified if they have documents
      }

      // Create user document
      const userData = {
        uid: userCredential.user.uid,
        businessName: formData.businessName || '',
        name: formData.name,
        email: formData.email,
        contact: formData.contact,
        address: formData.address || '',
        role: formData.role,
        businessPermitURL,
        businessRegistrationURL,
        adminProfileURL,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status,
        isVerified,
        isActive: false // New users start as inactive by default
      };

      const targetCollection = formData.role === 'admin' ? 'admins' : 'users';
      await addDoc(collection(db, targetCollection), userData);

      // Reset form and close modal
      setFormData({
        businessName: '',
        name: '',
        email: '',
        contact: '',
        address: '',
        role: 'owner',
        password: '',
        confirmPassword: '',
        businessPermit: null,
        businessRegistration: null,
        adminProfile: null,
        hasPermit: true
      });
      setFormErrors({});
      setShowAddModal(false);
      
      // Refresh users list
      fetchUsers();
      showNotification('success', `User ${formData.name} added successfully!`);
    } catch (error) {
      console.error('Error adding user:', error);
      setFormErrors({ submit: error.message });
    }
  };

  // Archive user
  const handleArchiveUser = async (user) => {
    if (!window.confirm(`Are you sure you want to archive ${user.name}?`)) return;

    try {
      // Add to archived_users collection
      await addDoc(collection(db, 'archived_users'), {
        ...user,
        archivedAt: Timestamp.now(),
        archivedBy: 'admin'
      });

      // Remove from original collection
      const targetCollection = user.source || (user.role === 'admin' ? 'admins' : 'users');
      await deleteDoc(doc(db, targetCollection, user.id));

      // Refresh lists
      fetchUsers();
      fetchArchivedUsers();
    } catch (error) {
      console.error('Error archiving user:', error);
    }
  };

  // Restore user
  const handleRestoreUser = async (user) => {
    try {
      console.log('🔄 Starting restore process for user:', user);
      console.log('📋 User details:', {
        id: user.id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role
      });
      
      // Add back to original collection
      const targetCollection = user.role === 'admin' ? 'admins' : 'users';
      const { archivedAt, archivedBy, id, ...userData } = user;
      
      console.log('📁 Target collection:', targetCollection);
      console.log('📄 Clean user data to restore:', userData);
      
      // Always use addDoc to create a new document
      const docRef = await addDoc(collection(db, targetCollection), {
        ...userData,
        isActive: true, // Ensure user is active when restored
        updatedAt: Timestamp.now()
      });
      console.log('✅ User restored with new ID:', docRef.id);

      // Remove ALL archived documents with the same email
      console.log('🗑️ Removing all archived documents with email:', user.email);
      const archivedQuery = query(
        collection(db, 'archived_users'),
        where('email', '==', user.email)
      );
      const archivedQuerySnapshot = await getDocs(archivedQuery);
      
      console.log(`🔍 Found ${archivedQuerySnapshot.docs.length} archived documents to delete`);
      
      const deletePromises = archivedQuerySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Successfully removed all archived documents with this email');

      // Update local state immediately - remove from archived
      setArchivedUsers(prev => {
        console.log('🗑️ Removing user from archived list:', user.id);
        const filtered = prev.filter(u => u.id !== user.id);
        console.log('📋 Archived users after removal:', filtered.length);
        return filtered;
      });
      
      // Add to active users list immediately
      const restoredUser = {
        id: docRef.id,
        ...userData,
        isActive: true,
        updatedAt: Timestamp.now(),
        source: targetCollection
      };
      
      setUsers(prev => {
        // Remove any existing duplicates with same email first
        const filtered = prev.filter(u => u.email !== user.email);
        // Add the restored user
        return [...filtered, restoredUser];
      });
      
      // Refresh lists immediately after restore
      console.log('🔄 Refreshing user lists after restore...');
      await fetchUsers();
      await fetchArchivedUsers();
      
      showNotification('success', `User ${user.name || user.email} restored successfully!`);
      console.log('✅ Restore process completed successfully');
    } catch (error) {
      console.error('❌ Error restoring user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      showNotification('error', `Failed to restore user: ${error.message}`);
    }
  };

  // View user details
  const handleViewUser = (user) => {
    setCurrentUser(user);
    setShowViewModal(true);
  };

  // Edit user
  const handleEditUser = (user) => {
    console.log('🔧 Editing user:', user);
    setCurrentUser(user);
    const hasPermitDocs = Boolean(user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url);
    setFormData({
      businessName: user.businessName || '',
      name: user.name || '',
      email: user.email || '',
      contact: user.contact || '',
      address: user.address || '',
      role: user.role || 'owner',
      password: '', // Don't pre-fill password for security
      hasPermit: user.hasPermit !== undefined ? user.hasPermit : hasPermitDocs
    });
    setShowEditModal(true);
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    console.log('🔄 Updating user with formData:', formData);
    console.log('👤 Current user:', currentUser);
    console.log('🏢 Business name being saved:', formData.businessName);
    
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.contact.trim()) errors.contact = 'Contact is required';
    
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Check unique email (exclude current user)
    if (formData.email && validateEmail(formData.email)) {
      const existingUser = users.find(user => user.email === formData.email && user.id !== currentUser.id);
      if (existingUser) {
        errors.email = 'Email already exists';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const targetCollection = currentUser.source || (currentUser.role === 'admin' ? 'admins' : 'users');
      
      let businessPermitURL = currentUser.businessPermitURL || '';
      let businessRegistrationURL = currentUser.businessRegistrationURL || '';

      // Upload new business permit if provided
      if (formData.businessPermit) {
        const permitRef = ref(storage, `business-permits/${currentUser.uid || currentUser.id}`);
        await uploadBytes(permitRef, formData.businessPermit);
        businessPermitURL = await getDownloadURL(permitRef);
      }

      // Upload new business registration if provided
      if (formData.businessRegistration) {
        const registrationRef = ref(storage, `business-registrations/${currentUser.uid || currentUser.id}`);
        await uploadBytes(registrationRef, formData.businessRegistration);
        businessRegistrationURL = await getDownloadURL(registrationRef);
      }
      
      // Auto-verify logic: Approved + Has Permit = Verified
      const hasPermits = Boolean(businessPermitURL || businessRegistrationURL || currentUser.businessDocuments?.permit?.url || currentUser.businessDocuments?.registration?.url);
      const isApproved = currentUser.status === 'approved';
      const shouldBeVerified = isApproved && hasPermits && formData.hasPermit !== false;
      
      const updateData = {
        businessName: formData.businessName || '',
        name: formData.name,
        email: formData.email,
        contact: formData.contact,
        address: formData.address,
        businessPermitURL,
        businessRegistrationURL,
        hasPermit: formData.hasPermit,
        isVerified: shouldBeVerified,
        updatedAt: Timestamp.now()
      };

      console.log('💾 Update data:', updateData);
      console.log('📁 Target collection:', targetCollection);
      console.log('🎯 Document ID:', currentUser.id);

      const docRef = doc(db, targetCollection, currentUser.id);
      console.log('📝 Writing to document:', docRef.path);
      console.log('💾 Data to write:', updateData);
      
      try {
        // Try updateDoc first, then setDoc as fallback
        try {
          await updateDoc(docRef, updateData);
          console.log('✅ updateDoc completed successfully');
        } catch (updateError) {
          console.log('⚠️ updateDoc failed, trying setDoc with merge:', updateError.message);
          await setDoc(docRef, updateData, { merge: true });
          console.log('✅ setDoc with merge completed successfully');
        }
        
        // Immediately verify the write
        const immediateVerify = await getDoc(docRef);
        if (immediateVerify.exists()) {
          console.log('🔍 Immediate verification - data exists:', immediateVerify.data());
        } else {
          console.error('❌ Immediate verification - document does not exist!');
        }
        
        console.log('✅ User updated successfully');
        showNotification('success', `User ${formData.name} updated successfully!`);
      } catch (writeError) {
        console.error('❌ Error writing to Firestore:', writeError);
        throw writeError;
      }
      
      // Verify the data was actually saved
      const verifyDoc = await getDoc(doc(db, targetCollection, currentUser.id));
      if (verifyDoc.exists()) {
        console.log('🔍 Verified saved data:', verifyDoc.data());
        console.log('🏢 Verified business name:', verifyDoc.data().businessName);
      }
      
      // Update local state directly with the new data
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === currentUser.id 
            ? { ...user, ...updateData }
            : user
        )
      );
      
      console.log('🔄 Updated local state directly');
      
      // Also refresh from database to ensure data persistence
      await fetchUsers();
      
      // Refresh current user data to reflect changes in edit modal
      const refreshedDoc = await getDoc(doc(db, targetCollection, currentUser.id));
      if (refreshedDoc.exists()) {
        const refreshedUser = { id: refreshedDoc.id, ...refreshedDoc.data(), source: targetCollection };
        setCurrentUser(refreshedUser);
        console.log('🔄 Refreshed current user data:', refreshedUser);
      }
      
      setShowEditModal(false);
      setCurrentUser(null);
      setFormData({
        businessName: '',
        name: '',
        email: '',
        contact: '',
        address: '',
        role: 'owner',
        password: '',
        hasPermit: true
      });
      setFormErrors({});
    } catch (error) {
      console.error('Error updating user:', error);
      setFormErrors({ submit: error.message });
    }
  };

  // Delete user confirmation
  const handleDeleteUser = (user) => {
    setCurrentUser(user);
    setShowDeleteModal(true);
  };

  // Confirm delete user (archive instead)
  const confirmDeleteUser = async () => {
    try {
      console.log('🗂️ Archiving user:', currentUser);
      
      // Get ALL users from database with same email (including from both collections)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      
      const allDbUsers = [
        ...usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'users' })),
        ...adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'admins' }))
      ];
      
      const usersToDelete = allDbUsers.filter(u => u.email === currentUser.email);
      console.log('🗑️ Found', usersToDelete.length, 'users in database with email:', currentUser.email);
      
      // Add ONE copy to archived_users collection
      await addDoc(collection(db, 'archived_users'), {
        ...currentUser,
        archivedAt: Timestamp.now(),
        archivedBy: 'admin'
      });
      console.log('✅ User added to archived collection');

      // Delete ALL duplicates from database
      for (const userToDelete of usersToDelete) {
        const targetCollection = userToDelete.source;
        try {
          await deleteDoc(doc(db, targetCollection, userToDelete.id));
          console.log('✅ Deleted user from database:', userToDelete.id, 'from', targetCollection);
        } catch (deleteError) {
          console.warn('⚠️ Could not delete user:', userToDelete.id, deleteError.message);
        }
      }
      
      // Update local state immediately - remove ALL users with same email
      setUsers(prev => {
        const filtered = prev.filter(u => u.email !== currentUser.email);
        console.log('📋 Active users after removal:', filtered.length);
        console.log('🧹 Removed all users with email:', currentUser.email);
        return filtered;
      });
      
      // Add to archived users local state
      setArchivedUsers(prev => [
        ...prev,
        {
          ...currentUser,
          archivedAt: Timestamp.now(),
          archivedBy: 'admin'
        }
      ]);
      
      setShowDeleteModal(false);
      setCurrentUser(null);
      
      showNotification('success', `User ${currentUser.name} archived successfully!`);
      
    } catch (error) {
      console.error('Error archiving user:', error);
      showNotification('error', 'Failed to archive user. Please try again.');
    }
  };

  // Permanently delete user
  const handlePermanentDelete = async (user) => {
    console.log('🗑️ Attempting to delete user:', user);
    console.log('📄 User ID:', user.id);
    
    const performDelete = async () => {
      try {
        console.log(`🔍 Starting permanent deletion for email: ${user.email}`);
        
        // Delete from ALL collections where this user might exist
        const collections = ['archived_users', 'users', 'admins'];
        let totalDeleted = 0;
        
        for (const collectionName of collections) {
          try {
            const userQuery = query(
              collection(db, collectionName),
              where('email', '==', user.email)
            );
            const querySnapshot = await getDocs(userQuery);
            
            console.log(`📂 Found ${querySnapshot.docs.length} documents in ${collectionName}`);
            
            if (querySnapshot.docs.length > 0) {
              const deletePromises = querySnapshot.docs.map(doc => {
                console.log(`🗑️ Deleting ${doc.id} from ${collectionName}`);
                return deleteDoc(doc.ref);
              });
              await Promise.all(deletePromises);
              totalDeleted += querySnapshot.docs.length;
            }
          } catch (collectionError) {
            console.warn(`⚠️ Error deleting from ${collectionName}:`, collectionError.message);
          }
        }
        
        console.log(`✅ Total documents deleted: ${totalDeleted}`);
        showNotification('success', `User ${user.name || user.email} permanently deleted from all collections!`);
        
        // Update local states immediately
        setArchivedUsers(prev => prev.filter(u => u.email !== user.email));
        setUsers(prev => prev.filter(u => u.email !== user.email));
        
        // Refresh from database
        await fetchArchivedUsers();
        await fetchUsers();
      } catch (error) {
        console.error('❌ Error permanently deleting user:', error);
        console.error('Error details:', error.message);
        showNotification('error', `Failed to delete user: ${error.message}`);
      }
    };
    
    showConfirm(
      `Are you sure you want to permanently delete ${user.name || user.email}? This action cannot be undone.`,
      performDelete
    );
  };

  // Approve user
  const handleApproveUser = async (user) => {
    try {
      console.log('🔄 Approving user:', user);
      const targetCollection = user.source || (user.role === 'admin' ? 'admins' : 'users');
      console.log('📁 Target collection:', targetCollection);
      
      // Auto-verify if user has permits or is admin
      const shouldAutoVerify = Boolean(user.role === 'admin' || user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url);
      
      const updateData = {
        status: 'approved',
        isVerified: shouldAutoVerify,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      console.log('💾 Update data:', updateData);
      
      const docRef = doc(db, targetCollection, user.id);
      await updateDoc(docRef, updateData);
      
      console.log('✅ User approved in database');
      
      // Update local state immediately
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id 
            ? { ...u, ...updateData }
            : u
        )
      );
      
      showNotification('success', `User ${user.name || user.fullName} approved successfully!`);
    } catch (error) {
      console.error('❌ Error approving user:', error);
      console.error('Error details:', error.message);
      showNotification('error', `Failed to approve user: ${error.message}`);
    }
  };

  // Reject user
  const handleRejectUser = async (user) => {
    try {
      console.log('🔄 Rejecting user:', user);
      const targetCollection = user.source || (user.role === 'admin' ? 'admins' : 'users');
      console.log('📁 Target collection:', targetCollection);
      
      const updateData = {
        status: 'rejected',
        isVerified: false,
        rejectedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = doc(db, targetCollection, user.id);
      await updateDoc(docRef, updateData);
      
      console.log('✅ User rejected in database');
      
      // Update local state immediately
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id 
            ? { ...u, ...updateData }
            : u
        )
      );
      
      showNotification('success', `User ${user.name || user.fullName} rejected successfully!`);
    } catch (error) {
      console.error('❌ Error rejecting user:', error);
      console.error('Error details:', error.message);
      showNotification('error', `Failed to reject user: ${error.message}`);
    }
  };

  // Toggle user active status
  const handleToggleActiveStatus = async (user) => {
    try {
      const targetCollection = user.source || (user.role === 'admin' ? 'admins' : 'users');
      const newActiveStatus = !user.isActive;
      
      // Auto-verify if user becomes active, is approved, and has permits
      const hasPermits = user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url;
      const shouldAutoVerify = newActiveStatus && user.status === 'approved' && hasPermits;
      
      const updateData = {
        isActive: newActiveStatus,
        updatedAt: Timestamp.now()
      };
      
      if (shouldAutoVerify) {
        updateData.isVerified = true;
      }
      
      await updateDoc(doc(db, targetCollection, user.id), updateData);
      
      // Update local state immediately
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id ? { ...u, ...updateData } : u
        )
      );
      
      showNotification('success', `User ${user.name} ${newActiveStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      showNotification('error', 'Failed to update user status');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      businessName: '',
      name: '',
      email: '',
      contact: '',
      address: '',
      role: 'owner',
      password: '',
      confirmPassword: '',
      businessPermit: null,
      businessRegistration: null,
      adminProfile: null
    });
    setFormErrors({});
    setCurrentUser(null);
  };

  // Filter users - only show owners and admins
  const filteredUsers = users.filter(user => {
    // Only show owners and admins, exclude clients
    const isOwnerOrAdmin = user.role === 'owner' || user.role === 'admin';
    
    const matchesFilter = filter === 'all' || 
      (filter === 'owners' && user.role === 'owner') ||
      (filter === 'admins' && user.role === 'admin');
    
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return isOwnerOrAdmin && matchesFilter && matchesSearch;
  }).sort((a, b) => {
    // Sort by createdAt date, newest first
    const dateA = a.createdAt?.toDate?.() || new Date(0);
    const dateB = b.createdAt?.toDate?.() || new Date(0);
    return dateB - dateA;
  });

  // Manual cleanup function for remaining duplicates
  const cleanupDuplicates = async () => {
    try {
      console.log('🧹 Starting manual cleanup of duplicates...');
      
      // Get archived users first to avoid deleting them
      const archivedSnapshot = await getDocs(collection(db, 'archived_users'));
      const archivedEmails = new Set(archivedSnapshot.docs.map(doc => doc.data().email));
      
      // Get all users from both collections
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      
      const allUsers = [
        ...usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'users' })),
        ...adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'admins' }))
      ];
      
      // Remove users that are already archived
      const activeUsers = allUsers.filter(user => !archivedEmails.has(user.email));
      
      console.log(`📋 Total users found: ${allUsers.length}`);
      console.log(`📂 Archived emails: ${Array.from(archivedEmails).join(', ')}`);
      console.log(`📊 Active users after filtering: ${activeUsers.length}`);
      
      // Also delete any users from active collections that are already archived
      const usersToDeleteFromActive = allUsers.filter(user => archivedEmails.has(user.email));
      if (usersToDeleteFromActive.length > 0) {
        console.log(`🗑️ Found ${usersToDeleteFromActive.length} users in active collections that should be archived`);
        for (const user of usersToDeleteFromActive) {
          try {
            await deleteDoc(doc(db, user.source, user.id));
            console.log(`🗑️ Deleted archived user from active collection: ${user.id} (${user.email})`);
          } catch (error) {
            console.warn(`⚠️ Could not delete archived user ${user.id}:`, error.message);
          }
        }
      }
      
      // Group by email to find duplicates
      const emailGroups = {};
      activeUsers.forEach(user => {
        if (user.email) {
          if (!emailGroups[user.email]) {
            emailGroups[user.email] = [];
          }
          emailGroups[user.email].push(user);
        }
      });
      
      // Delete duplicates only for non-archived users
      for (const [email, users] of Object.entries(emailGroups)) {
        if (users.length > 1) {
          console.log(`🔍 Found ${users.length} duplicates for ${email}`);
          
          // Sort by updatedAt, keep the most recent
          users.sort((a, b) => {
            const dateA = a.updatedAt?.toDate?.() || new Date(0);
            const dateB = b.updatedAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
          
          // Delete all except the first (most recent)
          const toDelete = users.slice(1);
          const deletePromises = toDelete.map(async (user) => {
            try {
              await deleteDoc(doc(db, user.source, user.id));
              console.log(`🗑️ Deleted duplicate: ${user.id} from ${user.source}`);
            } catch (error) {
              console.warn(`⚠️ Could not delete ${user.id}:`, error.message);
            }
          });
          
          // Wait for all deletions to complete
          await Promise.all(deletePromises);
        }
      }
      
      console.log('✅ Manual cleanup completed');
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      // Run cleanup first, then fetch clean data
      await cleanupDuplicates();
      await fetchUsers();
      await fetchArchivedUsers();
    };
    
    initializeData();
  }, []);

  // Sync form data when currentUser changes (for edit modal)
  useEffect(() => {
    if (currentUser && showEditModal) {
      console.log('🔄 Syncing form data with current user:', currentUser);
      const hasPermitDocs = Boolean(currentUser.businessPermitURL || currentUser.businessRegistrationURL || currentUser.businessDocuments?.permit?.url || currentUser.businessDocuments?.registration?.url);
      setFormData({
        businessName: currentUser.businessName || '',
        name: currentUser.name || currentUser.fullName || '',
        email: currentUser.email || '',
        contact: currentUser.contact || currentUser.contactNumber || '',
        address: currentUser.address || '',
        role: currentUser.role || 'owner',
        password: '',
        hasPermit: currentUser.hasPermit !== undefined ? currentUser.hasPermit : hasPermitDocs
      });
    }
  }, [currentUser, showEditModal]);

  return (
    <div className="flex h-screen bg-gray-50">
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
      
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <Sidebar currentPage="users" />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600">Manage owners and administrators</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Archive size={16} className="mr-2" />
                  {showArchived ? 'View Active' : 'View Archived'}
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={16} className="mr-2" />
                  Add User
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {!showArchived ? (
            <>
              {/* Filters and Search */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                  {/* Radio Filters */}
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="filter"
                        value="all"
                        checked={filter === 'all'}
                        onChange={(e) => setFilter(e.target.value)}
                        className="mr-2"
                      />
                      All Users ({users.filter(u => u.role === 'owner' || u.role === 'admin').length})
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="filter"
                        value="owners"
                        checked={filter === 'owners'}
                        onChange={(e) => setFilter(e.target.value)}
                        className="mr-2"
                      />
                      Owners Only ({users.filter(u => u.role === 'owner').length})
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="filter"
                        value="admins"
                        checked={filter === 'admins'}
                        onChange={(e) => setFilter(e.target.value)}
                        className="mr-2"
                      />
                      Admins Only ({users.filter(u => u.role === 'admin').length})
                    </label>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {filter === 'all' ? (
                <>
                  {/* Owners Table */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Vehicle Owners</h3>
                    </div>
                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User Info
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Business/Role
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contact
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.filter(user => user.role === 'owner').map((user, index) => {
                              const userStatus = user.status || 'pending';
                              const isVerified = user.isVerified || false;
                              const isPending = userStatus === 'pending';
                              
                              return (
                                <tr key={`${user.source || 'users'}-${user.id}-${user.email}-${index}`} className="hover:bg-gray-50">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center">
                                      <div className="relative h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {user.profileImageUrl || user.profileImage ? (
                                          <img 
                                            src={user.profileImageUrl || user.profileImage} 
                                            alt={user.name || user.fullName || 'User'} 
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-sm font-medium text-gray-600">
                                            {(user.name || user.fullName)?.charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                        {isPending && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                            <Clock size={10} className="text-white" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="ml-3 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{user.name || user.fullName || 'N/A'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-1">
                                      {user.businessName && (
                                        <div className="text-xs text-gray-600 truncate">
                                          {user.businessName}
                                        </div>
                                      )}
                                      <div className="w-2 h-2 rounded-full inline-block mr-1 bg-blue-500"></div>
                                      <span className="text-xs text-gray-700">Owner</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                          userStatus === 'approved' ? 'bg-green-500' :
                                          userStatus === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`}></div>
                                        <span className="text-xs text-gray-700">
                                          {userStatus === 'pending' ? 'Pending' : userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                          isVerified ? 'bg-blue-500' : 'bg-gray-400'
                                        }`}></div>
                                        <span className="text-xs text-gray-700">
                                          {isVerified ? 'Verified' : 'Unverified'}
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        {user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url ? (
                                          <FileCheck size={12} className="mr-2 text-green-500" />
                                        ) : (
                                          <FileText size={12} className="mr-2 text-gray-400" />
                                        )}
                                        <span className="text-xs text-gray-700">
                                          {user.hasPermit !== undefined ? (user.hasPermit ? 'Has Permit' : 'No Permit') : (user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url ? 'Has Permit' : 'No Permit')}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center text-sm text-gray-900">
                                        <Phone size={12} className="mr-2 text-gray-400" />
                                        <span>{user.contact || user.contactNumber || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Mail size={12} className="mr-2 text-gray-400" />
                                        <span className="truncate">{user.email}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-500">
                                    {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center justify-center space-x-1">
                                      <button 
                                        onClick={() => handleViewUser(user)}
                                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                        title="View Details"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleEditUser(user)}
                                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                        title="Edit User"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user)}
                                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Delete User"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Admins Table */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">System Administrators</h3>
                    </div>
                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User Info
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contact
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.filter(user => user.role === 'admin').map((user, index) => {
                              return (
                                <tr key={`${user.source || 'admins'}-${user.id}-${user.email}-${index}`} className="hover:bg-gray-50">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center">
                                      <div className="relative h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {user.profileImageUrl || user.profileImage || user.adminProfileURL ? (
                                          <img 
                                            src={user.profileImageUrl || user.profileImage || user.adminProfileURL} 
                                            alt={user.name || user.fullName || 'User'} 
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-sm font-medium text-gray-600">
                                            {(user.name || user.fullName)?.charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                      <div className="ml-3 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{user.name || user.fullName || 'N/A'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center text-sm text-gray-900">
                                        <Phone size={12} className="mr-2 text-gray-400" />
                                        <span>{user.contact || user.contactNumber || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <Mail size={12} className="mr-2 text-gray-400" />
                                        <span className="truncate">{user.email}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-500">
                                    {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center justify-center space-x-1">
                                      <button 
                                        onClick={() => handleViewUser(user)}
                                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                        title="View Details"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleEditUser(user)}
                                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                        title="Edit User"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user)}
                                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Delete User"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Single Table for Owners Only or Admins Only */
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User Info
                            </th>
                            {filter !== 'admins' && (
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Business/Role
                              </th>
                            )}
                            {filter !== 'admins' && (
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account Status
                              </th>
                            )}
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contact
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredUsers.map((user, index) => {
                            const userStatus = user.status || 'pending';
                            const isVerified = user.isVerified || false;
                            const isPending = userStatus === 'pending';
                            
                            return (
                              <tr key={`${user.source || 'users'}-${user.id}-${user.email}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                  <div className="flex items-center">
                                    <div className="relative h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                      {user.profileImageUrl || user.profileImage || user.adminProfileURL ? (
                                        <img 
                                          src={user.profileImageUrl || user.profileImage || user.adminProfileURL} 
                                          alt={user.name || user.fullName || 'User'} 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-sm font-medium text-gray-600">
                                          {(user.name || user.fullName)?.charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                      {isPending && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                          <Clock size={10} className="text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-3 min-w-0">
                                      <div className="text-sm font-medium text-gray-900 truncate">{user.name || user.fullName || 'N/A'}</div>
                                    </div>
                                  </div>
                                </td>
                                {filter !== 'admins' && (
                                  <td className="px-4 py-4">
                                    <div className="space-y-1">
                                      {user.businessName && (
                                        <div className="text-xs text-gray-600 truncate">
                                          {user.businessName}
                                        </div>
                                      )}
                                      <div className={`w-2 h-2 rounded-full inline-block mr-1 ${
                                        user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                                      }`}></div>
                                      <span className="text-xs text-gray-700">
                                        {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                                      </span>
                                    </div>
                                  </td>
                                )}
                                {filter !== 'admins' && (
                                  <td className="px-4 py-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                          userStatus === 'approved' ? 'bg-green-500' :
                                          userStatus === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`}></div>
                                        <span className="text-xs text-gray-700">
                                          {userStatus === 'pending' ? 'Pending' : userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                          isVerified ? 'bg-blue-500' : 'bg-gray-400'
                                        }`}></div>
                                        <span className="text-xs text-gray-700">
                                          {isVerified ? 'Verified' : 'Unverified'}
                                        </span>
                                      </div>
                                      {user.role === 'owner' && (
                                        <div className="flex items-center">
                                          {user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url ? (
                                            <FileCheck size={12} className="mr-2 text-green-500" />
                                          ) : (
                                            <FileText size={12} className="mr-2 text-gray-400" />
                                          )}
                                          <span className="text-xs text-gray-700">
                                            {user.hasPermit !== undefined ? (user.hasPermit ? 'Has Permit' : 'No Permit') : (user.businessPermitURL || user.businessRegistrationURL || user.businessDocuments?.permit?.url || user.businessDocuments?.registration?.url ? 'Has Permit' : 'No Permit')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )}
                                <td className="px-4 py-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center text-sm text-gray-900">
                                      <Phone size={12} className="mr-2 text-gray-400" />
                                      <span>{user.contact || user.contactNumber || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Mail size={12} className="mr-2 text-gray-400" />
                                      <span className="truncate">{user.email}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-500">
                                  {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button 
                                      onClick={() => handleViewUser(user)}
                                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                      title="View Details"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleEditUser(user)}
                                      className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                      title="Edit User"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(user)}
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                      title="Delete User"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Archived Users Section */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Archived Users</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Archived Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archivedUsers.filter((user, index, self) => 
                      index === self.findIndex(u => u.id === user.id && u.email === user.email)
                    ).map((user, index) => (
                      <tr key={`archived-${user.id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                              {user.profileImageUrl || user.profileImage || user.adminProfileURL ? (
                                <img 
                                  src={user.profileImageUrl || user.profileImage || user.adminProfileURL} 
                                  alt={user.name || user.fullName || 'User'} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-600">
                                  {(user.name || user.fullName)?.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-500">{user.name || user.fullName}</div>
                              <div className="text-sm text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.archivedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleRestoreUser(user)}
                              className="bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center"
                              title="Restore User"
                            >
                              <RotateCcw size={14} className="mr-1" />
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(user)}
                              className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center"
                              title="Delete Permanently"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
            
            <form onSubmit={handleAddUser} className="space-y-6">
              {/* First Row - Business Name and Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName || ''}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.name && <p className="text-red-600 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠</span>{formErrors.name}
                  </p>}
                </div>
              </div>

              {/* Second Row - Email and Password */}
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.email && <p className="text-red-600 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠</span>{formErrors.email}
                  </p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const businessName = formData.businessName || 'User';
                        const cleanName = businessName.replace(/[^a-zA-Z]/g, '').substring(0, 8);
                        const randomDigits = Math.floor(100 + Math.random() * 900);
                        const generatedPassword = `${cleanName}${randomDigits}!`;
                        setFormData({...formData, password: generatedPassword, confirmPassword: generatedPassword});
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Generate Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength="8"
                      pattern="^(?=.*[!@#$%^&*(),.?&quot;:{}|<>]).{8,}$"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      title="Password must be at least 8 characters with at least one special character"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-red-600 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠</span>{formErrors.password}
                  </p>}
                  <p className="text-xs text-gray-500 mt-1">8+ characters with at least one special character</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && <p className="text-red-600 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠</span>{formErrors.confirmPassword}
                  </p>}
                </div>
              </div>

              {/* Third Row - Contact and Address */}
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                  <input
                    type="tel"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.contact && <p className="text-red-600 text-xs mt-1 flex items-center">
                    <span className="mr-1">⚠</span>{formErrors.contact}
                  </p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Role Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'owner' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Permit</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({...formData, businessPermit: e.target.files[0]})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload business permit image</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({...formData, businessRegistration: e.target.files[0]})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload business registration image</p>
                  </div>
                </>
              )}

              {formData.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Profile (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({...formData, adminProfile: e.target.files[0]})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload admin profile image (optional)</p>
                </div>
              )}

              {formErrors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm flex items-center">
                    <span className="mr-2">❌</span>{formErrors.submit}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={formData.businessName || ''}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">⚠ {formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formErrors.email && <p className="text-red-600 text-xs mt-1">⚠ {formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                <input
                  type="tel"
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formErrors.contact && <p className="text-red-600 text-xs mt-1">⚠ {formErrors.contact}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Current Business Documents */}
              {currentUser && (currentUser.businessPermitURL || currentUser.businessRegistrationURL || currentUser.businessDocuments?.permit?.url || currentUser.businessDocuments?.registration?.url) && (
                <div className="border-t pt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Current Business Documents</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(currentUser.businessPermitURL || currentUser.businessDocuments?.permit?.url) && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Permit</p>
                        <img 
                          src={currentUser.businessPermitURL || currentUser.businessDocuments?.permit?.url} 
                          alt="Business Permit" 
                          className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                          onClick={() => window.open(currentUser.businessPermitURL || currentUser.businessDocuments?.permit?.url, '_blank')}
                        />
                      </div>
                    )}
                    {(currentUser.businessRegistrationURL || currentUser.businessDocuments?.registration?.url) && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Registration</p>
                        <img 
                          src={currentUser.businessRegistrationURL || currentUser.businessDocuments?.registration?.url} 
                          alt="Business Registration" 
                          className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                          onClick={() => window.open(currentUser.businessRegistrationURL || currentUser.businessDocuments?.registration?.url, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Has Permit Radio Button */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Permit Status</label>
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="hasPermit"
                          value="yes"
                          checked={formData.hasPermit === true}
                          onChange={() => setFormData({...formData, hasPermit: true})}
                          className="mr-2 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Has Permit</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="hasPermit"
                          value="no"
                          checked={formData.hasPermit === false}
                          onChange={() => setFormData({...formData, hasPermit: false})}
                          className="mr-2 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">No Permit</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Business Permit</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({...formData, businessPermit: e.target.files[0]})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to keep current permit</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Business Registration</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({...formData, businessRegistration: e.target.files[0]})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to keep current registration</p>
              </div>

              {formErrors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">❌ {formErrors.submit}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Save size={16} className="mr-2" />
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">User Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {currentUser.profileImageUrl || currentUser.profileImage || currentUser.adminProfileURL ? (
                    <img 
                      src={currentUser.profileImageUrl || currentUser.profileImage || currentUser.adminProfileURL} 
                      alt={currentUser.name || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-medium text-gray-600">
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{currentUser.name}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    currentUser.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {currentUser.role === 'admin' ? <Shield size={12} className="mr-1" /> : <User size={12} className="mr-1" />}
                    {currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-gray-900">{currentUser.email}</p>
                  </div>
                </div>

                {currentUser.businessName && (
                  <div className="flex items-center space-x-3">
                    <Building size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Business Name</p>
                      <p className="text-gray-900">{currentUser.businessName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Phone size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Contact</p>
                    <p className="text-gray-900">{currentUser.contact || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-gray-900">{currentUser.address || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CheckCircle size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Account Status</p>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        (currentUser.status || 'pending') === 'approved' ? 'bg-green-100 text-green-800' :
                        (currentUser.status || 'pending') === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(currentUser.status || 'pending') === 'approved' ? 'Approved' :
                         (currentUser.status || 'pending') === 'rejected' ? 'Rejected' :
                         'Waiting for Approval'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        currentUser.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {currentUser.isVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created</p>
                    <p className="text-gray-900">
                      {currentUser.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </p>
                  </div>
                </div>

                {currentUser.username && (
                  <div className="flex items-center space-x-3">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Username</p>
                      <p className="text-gray-900 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {currentUser.username}
                      </p>
                    </div>
                  </div>
                )}

                {currentUser.approvedAt && (
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={16} className="text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Approved Date</p>
                      <p className="text-gray-900">
                        {currentUser.approvedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {currentUser.rejectedAt && (
                  <div className="flex items-center space-x-3">
                    <X size={16} className="text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Rejected Date</p>
                      <p className="text-gray-900">
                        {currentUser.rejectedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {currentUser.password && (
                  <div className="flex items-center space-x-3">
                    <Eye size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Password</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-900 font-mono text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                          {showUserPassword ? currentUser.password : '••••••••'}
                        </p>
                        <button
                          onClick={() => setShowUserPassword(!showUserPassword)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                          title={showUserPassword ? 'Hide password' : 'Show password'}
                        >
                          {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentUser.updatedAt && (
                  <div className="flex items-center space-x-3">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Updated</p>
                      <p className="text-gray-900">
                        {currentUser.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Approval Section - Only show for pending users */}
                {(currentUser.status || 'pending') === 'pending' && (
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Clock size={16} className="mr-2 text-orange-500" />
                      Account Approval
                    </h5>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-800 mb-4">
                        This user is waiting for approval. Review their information and documents before making a decision.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            handleApproveUser(currentUser);
                            setShowViewModal(false);
                          }}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check size={16} className="mr-2" />
                          Approve User
                        </button>
                        <button
                          onClick={() => {
                            handleRejectUser(currentUser);
                            setShowViewModal(false);
                          }}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X size={16} className="mr-2" />
                          Reject User
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Documents - Only show for owners */}
                {currentUser.role === 'owner' && (
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Business Documents</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Permit</p>
                        {currentUser.businessPermitURL || currentUser.businessDocuments?.permit?.url ? (
                          <img 
                            src={currentUser.businessPermitURL || currentUser.businessDocuments?.permit?.url} 
                            alt="Business Permit" 
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                            onClick={() => window.open(currentUser.businessPermitURL || currentUser.businessDocuments?.permit?.url, '_blank')}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded-lg border flex items-center justify-center">
                            <span className="text-gray-400 text-sm">No permit uploaded</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Registration</p>
                        {currentUser.businessRegistrationURL || currentUser.businessDocuments?.registration?.url ? (
                          <img 
                            src={currentUser.businessRegistrationURL || currentUser.businessDocuments?.registration?.url} 
                            alt="Business Registration" 
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                            onClick={() => window.open(currentUser.businessRegistrationURL || currentUser.businessDocuments?.registration?.url, '_blank')}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded-lg border flex items-center justify-center">
                            <span className="text-gray-400 text-sm">No registration uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Profile - Only show for admins */}
                {currentUser.role === 'admin' && currentUser.adminProfileURL && (
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Admin Profile</h5>
                    <div className="flex justify-center">
                      <img 
                        src={currentUser.adminProfileURL} 
                        alt="Admin Profile" 
                        className="w-32 h-32 object-cover rounded-full border cursor-pointer"
                        onClick={() => window.open(currentUser.adminProfileURL, '_blank')}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditUser(currentUser);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit size={16} className="mr-2" />
                Edit User
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Confirm Action</h3>
            </div>
            
            <p className="text-gray-600 mb-6">{confirmMessage}</p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                  setConfirmMessage('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction) confirmAction();
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                  setConfirmMessage('');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Archive User</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive <strong>{currentUser.name}</strong>? The user will be moved to the archived section and can be restored later.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setCurrentUser(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 size={16} className="mr-2" />
                Archive User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;