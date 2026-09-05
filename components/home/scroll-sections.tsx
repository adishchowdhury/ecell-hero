import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { soundEngine } from '../ui/sound-effects';

gsap.registerPlugin(ScrollTrigger);

interface ScrollSectionsProps {
  onOpenLogin: () => void;
  onOpenEvents?: () => void;
}

export const ScrollSections: React.FC<ScrollSectionsProps> = ({ onOpenLogin }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const sections = containerRef.current.querySelectorAll('section');
    
    const ctx = gsap.context(() => {
      sections.forEach((section) => {
        ScrollTrigger.create({
          trigger: section,
          start: 'top center',
          end: 'bottom center',
        });

        // Minimalist fade up animation
        gsap.fromTo(
          section.querySelectorAll('.fade-up'),
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.4,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
            }
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative z-10 w-full pt-[100vh] pb-32">
      
      {/* SECTION 1: ABOUT JADAVPUR UNIVERSITY */}
      <section id="about-ju" className="min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center">
          
          <div className="fade-up mb-12 relative flex justify-center">
            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full scale-150" />
            <div className="bg-white rounded-3xl p-6 shadow-2xl relative z-10 flex items-center justify-center border border-white/10">
              <img 
                src="/image.png" 
                alt="Jadavpur University" 
                className="w-32 h-32 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="hidden w-32 h-32 items-center justify-center">
                <span className="text-xs font-mono tracking-widest text-black/50">JU LOGO</span>
              </div>
            </div>
          </div>

          <h2 className="fade-up font-calligraphy text-5xl md:text-7xl font-medium text-white mb-8 tracking-tight">
            A Legacy of Excellence.
          </h2>
          
          <p className="fade-up font-sans text-lg md:text-2xl text-white/50 leading-relaxed max-w-2xl mx-auto font-light">
            Established in 1955, Jadavpur University stands as a beacon of academic brilliance. 
            Recognized globally, it fosters an environment where innovation meets tradition.
          </p>

          <div className="fade-up mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-3xl border-t border-white/10 pt-16">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-display font-light text-white mb-3">#1</span>
              <span className="text-[11px] font-mono tracking-[0.2em] text-white/40 uppercase">State University</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-display font-light text-white mb-3">#9</span>
              <span className="text-[11px] font-mono tracking-[0.2em] text-white/40 uppercase">NIRF Ranking</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-display font-light text-white mb-3">5</span>
              <span className="text-[11px] font-mono tracking-[0.2em] text-white/40 uppercase">Star NAAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: E-CELL & SUMMIT */}
      <section id="e-cell" className="min-h-screen flex items-center justify-center px-6 py-24">
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center">
          
          <div className="fade-up mb-12">
            <span className="px-5 py-2 rounded-full border border-white/20 text-[10px] font-mono tracking-[0.2em] text-white/70 uppercase">
              The Ecosystem
            </span>
          </div>

          <h2 className="fade-up font-display text-5xl md:text-7xl font-semibold text-white mb-10 tracking-tighter">
            Where ideas become inevitable.
          </h2>
          
          <p className="fade-up font-sans text-xl md:text-2xl text-white/50 leading-relaxed max-w-2xl mx-auto font-light mb-16">
            The Entrepreneurship Cell is more than an organization; it is a movement. 
            We bridge the gap between radical ideation and venture realization.
          </p>

          <div className="fade-up flex flex-col sm:flex-row gap-6">
            <button 
              onClick={() => {
                soundEngine.playSwoosh();
                onOpenLogin();
              }}
              className="px-10 py-5 rounded-full bg-white text-black font-mono text-[11px] font-bold tracking-[0.2em] hover:scale-105 transition-transform duration-500"
            >
              PORTAL ACCESS
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
