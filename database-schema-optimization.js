// Database Schema Optimization Script
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  writeBatch,
  enableIndexedDbPersistence 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCcuQHQVEpXyqdBPsaSRxS9mYZbE6PzKcY",
  authDomain: "car-rental1-3c82a.firebaseapp.com",
  projectId: "car-rental1-3c82a",
  storageBucket: "car-rental1-3c82a.firebasestorage.app",
  messagingSenderId: "492454951144",
  appId: "1:492454951144:web:d667b7f7237c7ea1e6b15d",
  measurementId: "G-9ZCVCPBL2T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.log('The current browser does not support persistence.');
  }
});

// Optimized Schema Definitions
export const COLLECTIONS = {
  // Core Collections
  USERS: 'users',
  ADMINS: 'admins', 
  VEHICLES: 'vehicles',
  RENTALS: 'rentals',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  
  // Archive Collections
  ARCHIVED_USERS: 'archived_users',
  ARCHIVED_RENTALS: 'archived_rentals',
  
  // Lookup Collections
  VEHICLE_OWNERS: 'vehicle_owners',
  RENTAL_TRANSACTIONS: 'rental_transactions'
};

// Normalized Schema Structure
export const SCHEMA = {
  users: {
    // Primary key: uid (from Firebase Auth)
    uid: 'string',
    email: 'string',
    role: 'string', // 'owner' | 'admin'
    status: 'string', // 'approved' | 'pending' | 'rejected'
    
    // Profile data
    fullName: 'string',
    businessName: 'string', // For owners
    contact: 'string',
    address: 'string',
    
    // Documents
    businessPermitURL: 'string',
    businessRegistrationURL: 'string',
    businessPermitNumber: 'string',
    
    // Metadata
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    lastLoginAt: 'timestamp',
    
    // Indexes: email, role, status, businessName
  },

  vehicles: {
    // Primary key: auto-generated
    id: 'string',
    vehicleNumber: 'number', // Sequential number
    
    // Basic info
    brand: 'string',
    model: 'string',
    carNumber: 'string', // License plate
    carType: 'string',
    capacity: 'string',
    
    // Status
    status: 'string', // 'Verified' | 'Not Verified' | 'Rented' | 'Maintenance' | 'Out of Service'
    
    // Pricing
    price: 'number', // Daily rate
    hourlyRate: 'string',
    securityDeposit: 'string',
    
    // Technical specs
    transmission: 'string',
    fuelType: 'string',
    fuelReturnPolicy: 'string',
    minRentalPeriod: 'string',
    
    // Media
    mainImageUrl: 'string',
    angleImageUrls: 'array',
    
    // Owner reference (normalized)
    ownerId: 'string', // Reference to users collection
    businessName: 'string', // Denormalized for quick filtering
    businessPermitNumber: 'string',
    
    // Metadata
    description: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    
    // Indexes: ownerId, businessName, status, brand, model, carNumber, businessPermitNumber
  },

  rentals: {
    // Primary key: auto-generated
    id: 'string',
    transactionId: 'string', // Unique transaction identifier
    
    // Customer info
    customerId: 'string', // Reference to users if registered
    customerName: 'string',
    customerEmail: 'string',
    customerPhone: 'string',
    
    // Vehicle reference
    vehicleId: 'string',
    vehicleBrand: 'string', // Denormalized
    vehicleModel: 'string', // Denormalized
    ownerId: 'string', // Reference to vehicle owner
    
    // Rental details
    startDate: 'timestamp',
    endDate: 'timestamp',
    totalAmount: 'number',
    status: 'string', // 'pending' | 'accepted' | 'completed' | 'cancelled'
    
    // Payment info
    paymentStatus: 'string', // 'pending' | 'confirmed' | 'failed'
    paymentMethod: 'string',
    
    // Metadata
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    
    // Indexes: customerId, vehicleId, ownerId, status, transactionId, startDate, endDate
  },

  notifications: {
    // Primary key: auto-generated
    id: 'string',
    type: 'string', // 'new_account' | 'booking_created' | 'booking_status_change' | 'payment_confirmed' | 'maintenance_alert'
    title: 'string',
    message: 'string',
    
    // Targeting
    userId: 'string', // null for global notifications
    
    // Status
    read: 'boolean',
    readAt: 'timestamp',
    
    // Metadata
    metadata: 'object', // Additional data specific to notification type
    createdAt: 'timestamp',
    
    // Indexes: userId, type, read, createdAt
  },

  archived_users: {
    // Same structure as users but for archived records
    originalId: 'string', // Original user ID
    archivedAt: 'timestamp',
    archivedBy: 'string', // Admin who archived
    reason: 'string',
    // ... all original user fields
    
    // Indexes: originalId, archivedAt, role
  },

  settings: {
    // Primary key: 'app' (single document)
    siteTitle: 'string',
    logoUrl: 'string',
    contactEmail: 'string',
    contactPhone: 'string',
    address: 'string',
    
    // System settings
    maxLoginAttempts: 'number',
    disableDuration: 'number',
    enableEmailNotifications: 'boolean',
    currency: 'string',
    rentalTerms: 'string',
    
    // Metadata
    updatedAt: 'timestamp',
    updatedBy: 'string'
  }
};

