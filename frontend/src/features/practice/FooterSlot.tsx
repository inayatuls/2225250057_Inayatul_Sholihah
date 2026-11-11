import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Wadah tombol aksi bawah. Komponen soal "mengisi" tombol pink di bawah layar lewat portal. */
export const FooterSlotContext = createContext<HTMLElement | null>(null);

export function FooterPortal({ children }: { children: ReactNode }) {
  const el = useContext(FooterSlotContext);
  return el ? createPortal(children, el) : null;
}
