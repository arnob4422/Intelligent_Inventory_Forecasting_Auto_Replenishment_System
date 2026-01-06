import React, { useState, useEffect } from 'react';
import { apiService, API_BASE_URL } from '../services/api';
import {
    History,
    Search,
    Calendar,
    Download,
    ExternalLink,
    PlayCircle,
    Clock,
    HardDrive,
    Trash2,
    Video,
    LayoutGrid,
    List
} from 'lucide-react';

const Footages = () => {
    const [footages, setFootages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState({});
    const [cameras, setCameras] = useState({});
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [footagesRes, productsRes, camerasRes] = await Promise.all([
                apiService.getFootages(),
                apiService.getProducts(),
                apiService.getCameras().catch(() => ({ data: [] }))
            ]);

            setFootages(footagesRes.data);

            const pMap = {};
            productsRes.data.forEach(p => pMap[p.id] = p.name);
            setProducts(pMap);

            const cMap = {};
            camerasRes.data.forEach(c => cMap[c.id] = c.name);
            setCameras(cMap);

        } catch (error) {
            console.error('Error loading footages:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredFootages = footages.filter(f => {
        const cameraName = (cameras[f.camera_id] || '').toLowerCase();
        return cameraName.includes(searchTerm.toLowerCase()) ||
            f.timestamp.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-3">
                        <History className="w-10 h-10 text-primary-600" />
                        Camera Records
                    </h1>
                    <p className="text-slate-500 font-medium">Browse and manage AI-generated security recordings and snapshots</p>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-6 flex-1 lg:flex-none">
                        <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
                            <div className="w-10 h-10 bg-primary-100 rounded-2xl flex items-center justify-center">
                                <HardDrive className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Storage</p>
                                <p className="text-sm font-black text-slate-800">1.2/2.4 TB</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">System Healthy</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                    <input
                        type="text"
                        placeholder="Search by camera name, date, or event type..."
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="lg:col-span-4 flex gap-2">
                    <select className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-primary-500/10 outline-none font-bold text-slate-700">
                        <option>All Cameras</option>
                        {Object.values(cameras).map(name => (
                            <option key={name}>{name}</option>
                        ))}
                    </select>
                    <div className="flex bg-white border border-slate-200 rounded-3xl p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-3 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredFootages.length > 0 ? (
                        filteredFootages.map((footage) => (
                            <div key={footage.id} className="group bg-white rounded-[2rem] border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-primary-900/10 transition-all duration-500">
                                <div className="aspect-video bg-slate-900 relative overflow-hidden">
                                    {footage.file_path && (
                                        <img
                                            src={`${API_BASE_URL}/${footage.file_path}`}
                                            alt={`Footage ${footage.id}`}
                                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-90 group-hover:scale-100 z-10">
                                        <div className="bg-white/10 backdrop-blur-xl p-5 rounded-full border border-white/20 shadow-2xl">
                                            <PlayCircle className="w-10 h-10 text-white fill-white/20" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-white border border-white/10">
                                            <Clock className="w-3 h-3 text-primary-400" />
                                            {formatDuration(footage.duration)}
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-4">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-white/10 backdrop-blur-md ${footage.footage_type === 'recorded' ? 'bg-primary-600/80 text-white' : 'bg-emerald-600/80 text-white'}`}>
                                            {footage.footage_type}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg leading-tight group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                                                {cameras[footage.camera_id] || `Camera #${footage.camera_id}`}
                                            </h3>
                                            <div className="flex items-center gap-2 text-slate-400 text-xs mt-1 font-bold">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(footage.timestamp)}
                                            </div>
                                        </div>
                                        <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{footage.file_size.toFixed(1)} MB</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-3 bg-slate-50 hover:bg-primary-600 text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm" title="Download">
                                                <Download className="w-5 h-5" />
                                            </button>
                                            <button className="p-3 bg-slate-50 hover:bg-primary-600 text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm" title="View Details">
                                                <ExternalLink className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-slate-200 border-dashed">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Video className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">No Records Found</h3>
                            <p className="text-slate-500 font-medium max-w-xs mx-auto">Try adjusting your search filters or check back later for automated recordings.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 text-left bg-slate-50/50">
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Source</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Duration/Size</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredFootages.map(footage => (
                                    <tr key={footage.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-8 bg-slate-900 rounded-lg overflow-hidden group-hover:ring-2 ring-primary-500/50 transition-all"></div>
                                                <span className="font-bold text-slate-800">{cameras[footage.camera_id] || `Camera #${footage.camera_id}`}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-slate-500 font-medium">{formatDate(footage.timestamp)}</td>
                                        <td className="p-6 text-center">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${footage.footage_type === 'recorded' ? 'bg-primary-100 text-primary-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {footage.footage_type}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="font-bold text-slate-800">{formatDuration(footage.duration)}</div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{footage.file_size.toFixed(1)} MB</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"><Download className="w-4 h-4" /></button>
                                                <button className="p-2 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Footages;
