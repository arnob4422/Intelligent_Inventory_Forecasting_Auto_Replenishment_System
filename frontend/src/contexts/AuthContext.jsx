import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, isMockAuth } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authToken, setAuthToken] = useState(null);

    useEffect(() => {
        let unsubscribe;
        const checkAuth = async () => {
            // Check for persistent mock session
            const savedUser = localStorage.getItem('authUser');
            const savedToken = localStorage.getItem('authToken');

            if (isMockAuth || !auth) {
                if (savedUser && savedToken) {
                    try {
                        console.log('🔓 Restoring mock session:', JSON.parse(savedUser).email);
                        setUser(JSON.parse(savedUser));
                        setAuthToken(savedToken);
                    } catch (e) {
                        localStorage.removeItem('authUser');
                        localStorage.removeItem('authToken');
                    }
                }
                setLoading(false);
                return;
            }

            unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    const token = await firebaseUser.getIdToken();
                    setAuthToken(token);
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('authUser', JSON.stringify({
                        email: firebaseUser.email,
                        uid: firebaseUser.uid,
                        role: 'admin' // Default role for now
                    }));
                    setUser(firebaseUser);
                } else {
                    setAuthToken(null);
                    setUser(null);
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                }
                setLoading(false);
            });
        };

        checkAuth();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        if (isMockAuth || !auth) {
            return mockLogin(email);
        }
        try {
            return await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === 'auth/api-key-not-valid' || error.message.includes('api-key-not-valid')) {
                console.warn('⚠️ Invalid API Key detected. Falling back to Mock Login.');
                return mockLogin(email);
            }
            throw error;
        }
    };

    const mockLogin = (email) => {
        console.log('🔓 Logging in via development mode');
        const mockUser = { email, uid: 'dev-user-123', role: 'admin' };
        setUser(mockUser);
        setAuthToken('dev-token');
        localStorage.setItem('authToken', 'dev-token');
        localStorage.setItem('authUser', JSON.stringify(mockUser));
        return Promise.resolve(mockUser);
    };

    const signup = async (email, password) => {
        if (isMockAuth || !auth) {
            return mockLogin(email);
        }
        try {
            return await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === 'auth/api-key-not-valid' || error.message.includes('api-key-not-valid')) {
                console.warn('⚠️ Invalid API Key detected. Falling back to Mock Login.');
                return mockLogin(email);
            }
            throw error;
        }
    };

    const googleLogin = async (email) => {
        if (isMockAuth || !auth) {
            return mockLogin(email || 'google-user@example.com');
        }
        try {
            const provider = new GoogleAuthProvider();
            return await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Google sign-in error:', error);
            if (error.code === 'auth/api-key-not-valid' || error.message.includes('api-key-not-valid')) {
                console.warn('⚠️ Invalid API Key. Falling back to Mock Google Login.');
                return mockLogin('google-user@example.com');
            }
            throw error;
        }
    };

    const logout = async () => {
        if (isMockAuth || !auth) {
            setUser(null);
            setAuthToken(null);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            return;
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        return signOut(auth);
    };

    const value = {
        user,
        authToken,
        login,
        signup,
        googleLogin,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
