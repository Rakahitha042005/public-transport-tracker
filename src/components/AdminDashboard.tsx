import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Bus, MapPin, Power, Navigation, AlertTriangle, Users, 
  Activity, Shield, BarChart3, List, Settings, Search,
  CheckCircle2, AlertCircle, Clock, ArrowLeft
} from 'lucide-react';
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

interface LiveBus {
  busNumber: string;
  routeId: string;
  lat: number;
  lng: number;
  speed: number;
  status: string;
  occupancy: string;
  isSOS: boolean;
  last_updated: string;
}

const getBusIcon = (isSOS: boolean, occupancy: string) => {
  let color = 'bg-blue-600';
  if (isSOS) color = 'bg-red-600 animate-pulse';
  else if (occupancy === 'High') color = 'bg-orange-600';
  
  return L.divIcon({
    className: 'custom-bus-icon',
    html: `<div class="${color} p-2 rounded-full border-2 border-white shadow-lg text-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${isSOS ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' : '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4c-1.1 0-2.1.8-2.4 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2C.5 16.3 1 18 1 18h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'}
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [liveBuses, setLiveBuses] = useState<Record<string, LiveBus>>({});
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [activeTab, setActiveTab] = useState<'live' | 'routes' | 'alerts'>('live');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liveRes, routesRes] = await Promise.all([
          fetch('/api/get-live-locations'),
          fetch('/api/get-buses')
        ]);
        const liveData = await liveRes.json();
        const routesData = await routesRes.json();
        setLiveBuses(liveData);
        setAllRoutes(routesData);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      }
    };
    fetchData();

    socket.on('bus-location-updated', (data: LiveBus) => {
      setLiveBuses(prev => ({
        ...prev,
        [data.busNumber]: { ...data, last_updated: new Date().toISOString() }
      }));
    });

    return () => {
      socket.off('bus-location-updated');
    };
  }, []);

  const liveBusesList = Object.values(liveBuses) as LiveBus[];
  const sosBuses = liveBusesList.filter(b => b.isSOS);
  
  const filteredLive = liveBusesList.filter(b => 
    b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.routeId && b.routeId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredRoutes = allRoutes.filter(r => 
    r.RouteID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.RouteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.Via.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg-main font-sans">
      {/* Sidebar */}
      <aside className="w-[380px] bg-sidebar border-r border-border-main flex flex-col z-10 overflow-hidden">
        <div className="p-6 border-b border-border-main bg-white">
          <div className="flex items-center gap-2 mb-4">
            <button 
              onClick={() => navigate('/login')}
              className="p-2 hover:bg-slate-100 rounded-lg text-text-muted hover:text-primary transition-colors"
              title="Back to Login"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5 font-extrabold text-xl text-primary">
              <Shield size={24} />
              Admin Fleet
            </div>
            <button 
              onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}
              className="p-2 text-text-muted hover:text-red-500 transition-colors"
            >
              <Power size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-black text-blue-900">{allRoutes.length}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-2xl border border-green-100">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Live</p>
              <p className="text-xl font-black text-green-900">{liveBusesList.length}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-2xl border border-red-100 relative">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">SOS</p>
              <p className="text-xl font-black text-red-900">{sosBuses.length}</p>
              {sosBuses.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
            </div>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
            {(['live', 'routes', 'alerts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-border-main rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'live' && (
            filteredLive.length === 0 ? (
              <div className="text-center py-10 text-text-muted text-sm">No live buses found</div>
            ) : (
              filteredLive.map((bus) => (
                <div 
                  key={bus.busNumber}
                  onClick={() => {
                    setSelectedBusId(bus.busNumber);
                    setMapCenter([bus.lat, bus.lng]);
                  }}
                  className={`p-4 border rounded-2xl transition-all cursor-pointer ${selectedBusId === bus.busNumber ? 'border-primary bg-blue-50/50 ring-1 ring-primary' : 'border-border-main bg-white hover:border-primary/50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm px-2 py-0.5 bg-slate-100 rounded text-text-main">{bus.busNumber}</span>
                      <span className="text-[10px] font-bold text-primary">{bus.routeId}</span>
                    </div>
                    {bus.isSOS && <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded animate-pulse">SOS</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-text-muted">
                    <div className="flex items-center gap-1"><Activity size={12} /> {bus.speed} km/h</div>
                    <div className="flex items-center gap-1"><Users size={12} /> {bus.occupancy || 'Low'}</div>
                    <div className="flex items-center gap-1 col-span-2"><Clock size={12} /> {new Date(bus.last_updated).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'routes' && (
            filteredRoutes.map((route) => (
              <div key={route.RouteID} className="p-4 border border-border-main bg-white rounded-2xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-primary">{route.RouteID}</span>
                  <span className="text-[10px] font-bold text-text-muted">{route.RouteName.split(' to ')[1]}</span>
                </div>
                <p className="text-xs font-medium text-text-main mb-1">{route.RouteName}</p>
                <p className="text-[10px] text-text-muted truncate">Via: {route.Via}</p>
              </div>
            ))
          )}

          {activeTab === 'alerts' && (
            sosBuses.length === 0 ? (
              <div className="text-center py-10 text-text-muted text-sm">No active alerts</div>
            ) : (
              sosBuses.map((bus) => (
                <div 
                  key={bus.busNumber}
                  onClick={() => {
                    setSelectedBusId(bus.busNumber);
                    setMapCenter([bus.lat, bus.lng]);
                  }}
                  className="p-4 border-2 border-red-500 bg-red-50 rounded-2xl cursor-pointer animate-pulse"
                >
                  <div className="flex items-center gap-2 mb-2 text-red-600">
                    <AlertTriangle size={20} />
                    <span className="font-black text-sm uppercase">Emergency SOS</span>
                  </div>
                  <p className="text-xs font-bold text-red-900 mb-1">Bus: {bus.busNumber} | Route: {bus.routeId}</p>
                  <p className="text-[10px] text-red-700">Location: {bus.lat.toFixed(4)}, {bus.lng.toFixed(4)}</p>
                </div>
              ))
            )
          )}
        </div>
      </aside>

      {/* Main Map */}
      <main className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapRecenter center={mapCenter} />
          
          {liveBusesList.map((bus: LiveBus) => (
            <Marker 
              key={bus.busNumber} 
              position={[bus.lat, bus.lng]} 
              icon={getBusIcon(!!bus.isSOS, bus.occupancy)}
              eventHandlers={{
                click: () => setSelectedBusId(bus.busNumber)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-primary">{bus.busNumber}</h3>
                    {bus.isSOS && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">SOS</span>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-text-muted">Route:</span>
                      <span className="font-bold">{bus.routeId}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-text-muted">Speed:</span>
                      <span className="font-bold">{bus.speed} km/h</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-text-muted">Occupancy:</span>
                      <span className={`font-bold ${bus.occupancy === 'High' ? 'text-red-500' : 'text-green-600'}`}>{bus.occupancy || 'Low'}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-text-muted">Status:</span>
                      <span className="font-bold text-blue-600">{bus.status}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Stats Overlay */}
        <div className="absolute bottom-8 left-8 right-8 flex justify-center pointer-events-none z-[1000]">
          <div className="bg-white/90 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-6 flex gap-12 pointer-events-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Bus size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Active Fleet</p>
                <p className="text-xl font-black text-text-main">{liveBusesList.length} Buses</p>
              </div>
            </div>
            <div className="w-px h-12 bg-border-main"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Avg Occupancy</p>
                <p className="text-xl font-black text-text-main">Medium</p>
              </div>
            </div>
            <div className="w-px h-12 bg-border-main"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">System Health</p>
                <p className="text-xl font-black text-text-main">Optimal</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
