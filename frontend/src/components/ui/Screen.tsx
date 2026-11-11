import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from './Icons';

interface ScreenProps {
  tone?: 'light' | 'brand';
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: string | boolean;
  right?: ReactNode;
  footer?: ReactNode;
  nav?: ReactNode;
  children: ReactNode;
}

/**
 * Kerangka layar bergaya kartu ponsel (mengikuti referensi UI):
 * - tone "light": latar putih (layar info / beranda)
 * - tone "brand": latar indigo (layar soal & hasil)
 * Footer = tombol aksi utama berwarna pink selebar layar.
 */
export default function Screen({ tone = 'light', title, subtitle, back, right, footer, nav, children }: ScreenProps) {
  const navigate = useNavigate();
  const brand = tone === 'brand';
  return (
    <div className="min-h-[100dvh] bg-backdrop sm:py-6">
      <div
        className={`mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col overflow-hidden sm:min-h-[calc(100dvh-3rem)] sm:rounded-[28px] sm:shadow-card ${
          brand ? 'bg-brand-600 text-white' : 'bg-white text-ink'
        }`}
      >
        {(title || back || right) && (
          <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
            <div className="flex items-center justify-between min-h-[44px]">
              {back ? (
                <button
                  type="button"
                  aria-label="Kembali"
                  onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
                  className={`-ml-2 flex h-11 w-11 items-center justify-center rounded-full ${brand ? 'hover:bg-white/10' : 'hover:bg-brand-50'}`}
                >
                  <IconBack />
                </button>
              ) : (
                <span />
              )}
              {right}
            </div>
            {title && <h1 className="mt-1 text-[26px] font-semibold leading-tight">{title}</h1>}
            {subtitle && <p className={`mt-1 text-sm ${brand ? 'text-white/70' : 'text-ink-muted'}`}>{subtitle}</p>}
          </header>
        )}
        <main className="flex-1 px-5 pb-6">{children}</main>
        {footer && <div className="sticky bottom-0 z-10">{footer}</div>}
        {nav}
      </div>
    </div>
  );
}

interface FooterButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  form?: string;
}

/** Tombol pink selebar layar di bagian bawah (gaya referensi). */
export function FooterButton({ children, onClick, disabled, type = 'button', form }: FooterButtonProps) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-accent-500 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-lg font-semibold text-white transition hover:bg-accent-600 active:bg-accent-600 disabled:bg-accent-400/70"
    >
      {children}
    </button>
  );
}
