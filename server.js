import { WebcastPushConnection } from 'tiktok-live-connector';
import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Enhancements
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, 
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

app.use(cors());

// Serve videos statically
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Endpoint to list videos
app.get('/api/videos', (req, res) => {
    const videosDir = path.join(__dirname, 'videos');
    console.log(`[API] Listing videos from: ${videosDir}`);

    fs.readdir(videosDir, (err, files) => {
        if (err) {
            console.error("[API] Error reading videos directory:", err);
            return res.status(500).json({ error: "Failed to list videos" });
        }
        // Filter for mp4 files
        const videos = files.filter(file => file.endsWith('.mp4'));
        console.log(`[API] Found ${videos.length} mp4 files:`, videos);
        res.json(videos);
    });
});

// Serve alliance videos statically
app.use('/alliance_videos', express.static(path.join(__dirname, 'alliance_videos')));

// Endpoint to list alliance videos
app.get('/api/alliance-videos', (req, res) => {
    const videosDir = path.join(__dirname, 'alliance_videos');
    console.log(`[API] Listing alliance videos from: ${videosDir}`);

    // Klasör yoksa boş array dön
    if (!fs.existsSync(videosDir)) {
        return res.json([]);
    }

    fs.readdir(videosDir, (err, files) => {
        if (err) {
            console.error("[API] Error reading alliance_videos directory:", err);
            return res.status(500).json({ error: "Failed to list alliance videos" });
        }
        // Filter for mp4 files
        const videos = files.filter(file => file.endsWith('.mp4'));
        console.log(`[API] Found ${videos.length} mp4 alliance videos:`, videos);
        res.json(videos);
    });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let tiktokConnection = null;

io.on('connection', (socket) => {
    console.log('Frontend connected:', socket.id);

    socket.on('connectToTikTok', (username) => {
        console.log(`Request to connect to TikTok user: ${username}`);

        if (tiktokConnection) {
            tiktokConnection.disconnect();
            tiktokConnection = null;
        }

        try {
            tiktokConnection = new WebcastPushConnection(username);

            tiktokConnection.connect().then(state => {
                console.log(`Connected to room ${state.roomId}`);
                socket.emit('tiktokConnected', { username, roomId: state.roomId });
            }).catch(err => {
                console.error('Failed to connect', err);
                socket.emit('tiktokError', { message: 'Failed to connect: ' + err.message });
            });

            tiktokConnection.on('chat', data => {
                // meaningful chat only? For now ignoring chat as per requirements (Loop 4.1 scope: Like & Gift)
                // But logging just in case
                // socket.emit('tiktokEvent', { type: 'chat', data });
            });

            tiktokConnection.on('gift', data => {
                console.log(`[TikTok-Lib] GIFT RAW: ${data.giftName} x${data.repeatCount} (End:${data.repeatEnd}) ID:${data.msgId}`);
                console.log(`Sending to client...`);
                socket.emit('tiktokEvent', {
                    type: 'gift',
                    username: data.uniqueId,
                    userId: data.userId,
                    avatar: data.profilePictureUrl,
                    giftName: data.giftName,
                    giftCount: data.repeatCount,
                    giftCount: data.repeatCount,
                    diamondCost: data.diamondCount * data.repeatCount,
                    eventId: data.msgId, // Crucial for Deduplication
                    repeatEnd: data.repeatEnd // Crucial for Streak filtering
                });
            });

            tiktokConnection.on('like', data => {
                console.log(`LIKE: ${data.uniqueId} sent like x${data.likeCount}`);
                socket.emit('tiktokEvent', {
                    type: 'like',
                    username: data.uniqueId,
                    userId: data.userId,
                    avatar: data.profilePictureUrl,
                    likeCount: data.likeCount,
                    totalLikes: data.totalLikeCount
                });
            });

            tiktokConnection.on('disconnected', () => {
                console.log('TikTok Disconnected');
                socket.emit('tiktokDisconnected');
            });

            tiktokConnection.on('error', (err) => {
                console.error('TikTok Error:', err);
            });

        } catch (e) {
            console.error("Connection Error Wrapper:", e);
            socket.emit('tiktokError', { message: e.message });
        }
    });
});

const PORT = 3333;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`TikTok Relay Server running on port ${PORT}`);

    // Log Local IP for LAN access
    const nets = networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    console.log("==================================================");
    console.log("YEREL AĞ (LAN) ERİŞİM BİLGİLERİ:");
    Object.keys(results).forEach(name => {
        console.log(`${name}:`);
        results[name].forEach(ip => {
            console.log(`  http://${ip}:3000  (Oyun Giriş Linki)`);
            console.log(`  http://${ip}:${PORT}  (Sunucu Linki)`);
        });
    });
    console.log("==================================================");
});
