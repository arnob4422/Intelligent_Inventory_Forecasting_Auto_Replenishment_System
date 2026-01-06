import React, { useState, useEffect } from 'react';
import {
    Camera,
    Video,
    Settings,
    Plus,
    Play,
    Upload,
    Activity,
    Database,
    Cpu,
    Wifi,
    WifiOff
} from 'lucide-react';
import { apiService } from '../services/api';

const CameraSystem = () => {
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCameras();
    }, []);

    const fetchCameras = async () => {
        try {
            const response = await apiService.getCameras();
            setCameras(response.data);
            if (response.data.length > 0) {
                setSelectedCamera(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching cameras:', error);
            // Fallback to mock data if API fails
            const mockCameras = [
                { id: 1, name: 'Main Entrance', location_id: 1, resolution: '1920x1080', fps: 30, status: 'active' },
                { id: 2, name: 'Warehouse Aisle A', location_id: 2, resolution: '1920x1080', fps: 30, status: 'active' },
                { id: 3, name: 'Warehouse Aisle B', location_id: 2, resolution: '1920x1080', fps: 0, status: 'inactive' },
                { id: 4, name: 'Loading Dock', location_id: 3, resolution: '1280x720', fps: 30, status: 'active' },
            ];
            setCameras(mockCameras);
            setSelectedCamera(mockCameras[0]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl overflow-hidden border border-slate-800">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-primary-600/20 p-3 rounded-2xl">
                        <Camera className="w-8 h-8 text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Smart Camera System</h2>
                        <p className="text-slate-400 mt-1">AI-powered inventory tracking from live camera feeds</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 font-semibold group">
                        <Settings className="w-5 h-5 text-slate-400 group-hover:rotate-90 transition-transform" />
                        Settings
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-semibold">
                        <Plus className="w-5 h-5" />
                        Add Camera
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Sidebar - Camera Feeds */}
                <div className="lg:col-span-3 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-slate-300 font-semibold">
                            <Video className="w-5 h-5" />
                            <h3>Camera Feeds</h3>
                        </div>
                        <div className="space-y-3">
                            {cameras.map((camera) => (
                                <div
                                    key={camera.id}
                                    onClick={() => setSelectedCamera(camera)}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${selectedCamera?.id === camera.id
                                            ? 'bg-primary-600/10 border-primary-500/50 shadow-lg shadow-primary-900/20'
                                            : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-slate-100">{camera.name}</h4>
                                        {camera.status === 'active' ? (
                                            <Wifi className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <WifiOff className="w-4 h-4 text-rose-400" />
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        <p>Location #{camera.location_id}</p>
                                        <p>{camera.resolution} • {camera.fps} FPS</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Status Section */}
                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                        <h3 className="text-slate-300 font-semibold mb-4">System Status</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Active Cameras</span>
                                <span className="text-emerald-400 font-bold font-mono">3/4</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Total Storage</span>
                                <span className="text-primary-400 font-bold font-mono">2.4 TB</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">AI Processing</span>
                                <span className="text-slate-100 font-bold font-mono">Idle</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content - Live View */}
                <div className="lg:col-span-9">
                    {selectedCamera && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${selectedCamera.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                    <h3 className="text-2xl font-bold">{selectedCamera.name}</h3>
                                    <span className="text-slate-500 text-sm bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Location #{selectedCamera.location_id}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl transition-all shadow-lg shadow-primary-900/20 font-semibold">
                                        <Play className="w-5 h-5" />
                                        Start AI Analysis
                                    </button>
                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 font-semibold">
                                        <Upload className="w-5 h-5 text-primary-400" />
                                        Upload Video
                                    </button>
                                </div>
                            </div>

                            {/* Feed Placeholder */}
                            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-800 group">
                                <div className="absolute top-6 left-6 flex items-center gap-2 bg-rose-600/90 text-white px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider backdrop-blur-md">
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                                    LIVE
                                </div>

                                {/* Placeholder Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black p-8">
                                    {selectedCamera.status === 'active' ? (
                                        <>
                                            <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-700 group-hover:scale-110 transition-transform duration-500">
                                                <Activity className="w-12 h-12 text-primary-500" />
                                            </div>
                                            <p className="text-xl text-slate-300 font-medium">Connecting to live feed...</p>
                                            <div className="mt-8 flex gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="w-20 h-20 text-slate-700 mb-6" />
                                            <p className="text-xl text-slate-500 font-medium italic">Camera offline or inactive</p>
                                        </>
                                    )}
                                </div>

                                {/* Overlay Controls */}
                                <div className="absolute bottom-6 right-6 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-6">
                                        <div className="flex items-center gap-2 border-r border-white/10 pr-6">
                                            <Cpu className="w-4 h-4 text-primary-400" />
                                            <span className="text-xs font-bold text-slate-300">AI: READY</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-bold text-slate-300">REC: ON</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraSystem;
