import SimplePeer from 'simple-peer';

const SIGNALING_PORT = 8081;

export const createSignalingSocket = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const hostname = window.location.hostname || 'localhost';
  const signalingUrl = `${protocol}://${hostname}:${SIGNALING_PORT}`;
  const socket = new WebSocket(signalingUrl);
  socket.addEventListener('open', () => {
  });
  socket.addEventListener('error', (err) => {
    console.error('WebRTC signaling error', err);
  });
  return socket;
};

export const joinRoom = (socket, { role, livestreamId }) => {
  if (!socket) return;
  const payload = { type: 'join', role, livestreamId };
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return;
  }
  const onOpen = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
    socket.removeEventListener('open', onOpen);
  };
  socket.addEventListener('open', onOpen);
};

export const sendSignalingMessage = (socket, payload, target, livestreamId) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('sendSignalingMessage: socket not open', { readyState: socket?.readyState, target, livestreamId });
    return;
  }
  if (!target || typeof target !== 'string') {
    console.warn('sendSignalingMessage: invalid target', { target, livestreamId, payload });
    return;
  }
  if (!payload || typeof payload !== 'object') {
    console.warn('sendSignalingMessage: invalid payload', { target, livestreamId, payload });
    return;
  }
  socket.send(JSON.stringify({ type: 'signal', payload, target, livestreamId }));
};

const defaultIceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const createBroadcasterPeer = ({ stream, onSignal, onConnect, onError }) => {
  const peer = new SimplePeer({ initiator: true, trickle: false, stream, config: defaultIceConfig });
  peer.on('signal', (payload) => {
    onSignal(payload);
  });
  peer.on('connect', () => {
    onConnect();
  });
  peer.on('close', () => {
    console.warn('Broadcaster peer closed');
  });
  peer.on('error', onError || ((err) => console.error('Broadcaster peer error', err)));
  return peer;
};

export const createViewerPeer = ({ onSignal, onConnect, onStream, onError }) => {
  const peer = new SimplePeer({ initiator: false, trickle: false, config: defaultIceConfig });
  peer.on('signal', (payload) => {
    onSignal(payload);
  });
  peer.on('connect', () => {
    onConnect();
  });
  peer.on('stream', (stream) => {
    onStream(stream);
  });
  peer.on('track', (track, stream) => {
    onStream(stream);
  });
  peer.on('close', () => {
    console.warn('Viewer peer closed');
  });
  peer.on('error', onError || ((err) => console.error('Viewer peer error', err)));
  return peer;
};
