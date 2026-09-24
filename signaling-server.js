import WebSocket, { WebSocketServer } from 'ws';

const port = 8081;
const wss = new WebSocketServer({ port });
const clients = new Map();

const sendToClient = (clientId, message) => {
  const client = clients.get(clientId);
  if (client?.ws?.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
};

const getRoomClients = (livestreamId) => {
  return Array.from(clients.entries())
    .filter(([, client]) => client.livestreamId === livestreamId)
    .map(([id, client]) => ({ id, ...client }));
};

wss.on('connection', (ws) => {
  const id = crypto.randomUUID();
  clients.set(id, { ws, id, role: null, livestreamId: null });
  console.log(`Signaling: peer connected ${id}`);

  ws.send(JSON.stringify({ type: 'welcome', id }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'join') {
        const client = clients.get(id);
        if (!client) return;
        client.role = data.role;
        client.livestreamId = data.livestreamId;
        console.log(`Signaling: peer ${id} joined ${data.role} room ${data.livestreamId}`);

        if (data.role === 'viewer') {
          const broadcasters = getRoomClients(data.livestreamId).filter((peer) => peer.role === 'broadcaster');
          broadcasters.forEach((b) => {
            console.log(`Signaling: notifying broadcaster ${b.id} that viewer ${id} joined`);
            sendToClient(b.id, { type: 'viewer-joined', viewerId: id, livestreamId: data.livestreamId });
          });
        }

        if (data.role === 'broadcaster') {
          const viewers = getRoomClients(data.livestreamId).filter((peer) => peer.role === 'viewer');
          viewers.forEach((viewer) => {
            console.log(`Signaling: notifying broadcaster ${id} of existing viewer ${viewer.id}`);
            sendToClient(id, { type: 'viewer-joined', viewerId: viewer.id, livestreamId: data.livestreamId });
          });
        }
      }

      if (data.type === 'signal') {
        const payloadIsValid = data.payload && typeof data.payload === 'object';
        console.log('Signaling server received signal', { from: id, target: data.target, livestreamId: data.livestreamId, payloadType: data.payload?.type, payloadKeys: payloadIsValid ? Object.keys(data.payload) : undefined });
        if (!payloadIsValid) {
          console.warn('Signaling server ignoring invalid signal payload', data);
          return;
        }
        if (data.target) {
          sendToClient(data.target, { type: 'signal', payload: data.payload, from: id, livestreamId: data.livestreamId });
          return;
        }

        const room = getRoomClients(data.livestreamId).filter((peer) => peer.ws !== ws && peer.ws.readyState === WebSocket.OPEN);
        room.forEach((peer) => {
          console.log(`Signaling: broadcasting signal from ${id} to ${peer.id}`);
          peer.ws.send(JSON.stringify({ type: 'signal', payload: data.payload, from: id, livestreamId: data.livestreamId }));
        });
      }
    } catch (err) {
      console.warn('Signaling: invalid message', err);
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    console.log(`Signaling: peer disconnected ${id}`);
  });
});

console.log(`Signaling server running on ws://localhost:${port}`);
