import { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { io } from 'socket.io-client';
import { apiRequest, WS_URL } from '../services/api.js';

function RealTimeCollaboration({ noteId, user, enabled, onRemoteUpdate }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (!enabled || !noteId) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setCollaborators([]);
      return undefined;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const session = await apiRequest(`/api/collaboration/${noteId}/join`, 'POST');
        if (cancelled) return;

        const socket = io(WS_URL, {
          auth: { sessionToken: session.sessionToken },
          transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setConnected(true);
          socket.emit('join-note', noteId);
        });

        socket.on('disconnect', () => setConnected(false));
        socket.on('user-joined', () => refreshCollaborators());
        socket.on('user-left', () => refreshCollaborators());
        socket.on('note-updated', (data) => {
          if (Number(data.userId) !== Number(user?.id)) {
            onRemoteUpdate?.(data);
          }
        });

        await refreshCollaborators();
      } catch (error) {
        console.warn('Collaboration unavailable:', error.message);
      }
    };

    const refreshCollaborators = async () => {
      try {
        const data = await apiRequest(`/api/collaboration/${noteId}/collaborators`, 'GET');
        setCollaborators(data.collaborators || []);
      } catch {
        setCollaborators([]);
      }
    };

    start();

    return () => {
      cancelled = true;
      apiRequest(`/api/collaboration/${noteId}/leave`, 'DELETE').catch(() => {});
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled, noteId, user?.id]);

  const sendUpdate = (payload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('note-change', {
        noteId,
        title: payload.title,
        content: payload.content,
        userId: user?.id,
      });
    }
  };

  useEffect(() => {
    window.noteCollaboration = { sendUpdate };
    return () => {
      if (window.noteCollaboration?.sendUpdate === sendUpdate) {
        delete window.noteCollaboration;
      }
    };
  }, [connected, noteId, user?.id]);

  if (!enabled) return null;

  return (
    <div className={`live-chip ${connected ? 'online' : ''}`}>
      <Radio size={15} />
      <span>{connected ? 'Live collaboration enabled' : 'Connecting live collaboration'}</span>
      {collaborators.length > 1 && <strong>{collaborators.length} editing</strong>}
    </div>
  );
}

export default RealTimeCollaboration;
