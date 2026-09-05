import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, User, Menu, X, ArrowRight } from 'lucide-react';
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
  const [isMuted, setIsMuted] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const scrollToSection = (id: string) => {
    soundEngine.playClick();
    setMobileMenuOpen(false);
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
            ? 'bg-black/40 backdrop-blur-2xl border-b border-white/5 py-4'
            : 'bg-gradient-to-b from-black/80 to-transparent py-6'
        }`}
      >
        <div className="max-w-[90rem] mx-auto px-6 sm:px-12 flex items-center justify-between">
          {/* Minimalist Logo */}
          <div 
            onClick={() => scrollToSection('hero')}
            className="flex flex-col gap-0.5 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-lg tracking-tight text-white group-hover:opacity-70 transition-opacity">
                E-SUMMIT 2026
              </span>
            </div>
            <span className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase">
              Jadavpur University
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-6">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              title={isMuted ? "Enable Audio" : "Mute Sound"}
              className="hidden sm:flex p-2 text-white/50 hover:text-white transition-colors"
            >
              {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Login Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenLogin();
              }}
              className="relative group overflow-hidden px-5 py-2.5 rounded-full border border-white/20 hover:border-white text-[11px] font-mono tracking-widest text-white transition-all duration-500 flex items-center gap-2"
            >
              <span>PORTAL ACCESS</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
