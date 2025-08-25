// Database utility functions for optimized operations
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

export const DatabaseUtils = {
  // Optimized user queries
  async getUsersByRole(db, role, status = null) {
    let q = query(
      collection(db, 'users'),
      where('role', '==', role),
      orderBy('createdAt', 'desc')
    );
    
    if (status) {
      q = query(
        collection(db, 'users'),
        where('role', '==', role),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Optimized vehicle queries with owner filtering
  async getVehiclesByOwner(db, ownerId, status = null) {
    let q = query(
      collection(db, 'vehicles'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    
    if (status) {
      q = query(
        collection(db, 'vehicles'),
        where('ownerId', '==', ownerId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Optimized rental queries
  async getRentalsByStatus(db, status, limitCount = 50) {
    const q = query(
      collection(db, 'rentals'),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Batch operations for better performance
  async batchUpdateVehicleStatus(db, vehicleIds, newStatus) {
    const batch = writeBatch(db);
    
    vehicleIds.forEach(vehicleId => {
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      batch.update(vehicleRef, { 
        status: newStatus, 
        updatedAt: Timestamp.now() 
      });
    });
    
    await batch.commit();
  },

  // Archive operations
  async archiveUser(db, userId, reason, adminId) {
    const batch = writeBatch(db);
    
    // Get original user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) throw new Error('User not found');
    
    const userData = userDoc.data();
    
    // Create archived record
    const archivedUserRef = doc(collection(db, 'archived_users'));
    batch.set(archivedUserRef, {
      ...userData,
      originalId: userId,
      archivedAt: Timestamp.now(),
      archivedBy: adminId,
      reason
    });
    
    // Delete original record
    batch.delete(doc(db, 'users', userId));
    
    await batch.commit();
    return archivedUserRef.id;
  },

  // Search optimization
  async searchVehicles(db, searchTerm, filters = {}) {
    let q = query(collection(db, 'vehicles'));
    
    // Apply filters
    if (filters.ownerId) {
      q = query(q, where('ownerId', '==', filters.ownerId));
    }
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Client-side text search (Firestore doesn't support full-text search)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(vehicle => 
        vehicle.brand?.toLowerCase().includes(term) ||
        vehicle.model?.toLowerCase().includes(term) ||
        vehicle.carNumber?.toLowerCase().includes(term) ||
        vehicle.businessName?.toLowerCase().includes(term) ||
        vehicle.businessPermitNumber?.toLowerCase().includes(term)
      );
    }
    
    return results;
  },

  // Analytics queries
  async getAnalyticsData(db, dateRange = null) {
    const analytics = {
      totalVehicles: 0,
      verifiedVehicles: 0,
      totalRentals: 0,
      activeRentals: 0,
      totalRevenue: 0,
      ownerCount: 0
    };
    
    // Get vehicle stats
    const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
    analytics.totalVehicles = vehiclesSnapshot.size;
    analytics.verifiedVehicles = vehiclesSnapshot.docs.filter(
      doc => doc.data().status === 'Verified'
    ).length;
    
    // Get rental stats
    let rentalsQuery = query(collection(db, 'rentals'));
    if (dateRange) {
      rentalsQuery = query(
        rentalsQuery,
        where('createdAt', '>=', dateRange.start),
        where('createdAt', '<=', dateRange.end)
      );
    }
    
    const rentalsSnapshot = await getDocs(rentalsQuery);
    analytics.totalRentals = rentalsSnapshot.size;
    analytics.activeRentals = rentalsSnapshot.docs.filter(
      doc => ['pending', 'accepted'].includes(doc.data().status)
    ).length;
    
    // Calculate revenue
    analytics.totalRevenue = rentalsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().totalAmount || 0), 0
    );
    
    // Get owner count
    const ownersSnapshot = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'owner'))
    );
    analytics.ownerCount = ownersSnapshot.size;
    
    return analytics;
  },

  // Notification utilities
  async getUnreadNotificationCount(db, userId = null) {
    let q = query(
      collection(db, 'notifications'),
      where('read', '==', false)
    );
    
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // Data validation
  validateVehicleData(vehicleData) {
    const required = ['brand', 'model', 'carNumber', 'ownerId', 'businessName'];
    const missing = required.filter(field => !vehicleData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  },

  validateRentalData(rentalData) {
    const required = ['customerId', 'vehicleId', 'startDate', 'endDate', 'totalAmount'];
    const missing = required.filter(field => !rentalData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
};

export default DatabaseUtils;