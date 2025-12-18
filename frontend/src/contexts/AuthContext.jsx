import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authToken, setAuthToken] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            // Check for persistent mock session
            const savedUser = localStorage.getItem('authUser');
            const savedToken = localStorage.getItem('authToken');

            if (!auth) {
                if (savedUser && savedToken) {
                    console.log('🔓 Restoring mock session:', JSON.parse(savedUser).email);
                    setUser(JSON.parse(savedUser));
                    setAuthToken(savedToken);
                }
                setLoading(false);
                return;
            }

            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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

            return unsubscribe;
        };

        const unsubscribe = checkAuth();
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        if (!auth) {
            // Development mode persistent mock login
            console.log('🔓 Logging in via development mode persistence');
            const mockUser = { email, uid: 'dev-user-123', role: 'admin' };
            setUser(mockUser);
            setAuthToken('dev-token');
            localStorage.setItem('authToken', 'dev-token');
            localStorage.setItem('authUser', JSON.stringify(mockUser));
            return;
        }
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email, password) => {
        if (!auth) {
            // Development mode persistent mock signup
            console.log('🔓 Signing up via development mode persistence');
            const mockUser = { email, uid: 'dev-user-123', role: 'admin' };
            setUser(mockUser);
            setAuthToken('dev-token');
            localStorage.setItem('authToken', 'dev-token');
            localStorage.setItem('authUser', JSON.stringify(mockUser));
            return;
        }
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        if (!auth) {
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
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
