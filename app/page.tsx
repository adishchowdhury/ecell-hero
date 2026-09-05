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
  const [targetFocus, setTargetFocus] = useState<'system' | 'earth' | 'saturn' | 'rocket' | 'astronaut'>('system');

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

  // WebGL Asset Preloading & Progress Synchronization with Safety Fallback
  const handleSceneProgress = (progress: number) => {
    const percent = Math.min(100, Math.round(progress * 100));
    setLoadingProgress((prev) => Math.max(prev, percent));
  };

  const handleSceneLoaded = () => {
    setLoadingProgress(100);
    setTimeout(() => {
      setIsLoaded(true);
    }, 180);
  };

  // Safety fallback: ensure loading screen is dismissed even if WebGL is unavailable
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoadingProgress(100);
      setIsLoaded(true);
    }, 2400);

    return () => clearTimeout(safetyTimer);
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
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
      <HeroAnimation 
        onSceneLoaded={handleSceneLoaded} 
        onSceneProgress={handleSceneProgress}
        targetFocus={targetFocus} 
      />

      {/* ----------------------------------------------------
          04. MAIN HERO LANDING VIEW
      ---------------------------------------------------- */}
      <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-6 lg:px-8 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto flex flex-col items-center w-full relative z-10"
        >
          {/* Subtitle Telemetry Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/15 bg-black/40 backdrop-blur-xl text-white/70 text-[10px] font-mono tracking-[0.25em] uppercase mb-8 shadow-[0_0_25px_-5px_rgba(0,255,255,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00ffff]" />
            <span>JADAVPUR UNIVERSITY ENTREPRENEURSHIP CELL</span>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-cyan-300/80 hidden sm:inline">EDITION VI</span>
          </div>

          {/* Enormous Editorial Display Title (iOS / Awwwards Typography) */}
          <h1 className="font-display text-6xl sm:text-8xl lg:text-[11rem] font-medium tracking-[-0.055em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/45 leading-[0.88] drop-shadow-[0_12px_60px_rgba(255,255,255,0.2)] select-none">
            E-SUMMIT
          </h1>
          <div className="font-display text-6xl sm:text-8xl lg:text-[11rem] font-light tracking-[-0.06em] text-transparent bg-clip-text bg-gradient-to-b from-white/95 via-sky-100/80 to-white/20 leading-[0.88] -mt-2 sm:-mt-5 select-none drop-shadow-[0_0_50px_rgba(76,165,255,0.35)]">
            2026
          </div>

          {/* Calligraphic Accent Line (iOS Awwwards Haute-Couture Style) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.8 }}
            className="font-calligraphy italic text-3xl sm:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-white to-purple-200 mt-6 mb-7 tracking-[-0.015em] font-light drop-shadow-[0_4px_30px_rgba(255,255,255,0.4)]"
          >
            Where ideas leave Earth.
          </motion.div>

          <p className="max-w-xl text-sm sm:text-base text-white/60 font-sans leading-relaxed font-light mb-10">
            Eastern India&apos;s apex student-led entrepreneurship symposium. Connecting stellar minds, disruptive founders, and venture pioneers under one cosmic canvas.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <button
              onClick={() => {
                soundEngine.playSwoosh();
                setLoginOpen(true);
              }}
              className="px-10 py-4.5 rounded-full font-mono text-[11px] font-bold tracking-[0.2em] text-black bg-white hover:bg-cyan-100 hover:scale-105 transition-all duration-500 flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.35)] group"
            >
              <span>DELEGATE REGISTRATION</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                document.getElementById('about-ju')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4.5 rounded-full font-mono text-[11px] font-semibold tracking-[0.2em] text-white/80 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/30 backdrop-blur-xl transition-all duration-300"
            >
              EXPLORE ODYSSEY
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
