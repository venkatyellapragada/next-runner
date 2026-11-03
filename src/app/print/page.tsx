import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { joinUrlFor } from '@/components/bits';
import { Screen } from '@/components/screen/Slides';
import { hhmmToMs, slides, slotById } from '@/lib/event';
import { photoManifest } from '@/lib/server';
import { initialState } from '@/lib/state';
import './print.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'NEXT 1.0 · All slides', robots: { index: false } };

// Every running-order slide, one 1920×1080 page each, for the offline PDF.
// In Chrome: Print → Save as PDF, margins None, background graphics on. Or `npm run export:pdf`.
export default async function PrintPage() {
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const joinUrl = joinUrlFor(origin);
  const photos = photoManifest();
  return (
    <div className="print-root">
      {slides.map((slide) => {
        const slot = slotById(slide.slotId)!;
        // The header and day strip show the moment the slot begins.
        const now = hhmmToMs(slot.start, Date.now()) + 60000;
        return (
          <section key={slide.id} className="print-page" data-slide={slide.id}>
            <Screen slide={slide} state={{ ...initialState, slideId: slide.id }} now={now} photos={photos} joinUrl={joinUrl} print />
          </section>
        );
      })}
    </div>
  );
}
