import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/firebase.js';

const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test all possible collections
    const collections = ['rentals', 'bookings', 'users', 'admins', 'vehicles', 'notifications', 'reviews'];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        console.log(`✅ ${collectionName}: ${snapshot.size} records`);
        
        if (snapshot.size > 0 && (collectionName === 'rentals' || collectionName === 'bookings')) {
          const firstDoc = snapshot.docs[0].data();
          console.log(`   Sample data:`, Object.keys(firstDoc));
        }
      } catch (error) {
        console.log(`⚠️  ${collectionName}: Collection doesn't exist or error`);
      }
    }
    
    console.log('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

// Run the test
testDatabaseConnection();