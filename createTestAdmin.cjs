// createTestAdmin.cjs
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

// Your Firebase config
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
const auth = getAuth(app);
const db = getFirestore(app);

const createTestAdmin = async () => {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'admin@vigancarrental.com',
      'Admin@123'
    );
    
    // Create admin document in Firestore
    await setDoc(doc(db, 'admins', userCredential.user.uid), {
      uid: userCredential.user.uid,
      name: 'Admin User',
      email: 'admin@vigancarrental.com',
      username: 'admin',
      role: 'admin',
      contact: '123-456-7890',
      address: 'Vigan City, Philippines',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Test admin created successfully with UID:', userCredential.user.uid);
  } catch (error) {
    console.error('Error creating test admin:', error);
  }
};

createTestAdmin();