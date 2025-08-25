import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
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
    name: '',
    email: '',
    contact: '',
    address: '',
    role: 'owner',
    password: '',
    businessPermit: null,
    businessRegistration: null,
    adminProfile: null
  });
  const [formErrors, setFormErrors] = useState({});

  const navigate = useNavigate();
  const db = getFirestore();
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
    
    // Auto-verify owners with permits who are approved
    if (user.role === 'owner' && user.status === 'approved' && !user.isVerified && (user.businessPermitURL || user.businessRegistrationURL)) {
      updates.isVerified = true;
      needsUpdate = true;
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
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'users'
      }));

      // Fetch from admins collection
      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const adminsData = adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'admin',
        source: 'admins'
      }));

      const allUsers = [...usersData, ...adminsData];
      
      // Auto-update status for existing users
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

      setUsers([...updatedUsersData, ...updatedAdminsData]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch archived users
  const fetchArchivedUsers = async () => {
    try {
      const archivedSnapshot = await getDocs(collection(db, 'archived_users'));
      const archivedData = archivedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setArchivedUsers(archivedData);
    } catch (error) {
      console.error('Error fetching archived users:', error);
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
      let status = 'pending';
      let isVerified = false;
      
      if (formData.role === 'admin') {
        status = 'approved';
        isVerified = true;
      } else if (formData.role === 'owner' && (businessPermitURL || businessRegistrationURL)) {
        status = 'approved';
        isVerified = true;
      }

      // Create user document
      const userData = {
        uid: userCredential.user.uid,
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
        isVerified
      };

      const targetCollection = formData.role === 'admin' ? 'admins' : 'users';
      await addDoc(collection(db, targetCollection), userData);

      // Reset form and close modal
      setFormData({
        name: '',
        email: '',
        contact: '',
        address: '',
        role: 'owner',
        password: '',
        businessPermit: null,
        businessRegistration: null,
        adminProfile: null
      });
      setFormErrors({});
      setShowAddModal(false);
      
      // Refresh users list
      fetchUsers();
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
    if (!window.confirm(`Are you sure you want to restore ${user.name}?`)) return;

    try {
      // Add back to original collection
      const targetCollection = user.role === 'admin' ? 'admins' : 'users';
      const { archivedAt, archivedBy, ...userData } = user;
      
      await addDoc(collection(db, targetCollection), {
        ...userData,
        updatedAt: Timestamp.now()
      });

      // Remove from archived collection
      await deleteDoc(doc(db, 'archived_users', user.id));

      // Refresh lists
      fetchUsers();
      fetchArchivedUsers();
    } catch (error) {
      console.error('Error restoring user:', error);
    }
  };

  // View user details
  const handleViewUser = (user) => {
    setCurrentUser(user);
    setShowViewModal(true);
  };

  // Edit user
  const handleEditUser = (user) => {
    setCurrentUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      contact: user.contact || '',
      address: user.address || '',
      role: user.role || 'owner',
      password: '' // Don't pre-fill password for security
    });
    setShowEditModal(true);
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
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
      
      const updateData = {
        name: formData.name,
        email: formData.email,
        contact: formData.contact,
        address: formData.address,
        businessPermitURL,
        businessRegistrationURL,
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, targetCollection, currentUser.id), updateData);
      
      setShowEditModal(false);
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        contact: '',
        address: '',
        role: 'owner',
        password: ''
      });
      setFormErrors({});
      fetchUsers();
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
      // Add to archived_users collection
      await addDoc(collection(db, 'archived_users'), {
        ...currentUser,
        archivedAt: Timestamp.now(),
        archivedBy: 'admin'
      });

      // Remove from original collection
      const targetCollection = currentUser.source || (currentUser.role === 'admin' ? 'admins' : 'users');
      await deleteDoc(doc(db, targetCollection, currentUser.id));
      
      setShowDeleteModal(false);
      setCurrentUser(null);
      fetchUsers();
      fetchArchivedUsers();
    } catch (error) {
      console.error('Error archiving user:', error);
    }
  };

  // Permanently delete user
  const handlePermanentDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${user.name}? This action cannot be undone.`)) return;

    try {
      await deleteDoc(doc(db, 'archived_users', user.id));
      fetchArchivedUsers();
    } catch (error) {
      console.error('Error permanently deleting user:', error);
    }
  };

  // Approve user
  const handleApproveUser = async (user) => {
    try {
      const targetCollection = user.source || 'users';
      
      // Auto-verify if user has permits or is admin
      const shouldAutoVerify = user.role === 'admin' || user.businessPermitURL || user.businessRegistrationURL;
      
      await updateDoc(doc(db, targetCollection, user.id), {
        status: 'approved',
        isVerified: shouldAutoVerify,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  // Reject user
  const handleRejectUser = async (user) => {
    try {
      const targetCollection = user.source || 'users';
      await updateDoc(doc(db, targetCollection, user.id), {
        status: 'rejected',
        isVerified: false,
        rejectedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      fetchUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      contact: '',
      address: '',
      role: 'owner',
      password: '',
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
  });

  useEffect(() => {
    fetchUsers();
    fetchArchivedUsers();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
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

              {/* Users Table */}
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Business/Role
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Activity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Approval
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => {
                          const userStatus = user.status || 'pending';
                          const isVerified = user.isVerified || false;
                          const isActive = user.isActive !== false; // Default to active if not specified
                          const isPending = userStatus === 'pending';
                          
                          return (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-medium text-gray-600">
                                      {user.name?.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="ml-3 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">{user.name || 'N/A'}</div>
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
                                  <div className={`w-2 h-2 rounded-full inline-block mr-1 ${
                                    user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                                  }`}></div>
                                  <span className="text-xs text-gray-700">
                                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                                  </span>
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
                                  {user.role === 'owner' && (
                                    <div className="flex items-center">
                                      {user.businessPermitURL || user.businessRegistrationURL ? (
                                        <FileCheck size={12} className="mr-2 text-green-500" />
                                      ) : (
                                        <FileText size={12} className="mr-2 text-gray-400" />
                                      )}
                                      <span className="text-xs text-gray-700">
                                        {user.businessPermitURL || user.businessRegistrationURL ? 'Has Permit' : 'No Permit'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full mr-2 ${
                                    isActive ? 'bg-green-400' : 'bg-red-400'
                                  }`}></div>
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm text-gray-900">
                                    <Phone size={12} className="mr-2 text-gray-400" />
                                    <span>{user.contact || 'N/A'}</span>
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
                              <td className="px-4 py-4 text-center">
                                {isPending ? (
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => handleApproveUser(user)}
                                      className="bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 p-2 rounded-full transition-colors"
                                      title="Approve User"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleRejectUser(user)}
                                      className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 p-2 rounded-full transition-colors"
                                      title="Reject User"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
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
                    {archivedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {user.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-500">{user.name}</div>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
            
            <form onSubmit={handleAddUser} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength="8"
                  pattern="^(?=.*[!@#$%^&*(),.?&quot;:{}|<>]).{8,}$"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  title="Password must be at least 8 characters with at least one special character"
                />
                {formErrors.password && <p className="text-red-600 text-xs mt-1 flex items-center">
                  <span className="mr-1">⚠</span>{formErrors.password}
                </p>}
                <p className="text-xs text-gray-500 mt-1">8+ characters with at least one special character</p>
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
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
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
              {currentUser && (currentUser.businessPermitURL || currentUser.businessRegistrationURL) && (
                <div className="border-t pt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Current Business Documents</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentUser.businessPermitURL && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Permit</p>
                        <img 
                          src={currentUser.businessPermitURL} 
                          alt="Business Permit" 
                          className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                          onClick={() => window.open(currentUser.businessPermitURL, '_blank')}
                        />
                      </div>
                    )}
                    {currentUser.businessRegistrationURL && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Registration</p>
                        <img 
                          src={currentUser.businessRegistrationURL} 
                          alt="Business Registration" 
                          className="w-full h-24 object-cover rounded-lg border cursor-pointer"
                          onClick={() => window.open(currentUser.businessRegistrationURL, '_blank')}
                        />
                      </div>
                    )}
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
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xl font-medium text-gray-600">
                    {currentUser.name?.charAt(0).toUpperCase()}
                  </span>
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

                {/* Business Documents - Only show for owners */}
                {currentUser.role === 'owner' && (
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Business Documents</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Permit</p>
                        {currentUser.businessPermitURL ? (
                          <img 
                            src={currentUser.businessPermitURL} 
                            alt="Business Permit" 
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                            onClick={() => window.open(currentUser.businessPermitURL, '_blank')}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded-lg border flex items-center justify-center">
                            <span className="text-gray-400 text-sm">No permit uploaded</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Business Registration</p>
                        {currentUser.businessRegistrationURL ? (
                          <img 
                            src={currentUser.businessRegistrationURL} 
                            alt="Business Registration" 
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                            onClick={() => window.open(currentUser.businessRegistrationURL, '_blank')}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{currentUser.name}</strong>? This action cannot be undone.
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
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;