import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Store, MapPin, Package, Camera, ChevronRight, ArrowLeft } from 'lucide-react';
import SmartCameraSystem from '../components/SmartCameraSystem';

const Stores = () => {
    const [locations, setLocations] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [storeInventory, setStoreInventory] = useState([]);

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const res = await apiService.getLocations();
            setLocations(res.data);
        } catch (error) {
            console.error('Error loading locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStore = async (store) => {
        setLoading(true);
        setSelectedStore(store);
        try {
            const res = await apiService.getInventory();
            const filtered = res.data.filter(item => item.location_id === store.id);
            setStoreInventory(filtered);
        } catch (error) {
            console.error('Error loading store inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !selectedStore) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!selectedStore ? (
                <>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Store Management</h1>
                        <p className="text-slate-600">Overview of all active retail and warehouse locations</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {locations.map((loc) => (
                            <div
                                key={loc.id}
                                className="group bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-2xl hover:shadow-primary-900/10 transition-all cursor-pointer overflow-hidden relative"
                                onClick={() => handleSelectStore(loc)}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/30 rounded-full -mr-16 -mt-16 group-hover:bg-primary-500/10 transition-colors"></div>

                                <div className="flex items-center gap-4 mb-6 relative">
                                    <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-900/20">
                                        <Store className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{loc.name}</h3>
                                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{loc.type}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6 relative">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <MapPin className="w-4 h-4 text-primary-400" />
                                        <span className="text-sm">{loc.address || 'Standard Location'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Package className="w-4 h-4 text-primary-400" />
                                        <span className="text-sm font-semibold">SKU Code: {loc.code}</span>
                                    </div>
                                </div>

                                <button className="w-full flex items-center justify-between p-4 bg-slate-50 group-hover:bg-primary-600 rounded-2xl transition-all">
                                    <span className="text-slate-700 group-hover:text-white font-bold">View Store Details</span>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <button
                        onClick={() => setSelectedStore(null)}
                        className="flex items-center gap-2 text-slate-600 hover:text-primary-600 font-bold mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to All Stores
                    </button>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-primary-600 rounded-3xl flex items-center justify-center shadow-xl shadow-primary-900/30">
                            <Store className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{selectedStore.name}</h1>
                            <div className="flex items-center gap-3 text-slate-500 mt-1 font-medium">
                                <span className="uppercase tracking-widest text-xs px-2 py-0.5 bg-slate-100 rounded">{selectedStore.type}</span>
                                <span>•</span>
                                <span className="text-sm">{selectedStore.address}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="overflow-hidden rounded-3xl border border-slate-200">
                            <SmartCameraSystem
                                locationId={selectedStore.id}
                                onInventoryUpdate={() => handleSelectStore(selectedStore)}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                            <Package className="w-7 h-7 text-primary-600" />
                            Store Inventory
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-slate-100 text-left">
                                        <th className="py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Product</th>
                                        <th className="py-4 font-black text-slate-400 uppercase tracking-widest text-xs text-right">Current Stock</th>
                                        <th className="py-4 font-black text-slate-400 uppercase tracking-widest text-xs text-right text-green-600">Available</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {storeInventory.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4">
                                                <div className="font-bold text-slate-800">Product #{item.product_id}</div>
                                            </td>
                                            <td className="py-4 text-right font-black text-slate-900">{item.current_stock}</td>
                                            <td className="py-4 text-right font-black text-green-600">{item.available_stock}</td>
                                        </tr>
                                    ))}
                                    {storeInventory.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="py-12 text-center text-slate-400 italic">No inventory records found for this location.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stores;
