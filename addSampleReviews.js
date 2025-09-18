// addSampleReviews.js - Add sample review data
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, serverTimestamp } = require("firebase/firestore");

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCcuQHQVEpXyqdBPsaSRxS9mYZbE6PzKcY",
  authDomain: "car-rental1-3c82a.firebaseapp.com",
  projectId: "car-rental1-3c82a",
  storageBucket: "car-rental1-3c82a.firebasestorage.app",
  messagingSenderId: "492454951144",
  appId: "1:492454951144:web:d667b7f7237c7ea1e6b15d",
  measurementId: "G-9ZCVCPBL2T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleReviews = [
  {
    rating: 5,
    comment: "Excellent service! The car was clean and well-maintained. The owner was very professional and responsive.",
    ownerBusinessName: "Vigan Premium Cars",
    reviewerName: "John Smith",
    reviewerId: "sample_user_1",
    helpful: 3
  },
  {
    rating: 4,
    comment: "Good experience overall. The car was in good condition and the rental process was smooth.",
    ownerBusinessName: "Vigan Premium Cars",
    reviewerName: "Maria Garcia",
    reviewerId: "sample_user_2",
    helpful: 2
  },
  {
    rating: 5,
    comment: "Outstanding service! Highly recommend this car rental business. Very reliable and trustworthy.",
    ownerBusinessName: "Heritage Car Rentals",
    reviewerName: "David Johnson",
    reviewerId: "sample_user_3",
    helpful: 5
  },
  {
    rating: 4,
    comment: "Great cars and fair prices. The owner was helpful and accommodating with our schedule.",
    ownerBusinessName: "Heritage Car Rentals",
    reviewerName: "Sarah Wilson",
    reviewerId: "sample_user_4",
    helpful: 1
  },
  {
    rating: 3,
    comment: "Decent service. The car was okay but could have been cleaner. Overall acceptable experience.",
    ownerBusinessName: "Ilocos Car Hub",
    reviewerName: "Michael Brown",
    reviewerId: "sample_user_5",
    helpful: 0
  },
  {
    rating: 5,
    comment: "Perfect rental experience! The car was exactly as described and the owner was very professional.",
    ownerBusinessName: "Ilocos Car Hub",
    reviewerName: "Lisa Davis",
    reviewerId: "sample_user_6",
    helpful: 4
  }
];

const addSampleReviews = async () => {
  try {
    console.log('🚀 Adding sample reviews...');
    
    for (const review of sampleReviews) {
      const reviewData = {
        ...review,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'reviews'), reviewData);
      console.log(`✅ Added review for ${review.ownerBusinessName} with ID: ${docRef.id}`);
    }
    
    console.log('🎉 All sample reviews added successfully!');
    console.log(`📊 Total reviews added: ${sampleReviews.length}`);
    
  } catch (error) {
    console.error('❌ Error adding sample reviews:', error);
  }
};

addSampleReviews();