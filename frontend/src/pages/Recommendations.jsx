import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { ShoppingCart, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

const Recommendations = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [products, setProducts] = useState({});
    const [locations, setLocations] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [recRes, prodRes, locRes] = await Promise.all([
                apiService.getRecommendations(),
                apiService.getProducts(),
                apiService.getLocations()
            ]);

            setRecommendations(recRes.data);

            const prodMap = {};
            prodRes.data.forEach(p => prodMap[p.id] = p.name);
            setProducts(prodMap);

            const locMap = {};
            locRes.data.forEach(l => locMap[l.id] = l.name);
            setLocations(locMap);
        } catch (error) {
            console.error('Error loading recommendations data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await apiService.generateRecommendations({});
            await loadData();
        } catch (error) {
            console.error('Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await apiService.updateRecommendationStatus(id, status);
            setRecommendations(recommendations.map(r => r.id === id ? { ...r, status } : r));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Replenishment Recommendations</h1>
                    <p className="text-slate-600">AI-generated reorder suggestions based on demand forecasts</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn btn-primary flex items-center gap-2 self-start md:self-auto"
                >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Generating...' : 'Generate Recommendations'}
                </button>
            </div>

            {loading && !isGenerating ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : recommendations.length > 0 ? (
                <div className="card shadow-md border-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-slate-100 bg-slate-50/50">
                                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                    <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Levels</th>
                                    <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Reorder Qty</th>
                                    <th className="text-center py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                                    <th className="text-center py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-center py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recommendations.map((rec) => (
                                    <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-800">
                                                {products[rec.product_id] || `Product #${rec.product_id}`}
                                            </div>
                                            <div className="text-xs text-slate-400">ID: {rec.product_id}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-slate-600">
                                                {locations[rec.location_id] || `Location #${rec.location_id}`}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="text-sm font-medium text-slate-800">Cur: {rec.current_stock_level}</div>
                                            <div className="text-xs text-slate-400">Safe: {rec.safety_stock}</div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-primary-600 text-lg">
                                            {rec.reorder_quantity}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPriorityColor(rec.priority)}`}>
                                                {rec.priority}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${rec.status === 'pending' ? 'bg-blue-50 text-blue-600' :
                                                    rec.status === 'approved' ? 'bg-green-50 text-green-600' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                {rec.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {rec.status === 'pending' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => updateStatus(rec.id, 'approved')}
                                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(rec.id, 'cancelled')}
                                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card text-center py-20 bg-slate-50/50 border-dashed border-2">
                    <div className="bg-white w-20 h-20 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                        <ShoppingCart className="w-10 h-10 text-slate-200" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">No Recommendations Yet</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Click the button above to analyze your inventory and generate replenishment suggestions based on current stock and demand forecasts.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="btn btn-primary"
                    >
                        Generate Recommendations Now
                    </button>
                </div>
            )}
        </div>
    );
};

export default Recommendations;
