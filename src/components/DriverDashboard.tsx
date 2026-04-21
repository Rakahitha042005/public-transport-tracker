import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, MapPin, Power, Navigation, AlertCircle, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import socket from '../lib/socket';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const getBusIcon = (isSOS: boolean) => L.divIcon({
  className: 'custom-bus-icon',
  html: `<div class="${isSOS ? 'bg-red-600 animate-pulse' : 'bg-orange-500'} p-2 rounded-full border-2 border-white shadow-lg text-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${isSOS ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' : '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C.5 16.3 1 18 1 18h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'}
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [location, setLocation] = useState<[number, number]>([12.9716, 77.5946]);
  const [status, setStatus] = useState('Running');
  const [occupancy, setOccupancy] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [isSOS, setIsSOS] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const locationRef = useRef<[number, number]>(location);
  const prevLocationRef = useRef<[number, number] | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const statusRef = useRef<string>(status);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setDriver(JSON.parse(savedUser));

    let watchId: number;
    if (navigator.geolocation) {
      // Get initial position immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setLocation(newLoc);
        },
        (err) => console.error('Initial driver geolocation error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      // Watch for continuous updates
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setLocation(newLoc);
          
          // Also emit immediately if moving
          if (statusRef.current === 'Running') {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            socket.emit('update-location', {
              busNumber: user.bus_number,
              routeId: user.route,
              lat: newLoc[0],
              lng: newLoc[1],
              speed: currentSpeed,
              status: statusRef.current,
              occupancy: occupancy,
              isSOS: isSOS
            });
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          // If high accuracy fails, try with it turned off
          if (err.code === 3 || err.code === 2) {
            navigator.geolocation.getCurrentPosition(
              (p) => setLocation([p.coords.latitude, p.coords.longitude]),
              null,
              { enableHighAccuracy: false }
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const updateLocation = () => {
    if (!driver) return;
    setIsUpdating(true);
    
    const now = Date.now();
    let speed = 0;
    
    if (prevLocationRef.current) {
      const dist = calculateDistance(
        prevLocationRef.current[0], 
        prevLocationRef.current[1], 
        locationRef.current[0], 
        locationRef.current[1]
      );
      const timeDiff = (now - lastUpdateTimeRef.current) / 1000 / 3600; // hours
      if (timeDiff > 0) {
        speed = Math.round(parseFloat(dist) / timeDiff);
        // Sanity check for speed (max 100 km/h)
        if (speed > 100) speed = 40;
      }
    }
    
    setCurrentSpeed(speed);
    prevLocationRef.current = [...locationRef.current];
    lastUpdateTimeRef.current = now;
    
    // Send to socket
    socket.emit('update-location', {
      busNumber: driver.bus_number,
      routeId: driver.route,
      lat: locationRef.current[0],
      lng: locationRef.current[1],
      speed: speed,
      status: statusRef.current,
      occupancy: occupancy,
      isSOS: isSOS
    });

    setTimeout(() => setIsUpdating(false), 1000);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  // Periodic heartbeat update
  useEffect(() => {
    const interval = setInterval(() => {
      if (statusRef.current === 'Running' || statusRef.current === 'At Stop') {
        updateLocation();
      }
    }, 15000); // Every 15 seconds as a heartbeat
    
    return () => clearInterval(interval);
  }, [driver]);

  if (!driver) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-bg-main">
      {/* Sidebar / Controls */}
      <aside className="w-[320px] bg-sidebar border-r border-border-main flex flex-col p-6 z-10 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => navigate('/login')}
            className="p-2 hover:bg-slate-100 rounded-lg text-text-muted hover:text-primary transition-colors"
            title="Back to Login"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2.5 font-extrabold text-xl text-primary mb-8">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" ry="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
          Driver Console
        </div>

        <div className="bg-slate-50 border border-border-main rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
              <Bus size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Assigned Bus</p>
              <p className="text-sm font-bold text-text-main">{driver.bus_number}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Username</span>
              <span className="font-semibold text-text-main">{driver.username}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Route</span>
              <span className="font-semibold text-primary">{driver.route || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-muted">Status</span>
              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold block mb-3">Trip Status</span>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setStatus('Running')}
                className={`py-3 rounded-xl text-xs font-bold transition-all border ${status === 'Running' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-text-muted border-border-main hover:border-primary/30'}`}
              >
                Running
              </button>
              <button 
                onClick={() => setStatus('At Stop')}
                className={`py-3 rounded-xl text-xs font-bold transition-all border ${status === 'At Stop' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white text-text-muted border-border-main hover:border-orange-500/30'}`}
              >
                At Stop
              </button>
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold block mb-3">Bus Occupancy</span>
            <div className="grid grid-cols-3 gap-2">
              {(['Low', 'Medium', 'High'] as const).map((level) => (
                <button 
                  key={level}
                  onClick={() => setOccupancy(level)}
                  className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${occupancy === level ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border-main'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold block mb-3">Emergency</span>
            <button 
              onClick={() => {
                const newState = !isSOS;
                setIsSOS(newState);
                socket.emit('sos-alert', { busNumber: driver.bus_number, isSOS: newState });
              }}
              className={`w-full py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${isSOS ? 'bg-red-600 text-white border-red-600 animate-pulse' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
            >
              <AlertTriangle size={16} />
              {isSOS ? 'CANCEL SOS' : 'EMERGENCY SOS'}
            </button>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold block mb-3">GPS Location</span>
            <div className="bg-slate-50 border border-border-main rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-text-main">
                <MapPin size={14} className="text-primary" />
                {location[0].toFixed(5)}, {location[1].toFixed(5)}
              </div>
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => setLocation([pos.coords.latitude, pos.coords.longitude]));
                  }
                }}
                className="p-1.5 bg-white border border-border-main rounded-lg text-text-muted hover:text-primary transition-colors"
              >
                <Navigation size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border-main">
          <button 
            onClick={updateLocation}
            disabled={isUpdating}
            className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isUpdating ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-blue-700 shadow-lg shadow-primary/20 active:scale-[0.98]'}`}
          >
            {isUpdating ? 'Updating...' : 'Update Location'}
            {!isUpdating && <Navigation size={16} />}
          </button>
          
          <button 
            onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}
            className="w-full mt-3 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Power size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative bg-slate-200">
        <div className="absolute top-6 right-6 z-[1000]">
          <div className={`px-5 py-2.5 rounded-full font-bold text-xs shadow-main flex items-center gap-2 ${status === 'Running' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
            {status === 'Running' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {status.toUpperCase()}
          </div>
        </div>

        <MapContainer center={location} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapRecenter center={location} />
          <Marker position={location} icon={getBusIcon(isSOS)}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-primary">{driver.bus_number}</p>
                <p className="text-xs font-bold mt-1">Occupancy: {occupancy}</p>
                {isSOS && <p className="text-xs text-red-600 font-bold mt-1">EMERGENCY SOS ACTIVE</p>}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </main>
    </div>
  );
}

