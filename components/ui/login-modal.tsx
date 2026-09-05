import React, { useState } from 'react';
import { X, Sparkles, Lock, Mail, ArrowRight, ShieldCheck, Github, KeyRound } from 'lucide-react';
import { soundEngine } from './sound-effects';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playSwoosh();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Glowing orb background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 mb-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Sparkles className="w-6 h-6 animate-spin-slow" />
          </div>
          <h3 className="font-syne text-2xl font-bold text-white tracking-wide">
            {tab === 'login' ? 'DELEGATE PORTAL' : 'CREATE ACCOUNT'}
          </h3>
          <p className="text-xs font-mono text-cyan-400 mt-1">
            E-SUMMIT 2026 • JU E-CELL ACCESS
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-xs">
          <button
            onClick={() => {
              soundEngine.playClick();
              setTab('login');
            }}
            className={`py-2 rounded-lg font-bold transition-all ${
              tab === 'login'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            LOGIN
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setTab('register');
            }}
            className={`py-2 rounded-lg font-bold transition-all ${
              tab === 'register'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            REGISTER
          </button>
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h4 className="font-syne text-xl font-bold text-white">AUTHENTICATION SUCCESSFUL</h4>
            <p className="text-xs text-slate-400">Welcome to E-Summit 2026 Portal</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Arya Roy"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">INSTITUTION / UNIVERSITY</label>
                  <input
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="Jadavpur University"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-cyan-400" /> EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="delegate@ju.ac.in"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-400" /> SECURITY CODE / PASSWORD
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3 rounded-xl font-mono text-xs font-bold text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all flex items-center justify-center gap-2 group"
            >
              <span>{tab === 'login' ? 'GRANT PORTAL ACCESS' : 'COMPLETE REGISTRATION'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Social options */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
              <span className="text-[10px] font-mono text-slate-500 text-center">INSTITUTIONAL SINGLE SIGN-ON</span>
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-white/10 hover:border-white/20 text-xs font-mono text-slate-300 flex items-center justify-center gap-2 transition-all"
              >
                <Github className="w-4 h-4" /> CONTINUE WITH GITHUB / GOOGLE
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
