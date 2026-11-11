import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function TeacherLayout({ children, title, back }: { children: ReactNode; title: string; back?: string }) {
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    clear();
    qc.clear();
    navigate('/masuk', { replace: true });
  }
  return (
    <div className="min-h-[100dvh] bg-slate-50 text-ink">
      <header className="bg-brand-600 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/guru" className="flex items-center gap-2 font-semibold">
            <img src="/icons/favicon.svg" alt="" className="h-8 w-8 rounded-lg" /> Kartesia Guru
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{user?.display_name}</span>
            <button type="button" onClick={logout} className="rounded-xl bg-white/15 px-3 py-2 font-semibold hover:bg-white/25">
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {back && (
          <Link to={back} className="text-sm font-semibold text-brand-600">
            ← Kembali
          </Link>
        )}
        <h1 className="mb-5 mt-1 text-2xl font-semibold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
