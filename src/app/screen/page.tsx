import type { Metadata } from 'next';
import { photoManifest } from '@/lib/server';
import ScreenClient from './ScreenClient';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'NEXT 1.0 · Screen' };

export default function Page() {
  return <ScreenClient photos={photoManifest()} />;
}
