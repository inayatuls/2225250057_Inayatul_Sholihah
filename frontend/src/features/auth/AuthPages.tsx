import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, Field, inputClass } from '../../components/ui/Basics';
import Screen, { FooterButton } from '../../components/ui/Screen';
import { api, errorMessage } from '../../lib/api';
import { homePathFor, useAuth } from '../../lib/auth';
import type { AuthResponse, User } from '../../lib/types';
import InstallApp from '../install/InstallApp';

function Logo() {
  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <img src="/icons/favicon.svg" alt="" className="h-20 w-20 rounded-3xl shadow-card" />
      <p className="mt-3 text-2xl font-bold text-brand-700">Kartesia</p>
      <p className="text-sm text-ink-muted">Belajar Koordinat Kartesius selangkah demi selangkah</p>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<AuthResponse>('/auth/login', { identifier, password });
      setSession(r.access_token, r.user);
      navigate(homePathFor(r.user), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<FooterButton type="submit" form="login" disabled={busy || !identifier || !password}>{busy ? 'Memproses…' : 'Masuk'}</FooterButton>}>
      <Logo />
      <form id="login" onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Username atau email">
          <input className={inputClass} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </Field>
        <Field label="Kata sandi">
          <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <ErrorBox message={error} />}
        <p className="text-center text-sm text-ink-muted">
          Belum punya akun?{' '}
          <Link to="/daftar" className="font-semibold text-brand-600">
            Daftar
          </Link>
        </p>
        <p className="text-center text-xs text-ink-soft">Lupa kata sandi? Minta gurumu untuk meresetnya.</p>
      </form>
      <div className="mt-6">
        <InstallApp compact />
      </div>
    </Screen>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [name, setName] = useState('');
  const [ident, setIdent] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const minPw = role === 'student' ? 6 : 8;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body =
        role === 'student'
          ? { display_name: name, username: ident, password }
          : { display_name: name, email: ident, password };
      const r = await api.post<AuthResponse>(`/auth/register/${role}`, body);
      setSession(r.access_token, r.user);
      navigate(role === 'student' ? '/gabung-kelas' : '/guru', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      back="/masuk"
      title="Buat Akun"
      subtitle="Data yang diminta sesedikit mungkin."
      footer={
        <FooterButton type="submit" form="register" disabled={busy || !name || !ident || password.length < minPw}>
          {busy ? 'Memproses…' : 'Daftar'}
        </FooterButton>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1" role="radiogroup" aria-label="Daftar sebagai">
        {(['student', 'teacher'] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`min-h-[44px] rounded-xl text-sm font-semibold ${role === r ? 'bg-white text-brand-700 shadow' : 'text-brand-600'}`}
          >
            {r === 'student' ? '🧑‍🎓 Siswa' : '👩‍🏫 Guru'}
          </button>
        ))}
      </div>
      <form id="register" onSubmit={submit} className="space-y-4">
        <Field label="Nama panggilan">
          <input className={inputClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        {role === 'student' ? (
          <Field label="Username" hint="3–30 karakter: huruf, angka, titik, atau garis bawah. Tidak perlu email.">
            <input className={inputClass} autoComplete="username" value={ident} maxLength={30} onChange={(e) => setIdent(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))} />
          </Field>
        ) : (
          <Field label="Email">
            <input className={inputClass} type="email" autoComplete="email" value={ident} onChange={(e) => setIdent(e.target.value)} />
          </Field>
        )}
        <Field label="Kata sandi" hint={`Minimal ${minPw} karakter.`}>
          <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <ErrorBox message={error} />}
      </form>
    </Screen>
  );
}

export function JoinClassPage() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/classes/join', { join_code: code });
      setUser(await api.get<User>('/me'));
      navigate('/beranda', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      back="/beranda"
      title="Gabung Kelas"
      subtitle="Masukkan kode 6 karakter dari gurumu."
      footer={<FooterButton type="submit" form="join" disabled={busy || code.length !== 6}>{busy ? 'Memproses…' : 'Gabung'}</FooterButton>}
    >
      <form id="join" onSubmit={submit} className="mt-6 space-y-4">
        <input
          aria-label="Kode kelas"
          className="w-full rounded-2xl border-2 border-slate-200 py-4 text-center text-3xl font-bold uppercase tracking-[0.4em] outline-none focus:border-brand-500"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        />
        {error && <ErrorBox message={error} />}
      </form>
      <button type="button" onClick={() => navigate('/beranda')} className="mt-6 w-full text-center text-sm font-semibold text-brand-600">
        Lewati dulu, belajar mandiri →
      </button>
    </Screen>
  );
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [oldPw, setOldPw] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const forced = !!user?.must_change_password;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/me/password', { old_password: forced ? null : oldPw, new_password: pw });
      const me = await api.get<User>('/me');
      setUser(me);
      navigate(homePathFor(me), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Screen
      back={forced ? undefined : true}
      title="Ganti Kata Sandi"
      subtitle={forced ? 'Gurumu sudah mereset kata sandimu. Buat kata sandi baru, ya.' : undefined}
      footer={<FooterButton type="submit" form="pw" disabled={pw.length < 6}>Simpan</FooterButton>}
    >
      <form id="pw" onSubmit={submit} className="mt-4 space-y-4">
        {!forced && (
          <Field label="Kata sandi lama">
            <input className={inputClass} type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
          </Field>
        )}
        <Field label="Kata sandi baru" hint="Minimal 6 karakter.">
          <input className={inputClass} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        {error && <ErrorBox message={error} />}
      </form>
    </Screen>
  );
}
