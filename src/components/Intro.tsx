import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bus } from 'lucide-react';

export default function Intro() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5500); // 5.5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center overflow-hidden font-sans">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <div className="p-6 bg-primary rounded-[2.5rem] text-white shadow-2xl shadow-primary/30 mb-8 relative">
          <motion.div
            animate={{ 
              x: [-5, 5, -5],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Bus size={80} strokeWidth={1.5} />
          </motion.div>
          
          {/* Decorative elements */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
        </div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-5xl font-extrabold text-text-main tracking-tight mb-2"
        >
          TransitTrack
        </motion.h1>
        
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-text-muted font-medium text-lg tracking-wide uppercase"
        >
          Real-Time Public Transport Tracking
        </motion.p>

        <div className="mt-16 flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  delay: i * 0.2 
                }}
                className="w-2.5 h-2.5 bg-primary rounded-full"
              />
            ))}
          </div>
          
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            onClick={() => navigate('/login')}
            className="text-text-muted hover:text-primary font-bold text-sm uppercase tracking-widest transition-colors"
          >
            Skip Intro
          </motion.button>
        </div>
      </motion.div>

      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
