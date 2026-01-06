import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { TrendingUp, Calendar, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';

const Forecasting = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [forecasts, setForecasts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [daysAhead, setDaysAhead] = useState(30);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await apiService.getProducts();
            setProducts(res.data);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    };

    const generateForecast = async () => {
        if (!selectedProduct) return;

        setGenerating(true);
        try {
            const res = await apiService.generateForecast({
                product_id: parseInt(selectedProduct),
                days_ahead: daysAhead
            });
            setForecasts(res.data);
        } catch (error) {
            console.error('Error generating forecast:', error);
            const detail = error.response?.data?.detail || 'Error generating forecast. Make sure there is sufficient sales data.';
            alert(`Error: ${detail}`);
        } finally {
            setGenerating(false);
        }
    };

    const loadExistingForecasts = async () => {
        if (!selectedProduct) return;

        setLoading(true);
        try {
            const res = await apiService.getForecasts({
                product_id: parseInt(selectedProduct),
                limit: 30
            });
            setForecasts(res.data);
        } catch (error) {
            console.error('Error loading forecasts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProduct) {
            loadExistingForecasts();
        }
    }, [selectedProduct]);

    const chartData = forecasts.map(f => ({
        date: format(new Date(f.forecast_date), 'MMM dd'),
        predicted: Math.round(f.predicted_quantity),
        lower: Math.round(f.lower_bound),
        upper: Math.round(f.upper_bound)
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Demand Forecasting</h1>
                <p className="text-slate-600">AI-powered predictions for future product demand</p>
            </div>

            {/* Controls */}
            <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Select Product
                        </label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="input-field"
                        >
                            <option value="">Choose a product...</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Forecast Days
                        </label>
                        <input
                            type="number"
                            value={daysAhead}
                            onChange={(e) => setDaysAhead(parseInt(e.target.value))}
                            min="7"
                            max="90"
                            className="input-field"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={generateForecast}
                            disabled={!selectedProduct || generating}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5" />
                            {generating ? 'Generating...' : 'Generate Forecast'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Forecast Chart */}
            {forecasts.length > 0 && (
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-6 h-6 text-primary-600" />
                        <h2 className="text-xl font-bold text-slate-800">Forecast Visualization</h2>
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="upper"
                                stroke="#94a3b8"
                                fill="#f1f5f9"
                                name="Upper Bound"
                            />
                            <Area
                                type="monotone"
                                dataKey="predicted"
                                stroke="#0ea5e9"
                                fill="url(#colorPredicted)"
                                strokeWidth={3}
                                name="Predicted Demand"
                            />
                            <Line
                                type="monotone"
                                dataKey="lower"
                                stroke="#94a3b8"
                                strokeDasharray="5 5"
                                name="Lower Bound"
                            />
                        </AreaChart>
                    </ResponsiveContainer>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
                        <div className="text-center">
                            <p className="text-sm text-slate-600 mb-1">Average Predicted Demand</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {Math.round(forecasts.reduce((sum, f) => sum + f.predicted_quantity, 0) / forecasts.length)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-slate-600 mb-1">Total Forecasted</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {Math.round(forecasts.reduce((sum, f) => sum + f.predicted_quantity, 0))}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-slate-600 mb-1">Confidence Score</p>
                            <p className="text-2xl font-bold text-green-600">
                                {Math.round((forecasts[0]?.confidence_score || 0.85) * 100)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {forecasts.length === 0 && !loading && (
                <div className="card text-center py-12">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Forecasts Yet</h3>
                    <p className="text-slate-500">Select a product and click "Generate Forecast" to see predictions</p>
                </div>
            )}
        </div>
    );
};

export default Forecasting;
