import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './src/firebase.js';

const addSampleRentalData = async () => {
  try {
    // Sample rental data
    const sampleRentals = [
      {
        customerName: 'John Doe',
        customerEmail: 'john.doe@email.com',
        customerPhone: '09123456789',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Vios',
        plateNumber: 'ABC-1234',
        businessName: 'Vigan Auto Rentals',
        ownerBusinessName: 'Vigan Auto Rentals',
        startDate: Timestamp.fromDate(new Date('2024-01-15')),
        endDate: Timestamp.fromDate(new Date('2024-01-20')),
        totalAmount: 5000,
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: Timestamp.fromDate(new Date('2024-01-10')),
        transactionId: 'TXN-001'
      },
      {
        customerName: 'Jane Smith',
        customerEmail: 'jane.smith@email.com',
        customerPhone: '09987654321',
        vehicleBrand: 'Honda',
        vehicleModel: 'City',
        plateNumber: 'XYZ-5678',
        businessName: 'Kamie Rental',
        ownerBusinessName: 'Kamie Rental',
        startDate: Timestamp.fromDate(new Date('2024-02-01')),
        endDate: Timestamp.fromDate(new Date('2024-02-05')),
        totalAmount: 4000,
        status: 'active',
        paymentStatus: 'paid',
        createdAt: Timestamp.fromDate(new Date('2024-01-28')),
        transactionId: 'TXN-002'
      },
      {
        customerName: 'Mike Johnson',
        customerEmail: 'mike.johnson@email.com',
        customerPhone: '09555123456',
        vehicleBrand: 'Mitsubishi',
        vehicleModel: 'Mirage',
        plateNumber: 'DEF-9012',
        businessName: 'Camila\'s Car Rental',
        ownerBusinessName: 'Camila\'s Car Rental',
        startDate: Timestamp.fromDate(new Date('2024-01-25')),
        endDate: Timestamp.fromDate(new Date('2024-01-28')),
        totalAmount: 3000,
        status: 'cancelled',
        paymentStatus: 'refunded',
        createdAt: Timestamp.fromDate(new Date('2024-01-20')),
        transactionId: 'TXN-003'
      }
    ];

    console.log('Adding sample rental data...');
    
    for (const rental of sampleRentals) {
      await addDoc(collection(db, 'rentals'), rental);
      console.log(`Added rental: ${rental.transactionId}`);
    }
    
    console.log('Sample rental data added successfully!');
    
  } catch (error) {
    console.error('Error adding sample data:', error);
  }
};

// Run the function
addSampleRentalData();