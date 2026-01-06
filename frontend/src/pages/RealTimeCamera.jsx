import React, { useState, useRef, useEffect } from 'react';
import {
    Camera,
    Video,
    RefreshCw,
    Play,
    Camera as CameraIcon,
    Download,
    Eye,
    Box,
    TrendingUp,
    Clock,
    Trash2,
    Shield,
    CheckCircle,
    AlertCircle,
    Info,
    Package,
    CheckCircle2,
    X,
    Maximize2
} from 'lucide-react';
import { apiService } from '../services/api';

const RealTimeCamera = () => {
    // Stats State
    const [stats, setStats] = useState({
        totalDetections: 0,
        uniqueProducts: 0,
        lastUpdate: 'N/A'
    });

    // Camera & Detection State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentDetections, setCurrentDetections] = useState([]);
    const [inventoryCounts, setInventoryCounts] = useState({});
    const [activityLog, setActivityLog] = useState([]);
    const [model, setModel] = useState(null);
    const [modelLoading, setModelLoading] = useState(true);
    const [allProducts, setAllProducts] = useState([]);
    const [mappings, setMappings] = useState({});
    const [productEmbeddings, setProductEmbeddings] = useState([]);
    const [showMappingModal, setShowMappingModal] = useState(null);
    const [showTrainingModal, setShowTrainingModal] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [isTraining, setIsTraining] = useState(false);
    const [featureModel, setFeatureModel] = useState(null);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const logRef = useRef(null);
    const logEndRef = useRef(null);

    // Initial Load
    useEffect(() => {
        loadInitialData();
        loadModel();
    }, []);

    const loadInitialData = async () => {
        try {
            const [prodRes, mapRes, embRes] = await Promise.all([
                apiService.getProducts(),
                apiService.getMappings(),
                apiService.getEmbeddings()
            ]);
            setAllProducts(prodRes.data || []);

            const mapObj = {};
            (mapRes.data || []).forEach(m => {
                mapObj[m.ai_label.toLowerCase()] = m.product_id;
            });
            setMappings(mapObj);

            setProductEmbeddings(embRes.data || []);
        } catch (err) {
            console.error('Failed to load mapping data:', err);
        }
    };

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [activityLog]);

    // Fix: Attach stream to video element when active
    useEffect(() => {
        if (isCameraActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    const loadModel = async () => {
        try {
            addLog('System', 'Loading AI Prediction Engine...', 'info');
            const [cocoSsd, tf, mobilenet] = await Promise.all([
                import('@tensorflow-models/coco-ssd'),
                import('@tensorflow/tfjs'),
                import('@tensorflow-models/mobilenet')
            ]);

            const [detector, features] = await Promise.all([
                cocoSsd.load(),
                mobilenet.load({ version: 2, alpha: 1.0 })
            ]);

            setModel(detector);
            setFeatureModel(features);
            setModelLoading(false);
            addLog('System', 'AI Prediction Engine Online', 'success');
        } catch (err) {
            console.error('Failed to load model:', err);
            addLog('System', 'Failed to load AI Engine', 'error');
            setModelLoading(false);
        }
    };

    const addLog = (tag, message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setActivityLog(prev => [...prev, { timestamp, tag, message, type }]);
    };

    const toggleCamera = async () => {
        if (!isCameraActive) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: 1280, height: 720 }
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraActive(true);
                addLog('Camera', 'Webcam started', 'success');
            } catch (err) {
                console.error('Camera Error:', err);
                addLog('Camera', 'Permission denied', 'error');
            }
        } else {
            stopEverything();
        }
    };

    const stopEverything = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        setIsAnalyzing(false);
        if (window.rtAnalysisInterval) {
            clearInterval(window.rtAnalysisInterval);
            window.rtAnalysisInterval = null;
        }
        addLog('Camera', 'System stopped', 'info');
    };

    const toggleAnalysis = () => {
        if (!isAnalyzing) {
            if (!model) {
                addLog('AI', 'Model not ready', 'error');
                return;
            }
            setIsAnalyzing(true);
            addLog('AI', 'Object detection activated', 'success');

            const interval = setInterval(async () => {
                if (videoRef.current && model && featureModel) {
                    try {
                        const predictions = await model.detect(videoRef.current);
                        const confidentOnes = predictions.filter(p => p.score > 0.6);

                        // Match against embeddings
                        const finalDetections = await Promise.all(confidentOnes.map(async (p) => {
                            const embedding = await extractEmbedding(videoRef.current, p.bbox);
                            if (!embedding) return { ...p, identifiedProduct: null };

                            let bestMatch = null;
                            let maxSim = 0;

                            productEmbeddings.forEach(stored => {
                                const sim = cosineSimilarity(embedding, stored.embedding);
                                if (sim > maxSim) {
                                    maxSim = sim;
                                    bestMatch = stored;
                                }
                            });

                            return {
                                ...p,
                                identifiedProduct: maxSim > 0.75 ? bestMatch : null,
                                similarity: maxSim
                            };
                        }));

                        setCurrentDetections(finalDetections);

                        if (finalDetections.length > 0) {
                            finalDetections.forEach(p => {
                                const label = p.identifiedProduct ? p.identifiedProduct.product_name : p.class;
                                processDetection(label, p.score, p.identifiedProduct != null);
                            });
                        }
                    } catch (err) {
                        console.error('Analysis Error:', err);
                    }
                }
            }, 3000);
            window.rtAnalysisInterval = interval;
        } else {
            setIsAnalyzing(false);
            if (window.rtAnalysisInterval) {
                clearInterval(window.rtAnalysisInterval);
                window.rtAnalysisInterval = null;
            }
            addLog('AI', 'Object detection paused', 'info');
        }
    };

    const processDetection = async (label, confidence, isHighPrecision = false) => {
        const mappedProductId = mappings[label.toLowerCase()];
        const mappedProduct = allProducts.find(p => p.id === mappedProductId);
        const displayName = mappedProduct ? mappedProduct.name : label;

        // Update local session counts
        setInventoryCounts(prev => {
            const newCounts = { ...prev };
            newCounts[displayName] = (newCounts[displayName] || 0) + 1;
            return newCounts;
        });

        // Update session stats
        setStats(prev => {
            const isNew = !inventoryCounts[displayName];
            return {
                totalDetections: prev.totalDetections + 1,
                uniqueProducts: isNew ? prev.uniqueProducts + 1 : prev.uniqueProducts,
                lastUpdate: new Date().toLocaleTimeString()
            };
        });

        const logTag = isHighPrecision ? 'AI:PRECISE' : 'AI:GENERIC';
        addLog(logTag, `Found: ${displayName} (${Math.round(confidence * 100)}%)`, isHighPrecision ? 'success' : 'info');

        // Sync to Backend
        try {
            const video = videoRef.current;
            if (!video || video.videoWidth === 0) return;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('file', blob, 'live-detection.jpg');
                formData.append('label', label);
                formData.append('confidence', confidence);
                formData.append('location_id', 1); // Default to Location 1 for global view
                formData.append('camera_id', 1);
                await apiService.detectProductWithSnapshot(formData);
            }, 'image/jpeg', 0.8);
        } catch (err) {
            console.warn('Backend sync failed', err);
        }
    };

    const extractEmbedding = async (video, bbox) => {
        if (!featureModel || !video) return null;
        try {
            const tf = await import('@tensorflow/tfjs');
            return tf.tidy(() => {
                const img = tf.browser.fromPixels(video);
                const [x, y, w, h] = bbox;
                const sx = Math.max(0, x);
                const sy = Math.max(0, y);
                const sw = Math.min(img.shape[1] - sx, w);
                const sh = Math.min(img.shape[0] - sy, h);

                if (sw <= 0 || sh <= 0) return null;

                const cropped = tf.image.cropAndResize(
                    img.expandDims(0),
                    [[sy / img.shape[0], sx / img.shape[1], (sy + sh) / img.shape[0], (sx + sw) / img.shape[1]]],
                    [0],
                    [224, 224]
                );
                const embedding = featureModel.infer(cropped, true);
                return Array.from(embedding.dataSync());
            });
        } catch (err) {
            console.error('Embedding error:', err);
            return null;
        }
    };

    const cosineSimilarity = (a, b) => {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (normA * normB);
    };

    const handleSnapshot = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
            const link = document.createElement('a');
            link.download = `inventory-snapshot-${Date.now()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg');
            link.click();
            addLog('System', 'Snapshot downloaded', 'info');
        }
    };

    const clearSystem = () => {
        setStats({ totalDetections: 0, uniqueProducts: 0, lastUpdate: 'N/A' });
        setActivityLog([]);
        setInventoryCounts({});
        setCurrentDetections([]);
        addLog('System', 'Data cleared', 'info');
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 lg:p-8 font-sans">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Activity className="w-8 h-8 text-blue-400" />
                        Live Inventory Radar
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium italic">Global AI-powered product recognition and autonomous tracking</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={clearSystem} className="p-3 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded-2xl transition-all border border-slate-700">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button onClick={handleSnapshot} disabled={!isCameraActive} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700 disabled:opacity-50">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between border-b-4 border-b-blue-500">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Detections</p>
                        <h2 className="text-3xl font-black text-white mt-1">{stats.totalDetections}</h2>
                    </div>
                    <Box className="w-10 h-10 text-blue-500 opacity-20" />
                </div>
                <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between border-b-4 border-b-emerald-500">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unique Products</p>
                        <h2 className="text-3xl font-black text-white mt-1">{stats.uniqueProducts}</h2>
                    </div>
                    <TrendingUp className="w-10 h-10 text-emerald-500 opacity-20" />
                </div>
                <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between border-b-4 border-b-purple-500">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Signal</p>
                        <h2 className="text-3xl font-black text-white mt-1 uppercase tracking-tighter">{stats.lastUpdate}</h2>
                    </div>
                    <Clock className="w-10 h-10 text-purple-500 opacity-20" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Camera Feed */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#1e293b] border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                <span className="font-black text-xs uppercase tracking-widest text-slate-400">Main Optical Sensor</span>
                            </div>
                            <Maximize2 className="w-5 h-5 text-slate-600 cursor-pointer hover:text-white transition-colors" />
                        </div>

                        <div className="aspect-video bg-black flex items-center justify-center relative">
                            {isCameraActive ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center">
                                    <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-inner">
                                        <Camera className="w-10 h-10 text-slate-800" />
                                    </div>
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Sensor Offline</p>
                                </div>
                            )}

                            {isAnalyzing && currentDetections.map((d, i) => {
                                const mappedProductId = mappings[d.class.toLowerCase()];
                                const mappedProduct = allProducts.find(p => p.id === mappedProductId);
                                const displayName = d.identifiedProduct ? d.identifiedProduct.product_name : (mappedProduct ? mappedProduct.name : d.class);

                                return (
                                    <div
                                        key={i}
                                        className={`absolute border-2 pointer-events-none transition-all duration-300 ${d.identifiedProduct ? 'border-emerald-400 bg-emerald-400/10' : 'border-blue-400 bg-blue-400/10'}`}
                                        style={{
                                            left: `${(d.bbox[0] / (videoRef.current?.videoWidth || 1)) * 100}%`,
                                            top: `${(d.bbox[1] / (videoRef.current?.videoHeight || 1)) * 100}%`,
                                            width: `${(d.bbox[2] / (videoRef.current?.videoWidth || 1)) * 100}%`,
                                            height: `${(d.bbox[3] / (videoRef.current?.videoHeight || 1)) * 100}%`
                                        }}
                                    >
                                        <div className={`text-white text-[10px] font-black px-2 absolute -top-5 left-0 uppercase ${d.identifiedProduct ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                            {displayName} {Math.round((d.similarity || d.score) * 100)}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-8 bg-[#1e293b]">
                            <div className="grid grid-cols-2 gap-6">
                                <button
                                    onClick={toggleCamera}
                                    className={`py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${isCameraActive
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'}`}
                                >
                                    {isCameraActive ? <X className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                    {isCameraActive ? 'Kill Sensor' : 'Boot Sensor'}
                                </button>
                                <button
                                    onClick={toggleAnalysis}
                                    disabled={!isCameraActive || modelLoading}
                                    className={`py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${isAnalyzing
                                        ? 'bg-blue-600 text-white animate-pulse shadow-blue-900/20'
                                        : 'bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'}`}
                                >
                                    <Eye className="w-5 h-5" />
                                    {modelLoading ? 'AI Booting...' : isAnalyzing ? 'Stop AI' : 'Start AI'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Feed Tracking */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Detection Feed */}
                    <div className="bg-[#1e293b] border border-slate-800 rounded-[2rem] p-6 shadow-xl h-[450px] flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2 text-slate-400">
                            <Box className="w-4 h-4 text-blue-500" />
                            Optical Signal Tracking
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {currentDetections.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <RefreshCw className="w-8 h-8 animate-spin mb-3 text-slate-600" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Scanning Spectrum...</p>
                                </div>
                            ) : (
                                currentDetections.map((d, i) => {
                                    const mappedProductId = mappings[d.class.toLowerCase()];
                                    const mappedProduct = allProducts.find(p => p.id === mappedProductId);
                                    const displayName = d.identifiedProduct ? d.identifiedProduct.product_name : (mappedProduct ? mappedProduct.name : d.class);

                                    return (
                                        <div key={i} className={`p-4 rounded-2xl border transition-all ${d.identifiedProduct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0f172a] border-slate-800'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-lg ${d.identifiedProduct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                                                            {d.identifiedProduct ? 'AI:PRECISE' : 'AI:GENERIC'}
                                                        </p>
                                                        <h4 className={`font-black text-sm tracking-tight ${d.identifiedProduct ? 'text-emerald-400' : 'text-slate-200'}`}>
                                                            {displayName}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[10px] font-black underline decoration-2 ${d.identifiedProduct ? 'text-emerald-400 decoration-emerald-500/50' : 'text-blue-400 decoration-blue-500/50'}`}>
                                                        {Math.round((d.similarity || d.score) * 100)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
                                                <div className="flex gap-2 text-[8px] font-bold uppercase tracking-widest">
                                                    <span className="text-slate-600">Source:</span>
                                                    <span className="text-slate-400">{d.class}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setShowTrainingModal(d)}
                                                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors group relative"
                                                    >
                                                        <Box className="w-3.5 h-3.5" />
                                                        <span className="hidden group-hover:block absolute -top-8 right-0 bg-slate-900 text-[8px] text-white px-2 py-1 rounded whitespace-nowrap border border-slate-700 z-10 font-black">TRAIN</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setShowMappingModal(d)}
                                                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-400 transition-colors group relative"
                                                    >
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        <span className="hidden group-hover:block absolute -top-8 right-0 bg-slate-900 text-[8px] text-white px-2 py-1 rounded whitespace-nowrap border border-slate-700 z-10 font-black">MAP</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="bg-[#1e293b] border border-slate-800 rounded-[2rem] p-6 shadow-xl h-[400px] flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2 text-slate-400">
                            <Clock className="w-4 h-4 text-purple-400" />
                            Activity Logs
                        </h3>
                        <div ref={logRef} className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {activityLog.length === 0 ? (
                                <p className="text-slate-600 italic text-[10px] text-center py-10 uppercase tracking-[0.2em]">Silence...</p>
                            ) : (
                                activityLog.map((log, i) => (
                                    <div key={i} className="flex gap-3 leading-relaxed border-l-2 border-slate-800 pl-4 py-1 group hover:border-blue-500/50 transition-all">
                                        <span className="text-slate-600 font-bold text-[9px] shrink-0 mt-0.5">{log.timestamp}</span>
                                        <div className="flex-1">
                                            <span className={`font-black uppercase text-[9px] mr-2 ${log.type === 'error' ? 'text-rose-400' :
                                                    log.type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                                                }`}>
                                                [{log.tag}]
                                            </span>
                                            <p className="text-slate-400 font-medium text-[10px] leading-relaxed">{log.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mapping Modal */}
            {showMappingModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#1e293b] w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
                            <div>
                                <h3 className="font-black text-white text-xl tracking-tight">AI Label Mapping</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                                    Linking: <span className="text-blue-400">{showMappingModal.class}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowMappingModal(null)} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Inventory Product Target</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl p-4 text-white text-sm focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="">-- Choose Product --</option>
                                    {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!selectedProductId) return;
                                    try {
                                        await apiService.createMapping({
                                            ai_label: showMappingModal.class,
                                            product_id: parseInt(selectedProductId)
                                        });
                                        setMappings(prev => ({ ...prev, [showMappingModal.class.toLowerCase()]: parseInt(selectedProductId) }));
                                        addLog('AI', `Mapped sensor label "${showMappingModal.class}" to "${allProducts.find(p => p.id === parseInt(selectedProductId))?.name}"`, 'success');
                                        setShowMappingModal(null);
                                        setSelectedProductId('');
                                    } catch (err) {
                                        addLog('System', 'Mapping registration failed', 'error');
                                    }
                                }}
                                disabled={!selectedProductId}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all"
                            >
                                Register Mapping
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Training Modal */}
            {showTrainingModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#1e293b] w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-emerald-500/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-xl tracking-tight">AI One-Shot Calibration</h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Acquiring visual signature vector</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTrainingModal(null)} className="p-3 hover:bg-emerald-500/10 rounded-2xl text-slate-500 hover:text-emerald-400 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="bg-[#0f172a] p-5 rounded-3xl border border-slate-800 flex items-center gap-5 shadow-inner">
                                <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                                    <Package className="w-10 h-10 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Source</p>
                                    <p className="text-white font-black text-lg">{showTrainingModal.class}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <p className="text-emerald-500 text-[10px] font-black">READY TO LEARN</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Associate with Identity</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl p-4 text-white text-sm focus:border-emerald-500 outline-none transition-all"
                                >
                                    <option value="">-- Choose Product Profile --</option>
                                    {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!selectedProductId || isTraining) return;
                                    setIsTraining(true);
                                    try {
                                        const embedding = await extractEmbedding(videoRef.current, showTrainingModal.bbox);
                                        if (!embedding) throw new Error('Sensor failed to capture signature');

                                        await apiService.trainProduct({
                                            product_id: parseInt(selectedProductId),
                                            embedding: embedding,
                                            label: showTrainingModal.class
                                        });

                                        const prod = allProducts.find(p => p.id === parseInt(selectedProductId));
                                        setProductEmbeddings(prev => [...prev, {
                                            product_id: parseInt(selectedProductId),
                                            embedding,
                                            product_name: prod?.name || 'Unknown'
                                        }]);

                                        addLog('AI:LEARN', `Successfully acquired signature for: ${prod?.name}`, 'success');
                                        setShowTrainingModal(null);
                                        setSelectedProductId('');
                                    } catch (err) {
                                        addLog('System', 'Calibration failed: ' + err.message, 'error');
                                    } finally {
                                        setIsTraining(false);
                                    }
                                }}
                                disabled={!selectedProductId || isTraining}
                                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                {isTraining ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                {isTraining ? 'ACQUIRING...' : 'COMMIT SIGNATURE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>
        </div>
    );
};

export default RealTimeCamera;
