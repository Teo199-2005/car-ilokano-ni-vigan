// Sample notification data for testing the enhanced notification styling

export const generateSampleNotifications = () => {
  return [
    {
      id: 'notif-1',
      type: 'new_booking',
      title: 'New Booking Request',
      message: 'New booking request for Hiace Toyota Commuter',
      read: false,
      timeFormatted: '9/17/2025, 9:11:38 PM',
      createdAt: new Date('2025-09-17T21:11:38')
    },
    {
      id: 'notif-2',
      type: 'booking_cancelled',
      title: 'Booking Update',
      message: 'Booking cancelled for Hiace Toyota Commuter',
      read: false,
      timeFormatted: '9/16/2025, 11:30:10 PM',
      createdAt: new Date('2025-09-16T23:30:10')
    },
    {
      id: 'notif-3',
      type: 'booking_completed',
      title: 'Booking Update',
      message: 'Booking confirmed for Hiace Toyota Commuter',
      read: true,
      timeFormatted: '9/14/2025, 2:44:42 PM',
      createdAt: new Date('2025-09-14T14:44:42')
    },
    {
      id: 'notif-4',
      type: 'new_booking',
      title: 'New Booking Request',
      message: 'New booking request for Hiace Toyota Commuter',
      read: true,
      timeFormatted: '9/14/2025, 2:43:15 PM',
      createdAt: new Date('2025-09-14T14:43:15')
    },
    {
      id: 'notif-5',
      type: 'booking_completed',
      title: 'Booking Update',
      message: 'Booking completed for Hiace Toyota Commuter',
      read: true,
      timeFormatted: '9/14/2025, 2:05:34 PM',
      createdAt: new Date('2025-09-14T14:05:34')
    },
    {
      id: 'notif-6',
      type: 'booking_completed',
      title: 'Booking Update',
      message: 'Booking confirmed for toyota civic',
      read: true,
      timeFormatted: '9/14/2025, 2:00:58 PM',
      createdAt: new Date('2025-09-14T14:00:58')
    },
    {
      id: 'notif-7',
      type: 'booking_cancelled',
      title: 'Booking Update',
      message: 'Booking cancelled for Hiace Toyota Commuter',
      read: true,
      timeFormatted: '9/14/2025, 2:00:32 PM',
      createdAt: new Date('2025-09-14T14:00:32')
    },
    {
      id: 'notif-8',
      type: 'booking_cancelled',
      title: 'Booking Update',
      message: 'Booking cancelled for Hiace Toyota Commuter',
      read: true,
      timeFormatted: '9/14/2025, 2:00:05 PM',
      createdAt: new Date('2025-09-14T14:00:05')
    },
    {
      id: 'notif-9',
      type: 'booking_completed',
      title: 'Booking Update',
      message: 'Booking confirmed for Hiace Toyota Commuter',
      read: true,
      timeFormatted: '9/14/2025, 1:50:48 PM',
      createdAt: new Date('2025-09-14T13:50:48')
    },
    {
      id: 'notif-10',
      type: 'new_booking',
      title: 'New Booking Request',
      message: 'New booking request for Hiace Toyota Commuter',
      read: true,
      timeFormatted: '9/14/2025, 1:34:33 PM',
      createdAt: new Date('2025-09-14T13:34:33')
    }
  ];
};

export const getNotificationTypeColor = (type) => {
  switch (type) {
    case 'booking_completed':
      return '#4caf50'; // Success green
    case 'booking_cancelled':
      return '#f44336'; // Warning red
    case 'feedback':
    case 'review':
      return '#ff9800'; // Orange
    case 'new_booking':
    case 'booking_created':
      return '#1976d2'; // Primary blue
    case 'new_account':
      return '#4caf50'; // Success green
    default:
      return '#1976d2'; // Primary blue
  }
};