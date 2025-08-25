// components/Login.js
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Login = ({ auth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockEndTime, setBlockEndTime] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [selectedRole, setSelectedRole] = useState('admin'); // Default to admin
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  
  const navigate = useNavigate();
  const db = getFirestore();

  // Check if user is blocked on component mount
  useEffect(() => {
    const checkBlockStatus = async () => {
      const storedBlockEndTime = localStorage.getItem('blockEndTime');
      const storedAttempts = localStorage.getItem('loginAttempts');
      
      if (storedAttempts) {
        setLoginAttempts(parseInt(storedAttempts));
      }
      
      if (storedBlockEndTime) {
        const endTime = parseInt(storedBlockEndTime);
        if (endTime > Date.now()) {
          setIsBlocked(true);
          setBlockEndTime(endTime);
        } else {
          // Block time has expired
          localStorage.removeItem('blockEndTime');
          setIsBlocked(false);
        }
      }
    };
    
    checkBlockStatus();
  }, []);

  // Handle countdown timer when blocked
  useEffect(() => {
    let interval;
    
    if (isBlocked && blockEndTime) {
      interval = setInterval(() => {
        const timeLeft = Math.ceil((blockEndTime - Date.now()) / 1000);
        
        if (timeLeft <= 0) {
          setIsBlocked(false);
          localStorage.removeItem('blockEndTime');
          setLoginAttempts(0);
          localStorage.setItem('loginAttempts', '0');
          clearInterval(interval);
        } else {
          setCountdown(timeLeft);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBlocked, blockEndTime]);

  const blockUser = (minutes) => {
    const blockEndTime = Date.now() + (minutes * 60 * 1000);
    setIsBlocked(true);
    setBlockEndTime(blockEndTime);
    localStorage.setItem('blockEndTime', blockEndTime.toString());
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError(`Account is temporarily blocked. Try again in ${countdown} seconds.`);
      return;
    }
    
    setLoading(true);
    setError('');
    setDebugInfo(null);
    
    const trimmedEmail = email.toLowerCase().trim();
    
    try {
      console.log(`Attempting login for ${selectedRole}: ${trimmedEmail}`);
      
      // Step 1: Sign in with email and password
      console.log('Step 1: Firebase Authentication...');
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;
      console.log('Authentication successful. User UID:', user.uid);
      
      let userData = null;
      let userRole = null;
      let collectionUsed = null;
      
      // Step 2: Check the appropriate collection based on selected role
      if (selectedRole === 'admin') {
        console.log('Step 2: Checking admins collection...');
        
        // Check admins collection first - FORCE fresh data from server (no cache)
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        console.log('Admin document exists:', adminDoc.exists());
        
        if (adminDoc.exists()) {
          userData = adminDoc.data();
          userRole = 'admin';
          collectionUsed = 'admins';
          console.log('Found admin in admins collection:', userData);
          console.log('Admin isActive status from Firestore:', userData.isActive);
        } else {
          console.log('Not found in admins collection, checking users collection...');
          
          // Fallback: Check users collection for admin role
          const userQuery = query(
            collection(db, 'users'),
            where('email', '==', trimmedEmail)
          );
          const querySnapshot = await getDocs(userQuery);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const docData = userDoc.data();
            console.log('Found user in users collection:', docData);
            
            if (docData.role === 'admin') {
              userData = docData;
              userRole = 'admin';
              collectionUsed = 'users';
              console.log('User has admin role in users collection');
            } else {
              console.log('User exists but role is:', docData.role);
            }
          } else {
            console.log('No user found in users collection');
          }
        }
      } else {
        console.log('Step 2: Checking users collection for customer...');
        
        // Check users/customers collection
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', trimmedEmail)
        );
        const querySnapshot = await getDocs(userQuery);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          userData = userDoc.data();
          userRole = userData.role || 'customer';
          collectionUsed = 'users';
          console.log('Found customer in users collection:', userData);
        } else {
          console.log('No customer found in users collection');
          
          // Check if they're actually an admin trying to login as customer
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists()) {
            console.log('Found admin account, user should select admin role');
            throw new Error('This email is registered as an admin. Please select "Admin" role to login.');
          }
        }
      }
      
      // Debug information
      setDebugInfo({
        authUid: user.uid,
        searchedEmail: trimmedEmail,
        selectedRole: selectedRole,
        collectionUsed: collectionUsed,
        userFound: !!userData,
        userRole: userRole,
        userData: userData,
        isActive: userData?.isActive,
        isVerified: userData?.isVerified
      });
      
      if (!userData) {
        throw new Error(`No ${selectedRole} account found with this email address.`);
      }
      
      // Step 3: Verify role matches
      console.log(`Step 3: Role verification. Expected: ${selectedRole}, Found: ${userRole}`);
      if (userRole !== selectedRole) {
        if (userRole === 'admin' && selectedRole === 'customer') {
          throw new Error('This account is an admin account. Please select "Admin" role to login.');
        } else {
          throw new Error(`You are not registered as a ${selectedRole}.`);
        }
      }
      
      // Step 4: Check if admin account is active (for admin accounts)
      if (selectedRole === 'admin') {
        if (userData.hasOwnProperty('isActive') && !userData.isActive) {
          throw new Error('Your admin account has been disabled. Please contact the system administrator.');
        }
      }
      
      console.log('Login successful!');
      
      // FINAL SAFETY CHECK BEFORE NAVIGATION
      if (selectedRole === 'admin' && userData.hasOwnProperty('isActive') && userData.isActive !== true) {
        console.log('🚨 FINAL SAFETY CHECK FAILED - BLOCKING NAVIGATION');
        throw new Error('🚫 FINAL SECURITY CHECK: Account disabled - navigation blocked.');
      }
      
      // Reset login attempts on successful login
      setLoginAttempts(0);
      localStorage.setItem('loginAttempts', '0');
      
      // Store user info in localStorage for app-wide access
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('userId', user.uid);
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('userName', userData.name);
      
      // Store password for re-authentication (if needed)
      sessionStorage.setItem('currentUserPassword', password);
      
      // Redirect based on role
      if (userRole === 'admin') {
        navigate('/'); // Your existing dashboard route
      } else {
        navigate('/customer/dashboard');
      }
      
    } catch (error) {
      console.error("Login error:", error);
      
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());
      
      // Block user based on number of failed attempts
      if (newAttempts === 5) {
        blockUser(1); // Block for 1 minute
        setError('Too many failed login attempts. Account blocked for 1 minute.');
      } else if (newAttempts === 10) {
        blockUser(5); // Block for 5 minutes
        setError('Too many failed login attempts. Account blocked for 5 minutes.');
      } else if (newAttempts >= 15) {
        blockUser(15); // Block for 15 minutes
        setError('Too many failed login attempts. Account blocked for 15 minutes.');
      } else {
        // Display appropriate error message
        if (error.message.includes('ACCOUNT DISABLED') || error.message.includes('disabled')) {
          setError(error.message);
        } else if (error.message.includes('not registered') || 
            error.message.includes('admin account') || 
            error.message.includes('not active') ||
            error.message.includes('No admin account') ||
            error.message.includes('No customer account')) {
          setError(error.message);
        } else if (error.code === 'auth/user-not-found') {
          setError('No account found with this email address.');
        } else if (error.code === 'auth/wrong-password') {
          setError(`Invalid password. Attempts: ${newAttempts}`);
        } else if (error.code === 'auth/invalid-email') {
          setError('Invalid email address format.');
        } else if (error.code === 'auth/user-disabled') {
          setError('This account has been disabled.');
        } else if (error.code === 'auth/too-many-requests') {
          setError('Too many failed login attempts. Please try again later.');
        } else {
          setError(`Login failed. Attempts: ${newAttempts}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-screen bg-gray-800">
      {/* Left side with login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="text-center">
            <h1 className="text-white text-3xl font-bold mb-2">Login</h1>
            <p className="text-gray-400 text-sm mb-8">
              Sign in to your account
            </p>
          </div>
          
          {/* Debug toggle */}
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={() => setDebugMode(!debugMode)}
              className="text-xs text-gray-400 hover:text-gray-300"
            >
              {debugMode ? 'Hide' : 'Show'} Debug Info
            </button>
          </div>
          
          {/* Debug Info */}
          {debugMode && debugInfo && (
            <div className="mb-6 p-3 bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-300 font-semibold mb-2">Debug Information:</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>Auth UID:</strong> {debugInfo.authUid}</p>
                <p><strong>Searched Email:</strong> {debugInfo.searchedEmail}</p>
                <p><strong>Selected Role:</strong> {debugInfo.selectedRole}</p>
                <p><strong>Collection Used:</strong> {debugInfo.collectionUsed || 'None'}</p>
                <p><strong>User Found:</strong> {debugInfo.userFound ? 'Yes' : 'No'}</p>
                <p><strong>User Role:</strong> {debugInfo.userRole || 'None'}</p>
                {debugInfo.userData && (
                  <>
                    <p><strong>Is Active:</strong> <span className={`${debugInfo.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {debugInfo.isActive ? 'Yes' : 'No'} 
                      {debugInfo.isActive === false && <span className="ml-1 font-bold text-red-300">(DISABLED!)</span>}
                    </span></p>
                    <p><strong>Is Verified:</strong> <span className={`${debugInfo.isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                      {debugInfo.isVerified ? 'Yes' : 'No'}
                    </span></p>
                    <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
                      <p><strong>Raw isActive Value:</strong> {JSON.stringify(debugInfo.userData.isActive)}</p>
                      <p><strong>Type:</strong> {typeof debugInfo.userData.isActive}</p>
                    </div>
                    {debugInfo.BLOCKED && (
                      <div className="mt-2 p-2 bg-red-900 border border-red-500 rounded text-xs">
                        <p className="text-red-300 font-bold">🚫 ACCOUNT BLOCKED</p>
                        <p className="text-red-400"><strong>Reason:</strong> {debugInfo.blockReason}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Role selection toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-700 p-1 rounded-lg inline-flex">
              <button
                type="button"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedRole === 'admin'
                    ? 'bg-black text-white'
                    : 'bg-transparent text-gray-300 hover:text-white'
                }`}
                onClick={() => setSelectedRole('admin')}
              >
                Admin
              </button>
             
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 bg-white text-gray-800 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-white text-gray-800 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            {error && (
              <div className={`border px-4 py-3 rounded ${
                error.includes('ACCOUNT DISABLED') || error.includes('disabled') 
                  ? 'bg-red-50 border-red-500 text-red-800' 
                  : 'bg-red-100 border-red-400 text-red-700'
              }`}>
                {(error.includes('ACCOUNT DISABLED') || error.includes('disabled')) && (
                  <div className="flex items-center mb-2">
                    <svg className="w-6 h-6 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                    <strong className="text-red-800">🚫 ACCOUNT DISABLED</strong>
                  </div>
                )}
                <div className={error.includes('ACCOUNT DISABLED') ? 'font-semibold text-lg' : ''}>
                  {error}
                </div>
                {(error.includes('ACCOUNT DISABLED') || error.includes('disabled')) && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm">
                    <p><strong>What this means:</strong></p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Your administrator privileges have been revoked</li>
                      <li>You cannot access any admin functions</li>
                      <li>Contact your system administrator to restore access</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {isBlocked ? (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded text-center">
                Account temporarily blocked. <br />
                Try again in {Math.floor(countdown / 60)}:{countdown % 60 < 10 ? '0' + (countdown % 60) : countdown % 60}
              </div>
            ) : (
              <button
                type="submit"
                className="w-full bg-black hover:bg-gray-900 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  `LOGIN AS ${selectedRole.toUpperCase()}`
                )}
              </button>
            )}
            
            <div className="text-center mt-2">
              <a href="#" className="text-sm text-gray-400 hover:text-gray-300">
                Forgot password?
              </a>
            </div>
          </form>
        </div>
      </div>
      
      {/* Right side with welcome message */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-gray-700 to-gray-900 items-center justify-center relative">
        <div className="text-center px-8">
          <h1 className="text-white text-5xl font-bold mb-6">Welcome back!</h1>
          <p className="text-gray-300 text-xl mb-8">
            Login to Car Rental <br/>
            {selectedRole === 'admin' ? 'Administration Portal' : 'Customer Portal'}
          </p>
        </div>
        
        {/* Role indicator */}
        <div className="absolute top-8 right-8">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            selectedRole === 'admin' 
              ? 'bg-blue-600 text-white' 
              : 'bg-green-600 text-white'
          }`}>
            {selectedRole === 'admin' ? '👨‍💼 Admin Login' : '👤 Customer Login'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;