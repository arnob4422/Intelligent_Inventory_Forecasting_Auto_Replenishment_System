import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Package, Plus, Edit, Trash2, Search, X } from 'lucide-react';

const InventoryModal = ({ isOpen, onClose, onSave, products, locations, editingItem }) => {
    const [formData, setFormData] = useState({
        product_id: '',
        location_id: '',
        current_stock: 0,
        reserved_stock: 0,
        sku: '',
        name: '',
        category: '',
    });
    const isAddingProduct = !editingItem;

    useEffect(() => {
        if (editingItem) {
            setFormData({
                product_id: editingItem.product_id,
                location_id: editingItem.location_id,
                current_stock: editingItem.current_stock,
                reserved_stock: editingItem.reserved_stock,
            });
        } else {
            setFormData({
                product_id: '',
                location_id: '',
                current_stock: 0,
                reserved_stock: 0,
                sku: '',
                name: '',
                category: '',
            });
        }
    }, [editingItem, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-primary-600 text-white">
                    <h3 className="text-xl font-bold">{editingItem ? 'Edit Inventory' : 'Add New Product'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-6 space-y-4">
                    {!editingItem && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Product SKU</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="PROD-001"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Laptop Computer"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Electronics"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    list="category-suggestions"
                                />
                                <datalist id="category-suggestions">
                                    {[...new Set(products.map(p => p.category).filter(Boolean))].map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                                <select
                                    required
                                    className="input-field"
                                    value={formData.location_id}
                                    onChange={(e) => setFormData({ ...formData, location_id: parseInt(e.target.value) })}
                                >
                                    <option value="">Select Location</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Stock</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="input-field"
                                    placeholder="0"
                                    value={formData.current_stock}
                                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                />
                            </div>
                        </>
                    )}

                    {editingItem && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Current Stock</label>
                            <input
                                type="number"
                                required
                                className="input-field"
                                value={formData.current_stock}
                                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value === '' ? '' : parseInt(e.target.value) })}
                            />
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            {editingItem ? 'Update' : 'Create Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Filtering state
    const [showFilters, setShowFilters] = useState(false);
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [invRes, prodRes, locRes] = await Promise.all([
                apiService.getInventory(),
                apiService.getProducts(),
                apiService.getLocations()
            ]);
            setInventory(invRes.data);
            setProducts(prodRes.data);
            setLocations(locRes.data);
        } catch (error) {
            console.error('Error loading inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingItem) {
                // Update Inventory
                await apiService.updateInventory(editingItem.id, {
                    current_stock: (data.current_stock === '' || data.current_stock === null) ? 0 : data.current_stock,
                    reserved_stock: data.reserved_stock
                });
            } else {
                // Create Product first
                // Create Product with initial stock for selected location
                await apiService.createProduct({
                    sku: data.sku,
                    name: data.name,
                    category: data.category || null,
                    lead_time_days: 7,
                    safety_stock_level: 50,
                    unit_cost: 0,
                    // New backend fields for auto-inventory creation
                    initial_stock: (data.current_stock === '' || data.current_stock === null) ? 0 : parseInt(data.current_stock),
                    location_id: parseInt(data.location_id)
                });

                // Backend now handles inventory creation with the correct initial stock.
                // We just need to reload the data.
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            alert('Failed to save: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this inventory record?')) {
            try {
                await apiService.deleteInventory(id);
                loadData();
            } catch (error) {
                alert('Delete failed: ' + (error.response?.data?.detail || error.message));
            }
        }
    };

    const getProductName = (productId) => {
        const product = products.find(p => p.id === productId);
        return product ? product.name : `Product #${productId}`;
    };

    const getStockStatus = (current, safety) => {
        if (current <= safety * 0.5) return { label: 'Critical', color: 'badge-danger' };
        if (current <= safety) return { label: 'Low', color: 'badge-warning' };
        if (current <= safety * 2) return { label: 'Normal', color: 'badge-success' };
        return { label: 'Overstocked', color: 'badge-info' };
    };

    const filteredInventory = inventory.filter(item => {
        const product = products.find(p => p.id === item.product_id);
        const productName = (product?.name || '').toLowerCase();
        const matchesSearch = productName.includes(searchTerm.toLowerCase());
        const matchesLocation = filterLocation === 'all' || item.location_id.toString() === filterLocation;
        const matchesCategory = filterCategory === 'all' || (product?.category || '') === filterCategory;

        return matchesSearch && matchesLocation && matchesCategory;
    });

    // Get unique categories for filter
    const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <InventoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                products={products}
                locations={locations}
                editingItem={editingItem}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Inventory Management</h1>
                    <p className="text-slate-600">Monitor and manage stock levels across all locations</p>
                </div>
                <button
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Add Product
                </button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                <div className="card">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-slate-200' : ''}`}
                        >
                            Filter
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="card bg-slate-50 border-slate-200 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                                <select
                                    className="input-field"
                                    value={filterLocation}
                                    onChange={(e) => setFilterLocation(e.target.value)}
                                >
                                    <option value="all">All Locations</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                                <select
                                    className="input-field"
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Inventory Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Product</th>
                                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700">Location</th>
                                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-700">Current Stock</th>
                                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-700">Reserved</th>
                                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-700">Available</th>
                                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700">Status</th>
                                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item) => {
                                const product = products.find(p => p.id === item.product_id);
                                const status = getStockStatus(item.current_stock, product?.safety_stock_level || 50);

                                return (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{getProductName(item.product_id)}</p>
                                                    <p className="text-sm text-slate-500">{product?.sku || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-slate-600">Location #{item.location_id}</td>
                                        <td className="py-4 px-4 text-right font-semibold text-slate-800">{item.current_stock}</td>
                                        <td className="py-4 px-4 text-right text-slate-600">{item.reserved_stock}</td>
                                        <td className="py-4 px-4 text-right font-semibold text-green-600">{item.available_stock}</td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`badge ${status.color}`}>{status.label}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <Edit className="w-4 h-4 text-slate-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Inventory;
