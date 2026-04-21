import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Phone, User, Lock, Key, Navigation, Shield } from 'lucide-react';

export default function Login() {
  const [passengerMobile, setPassengerMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  const [driverBus, setDriverBus] = useState('');
  const [driverRoute, setDriverRoute] = useState('');
  const [driverUser, setDriverUser] = useState('');
  const [driverPass, setDriverPass] = useState('');

  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  const navigate = useNavigate();

  const handleGenerateOtp = async () => {
    const res = await fetch('/api/generate-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: passengerMobile })
    });
    const data = await res.json();
    if (data.otp) {
      alert(`Simulated OTP: ${data.otp}`);
      setOtpSent(true);
    }
  };

  const handlePassengerLogin = async () => {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: passengerMobile, otp })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/passenger');
    } else {
      alert(data.error);
    }
  };

  const handleDriverLogin = async () => {
    console.log('Attempting driver login...', { busNumber: driverBus, route: driverRoute, username: driverUser });
    try {
      const res = await fetch('/api/driver-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          busNumber: driverBus, 
          route: driverRoute,
          username: driverUser, 
          password: driverPass 
        })
      });
      const data = await res.json();
      console.log('Driver login response:', data);
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/driver');
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred during login');
    }
  };

  const handleAdminLogin = () => {
    // Flexible admin login - accepts any credentials as long as they aren't empty
    if (adminUser.trim() !== '' && adminPass.trim() !== '') {
      localStorage.setItem('user', JSON.stringify({ username: adminUser, role: 'admin' }));
      navigate('/admin');
    } else {
      alert('Please enter both username and password');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-bg-main">
      {/* Passenger Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative overflow-hidden border-r border-border-main">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <img 
            src="https://picsum.photos/seed/bus-station/1920/1080" 
            alt="bg" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="w-full max-w-md z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <User size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-text-main tracking-tight">Passenger</h2>
              <p className="text-text-muted font-medium">Real-time tracking for commuters</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Enter your mobile" 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-border-main rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-text-main"
                  value={passengerMobile}
                  onChange={(e) => setPassengerMobile(e.target.value)}
                />
              </div>
            </div>

            {otpSent && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Verification Code</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder="4-digit OTP" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-border-main rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-text-main"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              </div>
            )}

            {!otpSent ? (
              <button 
                onClick={handleGenerateOtp}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                Generate OTP
              </button>
            ) : (
              <button 
                onClick={handlePassengerLogin}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                Verify & Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Driver Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 relative overflow-hidden border-r border-border-main">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none grayscale">
          <img 
            src="https://picsum.photos/seed/bus-driver/1920/1080" 
            alt="bg" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="w-full max-w-md z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-text-main rounded-2xl text-white shadow-lg shadow-slate-900/20">
              <Bus size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-text-main tracking-tight">Driver</h2>
              <p className="text-text-muted font-medium">Update location & status</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Bus Number</label>
              <div className="relative">
                <Bus className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="KA-01-F-1234" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-border-main rounded-xl focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-text-main"
                  value={driverBus}
                  onChange={(e) => setDriverBus(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Bus Route</label>
              <div className="relative">
                <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="e.g. 335E" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-border-main rounded-xl focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-text-main"
                  value={driverRoute}
                  onChange={(e) => setDriverRoute(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Username" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-border-main rounded-xl focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-text-main"
                  value={driverUser}
                  onChange={(e) => setDriverUser(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-border-main rounded-xl focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-text-main"
                  value={driverPass}
                  onChange={(e) => setDriverPass(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleDriverLogin}
              className="w-full py-4 bg-text-main text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
            >
              Driver Login
            </button>
          </div>
        </div>
      </div>

      {/* Admin Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
          <Shield className="w-full h-full" />
        </div>

        <div className="w-full max-w-md z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-text-main tracking-tight">Admin</h2>
              <p className="text-text-muted font-medium">Fleet management & SOS control</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Admin Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="admin" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-border-main rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-text-main"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-border-main rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all text-text-main"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleAdminLogin}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}
