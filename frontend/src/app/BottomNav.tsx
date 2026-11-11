import { NavLink } from 'react-router-dom';
import { IconCompass, IconHome, IconList, IconPuzzle, IconUser } from '../components/ui/Icons';

const ITEMS = [
  { to: '/beranda', label: 'Beranda', Icon: IconHome },
  { to: '/latihan', label: 'Latihan', Icon: IconList },
  { to: '/eksplor', label: 'Eksplor', Icon: IconCompass },
  { to: '/pemodel', label: 'Pemodel', Icon: IconPuzzle },
  { to: '/saya', label: 'Saya', Icon: IconUser },
];

/** Navigasi bawah siswa: ikon selalu disertai label (W-4). */
export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-slate-100 bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Navigasi utama">
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? 'text-accent-500' : 'text-ink-soft'}`
          }
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
