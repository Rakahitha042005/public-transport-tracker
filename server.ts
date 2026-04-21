import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(express.json());

// Simple JSON Database Setup
const DB_FILE = 'db.json';
let dbData = {
  drivers: [
    { bus_number: 'KA-01-F-1234', username: 'driver1', password: 'password123' }
  ],
  live_locations: {} as Record<string, any>
};

// Load initial data if exists
if (fs.existsSync(DB_FILE)) {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    dbData = JSON.parse(data);
  } catch (e) {
    console.error('Error loading DB:', e);
  }
}

const saveDB = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
};

// Load BMTC Routes
let bmtcRoutes: any[] = [];
const csvPath = path.join(process.cwd(), 'data', 'bmtc_routes.csv');

if (fs.existsSync(csvPath)) {
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => {
      // Deduplicate based on RouteID
      if (!bmtcRoutes.find(r => r.RouteID === data.RouteID)) {
        bmtcRoutes.push(data);
      }
    })
    .on('end', () => {
      console.log('BMTC Routes loaded:', bmtcRoutes.length);
    });
}

// APIs
app.post('/api/generate-otp', (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ error: 'Mobile number required' });
  // Simulate OTP
  const otp = Math.floor(1000 + Math.random() * 9000);
  console.log(`OTP for ${mobile}: ${otp}`);
  res.json({ message: 'OTP generated', otp }); // In real app, don't send OTP in response
});

app.post('/api/verify-otp', (req, res) => {
  const { mobile, otp } = req.body;
  // Simple simulation: any 4-digit OTP works for demo
  if (otp && otp.length === 4) {
    res.json({ success: true, user: { mobile, role: 'passenger' } });
  } else {
    res.status(400).json({ success: false, error: 'Invalid OTP' });
  }
});

app.post('/api/driver-login', (req, res) => {
  const { busNumber, route, username, password } = req.body;
  
  // Lenient login: allow any credentials for demo purposes
  if (busNumber && username && password) {
    res.json({ 
      success: true, 
      user: { 
        bus_number: busNumber, 
        route: route || 'N/A',
        username: username, 
        role: 'driver' 
      } 
    });
  } else {
    res.status(400).json({ 
      success: false, 
      error: 'Please enter Bus Number, Username, and Password' 
    });
  }
});

app.get('/api/get-buses', (req, res) => {
  const { destination } = req.query;
  const searchStr = (destination as string || '').toLowerCase();
  
  // 1. Filter CSV routes
  let results = bmtcRoutes.map(route => {
    // Check if any live bus matches this route ID
    const liveBus = Object.values(dbData.live_locations).find((lb: any) => lb.routeId === route.RouteID);
    
    return {
      ...route,
      liveInfo: liveBus || null
    };
  }).filter(route => 
    !searchStr || 
    route.RouteName.toLowerCase().includes(searchStr) ||
    route.Via.toLowerCase().includes(searchStr) ||
    route.RouteID.toLowerCase().includes(searchStr)
  );

  // 2. Add live buses from DB that are NOT in the CSV but match the search
  const liveBuses = Object.values(dbData.live_locations);
  liveBuses.forEach((liveBus: any) => {
    const alreadyInResults = results.find(r => r.RouteID === liveBus.busNumber);
    if (!alreadyInResults) {
      // If it matches the search string (or if no search string)
      if (!searchStr || liveBus.busNumber.toLowerCase().includes(searchStr)) {
        results.push({
          RouteID: liveBus.busNumber,
          RouteName: `Live Session: ${liveBus.busNumber}`,
          Via: 'Custom Driver Update',
          StartLat: liveBus.lat,
          StartLng: liveBus.lng,
          EndLat: liveBus.lat,
          EndLng: liveBus.lng,
          status: liveBus.status,
          isLiveOnly: true,
          liveInfo: liveBus
        });
      }
    }
  });

  res.json(results);
});

// New endpoint to get all live data at once
app.get('/api/get-live-locations', (req, res) => {
  res.json(dbData.live_locations);
});

// Real-time Socket Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('update-location', (data) => {
    const { busNumber, routeId, lat, lng, speed, status, occupancy, isSOS } = data;
    dbData.live_locations[busNumber] = {
      busNumber, routeId, lat, lng, speed, status, occupancy, isSOS, last_updated: new Date().toISOString()
    };
    saveDB();
    // Broadcast to all clients
    io.emit('bus-location-updated', { busNumber, routeId, lat, lng, speed, status, occupancy, isSOS });
  });

  socket.on('sos-alert', (data) => {
    const { busNumber, isSOS } = data;
    if (dbData.live_locations[busNumber]) {
      dbData.live_locations[busNumber].isSOS = isSOS;
      saveDB();
      io.emit('bus-location-updated', dbData.live_locations[busNumber]);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
