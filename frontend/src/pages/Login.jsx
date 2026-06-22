import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900 to-slate-900" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">CMS-ITS</h1>
          <p className="text-sm text-slate-400 mt-1">Phần mềm quản lý tập trung</p>
          <p className="text-xs text-slate-500 mt-0.5">Hệ thống giao thông thông minh cao tốc</p>
        </div>

        {/* Form */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">Đăng nhập hệ thống</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tên đăng nhập</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="input-field pl-9"
                  placeholder="admin"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field pl-9 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Test accounts hint */}
          <div className="mt-6 pt-5 border-t border-slate-700">
            <p className="text-xs text-slate-500 font-medium mb-2">Tài khoản thử nghiệm:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { u: 'admin', p: 'Admin@123', label: 'Quản trị', color: 'red' },
                { u: 'cmo01', p: 'Cmo@123', label: 'CMO', color: 'blue' },
                { u: 'station01', p: 'Station@123', label: 'Trạm', color: 'green' },
                { u: 'night01', p: 'Night@123', label: 'Kíp đêm', color: 'purple' },
              ].map(a => (
                <button
                  key={a.u}
                  type="button"
                  onClick={() => setForm({ username: a.u, password: a.p })}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-colors border border-slate-600/50"
                >
                  <span className="block font-medium text-slate-300">{a.label}</span>
                  <span className="text-slate-500">{a.u}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
