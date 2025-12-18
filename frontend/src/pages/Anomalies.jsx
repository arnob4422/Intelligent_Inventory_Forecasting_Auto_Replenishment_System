import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { AlertTriangle, CheckCircle, RefreshCw, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

const Anomalies = () => {
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unresolved');
    const [isDetecting, setIsDetecting] = useState(false);
    const [products, setProducts] = useState({});
    const [locations, setLocations] = useState({});

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter !== 'all') {
                params.resolved = filter === 'resolved';
            }
            const [anomRes, prodRes, locRes] = await Promise.all([
                apiService.getAnomalies(params),
                apiService.getProducts(),
                apiService.getLocations()
            ]);

            setAnomalies(anomRes.data);

            const prodMap = {};
            prodRes.data.forEach(p => prodMap[p.id] = p.name);
            setProducts(prodMap);

            const locMap = {};
            locRes.data.forEach(l => locMap[l.id] = l.name);
            setLocations(locMap);
        } catch (error) {
            console.error('Error fetching anomalies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDetect = async () => {
        setIsDetecting(true);
        try {
            await apiService.detectAnomalies({});
            await loadData();
        } catch (error) {
            console.error('Detection failed:', error);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleResolve = async (id) => {
        try {
            await apiService.resolveAnomaly(id);
            setAnomalies(anomalies.map(a => a.id === id ? { ...a, resolved: true } : a));
        } catch (error) {
            console.error('Error resolving anomaly:', error);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    const getAnomalyIcon = (type) => {
        switch (type.toLowerCase()) {
            case 'spike': return <TrendingUp className="w-5 h-5" />;
            case 'drop': return <TrendingDown className="w-5 h-5" />;
            case 'outlier': return <AlertTriangle className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Anomaly Detection</h1>
                    <p className="text-slate-600">Identify and address unusual sales patterns</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDetect}
                        disabled={isDetecting}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                        {isDetecting ? 'Detecting...' : 'Run Detection'}
                    </button>
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        {['unresolved', 'resolved', 'all'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f
                                    ? 'bg-primary-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && !isDetecting ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : anomalies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {anomalies.map((anomaly) => (
                        <div key={anomaly.id} className={`card border-l-4 ${anomaly.resolved ? 'border-l-slate-300 opacity-75' :
                            anomaly.severity === 'critical' ? 'border-l-red-500' :
                                anomaly.severity === 'high' ? 'border-l-orange-500' : 'border-l-yellow-500'
                            }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg ${getSeverityColor(anomaly.severity)}`}>
                                    {getAnomalyIcon(anomaly.anomaly_type)}
                                </div>
                                <span className={`badge ${getSeverityColor(anomaly.severity)}`}>
                                    {anomaly.severity}
                                </span>
                            </div>

                            <div className="space-y-2 mb-6">
                                <h3 className="font-bold text-lg text-slate-800">
                                    {products[anomaly.product_id] || `Product #${anomaly.product_id}`}
                                </h3>
                                <p className="text-sm text-slate-500 italic">
                                    {locations[anomaly.location_id] || `Location #${anomaly.location_id}`}
                                </p>
                                <p className="text-slate-600 line-clamp-2">{anomaly.description}</p>
                                <p className="text-xs text-slate-400">
                                    Detected: {format(new Date(anomaly.detected_date), 'MMM dd, yyyy')}
                                </p>
                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-bold">Actual</p>
                                        <p className="text-lg font-bold text-slate-800">{Math.round(anomaly.actual_value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-bold">Expected</p>
                                        <p className="text-lg font-bold text-primary-600">{Math.round(anomaly.expected_value)}</p>
                                    </div>
                                </div>
                            </div>

                            {!anomaly.resolved ? (
                                <button
                                    onClick={() => handleResolve(anomaly.id)}
                                    className="w-full btn bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Mark as Resolved
                                </button>
                            ) : (
                                <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-bold">
                                    <CheckCircle className="w-5 h-5" />
                                    Resolved
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-16">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-slate-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">All clear!</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        No unusual patterns detected in your sales data. Everything seems to be operating normally.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Anomalies;
