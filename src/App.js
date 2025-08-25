// App.js - Main Application Component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Cars from './components/Cars';
import UserManagement from './components/UserManagement';
import RentalReports from './components/RentalReports';
import Settings from './components/Settings';
import AdminProfile from './components/AdminProfile';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCcuQHQVEpXyqdBPsaSRxS9mYZbE6PzKcY",
  authDomain: "car-rental1-3c82a.firebaseapp.com",
  projectId: "car-rental1-3c82a",
  storageBucket: "car-rental1-3c82a.firebasestorage.app",
  messagingSenderId: "492454951144",
  appId: "1:492454951144:web:d667b7f7237c7ea1e6b15d",
  measurementId: "G-9ZCVCPBL2T"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/login" element={!user ? <Login auth={auth} /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/cars" element={user ? <Cars user={user} db={db} /> : <Navigate to="/login" />} />
          <Route path="/users" element={user ? <UserManagement user={user} db={db} /> : <Navigate to="/login" />} />
          <Route path="/reports" element={user ? <RentalReports user={user} db={db} /> : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? <Settings user={user} auth={auth} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <AdminProfile user={user} auth={auth} db={db} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;