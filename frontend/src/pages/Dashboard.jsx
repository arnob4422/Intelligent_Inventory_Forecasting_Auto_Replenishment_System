import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import {
    TrendingUp,
    Package,
    AlertTriangle,
    ShoppingCart,
    Activity,
    BarChart3
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [anomalies, setAnomalies] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [products, setProducts] = useState({});
    const [locations, setLocations] = useState({});

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        console.log('📊 Loading dashboard data...');

        try {
            // Load essential data first
            console.log('📡 Fetching stats, products, and locations...');
            const [statsRes, productsRes, locationsRes] = await Promise.all([
                apiService.getStats().catch(err => { console.error('❌ Stats failed:', err); return { data: null }; }),
                apiService.getProducts().catch(err => { console.error('❌ Products failed:', err); return { data: [] }; }),
                apiService.getLocations().catch(err => { console.error('❌ Locations failed:', err); return { data: [] }; })
            ]);

            if (statsRes.data) setStats(statsRes.data);

            // Map products and locations
            const productMap = {};
            if (Array.isArray(productsRes.data)) {
                productsRes.data.forEach(p => productMap[p.id] = p.name);
            }
            setProducts(productMap);

            const locationMap = {};
            if (Array.isArray(locationsRes.data)) {
                locationsRes.data.forEach(l => locationMap[l.id] = l.name);
            }
            setLocations(locationMap);

            // Load secondary data
            console.log('📡 Fetching anomalies, recommendations, and low stock...');
            const [anomaliesRes, recommendationsRes, lowStockRes] = await Promise.all([
                apiService.getAnomalies({ resolved: false, limit: 5 }).catch(err => { console.error('❌ Anomalies failed:', err); return { data: [] }; }),
                apiService.getRecommendations({ status: 'pending', limit: 5 }).catch(err => { console.error('❌ Recommendations failed:', err); return { data: [] }; }),
                apiService.getLowStockItems().catch(err => { console.error('❌ Low stock failed:', err); return { data: [] }; })
            ]);

            if (anomaliesRes.data) setAnomalies(anomaliesRes.data);
            if (recommendationsRes.data) setRecommendations(recommendationsRes.data);
            if (lowStockRes.data) setLowStock(lowStockRes.data);

            console.log('✅ Dashboard data loaded');

        } catch (error) {
            console.error('❌ Critical error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Total Products',
            value: stats?.products || 0,
            icon: Package,
            color: 'bg-blue-500',
            trend: '+12%'
        },
        {
            title: 'Sales Records',
            value: stats?.sales_records || 0,
            icon: ShoppingCart,
            color: 'bg-green-500',
            trend: '+8%'
        },
        {
            title: 'Active Forecasts',
            value: stats?.forecasts || 0,
            icon: TrendingUp,
            color: 'bg-purple-500',
            trend: '+15%'
        },
        {
            title: 'Anomalies Detected',
            value: stats?.anomalies || 0,
            icon: AlertTriangle,
            color: 'bg-red-500',
            trend: '-5%'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard</h1>
                <p className="text-slate-600">Overview of your inventory forecasting system</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="card hover:scale-105 transition-transform duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                                <p className="text-sm text-green-600 mt-1">{stat.trend} from last month</p>
                            </div>
                            <div className={`${stat.color} p-4 rounded-xl`}>
                                <stat.icon className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Activity Chart */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="w-5 h-5 text-primary-600" />
                        <h2 className="text-xl font-bold text-slate-800">System Activity</h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.activity_data || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickFormatter={(str) => str.split('-')[2]}
                                    fontSize={12}
                                />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Forecast Trends Chart */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-primary-600" />
                        <h2 className="text-xl font-bold text-slate-800">Forecast Trends</h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.performance_data || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="actual" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Alerts and Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alerts */}
                <div className="card">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Low Stock Alerts
                    </h2>
                    <div className="space-y-3">
                        {lowStock.length > 0 ? (
                            lowStock.slice(0, 5).map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                    <div>
                                        <p className="font-medium text-slate-800">
                                            {products[item.product_id] || `Product #${item.product_id}`}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {locations[item.location_id] || `Location #${item.location_id}`} | Current: {item.current_stock} units
                                        </p>
                                    </div>
                                    <span className="badge badge-danger">Urgent</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-center py-4">No low stock items</p>
                        )}
                    </div>
                </div>

                {/* Recent Anomalies */}
                <div className="card">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Recent Anomalies
                    </h2>
                    <div className="space-y-3">
                        {anomalies.length > 0 ? (
                            anomalies.map((anomaly) => (
                                <div key={anomaly.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div>
                                        <p className="font-medium text-slate-800">
                                            {products[anomaly.product_id] || `Product #${anomaly.product_id}`}
                                        </p>
                                        <p className="text-sm text-slate-600">{anomaly.description}</p>
                                    </div>
                                    <span className={`badge ${anomaly.severity === 'critical' ? 'badge-danger' :
                                        anomaly.severity === 'high' ? 'badge-warning' : 'badge-info'
                                        }`}>
                                        {anomaly.severity}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-center py-4">No anomalies detected</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="card">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-500" />
                    Replenishment Recommendations
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Location</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Reorder Qty</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Priority</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recommendations.length > 0 ? (
                                recommendations.map((rec) => (
                                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            {products[rec.product_id] || `Product #${rec.product_id}`}
                                        </td>
                                        <td className="py-3 px-4 italic text-slate-600 text-sm">
                                            {locations[rec.location_id] || `Location #${rec.location_id}`}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-primary-600">{rec.reorder_quantity} units</td>
                                        <td className="py-3 px-4">
                                            <span className={`badge ${rec.priority === 'urgent' ? 'badge-danger' :
                                                rec.priority === 'high' ? 'badge-warning' : 'badge-info'
                                                }`}>
                                                {rec.priority}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="badge badge-info">{rec.status}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-slate-500">
                                        No pending recommendations
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
