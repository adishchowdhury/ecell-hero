import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { soundEngine } from './sound-effects';

interface NavigationProps {
  onOpenLogin: () => void;
  activeSection: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  onOpenLogin,
  activeSection
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    soundEngine.playClick();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled
            ? 'bg-[#030611]/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] py-3.5'
            : 'bg-gradient-to-b from-[#030611]/90 via-[#030611]/40 to-transparent py-5'
        }`}
      >
        <div className="max-w-[90rem] mx-auto px-6 sm:px-12 flex items-center justify-between">
          {/* Minimalist Logo */}
          <div 
            onClick={() => scrollToSection('hero')}
            className="flex flex-col gap-0.5 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00ffff] animate-pulse" />
              <span className="font-display font-semibold text-lg tracking-tight text-white group-hover:text-cyan-200 transition-colors">
                E-SUMMIT 2026
              </span>
            </div>
            <span className="text-[9px] font-mono tracking-[0.25em] text-white/50 uppercase pl-4">
              Jadavpur University
            </span>
          </div>

          {/* Center Orbital Telemetry Indicator (Desktop) */}
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono tracking-widest text-white/60 uppercase">
              ORBITAL TELEMETRY // JU-KOLKATA
            </span>
            <span className="text-[10px] font-mono text-cyan-400/80">LAT 22.4989° N</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-6">
            {/* Login Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenLogin();
              }}
              className="relative group overflow-hidden px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white text-white hover:text-black border border-white/20 hover:border-white text-[11px] font-mono tracking-widest transition-all duration-500 flex items-center gap-2.5 shadow-[0_0_20px_-5px_rgba(0,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]"
            >
              <span className="font-semibold">PORTAL ACCESS</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