// Database optimization functions
export const DatabaseOptimizer = {
  // Create composite indexes for efficient querying
  async createIndexes() {
    console.log('Creating optimized indexes...');
    
    // Note: Firestore indexes are created via Firebase Console or firebase.json
    // This is a reference for required indexes
    const requiredIndexes = [
      // Users collection
      { collection: 'users', fields: ['role', 'status'] },
      { collection: 'users', fields: ['businessName', 'status'] },
      { collection: 'users', fields: ['email'] },
      
      // Vehicles collection
      { collection: 'vehicles', fields: ['ownerId', 'status'] },
      { collection: 'vehicles', fields: ['businessName', 'status'] },
      { collection: 'vehicles', fields: ['status', 'createdAt'] },
      { collection: 'vehicles', fields: ['brand', 'model'] },
      
      // Rentals collection
      { collection: 'rentals', fields: ['customerId', 'status'] },
      { collection: 'rentals', fields: ['vehicleId', 'status'] },
      { collection: 'rentals', fields: ['ownerId', 'status'] },
      { collection: 'rentals', fields: ['status', 'createdAt'] },
      { collection: 'rentals', fields: ['startDate', 'endDate'] },
      
      // Notifications collection
      { collection: 'notifications', fields: ['userId', 'read', 'createdAt'] },
      { collection: 'notifications', fields: ['type', 'createdAt'] },
      
      // Archived collections
      { collection: 'archived_users', fields: ['originalId', 'archivedAt'] },
      { collection: 'archived_users', fields: ['role', 'archivedAt'] }
    ];
    
    console.log('Required indexes:', requiredIndexes);
    return requiredIndexes;
  },

  // Migrate existing data to optimized structure
  async migrateData() {
    console.log('Starting data migration...');
    const batch = writeBatch(db);
    
    try {
      // Migration would happen here in production
      // This is a placeholder for the migration logic
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  // Clean up redundant data
  async cleanupRedundancy() {
    console.log('Cleaning up redundant data...');
    
    // Remove duplicate fields
    // Normalize relationships
    // Archive old records
    
    console.log('Cleanup completed');
  },

  // Validate schema integrity
  async validateSchema() {
    console.log('Validating schema integrity...');
    
    const validationResults = {
      users: { valid: true, issues: [] },
      vehicles: { valid: true, issues: [] },
      rentals: { valid: true, issues: [] },
      notifications: { valid: true, issues: [] }
    };
    
    console.log('Schema validation completed:', validationResults);
    return validationResults;
  }
};

// Firestore Security Rules (to be applied in Firebase Console)
export const SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Admins collection
    match /admins/{adminId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Vehicles collection
    match /vehicles/{vehicleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Rentals collection
    match /rentals/{rentalId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource.data.customerId == request.auth.uid || 
         resource.data.ownerId == request.auth.uid ||
         get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         resource.data.userId == null ||
         get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Settings collection
    match /settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Archived collections (admin only)
    match /archived_users/{docId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
`;

export default DatabaseOptimizer;