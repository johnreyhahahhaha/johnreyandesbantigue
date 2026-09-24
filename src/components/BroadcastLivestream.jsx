import React, { useState, useRef, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, CircularProgress, Typography, Paper, Chip, Stack
} from '@mui/material';
import { ScreenShare as ScreenShareIcon, Stop as StopIcon } from '@mui/icons-material';
import { livestreamAPI, livestreamRecordingsAPI } from '../api/apiClient';
import { createSignalingSocket, joinRoom, sendSignalingMessage, createBroadcasterPeer } from '../utils/webrtc';

const BroadcastLivestream = ({ open, onClose, livestreamId, maxViewers = 0 }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamUrl, setStreamUrl] = useState('');
    const [mode, setMode] = useState('camera');
    const [deviceList, setDeviceList] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [videoTrackInfo, setVideoTrackInfo] = useState('');
    const [deviceMessage, setDeviceMessage] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const socketRef = useRef(null);
    const peersRef = useRef(new Map());
    const recorderRef = useRef(null);
    const cameraRecordersRef = useRef([]);
    const recordingChunksRef = useRef([]);

    const updateViewerCountInDatabase = async (nextCount) => {
        if (!livestreamId) return;
        try {
            await livestreamAPI.update(livestreamId, { current_viewers: Math.max(0, Number(nextCount) || 0) });
        } catch (err) {
            console.warn('Failed to sync current viewer count', err);
        }
    };

    const viewerPercent = maxViewers > 0 ? Math.min(100, (viewerCount / maxViewers) * 100) : 0;

    useEffect(() => {
        if (open) {
            loadDevices();
        }
        if (!open && isBroadcasting) {
            stopBroadcast();
        }
        return () => {
            if (isBroadcasting) stopBroadcast();
        };
    }, [open]);

    useEffect(() => {
        if (open && mode === 'camera') {
            loadDevices();
        }
    }, [mode, open]);

    useEffect(() => {
        if (mode === 'camera' && deviceList.length > 0) {
            setSelectedDevice((prev) => prev || deviceList[0].deviceId);
        }
    }, [deviceList, mode]);

    const loadDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setDeviceList(videoDevices);
            setDeviceMessage(`Nakakita ng ${videoDevices.length} video device${videoDevices.length === 1 ? '' : 's'}`);
            if (videoDevices.length > 0 && !selectedDevice) {
                setSelectedDevice(videoDevices[0].deviceId);
            }
            setSelectedDevices((previous) => {
                const availableIds = new Set(videoDevices.map((device) => device.deviceId));
                const retained = previous.filter((deviceId) => availableIds.has(deviceId));
                return retained.length > 0 ? retained : videoDevices.slice(0, 4).map((device) => device.deviceId);
            });
            setVideoTrackInfo('');
        } catch (err) {
            console.warn('Unable to enumerate devices', err);
            setError('Hindi ma-enumerate ang camera devices. I-check ang browser permissions.');
            setDeviceMessage('');
        }
    };

    const getCameraStream = async () => {
        const cameraIds = selectedDevices.length > 0 ? selectedDevices : [selectedDevice].filter(Boolean);
        if (cameraIds.length === 0) {
            return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }

        const cameraStreams = await Promise.all(cameraIds.map((deviceId) => (
            navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false })
        )));
        const combinedStream = new MediaStream();
        cameraStreams.forEach((cameraStream) => {
            cameraStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));
        });

        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            audioStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
        } catch (audioError) {
            if (audioError?.name !== 'NotFoundError' && audioError?.name !== 'OverconstrainedError') throw audioError;
        }
        return combinedStream;
    };

    const createViewerPeerFor = (viewerId) => {
        if (peersRef.current.has(viewerId) || !streamRef.current || !socketRef.current) {
            return peersRef.current.get(viewerId);
        }

        const peer = createBroadcasterPeer({
            stream: streamRef.current,
            onSignal: (payload) => {
                sendSignalingMessage(socketRef.current, payload, viewerId, livestreamId);
            },
            onConnect: () => {
            },
            onError: (err) => {
                console.error('Broadcaster peer error', err);
            },
        });

        peer.on('close', () => {
            peersRef.current.delete(viewerId);
            setViewerCount((count) => {
                const nextCount = Math.max(0, count - 1);
                updateViewerCountInDatabase(nextCount);
                return nextCount;
            });
        });

        peersRef.current.set(viewerId, peer);
        setViewerCount((count) => {
            const nextCount = count + 1;
            updateViewerCountInDatabase(nextCount);
            return nextCount;
        });
        return peer;
    };

    const handleSignalingMessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'welcome') {
                return;
            }
                    if (data.type === 'viewer-joined' && data.viewerId) {
                createViewerPeerFor(data.viewerId);
                return;
            }
            if (data.type === 'signal') {
                const payloadIsValid = data.payload && typeof data.payload === 'object';
                if (!payloadIsValid || !data.from) {
                    console.warn('Broadcast ignoring invalid signal message', data);
                    return;
                }
                const peer = peersRef.current.get(data.from) || createViewerPeerFor(data.from);
                if (peer) {
                    try {
                        peer.signal(data.payload);
                    } catch (err) {
                        console.error('Broadcast peer.signal error', err, data.payload);
                    }
                }
            }
        } catch (err) {
            console.warn('Invalid signaling message', err);
        }
    };

    const initializeSignaling = () => {
        if (!livestreamId) return;
        const socket = createSignalingSocket();
        socketRef.current = socket;
        socket.addEventListener('message', handleSignalingMessage);
        socket.addEventListener('open', () => {
            joinRoom(socket, { role: 'broadcaster', livestreamId: livestreamId.toString() });
        });
        socket.addEventListener('close', () => {
            console.warn('Broadcast signaling connection closed');
        });
        socket.addEventListener('error', (err) => {
            console.error('Broadcast signaling error', err);
        });
    };

    const generateUniqueWatchUrl = () => {
        const liveToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        return `${window.location.origin}/watch/${livestreamId}?live=${encodeURIComponent(liveToken)}`;
    };

    const startBroadcast = async () => {
        setLoading(true);
        setError('');
        try {
            let mediaStream;
            if (mode === 'screen') {
                mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } else {
                mediaStream = await getCameraStream();
            }
            streamRef.current = mediaStream;

            if (typeof MediaRecorder !== 'undefined') {
                const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                    ? 'video/webm;codecs=vp9,opus'
                    : 'video/webm';
                const videoTracks = mediaStream.getVideoTracks();
                cameraRecordersRef.current = mode === 'camera' ? videoTracks.map((videoTrack, index) => {
                    const cameraStream = new MediaStream([videoTrack, ...mediaStream.getAudioTracks()]);
                    const chunks = [];
                    const recorder = new MediaRecorder(cameraStream, { mimeType });
                    recorder.ondataavailable = (event) => {
                        if (event.data.size > 0) chunks.push(event.data);
                    };
                    recorder.start(1000);
                    return { recorder, chunks, angle: `Camera ${index + 1}` };
                }) : [];
                if (mode === 'screen' || videoTracks.length === 0) {
                    recordingChunksRef.current = [];
                    recorderRef.current = new MediaRecorder(mediaStream, { mimeType });
                    recorderRef.current.ondataavailable = (event) => {
                        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
                    };
                    recorderRef.current.start(1000);
                }
            }

            if (!mediaStream || mediaStream.getVideoTracks().length === 0) {
                throw new Error('Walang video track na nakuha. I-check ang Iriun camera o screen selection.');
            }

            const tracks = mediaStream.getVideoTracks();
            setVideoTrackInfo(`Video tracks: ${tracks.length} • ${tracks.map((track) => track.label || 'Unknown').join(', ')}`);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.autoplay = true;
                videoRef.current.muted = true;
                videoRef.current.playsInline = true;
                videoRef.current.preload = 'auto';
                try {
                    await videoRef.current.play();
                } catch (playError) {
                    console.warn('Unable to autoplay preview', playError);
                    setError('Nakuha ang camera pero hindi nag-auto play. I-click ang play button sa video preview.');
                }
            }

            const watchUrl = generateUniqueWatchUrl();
            setStreamUrl(watchUrl);

            initializeSignaling();

            if (livestreamId) {
                await livestreamAPI.update(livestreamId, { streaming_url: watchUrl, status: 'Live' });
            }

            setIsBroadcasting(true);
        } catch (err) {
                const message = err?.message || 'Unknown error while starting the broadcast.';
                if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
                    setError('Screen share or camera access denied. Please allow access and try again.');
                } else if (message.includes('video track')) {
                    setError('Walang video track na nakuha. Piliin ang tamang camera o i-restart ang Iriun app at browser.');
                } else {
                    setError('Failed to start broadcast: ' + message);
                }
                console.error('Broadcast start error', err);
            } finally {
                setLoading(false);
            }
        };
    const stopBroadcast = async () => {
        const cameraRecordings = cameraRecordersRef.current;
        cameraRecordersRef.current = [];
        for (const cameraRecording of cameraRecordings) {
            if (cameraRecording.recorder.state !== 'inactive') {
                await new Promise((resolve) => {
                    cameraRecording.recorder.onstop = resolve;
                    cameraRecording.recorder.stop();
                });
            }
            if (cameraRecording.chunks.length > 0 && livestreamId) {
                try {
                    const recording = new Blob(cameraRecording.chunks, { type: cameraRecording.recorder.mimeType || 'video/webm' });
                    const formData = new FormData();
                    formData.append('livestream_id', livestreamId);
                    formData.append('recording', recording, `livestream-${livestreamId}-${cameraRecording.angle.toLowerCase().replace(' ', '-')}.webm`);
                    formData.append('recording_angle', cameraRecording.angle);
                    await livestreamRecordingsAPI.create(formData);
                } catch (err) {
                    console.warn(`Failed to upload ${cameraRecording.angle} replay`, err);
                }
            }
        }
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            await new Promise((resolve) => {
                recorderRef.current.onstop = resolve;
                recorderRef.current.stop();
            });
            if (recordingChunksRef.current.length > 0 && livestreamId) {
                try {
                    const recording = new Blob(recordingChunksRef.current, { type: recorderRef.current.mimeType || 'video/webm' });
                    const formData = new FormData();
                    formData.append('livestream_id', livestreamId);
                    formData.append('recording', recording, `livestream-${livestreamId}.webm`);
                    await livestreamRecordingsAPI.create(formData);
                } catch (err) {
                    console.warn('Failed to upload livestream replay', err);
                }
            }
            recorderRef.current = null;
            recordingChunksRef.current = [];
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        peersRef.current.forEach((peer) => peer.destroy());
        peersRef.current.clear();
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setVideoTrackInfo('');
        setViewerCount(0);
        if (livestreamId) {
            try {
                await livestreamAPI.update(livestreamId, { streaming_url: '', status: 'Ended', current_viewers: 0 });
            } catch (err) {
                console.warn('Failed to clear livestream URL after stopping broadcast', err);
            }
        }
        if (streamUrl && window.URL && typeof window.URL.revokeObjectURL === 'function') {
            window.URL.revokeObjectURL(streamUrl);
        }
        setStreamUrl('');
        setIsBroadcasting(false);
    };

    const handleClose = () => {
        if (isBroadcasting) {
            stopBroadcast();
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScreenShareIcon sx={{ color: '#047857' }} />
                    {mode === 'screen' ? 'Live Screen Broadcast' : 'Live Camera Broadcast'}
                </Box>
            </DialogTitle>
            <DialogContent sx={{ py: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Paper sx={{ bgcolor: '#000', borderRadius: 1, overflow: 'hidden', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, position: 'relative' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        controls
                        style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#000' }}
                    />
                    {!isBroadcasting && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0, 0, 0, 0.56)' }}>
                            <Typography variant="body2" sx={{ color: '#fff', textAlign: 'center', px: 2 }}>
                                Ang preview ay lalabas dito kapag nagsimula na ang broadcast. I-click ang Start Camera Broadcast.
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {!isBroadcasting ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                                variant={mode === 'camera' ? 'contained' : 'outlined'}
                                onClick={() => setMode('camera')}
                                size="small"
                            >
                                Camera
                            </Button>
                            <Button
                                variant={mode === 'screen' ? 'contained' : 'outlined'}
                                onClick={() => setMode('screen')}
                                size="small"
                            >
                                Screen
                            </Button>
                        </Box>
                        {mode === 'camera' && deviceList.length > 0 && (
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Piliin ang camera devices (hanggang 4):
                                </Typography>
                                {[0, 1, 2, 3].map((index) => (
                                    <select
                                        key={index}
                                        value={selectedDevices[index] || ''}
                                        onChange={(e) => {
                                            const nextDevices = [...selectedDevices];
                                            if (e.target.value) nextDevices[index] = e.target.value;
                                            else nextDevices.splice(index, 1);
                                            setSelectedDevices(nextDevices.filter(Boolean));
                                            setSelectedDevice(nextDevices[0] || '');
                                        }}
                                        style={{ width: '100%', padding: '8px 12px', marginTop: 8, borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '14px' }}
                                    >
                                        <option value="">No camera selected</option>
                                        {deviceList.map((device) => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `Camera ${deviceList.indexOf(device) + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                ))}
                            </Box>
                        )}
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Piliin ang {mode === 'screen' ? 'screen/window' : 'camera'} na ipo-project sa livestream. Ang broadcast ay local na preview ngayon.
                        </Alert>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Kung gumagamit ng Iriun, tiyaking naka-open ang app at piliin ang Iriun camera mula sa browser permission prompt.
                        </Alert>
                        {mode === 'camera' && deviceList.length === 0 && (
                            <Alert severity="warning">Walang available na camera device na nakita. I-reload ang browser at i-check kung naka-on ang Iriun webcam.</Alert>
                        )}
                        {mode === 'camera' && deviceList.length > 0 && (
                            <Alert severity="info">
                                {deviceMessage}: {deviceList.map((device) => device.label || 'Unnamed camera').join(', ')}
                            </Alert>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="success">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a', animation: 'pulse 1s infinite' }} />
                                <Typography variant="body2">
                                    🔴 LIVE - {mode === 'screen' ? 'Screen sharing' : 'Camera feed'} active
                                </Typography>
                            </Box>
                        </Alert>
                        {streamUrl && (
                            <Alert severity="info">
                                Watch page link stored: <strong>{streamUrl}</strong>
                            </Alert>
                        )}
                        {videoTrackInfo && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                {videoTrackInfo}
                            </Alert>
                        )}
                        <Alert severity="info" sx={{ mt: 1 }}>
                            Kasalukuyang naka-connect na manonood: <strong>{viewerCount}</strong>
                            {maxViewers > 0 && <> • {viewerPercent.toFixed(0)}% ng capacity</>}
                        </Alert>
                        {maxViewers > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, color: '#475569', fontSize: 12 }}>
                                    <span>Viewer capacity</span>
                                    <span>{viewerCount}/{maxViewers}</span>
                                </Box>
                                <Box sx={{ width: '100%', height: 10, borderRadius: 999, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                                    <Box sx={{ width: `${viewerPercent}%`, height: '100%', borderRadius: 999, bgcolor: viewerPercent >= 80 ? '#ef4444' : viewerPercent >= 60 ? '#f59e0b' : '#10b981' }} />
                                </Box>
                            </Box>
                        )}
                        <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center' }}>
                            Hint: Buksan ang watch page sa ibang browser o device para makakita ng live stream.
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={handleClose} disabled={loading}>
                    {isBroadcasting ? 'Close' : 'Cancel'}
                </Button>
                {!isBroadcasting ? (
                    <Button
                        onClick={startBroadcast}
                        variant="contained"
                        color="success"
                        startIcon={<ScreenShareIcon />}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : mode === 'screen' ? 'Start Screen Broadcast' : 'Start Camera Broadcast'}
                    </Button>
                ) : (
                    <Button
                        onClick={stopBroadcast}
                        variant="contained"
                        color="error"
                        startIcon={<StopIcon />}
                    >
                        Stop Broadcast
                    </Button>
                )}
            </DialogActions>

            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}
            </style>
        </Dialog>
    );
};

export default BroadcastLivestream;
