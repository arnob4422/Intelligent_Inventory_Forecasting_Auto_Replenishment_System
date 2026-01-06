import React, { useState, useEffect, useRef } from 'react';
import {
    Camera as CameraIcon,
    RefreshCw,
    Play,
    X,
    Box,
    TrendingUp,
    Activity,
    Clock,
    Maximize2,
    Video,
    Info,
    Eye,
    Trash2,
    Package,
    CheckCircle2
} from 'lucide-react';
import { apiService } from '../services/api';

const SmartCameraSystem = ({ locationId = 1, onInventoryUpdate }) => {
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activityLog, setActivityLog] = useState([]);
    const [inventoryCounts, setInventoryCounts] = useState({});
    const [model, setModel] = useState(null);
    const [modelLoading, setModelLoading] = useState(false);
    const [currentDetections, setCurrentDetections] = useState([]);
    const [stats, setStats] = useState({
        totalDetections: 0,
        uniqueProducts: 0,
        lastUpdate: 'N/A'
    });
    const [permissionError, setPermissionError] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [mappings, setMappings] = useState({});
    const [showMappingModal, setShowMappingModal] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [productEmbeddings, setProductEmbeddings] = useState([]);
    const [featureModel, setFeatureModel] = useState(null);
    const [showTrainingModal, setShowTrainingModal] = useState(null);
    const [isTraining, setIsTraining] = useState(false);
    const [isBackendAiEnabled, setIsBackendAiEnabled] = useState(true);
    const [isBackendOnline, setIsBackendOnline] = useState(false);
    const [inventoryUpdates, setInventoryUpdates] = useState([]);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const logRef = useRef(null);
    const logEndRef = useRef(null);

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [activityLog]);

    useEffect(() => {
        checkBackendStatus();
        loadInitialData();
        loadModel();

        // Periodic backend check
        const backendCheck = setInterval(checkBackendStatus, 10000);
        return () => {
            stopEverything();
            clearInterval(backendCheck);
        };
    }, []);

    const checkBackendStatus = async () => {
        try {
            const res = await fetch('http://localhost:8001/api/health');
            if (res.ok) {
                setIsBackendOnline(true);
                addLog('AI', 'YOLOv8 Backend Detection server is ONLINE', 'success');
            }
        } catch (err) {
            setIsBackendOnline(false);
            console.warn('YOLOv8 Backend not detected on port 8001');
        }
    };

    // Ensure video stream is attached when camera becomes active
    useEffect(() => {
        if (isCameraActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    const loadInitialData = async () => {
        try {
            const [cams, productsRes, mappingsRes, embsRes] = await Promise.all([
                apiService.getCameras(),
                apiService.getProducts(),
                apiService.getMappings(),
                apiService.getEmbeddings()
            ]);

            // Add local webcam as an option
            const localCam = { id: 'local-1', name: 'Integrated Webcam', type: 'local', status: 'available' };
            const allCams = [localCam, ...(cams.data || [])];
            setCameras(allCams);
            setSelectedCamera(allCams[0]);

            setAllProducts(productsRes.data || []);
            setProductEmbeddings(embsRes.data || []);

            const mapObj = {};
            (mappingsRes.data || []).forEach(m => {
                mapObj[m.ai_label.toLowerCase()] = m.product_id;
            });
            setMappings(mapObj);

            addLog('System', 'Camera and configuration data loaded', 'success');
        } catch (err) {
            console.error('Failed to load initial data:', err);
            addLog('System', 'Failed to load configuration', 'error');
        }
    };

    const loadModel = async () => {
        setModelLoading(true);
        try {
            const [cocoSsd, tf, mobilenet] = await Promise.all([
                import('@tensorflow-models/coco-ssd'),
                import('@tensorflow/tfjs'),
                import('@tensorflow-models/mobilenet')
            ]);
            const loadedModel = await cocoSsd.load();
            setModel(loadedModel);

            const loadedFeatures = await mobilenet.load({ version: 2, alpha: 1.0 });
            setFeatureModel(loadedFeatures);

            addLog('AI', 'Object Detection and Feature Models loaded', 'success');
        } catch (err) {
            console.error('Model loading error:', err);
            addLog('AI', 'Model initialization failed', 'error');
        } finally {
            setModelLoading(false);
        }
    };

    const loadCameras = async () => {
        setLoading(true);
        try {
            const res = await apiService.getCameras(0, 100, locationId);
            const localCam = { id: 'local-1', name: 'Integrated Webcam', type: 'local', status: 'available' };
            setCameras([localCam, ...(res.data || [])]);
            addLog('System', 'Refreshed camera devices', 'info');
        } catch (err) {
            addLog('System', 'Failed to refresh cameras', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addLog = (tag, message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setActivityLog(prev => [...prev, { timestamp, tag, message, type }]);
    };

    const toggleCamera = async () => {
        if (!isCameraActive) {
            try {
                const constraints = {
                    video: selectedCamera?.deviceId ? { deviceId: { exact: selectedCamera.deviceId } } : true
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraActive(true);
                addLog('Camera', `Started: ${selectedCamera?.name || 'Device'}`, 'success');
            } catch (err) {
                console.error('Camera Error:', err);
                setPermissionError(true);
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
        if (window.storeAnalysisInterval) {
            clearInterval(window.storeAnalysisInterval);
            window.storeAnalysisInterval = null;
        }
        addLog('Camera', 'Monitoring stopped', 'info');
    };

    const toggleAnalysis = () => {
        if (!isAnalyzing) {
            if (!model) {
                addLog('AI', 'Model not ready', 'error');
                return;
            }
            if (!featureModel) {
                addLog('AI', 'Feature model not ready', 'error');
                return;
            }

            setIsAnalyzing(true);
            addLog('AI', 'Object detection activated - scanning every 3 seconds', 'success');
            console.log('🔍 AI Detection Started - Threshold: 30%, Interval: 3s');

            const interval = setInterval(async () => {
                if (videoRef.current && videoRef.current.readyState >= 2 && (isBackendAiEnabled && isBackendOnline ? true : (model && featureModel))) {
                    try {
                        console.log('📸 Scanning frame...');

                        let finalDetections = [];

                        if (isBackendAiEnabled && isBackendOnline) {
                            // Option A: Backend YOLOv8 Detection
                            const canvas = document.createElement('canvas');
                            canvas.width = videoRef.current.videoWidth;
                            canvas.height = videoRef.current.videoHeight;
                            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

                            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
                            if (blob) {
                                const formData = new FormData();
                                formData.append('file', blob, 'frame.jpg');
                                formData.append('location_id', locationId);

                                const response = await apiService.yolov8Detect(formData);
                                if (response.data && response.data.success) {
                                    finalDetections = response.data.detections.map(d => ({
                                        class: d.class_name,
                                        score: d.confidence,
                                        tracking_id: d.tracking_id,
                                        is_new: d.is_new_inventory,
                                        bbox: [d.bbox.x1, d.bbox.y1, d.bbox.x2 - d.bbox.x1, d.bbox.y2 - d.bbox.y1],
                                        identifiedProduct: d.product_id ? { product_id: d.product_id, product_name: d.product_name } : null
                                    }));
                                }
                            }
                        } else {
                            // Option B: Frontend COCO-SSD Detection (Legacy)
                            const predictions = await model.detect(videoRef.current);
                            console.log(`🎯 Raw detections: ${predictions.length}`, predictions.map(p => `${p.class} (${Math.round(p.score * 100)}%)`));

                            const confidentOnes = predictions.filter(p => p.score > 0.30);
                            console.log(`✅ Confident detections (>30%): ${confidentOnes.length}`, confidentOnes.map(p => `${p.class} (${Math.round(p.score * 100)}%)`));

                            if (confidentOnes.length > 0) {
                                // Match against embeddings
                                finalDetections = await Promise.all(confidentOnes.map(async (p) => {
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
                            }
                        }

                        setCurrentDetections(finalDetections);
                        console.log(`📦 Final detections to display: ${finalDetections.length}`);

                        if (finalDetections.length > 0) {
                            // Update stats in bulk to avoid race conditions
                            let newDetectionsCount = 0;
                            const newlyFoundProducts = [];

                            finalDetections.forEach(p => {
                                const label = p.identifiedProduct ? p.identifiedProduct.product_name : p.class;
                                const displayName = label.charAt(0).toUpperCase() + label.slice(1);

                                // Rule: Only count if it's a NEW detection (from tracking) or classic mode
                                const shouldIncrement = isBackendAiEnabled && isBackendOnline ? p.is_new : true;

                                if (shouldIncrement) {
                                    newDetectionsCount++;
                                    if (!inventoryCounts[displayName] && !newlyFoundProducts.includes(displayName)) {
                                        newlyFoundProducts.push(displayName);
                                    }

                                    const logTag = p.tracking_id ? `AI:ID-${p.tracking_id}` : 'AI:DETECTION';
                                    console.log(`🏷️ [${logTag}] Processing: ${p.class} → ${label} (${Math.round((p.score || 0) * 100)}%)`);
                                    processDetection(label, p.score || 0, p.identifiedProduct != null);
                                } else {
                                    console.log(`🔁 [ID:${p.tracking_id}] Tracking existing ${label}`);
                                }
                            });

                            if (newDetectionsCount > 0 || newlyFoundProducts.length > 0) {
                                setStats(prev => ({
                                    totalDetections: prev.totalDetections + newDetectionsCount,
                                    uniqueProducts: prev.uniqueProducts + newlyFoundProducts.length,
                                    lastUpdate: new Date().toLocaleTimeString()
                                }));

                                // Add to Inventory Updates log
                                if (isBackendAiEnabled && isBackendOnline) {
                                    const newSyncs = finalDetections.filter(d => d.is_new).map(d => ({
                                        id: Date.now() + Math.random(),
                                        timestamp: new Date().toLocaleTimeString(),
                                        product: d.product_name,
                                        id_tag: d.tracking_id,
                                        confidence: d.score
                                    }));
                                    if (newSyncs.length > 0) {
                                        setInventoryUpdates(prev => [...newSyncs, ...prev].slice(0, 10));
                                    }
                                }
                            }
                        } else {
                            console.log('ℹ️ No objects detected in this frame');
                        }
                    } catch (err) {
                        console.error('❌ Analysis Error:', err);
                        addLog('AI', `Detection error: ${err.message}`, 'error');
                    }
                } else {
                    console.warn('⚠️ Detection skipped - missing video/model');
                }
            }, 3000);
            window.storeAnalysisInterval = interval;
        } else {
            setIsAnalyzing(false);
            if (window.storeAnalysisInterval) {
                clearInterval(window.storeAnalysisInterval);
                window.storeAnalysisInterval = null;
            }
            console.log('🛑 AI Detection Stopped');
            addLog('AI', 'Deactivated', 'info');
        }
    };

    const processDetection = async (label, confidence, isHighPrecision = false) => {
        // Normalize the label
        const normalizedLabel = label.toLowerCase();

        // AI Label Mapping Check - prioritize this
        const mappedProductId = mappings[normalizedLabel];
        let displayName = label;
        let mappedProduct = null;

        if (mappedProductId) {
            mappedProduct = allProducts.find(p => p.id === mappedProductId);
            if (mappedProduct) {
                displayName = mappedProduct.name;
                console.log(`✅ Mapped "${label}" to "${mappedProduct.name}" via AI label mapping`);
            }
        }

        // If no mapping found, use the original label with title case
        if (!mappedProduct) {
            displayName = label.charAt(0).toUpperCase() + label.slice(1);
        }

        setInventoryCounts(prev => {
            const newCounts = { ...prev };
            newCounts[displayName] = (newCounts[displayName] || 0) + 1;
            return newCounts;
        });

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
                formData.append('file', blob, 'store-detection.jpg');
                formData.append('label', normalizedLabel);
                formData.append('confidence', confidence);
                formData.append('location_id', locationId);
                const camId = (selectedCamera && typeof selectedCamera.id === 'number') ? selectedCamera.id : 1;
                formData.append('camera_id', camId);

                await apiService.detectProductWithSnapshot(formData);
                if (onInventoryUpdate) onInventoryUpdate();
            }, 'image/jpeg', 0.8);
        } catch (err) {
            console.warn('Backend sync failed', err);
        }
    };

    const extractEmbedding = async (video, bbox) => {
        if (!featureModel || !video) return null;
        try {
            const tf = await import('@tensorflow/tfjs');

            // Create tensors
            const img = tf.browser.fromPixels(video);
            const [x, y, sw, sh] = bbox;

            // Bounds checking
            const sx = Math.max(0, x);
            const sy = Math.max(0, y);
            const finalW = Math.min(img.shape[1] - sx, sw);
            const finalH = Math.min(img.shape[0] - sy, sh);

            if (finalW <= 0 || finalH <= 0) {
                img.dispose();
                return null;
            }

            const cropped = tf.image.cropAndResize(
                img.expandDims(0),
                [[sy / img.shape[0], sx / img.shape[1], (sy + finalH) / img.shape[0], (sx + finalW) / img.shape[1]]],
                [0],
                [224, 224]
            );

            const embedding = featureModel.infer(cropped, true);

            // Extract data BEFORE disposing tensors
            const embeddingData = await embedding.data();
            const result = Array.from(embeddingData);

            // Clean up tensors
            img.dispose();
            cropped.dispose();
            embedding.dispose();

            return result;
        } catch (err) {
            console.warn('Embedding extraction failed:', err);
            return null;
        }
    };

    const cosineSimilarity = (a, b) => {
        if (!a || !b) return 0;
        try {
            const arrA = Array.isArray(a) ? a : (typeof a === 'string' ? JSON.parse(a) : []);
            const arrB = Array.isArray(b) ? b : (typeof b === 'string' ? JSON.parse(b) : []);

            if (!arrA.length || !arrB.length) return 0;

            const dotProduct = arrA.reduce((sum, val, i) => sum + val * (arrB[i] || 0), 0);
            const normA = Math.sqrt(arrA.reduce((sum, val) => sum + val * val, 0));
            const normB = Math.sqrt(arrB.reduce((sum, val) => sum + val * val, 0));

            if (normA === 0 || normB === 0) return 0;
            return dotProduct / (normA * normB);
        } catch (e) {
            console.warn('Similarity calculation error:', e);
            return 0;
        }
    };

    const handleSnapshot = async () => {
        if (!videoRef.current || !isCameraActive) return;
        addLog('System', 'Capturing snapshot...', 'info');

        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

            canvas.toBlob(async (blob) => {
                await apiService.uploadSnapshot(locationId, selectedCamera.id || 1, blob);
                addLog('System', 'Snapshot saved to server', 'success');
            }, 'image/jpeg', 0.9);
        } catch (err) {
            addLog('System', 'Snapshot failed', 'error');
        }
    };

    const clearSession = () => {
        setStats({ totalDetections: 0, uniqueProducts: 0, lastUpdate: 'N/A' });
        setActivityLog([]);
        setInventoryCounts({});
        setInventoryUpdates([]);
        setCurrentDetections([]);
        addLog('System', 'Session data cleared', 'info');
    };

    if (modelLoading) {
        return (
            <div className="flex items-center justify-center p-20 bg-[#0f172a] rounded-3xl border border-blue-500/20">
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest">Waking up AI engines...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Setup */}
            <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
                        <CameraIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Live Camera Setup</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Store Monitoring • Location ID: {locationId}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <select
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-bold text-sm appearance-none cursor-pointer"
                            value={selectedCamera?.id || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const isLocal = val.startsWith('local-');
                                setSelectedCamera(cameras.find(c => isLocal ? c.id === val : c.id === parseInt(val)));
                            }}
                        >
                            {cameras.length > 0 ? cameras.map(cam => (
                                <option key={cam.id} value={cam.id}>{cam.name}</option>
                            )) : <option>No cameras found</option>}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <Video className="w-4 h-4" />
                        </div>
                    </div>

                    <button
                        onClick={() => loadCameras()}
                        disabled={loading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'REFRESHING...' : 'REFRESH DEVICES'}
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-lg hover:border-blue-500/30 transition-all group">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Total Detections</p>
                        <h3 className="text-3xl font-black text-white">{stats.totalDetections}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                        <Box className="w-7 h-7" />
                    </div>
                </div>
                <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-lg hover:border-emerald-500/30 transition-all group">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-emerald-400 transition-colors">Unique Products</p>
                        <h3 className="text-3xl font-black text-white">{stats.uniqueProducts}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                </div>
                <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-lg hover:border-purple-500/30 transition-all group">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-purple-400 transition-colors">Last Detection</p>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{stats.lastUpdate}</h3>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                        <Clock className="w-7 h-7" />
                    </div>
                </div>
            </div>

            {/* Main Video View */}
            <div className="bg-[#0f172a] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
                <div className="p-4 border-b border-slate-800 bg-[#1e293b]/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{selectedCamera?.name || 'Live View'}</span>
                        </div>
                        <div className="h-4 w-[1px] bg-slate-700"></div>
                        <div className="flex items-center gap-3">
                            <Activity className={`w-4 h-4 ${isBackendOnline ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isBackendOnline ? 'text-emerald-400' : 'text-rose-500'}`}>
                                YOLOv8: {isBackendOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                            {!isBackendOnline && (
                                <button onClick={checkBackendStatus} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded-lg border border-slate-700 font-bold">RETRY</button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="aspect-video bg-[#020617] flex items-center justify-center relative shadow-inner">
                    {isCameraActive ? (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                    ) : (
                        <div className="text-center group">
                            <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800 group-hover:border-blue-500/50 transition-all duration-500 shadow-2xl">
                                <CameraIcon className="w-10 h-10 text-slate-700 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <p className="text-slate-500 font-black text-sm uppercase tracking-[0.2em]">Camera Inactive</p>
                            <p className="text-slate-700 text-[10px] font-bold mt-2">Click "START CAMERA" to begin monitoring</p>
                        </div>
                    )}

                    {isAnalyzing && currentDetections.map((d, i) => {
                        const label = d.identifiedProduct ? d.identifiedProduct.product_name : d.class;
                        const displayName = label.charAt(0).toUpperCase() + label.slice(1);
                        return (
                            <div
                                key={i}
                                className={`absolute border-2 pointer-events-none transition-all duration-300 shadow-lg ${d.identifiedProduct ? 'border-emerald-400 bg-emerald-400/10' : 'border-blue-400 bg-blue-400/10'}`}
                                style={{
                                    left: `${(d.bbox[0] / (videoRef.current?.videoWidth || 1)) * 100}%`,
                                    top: `${(d.bbox[1] / (videoRef.current?.videoHeight || 1)) * 100}%`,
                                    width: `${(d.bbox[2] / (videoRef.current?.videoWidth || 1)) * 100}%`,
                                    height: `${(d.bbox[3] / (videoRef.current?.videoHeight || 1)) * 100}%`
                                }}
                            >
                                <div className={`text-white text-[10px] font-black px-2 py-0.5 absolute -top-5 left-0 uppercase shadow-md ${d.identifiedProduct ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                    {displayName}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Controls Bar Below Video */}
                <div className="p-6 bg-[#1e293b] border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={toggleCamera}
                        className={`py-4 rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg ${isCameraActive ? 'bg-rose-600 hover:bg-rose-700 hover:scale-[1.02] shadow-rose-900/20' : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] shadow-emerald-900/20'}`}
                    >
                        {isCameraActive ? <X className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        {isCameraActive ? 'STOP CAMERA' : 'START CAMERA'}
                    </button>
                    <button
                        onClick={handleSnapshot}
                        disabled={!isCameraActive}
                        className="py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale transition-all hover:scale-[1.02] shadow-lg shadow-slate-900/20"
                    >
                        <CameraIcon className="w-5 h-5" />
                        CAPTURE
                    </button>
                    <button
                        onClick={toggleAnalysis}
                        disabled={!isCameraActive || modelLoading}
                        className={`py-4 rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg ${isAnalyzing ? 'bg-blue-600 animate-pulse shadow-blue-900/40' : 'bg-[#1e40af] hover:bg-blue-700 text-white disabled:opacity-30 shadow-blue-900/20'}`}
                    >
                        <Eye className="w-5 h-5" />
                        {modelLoading ? 'LOADING...' : isAnalyzing ? 'STOP AI' : `START ${isBackendAiEnabled && isBackendOnline ? 'YOLOv8' : 'AI'} DETECTION`}
                    </button>
                    <button
                        onClick={clearSession}
                        className="py-4 bg-[#0f172a] hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 transition-all border border-slate-800 hover:border-slate-700"
                    >
                        <Trash2 className="w-4 h-4" />
                        CLEAR SESSION
                    </button>
                </div>
            </div>

            {/* AI Settings Toggle */}
            {isBackendOnline && (
                <div className="flex items-center justify-center">
                    <div className="bg-[#1e293b] p-3 px-6 rounded-full border border-slate-800 flex items-center gap-6 shadow-2xl">
                        <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Mode</span>
                        </div>
                        <div className="h-4 w-[1px] bg-slate-700"></div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Use Backend AI</span>
                            <button
                                onClick={() => setIsBackendAiEnabled(!isBackendAiEnabled)}
                                className={`w-12 h-6 rounded-full relative transition-all shadow-inner ${isBackendAiEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${isBackendAiEnabled ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Frame Detections */}
                <div className="bg-[#1e293b] rounded-3xl border border-slate-800 p-6 flex flex-col h-[500px] shadow-xl">
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-3 pb-4 border-b border-slate-800/50">
                        <Box className="w-5 h-5" />
                        Current Frame ({currentDetections.length})
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {currentDetections.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <Package className="w-12 h-12 mb-3" />
                                <p className="text-slate-400 italic text-[10px] text-center tracking-widest uppercase">Scanning for products...</p>
                            </div>
                        ) : (
                            currentDetections.map((d, i) => {
                                const label = d.identifiedProduct ? d.identifiedProduct.product_name : d.class;
                                const displayName = label.charAt(0).toUpperCase() + label.slice(1);
                                return (
                                    <div key={i} className={`p-4 rounded-2xl border transition-all hover:bg-slate-800/30 ${d.identifiedProduct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0f172a] border-slate-800'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${d.identifiedProduct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                                                        Inventory Detection
                                                    </p>
                                                    <h4 className={`font-black text-sm tracking-tight ${d.identifiedProduct ? 'text-emerald-400' : 'text-slate-200'}`}>
                                                        {displayName}
                                                    </h4>
                                                </div>
                                            </div>
                                            <div className={`p-1.5 rounded-lg ${d.identifiedProduct ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                <CheckCircle2 className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Inventory Updates */}
                <div className="bg-[#1e293b] rounded-3xl border border-slate-800 p-6 flex flex-col h-[500px] shadow-xl">
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-emerald-400 mb-6 flex items-center gap-3 pb-4 border-b border-slate-800/50">
                        <CheckCircle2 className="w-5 h-5" />
                        Inventory Updates
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {inventoryUpdates.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <Activity className="w-12 h-12 mb-3" />
                                <p className="text-slate-400 italic text-[10px] text-center tracking-widest uppercase">No updates yet...</p>
                            </div>
                        ) : (
                            inventoryUpdates.map((up) => (
                                <div key={up.id} className="p-4 rounded-2xl bg-[#0f172a] border border-emerald-500/20 flex items-center justify-between animate-in fade-in slide-in-from-right-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <div>
                                            <p className="text-[10px] font-black text-white">{up.product}</p>
                                            <p className="text-[8px] font-bold text-slate-500">Inventory Status: Synced</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500">{up.timestamp}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Activity Log */}
                <div className="bg-[#1e293b] rounded-3xl border border-slate-800 p-6 flex flex-col h-[500px] shadow-xl">
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-purple-400 mb-6 flex items-center gap-3 pb-4 border-b border-slate-800/50">
                        <Clock className="w-5 h-5" />
                        Activity Log
                    </h3>
                    <div ref={logRef} className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar scroll-smooth">
                        {activityLog.length === 0 ? (
                            <p className="text-slate-600 italic py-8 text-center text-[10px] uppercase tracking-widest">Awaiting system events...</p>
                        ) : (
                            activityLog.map((log, i) => (
                                <div key={i} className="flex gap-4 leading-relaxed border-l-2 border-slate-800 pl-4 py-1 hover:border-blue-500/50 transition-colors">
                                    <span className="text-[9px] text-slate-600 font-black shrink-0">{log.timestamp}</span>
                                    <div className="flex-1">
                                        <span className={`text-[9px] font-black uppercase mr-2 ${log.type === 'error' ? 'text-rose-400' :
                                            log.type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                                            }`}>[{log.tag}]</span>
                                        <span className="text-[10px] text-slate-400 font-bold">{log.message}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}</style>

            {/* Mapping Modal */}
            {
                showMappingModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1e293b] w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-white text-lg tracking-tight">AI Label Mapping</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                                        Linking: <span className="text-blue-400">{showMappingModal.class}</span>
                                    </p>
                                </div>
                                <button onClick={() => setShowMappingModal(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Inventory Product</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full bg-[#0f172a] border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none transition-all"
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
                                            const prod = allProducts.find(p => p.id === parseInt(selectedProductId));
                                            setMappings(prev => ({ ...prev, [showMappingModal.class.toLowerCase()]: parseInt(selectedProductId) }));
                                            addLog('System', `Mapped "${showMappingModal.class}" to "${prod.name}"`, 'success');
                                            setShowMappingModal(null);
                                            setSelectedProductId('');
                                        } catch (err) {
                                            addLog('System', 'Mapping failed', 'error');
                                        }
                                    }}
                                    disabled={!selectedProductId}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
                                >
                                    Confirm Mapping
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Training Modal */}
            {
                showTrainingModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#1e293b] w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-emerald-500/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-lg tracking-tight">One-Shot Training</h3>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">Teach AI a specific product signature</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowTrainingModal(null)} className="p-2 hover:bg-emerald-500/10 rounded-xl text-slate-500 hover:text-emerald-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                                        <Package className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Visual Target</p>
                                        <p className="text-white font-black text-base">{showTrainingModal.class}</p>
                                        <p className="text-emerald-500 text-[10px] font-bold">Vector Signature Ready</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Identify as Inventory Item</label>
                                    <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="w-full bg-[#0f172a] border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-emerald-500 outline-none transition-all"
                                    >
                                        <option value="">-- Select Target Product --</option>
                                        {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!selectedProductId || isTraining) return;
                                        setIsTraining(true);
                                        try {
                                            const embedding = await extractEmbedding(videoRef.current, showTrainingModal.bbox);
                                            if (!embedding) throw new Error('Could not extract visual signature');

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

                                            addLog('AI:TRAINED', `Learned signature for: ${prod?.name}`, 'success');
                                            setShowTrainingModal(null);
                                            setSelectedProductId('');
                                        } catch (err) {
                                            addLog('System', 'Training failed: ' + err.message, 'error');
                                        } finally {
                                            setIsTraining(false);
                                        }
                                    }}
                                    disabled={!selectedProductId || isTraining}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                                >
                                    {isTraining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                                    {isTraining ? 'GENERATING SIGNATURE...' : 'TRAIN PRODUCT SIGNATURE'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SmartCameraSystem;

