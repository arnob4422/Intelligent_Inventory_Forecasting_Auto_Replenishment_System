import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app;
let auth;
let isMockAuth = false;

const isConfigValid = firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.apiKey.trim() !== "";

if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.warn('⚠️ Firebase initialization failed:', error.message);
    }
} else {
    console.warn('⚠️ Running in development mode with Mock Auth. (Using development defaults)');
    isMockAuth = true;
    // Initialize with a dummy app if config is missing to avoid null exports
    try {
        app = initializeApp({
            apiKey: "dev-key",
            authDomain: "dev.firebaseapp.com",
            projectId: "dev-project",
            storageBucket: "dev.appspot.com",
            messagingSenderId: "12345",
            appId: "1:12345:web:6789"
        });
        auth = getAuth(app);
    } catch (e) {
        // App might already be initialized in some environments
    }
}

export { auth, isMockAuth };
export default app;
