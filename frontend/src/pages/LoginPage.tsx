import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { Button } from '../components/ui/Button';
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authService.login(email, password);
      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="p-8 md:p-10 rounded-3xl bg-surface-elevated/80 border border-indigo-500/20 shadow-2xl backdrop-blur-2xl relative overflow-hidden animate-fade-in">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/40 mb-3.5 ring-4 ring-indigo-500/10">
          <Zap className="w-7 h-7 text-white fill-white" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">JobScheduler Control</h1>
        <p className="text-xs text-gray-400 mt-1">High-throughput distributed async workload orchestrator</p>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 px-4 py-3 rounded-xl mb-6 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Quick Demo Autofill Pills */}
      <div className="mb-6 p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1 font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Quick Demo Login:
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemo('admin@acme.com', 'password123')}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
          >
            <span className="text-[10px] text-gray-400 block font-mono">ADMIN ROLE</span>
            <span className="text-xs font-semibold text-indigo-200">admin@acme.com</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo('developer@acme.com', 'password123')}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
          >
            <span className="text-[10px] text-gray-400 block font-mono">DEVELOPER ROLE</span>
            <span className="text-xs font-semibold text-purple-200">developer@acme.com</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            Email Address
          </label>
          <input
            type="email"
            required
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="input pr-10"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 py-2.5 font-bold flex items-center justify-center gap-2 mt-2"
          isLoading={isLoading}
        >
          <span>Sign In to Cluster</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-gray-400">
        Need a new organization workspace?{' '}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
          Register here
        </Link>
      </div>
    </div>
  );
}
