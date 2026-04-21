import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Bus, Navigation, Clock, Activity, ArrowRight, User, AlertTriangle, Users, Bell, Languages, ArrowLeft } from 'lucide-react';

const translations = {
  en: {
    title: 'BusTrack Live',
    searchPlaceholder: 'Search destination (e.g. Majestic)',
    arrived: 'Arrived',
    minsAway: (mins: number) => `${mins} mins away`,
    via: 'Via',
    occupancy: 'Occupancy',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    sos: 'EMERGENCY SOS',
    proximityAlert: 'Bus is arriving soon!',
    distance: 'Distance',
    speed: 'Speed',
    status: 'Status',
    onTime: 'On Time',
    delayed: 'Delayed'
  },
  kn: {
    title: 'ಬಸ್ ಟ್ರ್ಯಾಕ್ ಲೈವ್',
    searchPlaceholder: 'ಗಮ್ಯಸ್ಥಾನವನ್ನು ಹುಡುಕಿ (ಉದಾ. ಮೆಜೆಸ್ಟಿಕ್)',
    arrived: 'ಬಂದಿದೆ',
    minsAway: (mins: number) => `${mins} ನಿಮಿಷಗಳ ದೂರ`,
    via: 'ಮೂಲಕ',
    occupancy: 'ಜನಸಂದಣಿ',
    low: 'ಕಡಿಮೆ',
    medium: 'ಮಧ್ಯಮ',
    high: 'ಹೆಚ್ಚು',
    sos: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿ',
    proximityAlert: 'ಬಸ್ ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ!',
    distance: 'ದೂರ',
    speed: 'ವೇಗ',
    status: 'ಸ್ಥಿತಿ',
    onTime: 'ಸರಿಯಾದ ಸಮಯ',
    delayed: 'ವಿಳಂಬ'
  }
};
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
  html: `<div class="${isSOS ? 'bg-red-600 animate-pulse' : 'bg-blue-600'} p-2 rounded-full border-2 border-white shadow-lg text-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${isSOS ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' : '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C.5 16.3 1 18 1 18h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'}
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div class="bg-red-500 p-2 rounded-full border-2 border-white shadow-lg text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
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

export default function PassengerDashboard() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'kn'>('en');
  const t = translations[lang];
  const [destination, setDestination] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]); // Default Bangalore
  const [buses, setBuses] = useState<any[]>([]);
  const [liveBuses, setLiveBuses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [activeBusId, setActiveBusId] = useState<string | null>(null);
  const [notifiedBuses, setNotifiedBuses] = useState<Set<string>>(new Set());
  const [routePaths, setRoutePaths] = useState<Record<string, [number, number][]>>({});

  useEffect(() => {
    // Get current location and watch for changes
    let watchId: number;

    if (navigator.geolocation) {
      // Get initial position immediately
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.error('Initial geolocation error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      // Watch for continuous updates
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.error('Geolocation error:', err);
          // If high accuracy fails, try with it turned off
          if (err.code === 3 || err.code === 2) {
            navigator.geolocation.getCurrentPosition(
              (p) => setUserLocation([p.coords.latitude, p.coords.longitude]),
              null,
              { enableHighAccuracy: false }
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // Fetch initial live locations from database
    const fetchLiveLocations = async () => {
      try {
        const res = await fetch('/api/get-live-locations');
        const data = await res.json();
        setLiveBuses(data);
      } catch (err) {
        console.error('Error fetching live locations:', err);
      }
    };
    fetchLiveLocations();

    // Listen for live updates
    socket.on('bus-location-updated', (data) => {
      setLiveBuses(prev => ({
        ...prev,
        [data.routeId || data.busNumber]: {
          ...data,
          lastUpdated: new Date()
        }
      }));
    });

    return () => {
      socket.off('bus-location-updated');
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Proximity Alerts
  useEffect(() => {
    buses.forEach(bus => {
      const liveData = liveBuses[bus.RouteID];
      if (liveData) {
        const dist = parseFloat(calculateDistance(userLocation[0], userLocation[1], liveData.lat, liveData.lng));
        const eta = Math.round(dist / (Math.max(liveData.speed || 20, 10) / 60));
        
        if (eta <= 5 && !notifiedBuses.has(bus.RouteID)) {
          // Play a sound or show a browser notification
          if (Notification.permission === 'granted') {
            new Notification(t.proximityAlert, {
              body: `${bus.RouteID} (${bus.RouteName}) ${t.minsAway(eta)}`,
              icon: '/bus-icon.png'
            });
          } else {
            // Fallback: console log or custom UI alert
            console.log(`ALERT: Bus ${bus.RouteID} is ${t.minsAway(eta)}!`);
          }
          setNotifiedBuses(prev => new Set(prev).add(bus.RouteID));
        }
      }
    });
  }, [liveBuses, userLocation, buses, notifiedBuses, t]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch road path for active bus
  useEffect(() => {
    if (!activeBusId) return;
    const bus = buses.find(b => b.RouteID === activeBusId);
    if (!bus) return;

    const liveData = liveBuses[activeBusId];
    const currentLat = liveData ? liveData.lat : bus.lat;
    const currentLng = liveData ? liveData.lng : bus.lng;
    const endLat = parseFloat(bus.EndLat);
    const endLng = parseFloat(bus.EndLng);

    if (isNaN(endLat) || isNaN(endLng)) return;

    const fetchPath = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${currentLng},${currentLat};${endLng},${endLat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
          setRoutePaths(prev => ({ ...prev, [activeBusId]: coords }));
        }
      } catch (err) {
        console.error('Error fetching road path:', err);
      }
    };

    // Debounce or limit fetching
    const timer = setTimeout(fetchPath, 500);
    return () => clearTimeout(timer);
  }, [activeBusId, buses]); // Only refetch when active bus changes or results change

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/get-buses?destination=${destination}`);
      const data = await res.json();
      
      // Merge with live data from our state
      const processedBuses = data.map((bus: any) => {
        const liveData = liveBuses[bus.RouteID] || bus.liveInfo;
        const startLat = liveData ? liveData.lat : parseFloat(bus.StartLat);
        const startLng = liveData ? liveData.lng : parseFloat(bus.StartLng);
        
        return {
          ...bus,
          lat: startLat,
          lng: startLng,
          speed: liveData ? (liveData.speed || 0) : Math.floor(20 + Math.random() * 40),
          status: liveData ? liveData.status : (Math.random() > 0.2 ? 'On Time' : 'Delayed'),
          isLive: !!liveData
        };
      });

      setBuses(processedBuses);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate movement for buses that aren't "live" (from drivers)
  useEffect(() => {
    const interval = setInterval(() => {
      setBuses(prev => prev.map(bus => {
        if (bus.isLive) return bus; 

        const endLat = parseFloat(bus.EndLat);
        const endLng = parseFloat(bus.EndLng);
        
        // Calculate distance to destination
        const distToDest = Math.sqrt(Math.pow(endLat - bus.lat, 2) + Math.pow(endLng - bus.lng, 2));
        
        // If already at destination (within 0.001 degrees), don't move
        if (distToDest < 0.001) return bus;

        // Move slightly towards destination
        const step = 0.0005;
        const latDiff = endLat - bus.lat;
        const lngDiff = endLng - bus.lng;
        
        // Normalize step
        const moveLat = (latDiff / distToDest) * step;
        const moveLng = (lngDiff / distToDest) * step;
        
        return { 
          ...bus, 
          lat: bus.lat + moveLat, 
          lng: bus.lng + moveLng 
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="flex h-screen overflow-hidden bg-bg-main">
      {/* Sidebar */}
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5 font-extrabold text-xl text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" ry="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            {t.title}
          </div>
          <button 
            onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
            className="p-2 hover:bg-slate-100 rounded-lg text-primary transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <Languages size={16} />
            {lang === 'en' ? 'KN' : 'EN'}
          </button>
        </div>

        <div className="mb-6">
          <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold block mb-3">{lang === 'en' ? 'Your Destination' : 'ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ'}</span>
          <div className="relative">
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              className="w-full px-4 py-3 bg-slate-100 border border-border-main rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary p-1 hover:bg-white rounded-md transition-colors"
            >
              <Search size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <span className="text-[11px] uppercase tracking-wider text-text-muted font-bold block mb-3">
            Nearby Routes {buses.length > 0 && `(${buses.length})`}
          </span>
          
          <div className="space-y-3">
            {buses.length === 0 ? (
              <div className="py-12 text-center">
                <Navigation size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-text-muted">Enter a destination to find routes</p>
              </div>
            ) : (
              buses.map((bus) => {
                const liveData = liveBuses[bus.RouteID];
                const currentLat = liveData ? liveData.lat : bus.lat;
                const currentLng = liveData ? liveData.lng : bus.lng;
                const dist = calculateDistance(userLocation[0], userLocation[1], currentLat, currentLng);
                const distNum = parseFloat(dist);
                
                // Use live speed if available, otherwise use simulated speed
                const currentSpeed = liveData ? (liveData.speed || bus.speed) : bus.speed;
                // Calculate ETA: distance / (speed in km/min). Use min speed of 10 for calculation.
                const eta = Math.round(distNum / (Math.max(currentSpeed, 10) / 60));
                const isArrived = eta <= 0;
                
                const isActive = activeBusId === bus.RouteID;

                return (
                  <div 
                    key={bus.RouteID} 
                    onClick={() => setActiveBusId(bus.RouteID)}
                    className={`p-4 border rounded-xl transition-all cursor-pointer ${isActive ? 'border-primary bg-blue-50/50' : 'border-border-main hover:border-primary/50'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm px-2 py-0.5 bg-slate-200 rounded text-text-main">{bus.RouteID}</span>
                        {(bus.isLive || !!liveData) && (
                          <span className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded uppercase animate-pulse">
                            Live
                          </span>
                        )}
                      </div>
                      <span className={`font-semibold text-xs ${isArrived ? 'text-green-600' : 'text-primary'}`}>
                        {isArrived ? t.arrived : t.minsAway(eta)}
                      </span>
                    </div>
                    <span className="font-bold text-[15px] text-text-main block mb-1 leading-tight">{bus.RouteName}</span>
                    <span className="text-xs text-text-muted block truncate">{t.via}: {bus.Via}</span>
                    
                    {liveData?.isSOS && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 animate-pulse">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-bold">{t.sos}</span>
                      </div>
                    )}

                    {liveData?.occupancy && (
                      <div className="mt-2 flex items-center gap-2">
                        <Users size={12} className="text-text-muted" />
                        <span className="text-[10px] text-text-muted font-medium">{t.occupancy}:</span>
                        <span className={`text-[10px] font-bold ${liveData.occupancy === 'High' ? 'text-red-500' : liveData.occupancy === 'Medium' ? 'text-orange-500' : 'text-green-500'}`}>
                          {t[liveData.occupancy.toLowerCase() as keyof typeof t]}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-3 mt-3 pt-3 border-t border-dashed border-border-main text-[11px] text-text-muted font-medium">
                      <span className="flex items-center gap-1"><Navigation size={10} /> {dist} km</span>
                      <span className="flex items-center gap-1"><Activity size={10} /> {currentSpeed} km/h</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isArrived ? 'bg-green-100 text-green-700' : (bus.status === 'On Time' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}`}>
                        {isArrived ? t.arrived : (bus.status === 'On Time' ? t.onTime : t.delayed)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative bg-slate-200">
        <div className="absolute top-6 right-6 bg-white px-5 py-3 rounded-full shadow-main flex items-center gap-4 z-[1000]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-text-main">
            <Clock size={16} className="text-primary" />
            Live tracking active
          </div>
          <div className="w-px h-5 bg-border-main"></div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-text-main">
            <img src={`https://ui-avatars.com/api/?name=User&background=2563eb&color=fff`} width="24" height="24" className="rounded-full" alt="user" />
            98765 43210
          </div>
        </div>

        <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapRecenter center={userLocation} />
          
          <Marker position={userLocation} icon={userIcon} zIndexOffset={1000}>
            <Popup>You are here</Popup>
          </Marker>

          {buses.map((bus) => {
            const liveData = liveBuses[bus.RouteID];
            let currentLat = liveData ? liveData.lat : bus.lat;
            let currentLng = liveData ? liveData.lng : bus.lng;
            
            // Add slight offset if bus and user are at the exact same location
            if (currentLat === userLocation[0] && currentLng === userLocation[1]) {
              currentLat += 0.0001;
              currentLng += 0.0001;
            }
            
            return (
              <React.Fragment key={bus.RouteID}>
                <Marker position={[currentLat, currentLng]} icon={getBusIcon(!!liveData?.isSOS)}>
                  <Popup>
                    <div className="p-1">
                      <p className={`font-bold ${liveData?.isSOS ? 'text-red-600' : 'text-primary'}`}>{bus.RouteID} {liveData?.isSOS && '(SOS)'}</p>
                      <p className="text-sm">{bus.RouteName}</p>
                      {liveData?.occupancy && <p className="text-xs font-bold mt-1">Occupancy: {liveData.occupancy}</p>}
                      <p className="text-xs text-text-muted mt-1">Status: {bus.status}</p>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Road Path to Destination */}
                {activeBusId === bus.RouteID && routePaths[bus.RouteID] && (
                  <Polyline 
                    positions={routePaths[bus.RouteID]} 
                    pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7, lineJoin: 'round' }} 
                  />
                )}

                {/* Connection to User (Dashed) */}
                <Polyline 
                  positions={[[userLocation[0], userLocation[1]], [currentLat, currentLng]]} 
                  pathOptions={{ color: '#2563eb', dashArray: '6, 6', weight: 2, opacity: 0.4 }} 
                />
              </React.Fragment>
            );
          })}

          {Object.values(liveBuses).filter((lb: any) => !buses.find(b => b.RouteID === lb.busNumber)).map((liveBus: any) => {
            let displayLat = liveBus.lat;
            let displayLng = liveBus.lng;
            
            if (displayLat === userLocation[0] && displayLng === userLocation[1]) {
              displayLat += 0.0001;
              displayLng += 0.0001;
            }

            return (
              <React.Fragment key={liveBus.busNumber}>
                <Marker position={[displayLat, displayLng]} icon={getBusIcon(!!liveBus.isSOS)}>
                  <Popup>
                    <div className="p-1">
                      <p className={`font-bold ${liveBus.isSOS ? 'text-red-600' : 'text-orange-500'}`}>{liveBus.busNumber} (Live) {liveBus.isSOS && '(SOS)'}</p>
                      <p className="text-sm">Custom Driver Session</p>
                      {liveBus.occupancy && <p className="text-xs font-bold mt-1">Occupancy: {liveBus.occupancy}</p>}
                      <p className="text-xs text-text-muted mt-1">Status: {liveBus.status}</p>
                    </div>
                  </Popup>
                </Marker>
                <Polyline 
                  positions={[[userLocation[0], userLocation[1]], [displayLat, displayLng]]} 
                  pathOptions={{ color: '#f97316', dashArray: '6, 6', weight: 2, opacity: 0.4 }} 
                />
              </React.Fragment>
            );
          })}
        </MapContainer>

        <button 
          onClick={() => navigate('/driver')} 
          className="absolute bottom-6 right-6 bg-text-main text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-main z-[1000] hover:bg-slate-800 transition-colors"
        >
          Switch to Driver Dashboard
        </button>
      </main>
    </div>
  );
}

