import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, ErrorBox, Feedback, ProgressBar, RichText, Spinner } from '../../components/ui/Basics';
import Screen, { FooterButton } from '../../components/ui/Screen';
import { api, errorMessage } from '../../lib/api';
import { coordText } from '../../lib/math/coords';
import type { XY } from '../../lib/math/models/types';
import type { Display, ModuleDetail, Quadrant, Segment } from '../../lib/types';
import CartesianCanvas from '../canvas/CartesianCanvas';
import { FooterPortal, FooterSlotContext } from '../practice/FooterSlot';

const KIND_LABEL: Record<Segment['kind'], string> = {
  hook: 'Pemantik',
  concept: 'Konsep',
  worked: 'Contoh',
  faded: 'Coba Sendiri',
  reflection: 'Refleksi',
};

/** Pemutar materi: satu konsep per layar (segmentasi), contoh lengkap → dipudarkan → latihan. */
export default function LessonPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['module', code],
    queryFn: () => api.get<ModuleDetail>(`/modules/${code}`),
  });
  const [i, setI] = useState<number | null>(null);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (data && i === null) {
      const last = data.progress?.last_segment_index ?? 0;
      setI(last < data.segments.length ? last : 0);
    }
  }, [data, i]);

  const segs = data?.segments ?? [];
  const idx = i ?? 0;
  const seg = segs[idx];

  function go(next: number) {
    if (next >= segs.length) {
      void api.patch(`/progress/${code}`, { last_segment_index: segs.length - 1 }).catch(() => undefined);
      navigate(`/modul/${code}/latihan`);
      return;
    }
    setI(next);
    void api.patch(`/progress/${code}`, { last_segment_index: next }).catch(() => undefined);
    window.scrollTo({ top: 0 });
  }

  return (
    <FooterSlotContext.Provider value={slot}>
    <Screen tone="brand" back={`/modul/${code}`} title={data?.title ?? 'Materi'} footer={<div ref={setSlot} />}>
      {isLoading && <Spinner />}
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />}
      {seg && (
        <>
          <div className="mb-5">
            <ProgressBar value={((idx + 1) / segs.length) * 100} label={`Materi ${idx + 1}/${segs.length}`} />
          </div>
          <SegmentView
            key={`${code}-${idx}`}
            seg={seg}
            isLast={idx === segs.length - 1}
            onNext={() => go(idx + 1)}
            onPrev={idx > 0 ? () => go(idx - 1) : undefined}
          />
        </>
      )}
    </Screen>
    </FooterSlotContext.Provider>
  );
}

function SegmentView({ seg, isLast, onNext, onPrev }: { seg: Segment; isLast: boolean; onNext: () => void; onPrev?: () => void }) {
  const [step, setStep] = useState(0);
  const [pts, setPts] = useState<XY[]>([]);
  const [quad, setQuad] = useState<Quadrant | null>(null);
  const [solved, setSolved] = useState(false);
  const [tries, setTries] = useState(0);

  const worked = seg.worked_steps ?? [];
  const inter = seg.interaction;
  const display: Display | undefined = worked.length ? worked[step]?.display : seg.display;
  const needsCanvas = !!display || !!inter;

  function checkPlace(p: XY[]) {
    setPts(p);
    if (!inter || inter.type !== 'place_point' || p.length === 0) return;
    const [x, y] = p[0];
    let ok = false;
    if (inter.target && typeof inter.target === 'object') ok = x === inter.target.x && y === inter.target.y;
    if (inter.accept) {
      const a = inter.accept;
      ok = (a.x === undefined || x === a.x) && (a.y === undefined || y === a.y) && !(a.not && a.not[0] === x && a.not[1] === y);
    }
    setTries((t) => t + 1);
    setSolved(ok);
  }

  function tapQuad(q: Quadrant) {
    setQuad(q);
    setTries((t) => t + 1);
    setSolved(inter?.target === q);
  }

  const workedDone = worked.length === 0 || step === worked.length - 1;
  const canNext = workedDone && (!inter || solved || tries >= 3);
  const lineDisplay: Display | undefined =
    inter?.line_from && pts.length === 1 && solved ? { ...display, lines: [{ a: inter.line_from, b: pts[0] }] } : display;

  return (
    <>
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-500">{KIND_LABEL[seg.kind]}</p>
        <h2 className="mt-1 text-xl font-semibold">{seg.title}</h2>
        <RichText text={seg.body} className="mt-2 text-[16px] leading-relaxed text-ink-muted" />

        {needsCanvas && (
          <div className="mt-4">
            <CartesianCanvas
              display={lineDisplay}
              userPoints={pts}
              onUserPointsChange={inter?.type === 'place_point' && !solved ? checkPlace : undefined}
              maxPoints={inter?.type === 'place_point' ? 1 : 0}
              onTapQuadrant={inter?.type === 'tap_quadrant' && !solved ? tapQuad : undefined}
              selectedQuadrant={quad}
            />
          </div>
        )}

        {worked.length > 0 && (
          <div className="mt-4 rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-brand-700">
              Langkah {step + 1} dari {worked.length}
            </p>
            <RichText text={worked[step].text} className="mt-1 text-[16px] font-medium text-brand-800" />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
                className="min-h-[44px] flex-1 rounded-xl bg-white font-semibold text-brand-700 disabled:opacity-40"
              >
                ◀
              </button>
              <button
                type="button"
                disabled={step === worked.length - 1}
                onClick={() => setStep((s) => s + 1)}
                className="min-h-[44px] flex-[3] rounded-xl bg-brand-600 font-semibold text-white disabled:opacity-40"
              >
                Langkah berikutnya ▶
              </button>
            </div>
          </div>
        )}

        {inter && tries > 0 && (
          <Feedback ok={solved}>
            {solved
              ? inter.success
              : inter.type === 'place_point' && pts[0]
                ? `Titikmu di ${coordText(pts[0][0], pts[0][1])}. Coba lagi, ya!${tries >= 3 ? ' Kamu boleh lanjut dan mempelajarinya lagi nanti.' : ''}`
                : `Belum tepat. Coba lagi, ya!${tries >= 3 ? ' Kamu boleh lanjut.' : ''}`}
          </Feedback>
        )}

        {onPrev && (
          <button type="button" onClick={onPrev} className="mt-4 text-sm font-semibold text-brand-600">
            ← Materi sebelumnya
          </button>
        )}
      </Card>
      <FooterPortal>
        <FooterButton onClick={onNext} disabled={!canNext}>
          {isLast ? 'Mulai Latihan' : !workedDone ? 'Ikuti semua langkah dulu' : inter && !solved && tries < 3 ? 'Selesaikan tantangannya' : 'Lanjut'}
        </FooterButton>
      </FooterPortal>
    </>
  );
}
