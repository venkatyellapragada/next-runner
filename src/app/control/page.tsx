import type { Metadata } from 'next';
import { photoManifest } from '@/lib/server';
import ControlClient from './ControlClient';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'NEXT 1.0 · Control', robots: { index: false } };

export default function Page() {
  return <ControlClient photos={photoManifest()} />;
}
