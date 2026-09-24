import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress, Alert, Button, Paper, IconButton, Tooltip, Stack } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { livestreamAPI, livestreamRecordingsAPI } from '../api/apiClient';
import { createSignalingSocket, joinRoom, sendSignalingMessage, createViewerPeer } from '../utils/webrtc';
import LivestreamChat from './LivestreamChat';

const WatchLivestream = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [selectedAngle, setSelectedAngle] = useState('Camera 1');
  const [signalingError, setSignalingError] = useState('');
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);

  const enterVideoFullscreen = (event) => {
    const playerContainer = playerContainerRef.current;
    if (!playerContainer) return;

    if (document.fullscreenElement === playerContainer) {
      document.exitFullscreen?.();
      return;
    }

    if (playerContainer.requestFullscreen) {
      playerContainer.requestFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPlayerFullscreen(document.fullscreenElement === playerContainerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlayerFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    playerContainerRef.current.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await livestreamAPI.getById(id);
        if (res.data.success && res.data.data) {
          setEvent(res.data.data);
          const recordingsRes = await livestreamRecordingsAPI.getAll({ livestream_id: id });
          setRecordings(recordingsRes.data.success ? recordingsRes.data.data || [] : []);
        } else {
          setError(res.data.message || 'Livestream event not found.');
        }
      } catch (err) {
        setError('Unable to load livestream: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    } else {
      setError('Livestream ID is missing.');
      setLoading(false);
    }
  }, [id]);

  const handleSignalingMessage = (message) => {
    try {
      const data = JSON.parse(message.data);
      if (data.type === 'welcome') {
        return;
      }
      if (data.type === 'signal') {
        const payloadIsValid = data.payload && typeof data.payload === 'object';

        if (!payloadIsValid || !data.from) {
          console.warn('WatchLivestream signal ignored because payload or from is missing or invalid', data);
          return;
        }

        let peer = peerRef.current;
        if (!peer) {
          peer = createViewerPeer({
            onSignal: (payload) => {
              sendSignalingMessage(socketRef.current, payload, data.from, id);
            },
            onConnect: () => {
            },
            onStream: (stream) => {
              setRemoteStream(stream);
            },
            onError: (err) => {
              console.error('Viewer peer error', err);
              setSignalingError('Viewer peer connection failed.');
            },
          });
          peerRef.current = peer;
        }

        try {
          peer.signal(data.payload);
        } catch (signalErr) {
          console.error('Error signaling viewer peer', signalErr, data.payload);
          setSignalingError('Invalid signaling data received.');
        }
      }
    } catch (err) {
      console.warn('Invalid signaling message', err);
    }
  };

  useEffect(() => {
    if (!id || !event || event.status !== 'Live') {
      return;
    }

    const socket = createSignalingSocket();
    socketRef.current = socket;
    socket.addEventListener('message', handleSignalingMessage);
    socket.addEventListener('open', () => {
      joinRoom(socket, { role: 'viewer', livestreamId: id.toString() });
    });
    socket.addEventListener('close', () => {
      console.warn('Viewer signaling connection closed');
    });
    socket.addEventListener('error', (err) => {
      console.error('Signaling socket error', err);
      setSignalingError('Cannot connect to signaling server.');
    });

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setRemoteStream(null);
    };
  }, [event, id]);

  useEffect(() => {
    if (!remoteStream || !videoRef.current) {
      return;
    }

    const trackIndex = Math.max(0, Number(selectedAngle.replace(/\D/g, '')) - 1);
    const selectedTrack = remoteStream.getVideoTracks()[trackIndex] || remoteStream.getVideoTracks()[0];
    if (!selectedTrack) return;
    videoRef.current.srcObject = new MediaStream([selectedTrack, ...remoteStream.getAudioTracks()]);
    videoRef.current.muted = true;
    videoRef.current.play().catch((err) => {
      console.warn('Viewer autoplay failed:', err);
    });
  }, [remoteStream, selectedAngle]);

  const getEmbedUrl = (url) => {
    if (!url) return '';
    const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/))([A-Za-z0-9_-]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    const facebookMatch = url.match(/(?:facebook\.com|fb\.watch)/i);
    if (facebookMatch) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&width=560`;
    }
    return url;
  };

  const renderPlayer = () => {
    const isLive = event?.status === 'Live';
    const selectedRecording = recordings.find((recording) => (recording.recording_angle || 'Camera 1') === selectedAngle);
    const playbackUrl = isLive
      ? event?.streaming_url
      : selectedRecording?.recording_url || event?.recording_url || event?.streaming_url;
    if (!playbackUrl) {
      return <Alert severity="warning">No replay is available for this event.</Alert>;
    }

    const url = playbackUrl;
    const isBlobUrl = /^blob:/i.test(url);
    const embedUrl = getEmbedUrl(url);
    const isVideoFile = /\.(mp4|webm|ogg)$/i.test(url) || isBlobUrl;
    const isSelfWatchLink =
      url === window.location.href ||
      url === `${window.location.origin}/watch/${id}` ||
      url.startsWith(`${window.location.origin}/watch/${id}?`);

    if (remoteStream) {
      return (
        <Box sx={{ mt: 2 }}>
          <video
            ref={videoRef}
            width="100%"
            controls
            controlsList="nofullscreen"
            autoPlay
            playsInline
            onDoubleClick={enterVideoFullscreen}
          />
        </Box>
      );
    }

    if (isSelfWatchLink && isLive) {
      return (
        <Alert severity="info">
          Sinusuportahan na ang live viewer mode. Hint: I-refresh ang page kung hindi agad lumabas ang live feed.
        </Alert>
      );
    }

    if (isVideoFile) {
      return (
        <Box sx={{ mt: 2 }}>
          <video width="100%" controls controlsList="nofullscreen" onDoubleClick={enterVideoFullscreen}>
            <source src={url} />
            Your browser does not support the video tag.
          </video>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 2, position: 'relative', pt: '56.25%' }}>
        <iframe
          title="Livestream player"
          src={embedUrl}
          loading="lazy"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 4, boxShadow: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Watch Livestream</Typography>
              <Button component={Link} to="/login" variant="outlined">Back to Login</Button>
            </Box>

            {error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <>
                <Typography variant="subtitle1" sx={{ color: '#475569' }}>
                  {event.title || 'Untitled event'} • {event.status || 'Unknown status'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Scheduled start: {event.scheduled_start || 'N/A'}
                </Typography>
                {event.status !== 'Live' && !event.recording_url && (
                  <Alert severity="info">This stream is currently not live. The player below will only work once the event is live.</Alert>
                )}
                {event.recording_url && (
                  <Alert severity={event.status === 'Live' ? 'info' : 'success'}>
                    {event.status === 'Live' ? 'Live stream' : 'Event replay'}
                  </Alert>
                )}
                {(remoteStream || recordings.length > 0) && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    {(remoteStream ? remoteStream.getVideoTracks() : recordings).map((item, index) => {
                      const angle = remoteStream
                        ? `Camera ${index + 1}`
                        : (item.recording_angle || `Camera ${index + 1}`);
                      return (
                        <Button
                          key={angle}
                          size="small"
                          variant={selectedAngle === angle ? 'contained' : 'outlined'}
                          onClick={() => setSelectedAngle(angle)}
                        >
                          {angle}
                        </Button>
                      );
                    })}
                  </Stack>
                )}
                {signalingError && (
                  <Alert severity="error">{signalingError}</Alert>
                )}
                <Box
                  ref={playerContainerRef}
                  data-livestream-fullscreen="true"
                  sx={{
                    '&:fullscreen': {
                      bgcolor: '#0f172a',
                      color: '#fff',
                      overflowY: 'auto',
                      p: { xs: 1, sm: 2 },
                    },
                    '&:fullscreen video, &:fullscreen iframe': {
                      maxHeight: { xs: '55vh', sm: '65vh' },
                    },
                    '&:fullscreen .livestream-chat': {
                      maxWidth: 900,
                      mx: 'auto',
                    },
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    {renderPlayer()}
                    <Tooltip title={isPlayerFullscreen ? 'Exit fullscreen' : 'Fullscreen with comments'}>
                      <IconButton
                        aria-label={isPlayerFullscreen ? 'Exit fullscreen' : 'Fullscreen with comments'}
                        onClick={togglePlayerFullscreen}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          bottom: 8,
                          zIndex: 2,
                          color: '#fff',
                          bgcolor: 'rgba(15, 23, 42, 0.75)',
                          '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.95)' },
                        }}
                      >
                        {isPlayerFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box className="livestream-chat">
                    <LivestreamChat livestreamId={event.livestream_id} isLive={event.status === 'Live'} />
                  </Box>
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ color: '#475569' }}>Streaming URL:</Typography>
                  <Typography sx={{ wordBreak: 'break-word' }}>
                    {event.status === 'Live'
                      ? event.streaming_url
                      : recordings.find((recording) => (recording.recording_angle || 'Camera 1') === selectedAngle)?.recording_url || event.recording_url || event.streaming_url}
                  </Typography>
                  <Button
                    href={event.status === 'Live'
                      ? event.streaming_url
                      : recordings.find((recording) => (recording.recording_angle || 'Camera 1') === selectedAngle)?.recording_url || event.recording_url || event.streaming_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="text"
                    sx={{ mt: 1 }}
                  >
                    Open streaming source directly
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default WatchLivestream;
