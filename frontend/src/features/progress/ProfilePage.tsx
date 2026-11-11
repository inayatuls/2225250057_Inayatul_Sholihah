import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BottomNav from '../../app/BottomNav';
import { Button, Card, Spinner } from '../../components/ui/Basics';
import Screen from '../../components/ui/Screen';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { LiteracyProfile } from '../../lib/types';
import InstallApp from '../install/InstallApp';
import LiteracyBars from '../literacy/LiteracyBars';
import Tutorial from '../onboarding/Tutorial';

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tutorial, setTutorial] = useState(false);
  const lit = useQuery({ queryKey: ['literacy'], queryFn: () => api.get<LiteracyProfile>('/me/literacy-profile') });

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    clear();
    qc.clear();
    navigate('/masuk', { replace: true });
  }

  return (
    <Screen title={user?.display_name} subtitle={`@${user?.username ?? ''}`} nav={<BottomNav />}>
      <Card className="border-2 border-brand-100 shadow-none">
        <p className="text-sm text-ink-muted">Kelas</p>
        {user?.class ? (
          <p className="font-semibold">
            {user.class.name} · {user.class.teacher_name}
          </p>
        ) : (
          <Link to="/gabung-kelas" className="font-semibold text-brand-600">
            Gabung kelas →
          </Link>
        )}
      </Card>

      <Card className="mt-4 border-2 border-brand-100 shadow-none">
        <p className="mb-1 font-semibold">Profil Literasi Matematika</p>
        <p className="mb-4 text-xs text-ink-muted">Dihitung dari langkah-langkah di Lab Pemodelan dan soal denah.</p>
        {lit.isLoading && <Spinner />}
        {lit.data && <LiteracyBars processes={lit.data.processes} />}
        {lit.data?.suggestion && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">💡 {lit.data.suggestion}</p>}
      </Card>

      <div className="mt-6 space-y-2">
        <Button variant="ghost" className="w-full" onClick={() => setTutorial(true)}>
          📘 Lihat tutorial lagi
        </Button>
        <InstallApp />
        <Button variant="ghost" className="w-full" onClick={() => navigate('/ganti-sandi')}>
          🔑 Ganti kata sandi
        </Button>
        <Button variant="danger" className="w-full" onClick={logout}>
          Keluar
        </Button>
      </div>
      {tutorial && <Tutorial forceOpen onClose={() => setTutorial(false)} />}
    </Screen>
  );
}
