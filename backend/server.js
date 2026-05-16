import express from 'express';
import cors from 'cors';
import { getEnvLoadSummary } from './config/env.js';
import "express-async-errors";
import { createServer } from 'http';
import { Server } from 'socket.io';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import labelRoutes from './routes/labelRoutes.js';
import sharedNoteRoutes from './routes/sharedNoteRoutes.js';
import noteProtectionRoutes from './routes/noteProtectionRoutes.js';
import sharingRoutes from './routes/sharingRoutes.js';
import collaborationRoutes from './routes/collaborationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import preferenceRoutes from './routes/preferenceRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { corsOptions, socketCorsOptions } from './config/cors.js';
import { db, explainDatabaseError, getDatabaseConfigSummary, testDatabaseConnection } from './config/db.js';
import { ensureDatabaseShape } from './config/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);






const app= express();
const server= createServer(app);
const io= new Server(server,{
  cors: socketCorsOptions
});

const PORT= process.env.PORT || 5000;

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.get('/', (req,res)=> {
  res.json({ message: 'NoteSpace API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'NoteSpace API is running',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/auth',authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/notes',noteRoutes);
app.use('/api/labels',labelRoutes);
app.use('/api/shared',sharedNoteRoutes);
app.use('/api/notes',noteProtectionRoutes);
app.use('/api/sharing',sharingRoutes);
app.use('/api/collaboration',collaborationRoutes);

app.use(errorHandler);

// Socket.io for real-time collaboration (Phase 5)
const noteRooms=new Map(); // noteId -> Set of socket IDs

io.use(async (socket, next) => {
  const { sessionToken } = socket.handshake.auth || {};
  if (!sessionToken) {
    return next(new Error('Collaboration session token is required.'));
  }

  try {
    const [rows] = await db.query(
      `SELECT cs.note_id, cs.user_id, u.display_name, u.email
       FROM collaboration_sessions cs
       JOIN users u ON cs.user_id = u.id
       WHERE cs.session_token = ? AND cs.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [sessionToken],
    );

    if (rows.length) {
      socket.userId = rows[0].user_id;
      socket.user = {
        id: rows[0].user_id,
        displayName: rows[0].display_name,
        email: rows[0].email,
      };
      socket.allowedNoteId = rows[0].note_id;
      await db.query('UPDATE collaboration_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = ?', [sessionToken]);
      return next();
    }

    return next(new Error('Invalid or expired collaboration session.'));
  } catch (error) {
    return next(error);
  }
});

io.on('connection',(socket)=> {
  console.log('User connected:',socket.id);








  // Join a note room for real-time collaboration
  socket.on('join-note',(noteId)=> {
    if (socket.allowedNoteId && String(socket.allowedNoteId) !== String(noteId)) {
      socket.emit('collaboration-error', { message: 'You do not have access to this note room.' });
      return;
    }

    socket.join(`note-${noteId}`);
    console.log(`User ${socket.id} joined note ${noteId}`);

    // Notify others in the room
    socket.to(`note-${noteId}`).emit('user-joined', {
      userId: socket.userId,
      user: socket.user,
      socketId: socket.id
    });
  });






  // Leave a note room
  socket.on('leave-note',(noteId) => {
    socket.leave(`note-${noteId}`);
    console.log(`User ${socket.id} left note ${noteId}`);

    // Notify others in the room
    socket.to(`note-${noteId}`).emit('user-left', {
      userId:socket.userId,
      socketId:socket.id
    });
  });








  // Handle note content changes (real-time editing)
  socket.on('note-change',(data)=> {
    const { noteId,content,title,userId }= data;
    if (socket.allowedNoteId && String(socket.allowedNoteId) !== String(noteId)) {
      socket.emit('collaboration-error', { message: 'You do not have access to this note room.' });
      return;
    }

    // Broadcast to all other users in the note room
    socket.to(`note-${noteId}`).emit('note-updated', {
      noteId,
      content,
      title,
      userId,
      timestamp: new Date().toISOString()
    });
  });






  // Handle cursor position updates
  socket.on('cursor-move',(data)=> {
    const { noteId,position,userId }= data;
    if (socket.allowedNoteId && String(socket.allowedNoteId) !== String(noteId)) {
      return;
    }

    socket.to(`note-${noteId}`).emit('cursor-update', {
      userId,
      position,
      socketId:socket.id
    });
  });

  socket.on('disconnect',()=> {
    console.log('User disconnected:',socket.id);

    // Notify all rooms this user was in
    socket.rooms.forEach(room=> {
      if (room.startsWith('note-')) {
        const noteId = room.replace('note-','');
        socket.to(room).emit('user-left', {
          userId: socket.userId,
          user: socket.user,
          socketId: socket.id
        });
      }
    });
  });
});





server.listen(PORT, async ()=> {
  const envSummary = getEnvLoadSummary();
  if (envSummary.loaded) {
    console.log(`Loaded environment from ${envSummary.path}`);
  } else if (process.env.NODE_ENV === 'production') {
    console.log('Using environment variables from the hosting provider');
  } else {
    console.warn(`Could not load backend .env from ${envSummary.path}`);
    console.warn(envSummary.error);
  }

  console.log('Database configuration:', getDatabaseConfigSummary());

  try {
    await testDatabaseConnection();
    await ensureDatabaseShape();
    console.log('MySQL/MariaDB connected');
  } catch (err) {
    console.error('MySQL/MariaDB connection failed');
    console.error(explainDatabaseError(err));
  }
  console.log(`Server running on port ${PORT}`);
});
