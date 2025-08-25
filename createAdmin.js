import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { auth, db } from './firebase';

const validateAdminData = (email, password, username) => {
  const errors = [];
  
  // Email validation
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errors.push('Valid email is required');
  }
  
  // Password validation
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain uppercase, lowercase, and number');
  }
  
  // Username validation
  if (!username || username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  return errors;
};

const checkUsernameExists = async (username) => {
  const q = query(collection(db, 'admins'), where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

const checkEmailExists = async (email) => {
  const q = query(collection(db, 'admins'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

const createInitialAdmin = async () => {
  try {
    const email = 'admin@vigancarrental.com';
    const password = 'Admin@123';
    const username = 'admin';
    
    // Validate input data
    const validationErrors = validateAdminData(email, password, username);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return;
    }
    
    // Check if username already exists
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      console.error('Username already exists');
      return;
    }
    
    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      console.error('Email already exists');
      return;
    }
    
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create admin document in Firestore
    await setDoc(doc(db, 'admins', userCredential.user.uid), {
      uid: userCredential.user.uid,
      name: 'Admin User',
      email: email,
      username: username,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Initial admin created successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};

createInitialAdmin();