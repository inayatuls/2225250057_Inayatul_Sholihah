import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, ErrorBox, Spinner, inputClass } from '../../components/ui/Basics';
import { api, errorMessage } from '../../lib/api';
import type { ClassInfo } from '../../lib/types';
import InstallApp from '../install/InstallApp';
import TeacherLayout from './TeacherLayout';

export default function TeacherHome() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['classes'], queryFn: () => api.get<ClassInfo[]>('/classes') });
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api.post('/classes', { name });
      setName('');
      void qc.invalidateQueries({ queryKey: ['classes'] });
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }

  return (
    <TeacherLayout title="Kelas Saya">
      <form onSubmit={create} className="mb-6 flex flex-wrap gap-2 rounded-card bg-white p-4 shadow-card">
        <input className={`${inputClass} max-w-xs`} placeholder="Nama kelas, mis. VIII-A" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={!name.trim()}>
          + Buat Kelas
        </Button>
        {err && <ErrorBox message={err} />}
      </form>
      {isLoading && <Spinner />}
      {error && <ErrorBox message={errorMessage(error)} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <Link key={c.id} to={`/guru/kelas/${c.id}`} className={`rounded-card bg-white p-5 shadow-card hover:ring-2 hover:ring-brand-500 ${c.is_archived ? 'opacity-60' : ''}`}>
            <p className="text-lg font-semibold">{c.name}</p>
            <p className="mt-1 text-sm text-ink-muted">{c.student_count} siswa{c.is_archived ? ' · diarsipkan' : ''}</p>
            <p className="mt-3 inline-block rounded-xl bg-brand-50 px-3 py-1 font-mono text-lg font-bold tracking-widest text-brand-700">{c.join_code}</p>
          </Link>
        ))}
      </div>
      {data?.length === 0 && <p className="text-ink-muted">Belum ada kelas. Buat kelas pertama, lalu bagikan kodenya ke siswa.</p>}
      <div className="mt-8 max-w-xs">
        <InstallApp compact />
      </div>
    </TeacherLayout>
  );
}
