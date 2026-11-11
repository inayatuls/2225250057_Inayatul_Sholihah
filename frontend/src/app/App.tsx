import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui/Basics';
import { ChangePasswordPage, JoinClassPage, LoginPage, RegisterPage } from '../features/auth/AuthPages';
import ExplorePage from '../features/explore/ExplorePage';
import LessonPage from '../features/lessons/LessonPage';
import ModuleIntroPage from '../features/lessons/ModuleIntroPage';
import FreeModelerPage from '../features/modeling/FreeModelerPage';
import PracticeLevelsPage from '../features/practice/PracticeLevelsPage';
import PracticePage from '../features/practice/PracticePage';
import ResultPage from '../features/practice/ResultPage';
import HomePage from '../features/progress/HomePage';
import ProfilePage from '../features/progress/ProfilePage';
import ClassPage from '../features/teacher/ClassPage';
import StudentDetailPage from '../features/teacher/StudentDetailPage';
import TeacherHome from '../features/teacher/TeacherHome';
import { tryRefresh } from '../lib/api';
import { homePathFor, useAuth } from '../lib/auth';
import type { Role } from '../lib/types';

function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Spinner label="Memuat Kartesia…" />;
  if (!user) return <Navigate to="/masuk" replace state={{ from: loc.pathname }} />;
  if (user.must_change_password && loc.pathname !== '/ganti-sandi') return <Navigate to="/ganti-sandi" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner label="Memuat Kartesia…" />;
  if (user) return <Navigate to={homePathFor(user)} replace />;
  return <>{children}</>;
}

const STUDENT: Role[] = ['student'];
const TEACHER: Role[] = ['teacher', 'admin'];

export default function App() {
  const markReady = useAuth((s) => s.markReady);
  useEffect(() => {
    void tryRefresh().finally(markReady);
  }, [markReady]);

  return (
    <Routes>
      <Route path="/masuk" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/daftar" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/ganti-sandi" element={<Guard><ChangePasswordPage /></Guard>} />

      <Route path="/gabung-kelas" element={<Guard roles={STUDENT}><JoinClassPage /></Guard>} />
      <Route path="/beranda" element={<Guard roles={STUDENT}><HomePage /></Guard>} />
      <Route path="/modul/:code" element={<Guard roles={STUDENT}><ModuleIntroPage /></Guard>} />
      <Route path="/modul/:code/materi" element={<Guard roles={STUDENT}><LessonPage /></Guard>} />
      <Route path="/modul/:code/latihan" element={<Guard roles={STUDENT}><PracticePage /></Guard>} />
      <Route path="/modul/:code/hasil" element={<Guard roles={STUDENT}><ResultPage /></Guard>} />
      <Route path="/latihan" element={<Guard roles={STUDENT}><PracticeLevelsPage /></Guard>} />
      <Route path="/latihan/:code" element={<Guard roles={STUDENT}><PracticePage key="level" mode="level" /></Guard>} />
      <Route path="/latihan/:code/hasil" element={<Guard roles={STUDENT}><ResultPage /></Guard>} />
      <Route path="/eksplor" element={<Guard roles={STUDENT}><ExplorePage /></Guard>} />
      <Route path="/pemodel" element={<Guard roles={STUDENT}><FreeModelerPage /></Guard>} />
      <Route path="/saya" element={<Guard roles={STUDENT}><ProfilePage /></Guard>} />

      <Route path="/guru" element={<Guard roles={TEACHER}><TeacherHome /></Guard>} />
      <Route path="/guru/kelas/:id" element={<Guard roles={TEACHER}><ClassPage /></Guard>} />
      <Route path="/guru/kelas/:id/siswa/:sid" element={<Guard roles={TEACHER}><StudentDetailPage /></Guard>} />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner label="Memuat Kartesia…" />;
  return <Navigate to={homePathFor(user)} replace />;
}
