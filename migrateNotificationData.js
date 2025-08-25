import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './src/firebase.js';

const migrateNotificationToRentals = async () => {
  try {
    console.log('Fetching notifications...');
    
    // Get all notifications
    const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
    const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Found ${notifications.length} notifications`);
    
    // Extract rental data from notifications
    const rentalData = [];
    let transactionCounter = 1;
    
    notifications.forEach(notification => {
      if (notification.message && notification.message.includes('toyota')) {
        const vehicleMatch = notification.message.match(/toyota\s+([^"]+)/i);
        const vehicle = vehicleMatch ? vehicleMatch[1].trim() : 'Unknown';
        
        let status = 'pending';
        if (notification.message.includes('completed')) status = 'completed';
        else if (notification.message.includes('confirmed')) status = 'active';
        else if (notification.message.includes('request')) status = 'pending';
        
        const rental = {
          customerName: 'Sample Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '09123456789',
          vehicleBrand: 'Toyota',
          vehicleModel: vehicle,
          plateNumber: `ABC-${String(transactionCounter).padStart(4, '0')}`,
          businessName: 'Vigan Auto Rentals',
          ownerBusinessName: 'Vigan Auto Rentals',
          startDate: notification.createdAt || Timestamp.now(),
          endDate: notification.createdAt ? Timestamp.fromMillis(notification.createdAt.toMillis() + (5 * 24 * 60 * 60 * 1000)) : Timestamp.now(),
          totalAmount: Math.floor(Math.random() * 5000) + 2000,
          status: status,
          paymentStatus: status === 'completed' ? 'paid' : 'pending',
          createdAt: notification.createdAt || Timestamp.now(),
          transactionId: `TXN-${String(transactionCounter).padStart(3, '0')}`
        };
        
        rentalData.push(rental);
        transactionCounter++;
      }
    });
    
    console.log(`Creating ${rentalData.length} rental records...`);
    
    // Add rental records to database
    for (const rental of rentalData) {
      await addDoc(collection(db, 'rentals'), rental);
      console.log(`✅ Added rental: ${rental.transactionId} - ${rental.vehicleModel}`);
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log(`Created ${rentalData.length} rental records from notifications`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Run the migration
migrateNotificationToRentals();