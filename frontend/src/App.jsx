import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Forecasting from './pages/Forecasting';
import Anomalies from './pages/Anomalies';
import Recommendations from './pages/Recommendations';
import Stores from './pages/Stores';
import Footages from './pages/Footages';
import RealTimeCamera from './pages/RealTimeCamera';

import MediaAnalysis from './pages/MediaAnalysis';

const PrivateRoute = ({ children }) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Layout />
                            </PrivateRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="forecasting" element={<Forecasting />} />
                        <Route path="anomalies" element={<Anomalies />} />
                        <Route path="recommendations" element={<Recommendations />} />
                        <Route path="stores" element={<Stores />} />
                        <Route path="footages" element={<Footages />} />
                        <Route path="live-detection" element={<RealTimeCamera />} />
                        <Route path="media-analysis" element={<MediaAnalysis />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
