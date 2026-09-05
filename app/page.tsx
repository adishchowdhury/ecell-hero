import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { HeroAnimation } from '../components/home/hero-animation';
import { ScrollSections } from '../components/home/scroll-sections';
import { Navigation } from '../components/ui/navigation';
import { LoginModal } from '../components/ui/login-modal';
import { soundEngine } from '../components/ui/sound-effects';

export default function Page() {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  // Custom Cursor Logic
  useEffect(() => {
    const updateCursorPos = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.closest('button') || 
        target.closest('a')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateCursorPos);
    return () => window.removeEventListener('mousemove', updateCursorPos);
  }, []);

  // Loading Screen Timer Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoaded(true), 400);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const juPos = document.getElementById('about-ju')?.offsetTop || 800;
      const ecellPos = document.getElementById('e-cell')?.offsetTop || 1600;

      if (scrollPos < juPos - 200) {
        setActiveSection('hero');
      } else if (scrollPos < ecellPos - 200) {
        setActiveSection('about-ju');
      } else {
        setActiveSection('e-cell');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden font-sans cursor-none">
      
      {/* Custom Cursor */}
      <div 
        className={`custom-cursor ${isHovering ? 'hovering' : ''}`}
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />

      {/* ----------------------------------------------------
          01. CINEMATIC SYSTEM LOADING OVERLAY
      ---------------------------------------------------- */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            key="loader"
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-6"
          >
            <div className="relative w-full max-w-sm flex flex-col items-center text-center">
              <h2 className="font-display text-lg tracking-tight text-white mb-2">
                E-SUMMIT 2026
              </h2>
              <p className="text-[9px] font-mono text-white/40 mb-12 tracking-[0.2em] uppercase">
                Jadavpur University
              </p>

              {/* Minimal Progress Bar */}
              <div className="w-full h-[1px] bg-white/10 mb-6 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                />
              </div>

              {/* HUD Logs */}
              <div className="flex items-center justify-between w-full font-mono text-[9px] tracking-widest text-white/40">
                <span className="uppercase">
                  {loadingProgress < 100 ? 'Initializing Space Link...' : 'System Ready.'}
                </span>
                <span className="text-white">{Math.min(loadingProgress, 100)}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          02. GLOBAL NAVIGATION HEADER
      ---------------------------------------------------- */}
      <Navigation
        onOpenLogin={() => setLoginOpen(true)}
        activeSection={activeSection}
      />

      {/* ----------------------------------------------------
          03. 3D WEBGL HERO CANVAS BACKGROUND
      ---------------------------------------------------- */}
      <HeroAnimation />

      {/* ----------------------------------------------------
          04. MAIN HERO LANDING VIEW
      ---------------------------------------------------- */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-6 lg:px-8 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto flex flex-col items-center w-full"
        >
          {/* Subtitle Label */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 text-white/60 text-[9px] font-mono tracking-[0.2em] uppercase mb-8 backdrop-blur-md">
            <span>Jadavpur University Entrepreneurship Cell</span>
          </div>

          {/* Enormous Editorial Display Title */}
          <h1 className="font-display text-5xl sm:text-8xl lg:text-[10rem] font-medium tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
            E-SUMMIT
          </h1>
          <div className="font-display text-5xl sm:text-8xl lg:text-[10rem] font-medium text-white/40 tracking-tighter leading-[0.9] -mt-1 sm:-mt-2">
            2026
          </div>

          {/* Calligraphic Accent Line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.8 }}
            className="font-calligraphy text-white/90 text-2xl sm:text-4xl lg:text-5xl mt-8 mb-10 italic tracking-tight font-light"
          >
            Where ideas leave Earth.
          </motion.div>

          <p className="max-w-xl text-sm sm:text-base text-white/40 font-sans leading-relaxed font-light mb-12">
            The Sixth Edition of our flagship event for innovators, founders, and aspiring entrepreneurs. Join the premier startup summit.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <button
              onClick={() => {
                soundEngine.playSwoosh();
                setLoginOpen(true);
              }}
              className="px-10 py-5 rounded-full font-mono text-[11px] font-bold tracking-[0.2em] text-black bg-white hover:scale-105 transition-transform duration-500 flex items-center gap-3 group"
            >
              <span>DELEGATE PORTAL</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Scroll Down Indicator */}
        <motion.div
          animate={{ y: [0, 8, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer text-white/30 hover:text-white transition-colors"
          onClick={() => {
            document.getElementById('about-ju')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <span className="text-[9px] font-mono tracking-[0.3em] uppercase">Scroll</span>
          <ArrowDown className="w-3 h-3" />
        </motion.div>
      </section>

      {/* ----------------------------------------------------
          05. SCROLL SECTIONS
      ---------------------------------------------------- */}
      <ScrollSections
        onOpenLogin={() => setLoginOpen(true)}
      />

      {/* ----------------------------------------------------
          06. FOOTER
      ---------------------------------------------------- */}
      <footer className="relative z-10 bg-black border-t border-white/10 py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="font-display font-semibold text-xl tracking-tight text-white">
              E-SUMMIT 2026
            </div>
            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
              Jadavpur University Entrepreneurship Cell
            </p>
          </div>

          <div className="flex items-center gap-8 text-[10px] font-mono tracking-widest text-white/40 uppercase">
            <button onClick={() => setLoginOpen(true)} className="hover:text-white transition-colors">Portal</button>
            <a href="https://ecellju.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Official Site</a>
          </div>
        </div>
      </footer>

      {/* ----------------------------------------------------
          07. MODALS
      ---------------------------------------------------- */}
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
