import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  updateDoc,
  doc,
  where,
  Timestamp 
} from 'firebase/firestore';

export const NotificationService = {
  // Create notification
  async createNotification(db, type, title, message, userId = null, metadata = {}) {
    try {
      const notification = {
        type,
        title,
        message,
        userId,
        metadata,
        read: false,
        createdAt: Timestamp.now(),
        readAt: null
      };

      const docRef = await addDoc(collection(db, 'notifications'), notification);
      return { id: docRef.id, ...notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get notifications
  async getNotifications(db, userId = null, limitCount = 10) {
    try {
      let q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (userId) {
        q = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timeFormatted: doc.data().createdAt?.toDate().toLocaleString()
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  async markAsRead(db, notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Notification triggers
  async onNewUserRegistration(db, userData) {
    return this.createNotification(
      db,
      'new_account',
      'New Account Created',
      `New ${userData.role} registered: ${userData.name}`,
      null,
      { userId: userData.id, userRole: userData.role }
    );
  },

  async onNewRentalBooking(db, rentalData) {
    return this.createNotification(
      db,
      'booking_created',
      'New Rental Booking',
      `New booking from ${rentalData.customerName} for ${rentalData.vehicleBrand} ${rentalData.vehicleModel}`,
      null,
      { rentalId: rentalData.id, customerId: rentalData.customerId }
    );
  },

  async onBookingStatusChange(db, rentalData, oldStatus, newStatus) {
    const statusMessages = {
      'pending': 'Booking is pending approval',
      'accepted': 'Booking has been accepted',
      'completed': 'Booking has been completed',
      'cancelled': 'Booking has been cancelled'
    };

    return this.createNotification(
      db,
      'booking_status_change',
      'Booking Status Updated',
      `Booking ${rentalData.transactionId || rentalData.id}: ${statusMessages[newStatus]}`,
      null,
      { 
        rentalId: rentalData.id, 
        oldStatus, 
        newStatus,
        customerId: rentalData.customerId 
      }
    );
  },

  async onPaymentConfirmation(db, paymentData) {
    return this.createNotification(
      db,
      'payment_confirmed',
      'Payment Confirmed',
      `Payment of ₱${paymentData.amount.toLocaleString()} confirmed for booking ${paymentData.transactionId}`,
      null,
      { 
        paymentId: paymentData.id,
        rentalId: paymentData.rentalId,
        amount: paymentData.amount
      }
    );
  },

  async onVehicleMaintenanceAlert(db, vehicleData) {
    return this.createNotification(
      db,
      'maintenance_alert',
      'Vehicle Maintenance Required',
      `${vehicleData.brand} ${vehicleData.model} (${vehicleData.plateNumber}) requires maintenance`,
      null,
      { 
        vehicleId: vehicleData.id,
        ownerId: vehicleData.ownerId,
        maintenanceType: vehicleData.maintenanceType || 'general'
      }
    );
  }
};