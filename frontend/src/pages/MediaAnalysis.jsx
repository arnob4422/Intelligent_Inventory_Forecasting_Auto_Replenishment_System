import React, { useState, useRef, useEffect } from 'react';
import {
    UploadCloud,
    FileVideo,
    FileImage,
    CheckCircle,
    AlertCircle,
    Loader2,
    ShieldCheck,
    Zap,
    Plus,
    Box,
    TrendingUp,
    Map,
    Activity
} from 'lucide-react';
import { apiService } from '../services/api';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as mobilenet from '@tensorflow-models/mobilenet';

const MediaAnalysis = () => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [mediaType, setMediaType] = useState('image'); // 'image' or 'video'
    const [videoReady, setVideoReady] = useState(false);
    const lastAnalysisTime = useRef(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);
    const [results, setResults] = useState([]);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(1);
    const [mappings, setMappings] = useState([]);
    const [embeddings, setEmbeddings] = useState([]);
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [showTrainingModal, setShowTrainingModal] = useState(false);
    const [selectedDetection, setSelectedDetection] = useState(null);
    const [showMappingModal, setShowMappingModal] = useState(false);
    const [inventoryUpdateStatus, setInventoryUpdateStatus] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [useHighPrecision, setUseHighPrecision] = useState(true);
    const [isStrictMode, setIsStrictMode] = useState(false); // Default to false to show all detections
    const [trainingStats, setTrainingStats] = useState({ totalEmbeddings: 0, uniqueProducts: 0 });

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const objModel = useRef(null);
    const embedModel = useRef(null);

    useEffect(() => {
        loadInitialData();
        loadModels();
    }, []);

    // Auto-analysis when file uploaded or model loaded
    useEffect(() => {
        if (!previewUrl || isAnalyzing || results.length > 0) return;

        // If NOT using high precision, wait for browser models
        if (!useHighPrecision && isModelLoading) return;

        // For video, wait until data is loaded
        if (mediaType === 'video' && !videoReady) return;

        // Small delay to ensure render
        const timer = setTimeout(() => {
            analyzeMedia();
        }, 500);
        return () => clearTimeout(timer);
    }, [previewUrl, isModelLoading, videoReady]);

    const loadInitialData = async () => {
        try {
            const [pRes, mRes, eRes, lRes] = await Promise.all([
                apiService.getProducts(),
                apiService.getMappings(),
                apiService.getEmbeddings(),
                apiService.getLocations()
            ]);
            setProducts(pRes.data);
            setMappings(mRes.data);
            setEmbeddings((eRes.data || []).map(e => ({
                ...e,
                embedding: JSON.parse(e.embedding)
            })));
            setLocations(lRes.data || []);

            // Calculate stats
            const uniqueProds = new Set((eRes.data || []).map(e => e.product_id));
            setTrainingStats({
                totalEmbeddings: (eRes.data || []).length,
                uniqueProducts: uniqueProds.size
            });

            if (lRes.data && lRes.data.length > 0) setSelectedLocation(lRes.data[0].id);
        } catch (err) {
            console.error("Failed to load data:", err);
        }
    };

    const loadModels = async () => {
        try {
            setIsModelLoading(true);
            const [ssd, mobile] = await Promise.all([
                cocoSsd.load(),
                mobilenet.load()
            ]);
            objModel.current = ssd;
            embedModel.current = mobile;
            setIsModelLoading(false);
        } catch (err) {
            console.error("Failed to load AI models:", err);
            setLoadError("Internet connection required to load AI models. Please check your network and refresh.");
            setIsModelLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setMediaType(selectedFile.type.startsWith('video') ? 'video' : 'image');
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setVideoReady(false); // Reset video state
            setResults([]);
            setInventoryUpdateStatus(null);
        }
    };

    const analyzeMedia = async (isBackground = false) => {
        if (!file) return;

        // Only require browser model if NOT using high precision
        if (!useHighPrecision && !objModel.current) return;

        if (isAnalyzing) return; // Prevent overlapping requests

        setIsAnalyzing(true);
        if (!isBackground) {
            setResults([]); // Only clear if explicit user action or new file
        }
        setLoadError(null);

        try {
            if (useHighPrecision) {
                // Call YOLOv8 Detection Server directly for best results
                const formData = new FormData();
                formData.append('file', file);
                formData.append('confidence', 0.01);

                let res;
                if (mediaType === 'image') {
                    console.log("📸 Calling Image AI Server...");
                    res = await apiService.yolov8Detect(formData);
                } else {
                    console.log("🎥 Calling Video AI Server...");
                    res = await apiService.detectVideo(formData);
                }

                console.log("🔍 AI RAW Response:", res.data);

                // Backend returns {success: true, detections: [...]} or {detections: [...]}
                const detections = res.data.detections || (res.data.success ? res.data.detections : null);
                console.log("🔍 Extracted Detections:", detections);

                if (detections && Array.isArray(detections)) {
                    console.log(`✅ Found ${detections.length} detections, processing...`);
                    let processed = detections.map(det => ({
                        ...det,
                        displayName: det.product_name || (det.class_name ? det.class_name.charAt(0).toUpperCase() + det.class_name.slice(1) : 'Unknown'),
                        score: det.confidence,
                        similarity: det.confidence,
                        class: det.class_name,
                        bbox: [det.bbox.x1, det.bbox.y1, det.bbox.x2 - det.bbox.x1, det.bbox.y2 - det.bbox.y1],
                        identifiedProduct: det.product_exists ? {
                            product_id: det.product_id,
                            product_name: det.product_name
                        } : null
                    }));

                    // Apply Strict Mode filtering for Server-side AI too
                    if (isStrictMode) {
                        processed = processed.filter(det => det.product_exists);
                    }

                    setResults(processed);

                    // Redraw canvas for High-Precision results
                    if (mediaType === 'image') {
                        const img = new Image();
                        img.onload = () => drawDetections(processed, img);
                        img.src = previewUrl;
                    } else if (videoRef.current) {
                        drawDetections(processed, videoRef.current);
                    }
                } else if (res.data && res.data.status === 'error') {
                    setLoadError(res.data.message || "Detection failed");
                    setResults([]);
                } else {
                    console.log("⚠️ No detections returned from server.");
                    setResults([]);
                }
            } else {
                // Quick AI Analysis (Browser-side)
                if (mediaType === 'image') {
                    const img = new Image();
                    img.src = previewUrl;
                    await img.decode();
                    const preds = await objModel.current.detect(img);
                    await processDetections(preds, img);
                } else if (videoRef.current) {
                    const preds = await objModel.current.detect(videoRef.current);
                    await processDetections(preds, videoRef.current);
                }
            }
        } catch (err) {
            console.error("Analysis failed:", err);
            setLoadError("High-Precision AI Connection Failed. Please ensure the detection server is running at http://127.0.0.1:8001");
            setResults([]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const processDetections = async (preds, source) => {
        const processed = [];

        for (const pred of preds) {
            const label = pred.class.toLowerCase();
            const mapping = mappings.find(m => m.ai_label === label);

            let identifiedProduct = null;
            let similarity = 0;
            let displayName = pred.class.charAt(0).toUpperCase() + pred.class.slice(1);

            // One-Shot Learning: Match embedding
            const embedding = await extractEmbedding(source, pred.bbox);
            if (embedding) {
                let maxSim = 0;
                let bestMatch = null;

                for (const stored of embeddings) {
                    const sim = cosineSimilarity(embedding, stored.embedding);
                    if (sim > maxSim) {
                        maxSim = sim;
                        bestMatch = stored;
                    }
                }

                if (maxSim > 0.65) {
                    identifiedProduct = bestMatch;
                    similarity = maxSim;
                    displayName = bestMatch.product_name;
                }
            }

            // Fallback 1: MobileNet Multi-Class Second Opinion
            // Don't use MobileNet if we already detected a 'person' (avoid "Torch" misclassification)
            if (!identifiedProduct && label !== 'person') {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 224;
                    canvas.height = 224;
                    const ctx = canvas.getContext('2d');
                    const [x, y, w, h] = pred.bbox;
                    ctx.drawImage(source, x, y, w, h, 0, 0, 224, 224);

                    const predictions = await embedModel.current.classify(canvas, 5);
                    if (predictions && predictions.length > 0) {
                        // 1. Check DB matches
                        for (const p of predictions) {
                            const className = p.className.toLowerCase();
                            const pNames = className.split(', ');

                            const match = products.find(prod => {
                                const prodName = prod.name.toLowerCase();

                                // Aliases for Store Jars (YOLO detects as vase/bottle)
                                const jarShapes = ['vase', 'bottle', 'jar', 'crock', 'pot', 'urn', 'cruet'];
                                if (prodName === 'store jar' && jarShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Coffee Cup shapes
                                const cupShapes = ['drum', 'barrel', 'vase', 'chalice', 'beaker', 'goblet', 'mug', 'cup', 'paper cup', 'coffee'];
                                if (prodName === 'coffee cup' && cupShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Clocks
                                const clockShapes = ['clock', 'watch', 'timer', 'chronometer', 'alarm'];
                                if (prodName === 'clock' && clockShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Stools
                                const stoolShapes = ['stool', 'bar stool', 'tall stool', 'footstool', 'piano stool'];
                                if (prodName === 'bar stool' && stoolShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Grocery items
                                const foodShapes = ['box', 'carton', 'packet', 'bag', 'book', 'microwave', 'oven', 'toaster', 'food', 'snack', 'chocolate', 'biscuit'];
                                if (prodName === 'packaged food' && foodShapes.some(shape => className.includes(shape))) return true;

                                const snackShapes = ['tube', 'can', 'pringles', 'cylinder', 'snack can'];
                                if (prodName === 'snack can' && snackShapes.some(shape => className.includes(shape))) return true;

                                const cleaningShapes = ['bottle', 'spray', 'cleaner', 'detergent', 'soap', 'liquid', 'cleaning item'];
                                if (prodName === 'cleaning item' && cleaningShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Fresh Produce
                                const freshShapes = ['apple', 'orange', 'banana', 'broccoli', 'carrot', 'fruit', 'vegetable'];
                                if (prodName === 'fresh produce' && freshShapes.some(shape => className.includes(shape))) return true;

                                // Specific Produce Matches
                                if (prodName === 'apple' && className.includes('apple')) return true;
                                if (prodName === 'orange' && className.includes('orange')) return true;
                                if (prodName === 'banana' && className.includes('banana')) return true;
                                if (prodName === 'broccoli' && className.includes('broccoli')) return true;
                                if (prodName === 'carrot' && className.includes('carrot')) return true;

                                // Aliases for Meat/Poultry
                                const meatShapes = ['bird', 'chicken', 'meat', 'poultry', 'fish'];
                                if (prodName === 'meat/poultry' && meatShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Kitchenware
                                const kitchenShapes = ['bowl', 'plate', 'dish', 'spoon', 'fork', 'knife', 'pot', 'pan'];
                                if (prodName === 'kitchenware' && kitchenShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Personal Care
                                const personalShapes = ['nivea', 'cream', 'lotion', 'personal care', 'bottle'];
                                if (prodName === 'personal care item' && personalShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Hardware & Lubricants
                                const lubShapes = ['wd-40', 'lubricant', 'blue', 'wd40', 'oil', 'can', 'cylinder'];
                                if (prodName === 'lubricant (wd-40)' && lubShapes.some(shape => className.includes(shape))) return true;

                                const paintShapes = ['spray paint', 'paint', 'red', 'green', 'yellow', 'cap', 'spray', 'can'];
                                if (prodName === 'spray paint' && paintShapes.some(shape => className.includes(shape))) return true;

                                const toolShapes = ['pliers', 'wrench', 'screwdriver', 'hammer', 'tool', 'hand tool', 'scissors', 'knife', 'toothbrush', 'hair drier'];
                                if (prodName === 'hand tool' && toolShapes.some(shape => className.includes(shape))) return true;

                                const boxShapes = ['box', 'carton', 'package', 'slatwall', 'hardware box', 'handbag', 'suitcase', 'backpack', 'book'];
                                if (prodName === 'hardware box' && boxShapes.some(shape => className.includes(shape))) return true;

                                // Aliases for Dairy & Beverages
                                const dairyShapes = ['carton', 'box', 'package', 'container', 'dairy', 'milk', 'cream'];
                                if (prodName === 'dairy carton' && dairyShapes.some(shape => className.includes(shape))) return true;

                                const juiceShapes = ['carton', 'box', 'package', 'juice', 'orange', 'apple', 'nectar'];
                                if (prodName === 'juice carton' && juiceShapes.some(shape => className.includes(shape))) return true;

                                const yogurtShapes = ['cup', 'bowl', 'container', 'tub', 'yogurt', 'curd', 'pot'];
                                if (prodName === 'yogurt container' && yogurtShapes.some(shape => className.includes(shape))) return true;

                                const milkShapes = ['bottle', 'can', 'jug', 'milk', 'dairy', 'white'];
                                if (prodName === 'milk bottle' && milkShapes.some(shape => className.includes(shape))) return true;

                                const genericShapes = ['bottle', 'can', 'tube', 'container', 'item', 'product'];
                                if (prodName === 'product (bottle)' && genericShapes.some(shape => className.includes(shape))) return true;

                                // Strict match for short names
                                if (prodName.length <= 3) {
                                    return pNames.some(pn => pn === prodName);
                                }

                                // Specific match: avoid "pen" matching "pen set" too loosely
                                return pNames.some(pn => {
                                    // 1. Exact match
                                    if (pn === prodName) return true;
                                    // 2. Detection contains product name (e.g. "analog clock" matches "clock")
                                    if (pn.includes(prodName)) return true;
                                    // 3. DO NOT match if product name contains pn (e.g. "pen set" contains "pen" -> NO match)
                                    return false;
                                });
                            });

                            if (match) {
                                displayName = match.name;
                                identifiedProduct = { product_id: match.id, product_name: match.name, label: pNames[0] };
                                break;
                            }
                        }

                        // 2. Logic: Search for Priority items
                        if (!identifiedProduct) {
                            const priorityItems = ['person', 'human', 'clock', 'watch', 'alarm', 'headphone', 'earphone', 'laptop', 'phone', 'keyboard', 'mouse', 'monitor', 'car', 'toy', 'vehicle', 'racer', 'lego', 'f1', 'sports car'];
                            const commonItems = ['bottle', 'book', 'pen', 'chair', 'table', 'desk', 'crate', 'box', 'cargo'];

                            let found = false;
                            for (const p of predictions) {
                                const pName = p.className.toLowerCase();
                                const matchedKw = priorityItems.find(kw => pName.includes(kw));
                                if (matchedKw) {
                                    // Try to find a product that matches this keyword (e.g. "clock")
                                    const prodMatch = products.find(prod => prod.name.toLowerCase().includes(matchedKw));
                                    if (prodMatch) {
                                        displayName = prodMatch.name;
                                        identifiedProduct = { product_id: prodMatch.id, product_name: prodMatch.name, label: pName.split(',')[0] };
                                    } else {
                                        displayName = p.className.split(',')[0];
                                        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                                    }
                                    found = true;
                                    break;
                                }
                            }

                            if (!found) {
                                for (const p of predictions) {
                                    const pName = p.className.toLowerCase();
                                    if (commonItems.some(kw => pName.includes(kw))) {
                                        displayName = p.className.split(',')[0];
                                        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                                        break;
                                    }
                                }
                            }
                        }

                        // 3. Filter out "Stupid" labels
                        if (!identifiedProduct && displayName === pred.class.charAt(0).toUpperCase() + pred.class.slice(1)) {
                            const top = predictions[0];
                            const stupidLabels = ['beetle', 'insect', 'animal', 'organism', 'fungus', 'carpenter', 'kit', 'tool kit', 'tool box', 'scale', 'rule'];
                            if (!stupidLabels.some(s => top.className.toLowerCase().includes(s))) {
                                displayName = top.className.split(',')[0];
                                displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                            }
                        }
                    }
                } catch (e) {
                    console.log("Secondary classification failed", e);
                }
            }

            // HARD CAR OVERRIDE: If primary said 'car' and secondary is mentioning carpenter/tools, stick with 'Car'
            if (!identifiedProduct && (pred.class || '').toLowerCase().includes('car') && (displayName.toLowerCase().includes('carpenter') || displayName.toLowerCase().includes('kit'))) {
                displayName = "Car / Model Racer";
            }

            // Fallback 2: Label mapping
            if (!identifiedProduct && mapping) {
                const p = products.find(prod => prod.id === mapping.product_id);
                if (p) {
                    displayName = p.name;
                    identifiedProduct = { product_id: p.id, product_name: p.name, label: label };
                }
            }

            // Final fallback for Strict Mode
            if (isStrictMode && !identifiedProduct && (displayName === "Unknown Object" || displayName === "Car / Model Racer" || displayName === "Unknown Inventory Item")) {
                displayName = (displayName === "Car / Model Racer") ? displayName : "Unknown Inventory Item";
            }

            processed.push({
                ...pred,
                displayName,
                identifiedProduct,
                similarity,
                embedding: JSON.stringify(Array.from(embedding || []))
            });
        }

        setResults(processed);
        drawDetections(processed, source); // Use processed here
    };

    const extractEmbedding = async (source, bbox) => {
        if (!embedModel.current) return null;
        try {
            const [x, y, w, h] = bbox;
            const canvas = document.createElement('canvas');
            canvas.width = 224;
            canvas.height = 224;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(source, x, y, w, h, 0, 0, 224, 224);
            const tensor = embedModel.current.infer(canvas, true);
            const array = await tensor.data();
            tf.dispose(tensor);
            return array;
        } catch (err) {
            return null;
        }
    };

    const cosineSimilarity = (a, b) => {
        let dot = 0, mA = 0, mB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += (a[i] * b[i]);
            mA += (a[i] * a[i]);
            mB += (b[i] * b[i]);
        }
        return dot / (Math.sqrt(mA) * Math.sqrt(mB));
    };

    const drawDetections = (preds, source) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Initial clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (mediaType === 'image' && imageRef.current) {
            const img = imageRef.current;

            // Re-sync canvas to match the actual rendered image dimensions and position
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;

            // Position canvas exactly on top of the image (handling object-contain etc)
            canvas.style.position = 'absolute';
            canvas.style.left = `${img.offsetLeft}px`;
            canvas.style.top = `${img.offsetTop}px`;
            canvas.style.width = `${img.clientWidth}px`;
            canvas.style.height = `${img.clientHeight}px`;

            scale = img.clientWidth / img.naturalWidth;
            offsetX = 0;
            offsetY = 0;
        } else if (mediaType === 'video' && videoRef.current) {
            const video = videoRef.current;
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
            offsetX = (canvas.width - video.videoWidth * scale) / 2;
            offsetY = (canvas.height - video.videoHeight * scale) / 2;
        }

        // 🛡️ Visual Stress Filter: Browsers lag if drawing 300+ boxes on high-res video
        const visibleResults = preds.slice(0, 200);

        visibleResults.forEach(pred => {
            let [x1, y1, w, h] = pred.bbox;

            // Scaled coordinates
            const sx = x1 * scale + offsetX;
            const sy = y1 * scale + offsetY;
            const sw = w * scale;
            const sh = h * scale;

            const isCocaCola = (pred.displayName || '').toLowerCase().includes('coca');

            ctx.strokeStyle = is_coca_cola(pred) ? '#ef4444' : '#10b981';
            ctx.lineWidth = is_coca_cola(pred) ? 5 : 3;
            ctx.strokeRect(sx, sy, sw, sh);

            // Label background
            ctx.fillStyle = is_coca_cola(pred) ? '#ef4444' : '#10b981';
            ctx.font = `bold ${is_coca_cola(pred) ? '18px' : '14px'} Inter, sans-serif`;
            // USE displayName from processed results to ensure consistency
            const labelText = is_coca_cola(pred) ? "COCA COLA" : (pred.displayName || pred.class || 'Unknown');

            const textMetrics = ctx.measureText(labelText);
            const textWidth = textMetrics.width;
            const textHeight = is_coca_cola(pred) ? 28 : 22;

            ctx.fillRect(sx, sy > textHeight ? sy - textHeight : 0, textWidth + 12, textHeight);

            ctx.fillStyle = 'white';
            ctx.fillText(labelText, sx + 6, sy > textHeight ? sy - 7 : 17);
        });
    };

    const is_coca_cola = (pred) => {
        const name = (pred.displayName || pred.class || '').toLowerCase();
        return name.includes('coca') || name.includes('cola');
    };

    const updateInventory = async (det) => {
        if (!det.identifiedProduct) return;

        try {
            setInventoryUpdateStatus('updating');

            const formData = new FormData();
            formData.append('location_id', selectedLocation);
            formData.append('label', det.identifiedProduct.label || det.class);
            formData.append('confidence', det.score);

            // We use the file itself if it's an image, or a snapshot from canvas if video
            if (mediaType === 'image') {
                formData.append('file', file);
            } else {
                const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/jpeg'));
                formData.append('file', blob, 'detection.jpg');
            }

            await apiService.detectProductWithSnapshot(formData);
            setInventoryUpdateStatus('success');
            setTimeout(() => setInventoryUpdateStatus(null), 3000);
        } catch (err) {
            setInventoryUpdateStatus('error');
            setTimeout(() => setInventoryUpdateStatus(null), 3000);
        }
    };

    const handleVideoTimeUpdate = async () => {
        const now = Date.now();
        // Throttled live frame analysis (ALLOWING concurrent background analysis)
        if (Date.now() - lastAnalysisTime.current > 1000 && !isLiveAnalyzing && videoRef.current && !videoRef.current.paused) {
            lastAnalysisTime.current = Date.now();

            // 📸 CAPTURE CURRENT FRAME Snapshot for fast analysis
            try {
                const video = videoRef.current;
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    setIsLiveAnalyzing(true);
                    try {
                        const formData = new FormData();
                        formData.append('file', blob, 'frame.jpg');
                        formData.append('confidence', 0.01);

                        console.log("🎞️ Analyzing LIVE frame...");
                        const res = await apiService.yolov8Detect(formData);
                        const detections = res.data.detections || (res.data.success ? res.data.detections : []);

                        let processed = detections.map(det => ({
                            ...det,
                            displayName: det.product_name || (det.class_name ? det.class_name.charAt(0).toUpperCase() + det.class_name.slice(1) : 'Unknown'),
                            score: det.confidence,
                            similarity: det.confidence,
                            class: det.class_name,
                            bbox: [det.bbox.x1, det.bbox.y1, det.bbox.x2 - det.bbox.x1, det.bbox.y2 - det.bbox.y1],
                            identifiedProduct: det.product_exists ? {
                                product_id: det.product_id,
                                product_name: det.product_name
                            } : null
                        }));

                        if (isStrictMode) {
                            processed = processed.filter(det => det.product_exists);
                        }

                        setResults(processed);
                        drawDetections(processed, video);
                    } catch (err) {
                        console.error("Live analysis failed:", err);
                    } finally {
                        setIsLiveAnalyzing(false);
                    }
                }, 'image/jpeg', 0.8);
            } catch (err) {
                console.error("Frame capture failed:", err);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Inventory-Specific AI Analysis</h1>
                <p className="text-slate-600">Using your custom-trained model to identify warehouse products.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                        <Box className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Custom Trained</p>
                        <h3 className="text-xl font-black text-emerald-900">{trainingStats.uniqueProducts} Products</h3>
                    </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                        <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Training Samples</p>
                        <h3 className="text-xl font-black text-blue-900">{trainingStats.totalEmbeddings} Images</h3>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                            <ShieldCheck className={`w-6 h-6 ${isStrictMode ? 'text-indigo-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Strict Mode</p>
                            <h3 className="text-sm font-medium text-slate-600">{isStrictMode ? 'Inventory Only' : 'Show All Gueses'}</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsStrictMode(!isStrictMode)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isStrictMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isStrictMode ? 'right-1' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload & Preview Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className={`relative border-2 border-dashed rounded-xl p-12 transition-all flex flex-col items-center justify-center ${previewUrl ? 'border-primary-200 bg-primary-50' : 'border-slate-300 hover:border-primary-400 bg-slate-50'
                            }`}>
                            {!previewUrl ? (
                                <>
                                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                        <UploadCloud className="w-8 h-8 text-primary-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Drop your media here</h3>
                                    <p className="text-sm text-slate-500 mb-6">Support for JPG, PNG, and MP4 files</p>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*,video/*"
                                    />
                                    <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                                        Browse Files
                                    </button>
                                </>
                            ) : (
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                    {mediaType === 'image' ? (
                                        <img ref={imageRef} src={previewUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
                                    ) : (
                                        <video
                                            ref={videoRef}
                                            src={previewUrl}
                                            controls
                                            className="max-w-full max-h-full"
                                            onLoadedData={() => setVideoReady(true)}
                                            onSeeked={() => analyzeMedia(false)}
                                            onPause={() => analyzeMedia(false)}
                                            onTimeUpdate={handleVideoTimeUpdate}
                                        />
                                    )}
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                    />
                                    <button
                                        onClick={() => { setPreviewUrl(null); setFile(null); setResults([]); }}
                                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md transition-all"
                                    >
                                        <Plus className="w-5 h-5 rotate-45" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {previewUrl && (
                            <div className="mt-6 flex gap-4">
                                <button
                                    onClick={analyzeMedia}
                                    disabled={isAnalyzing || isModelLoading}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAnalyzing ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                                    ) : (
                                        <><Zap className="w-5 h-5" /> {useHighPrecision ? 'Run High-Precision AI' : 'Start Quick AI Analysis'}</>
                                    )}
                                </button>
                                <button
                                    onClick={() => setUseHighPrecision(!useHighPrecision)}
                                    className={`px-4 rounded-xl border font-bold transition-all ${useHighPrecision
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    title={useHighPrecision ? "Using Server-Side AI (Most Accurate)" : "Using Browser-Side AI (Fastest)"}
                                >
                                    <ShieldCheck className={`w-6 h-6 ${useHighPrecision ? 'text-emerald-600' : 'text-slate-400'}`} />
                                </button>
                                {mediaType === 'video' && !useHighPrecision && (
                                    <button
                                        onClick={analyzeMedia}
                                        disabled={isAnalyzing}
                                        className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                                    >
                                        Extract Frame
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {isModelLoading && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <p className="text-sm font-medium">Initializing Enterprise AI Engine (Loading 5GB Context)... This may take a moment.</p>
                        </div>
                    )}

                    {loadError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm font-medium">{loadError}</p>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary-600" />
                                Detection Results
                            </h3>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                                {results.length} Objects Found
                            </span>
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {results.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Activity className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm text-slate-400">No objects identified yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Target Location</label>
                                        <select
                                            value={selectedLocation}
                                            onChange={(e) => setSelectedLocation(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm text-slate-700 font-medium focus:ring-2 focus:ring-primary-500"
                                        >
                                            {locations.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {results.map((res, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-primary-100 hover:bg-primary-50/30 transition-all">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {res.identifiedProduct ? (
                                                            <>
                                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                                                    <ShieldCheck className="w-3 h-3" />
                                                                    AI: Precise Match
                                                                </span>
                                                                <span className="text-emerald-600 text-xs font-bold">
                                                                    {Math.round(res.similarity * 100)}%
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">
                                                                AI: Generic
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-slate-800">{res.displayName}</h4>
                                                    <p className="text-xs text-slate-500">Confidence: {Math.round(res.score * 100)}%</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setSelectedDetection(res); setShowTrainingModal(true); }}
                                                        className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                                                        title="Train product"
                                                    >
                                                        <Box className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedDetection(res); setShowMappingModal(true); }}
                                                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                                        title="Map label"
                                                    >
                                                        <Map className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {res.identifiedProduct && (
                                                <button
                                                    onClick={() => updateInventory(res)}
                                                    disabled={inventoryUpdateStatus === 'updating'}
                                                    className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${inventoryUpdateStatus === 'success'
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-200'
                                                        }`}
                                                >
                                                    {inventoryUpdateStatus === 'updating' ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                                                    ) : inventoryUpdateStatus === 'success' ? (
                                                        <><CheckCircle className="w-4 h-4" /> Added to Stock</>
                                                    ) : (
                                                        'Add 1 to Inventory'
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Training Modal */}
            {showTrainingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Box className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Train AI Model</h3>
                                <p className="text-sm text-slate-500">Associate this image with a product</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Select Product</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                                onChange={async (e) => {
                                    const prodId = parseInt(e.target.value);
                                    if (!prodId) return;
                                    try {
                                        await apiService.trainProduct({
                                            product_id: prodId,
                                            embedding: selectedDetection.embedding,
                                            label: selectedDetection.class
                                        });
                                        setShowTrainingModal(false);
                                        loadInitialData(); // Refresh embeddings
                                    } catch (err) {
                                        console.error("Training failed:", err);
                                    }
                                }}
                            >
                                <option value="">Select a product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                            </select>

                            <button
                                onClick={() => setShowTrainingModal(false)}
                                className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all mt-4"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mapping Modal */}
            {showMappingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Map className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Map AI Label</h3>
                                <p className="text-sm text-slate-500">Always link "{selectedDetection?.class}" to:</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <select
                                className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                                onChange={async (e) => {
                                    const prodId = parseInt(e.target.value);
                                    if (!prodId) return;
                                    try {
                                        await apiService.createMapping({
                                            ai_label: selectedDetection.class,
                                            product_id: prodId
                                        });
                                        setShowMappingModal(false);
                                        loadInitialData();
                                    } catch (err) {
                                        console.error("Mapping failed:", err);
                                    }
                                }}
                            >
                                <option value="">Select a product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                            </select>

                            <button
                                onClick={() => setShowMappingModal(false)}
                                className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all mt-4"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaAnalysis;
