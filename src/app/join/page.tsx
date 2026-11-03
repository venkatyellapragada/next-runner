import type { Metadata } from 'next';
import { photoManifest } from '@/lib/server';
import JoinClient from './JoinClient';

export const dynamic = 'force-static';
export const metadata: Metadata = {
  title: 'NEXT 1.0 · Campx',
  description: 'Agenda, speakers, questions and feedback for NEXT 1.0 by Campx, 5 November 2026, Google Hyderabad.',
};

export default function Page() {
  return <JoinClient photos={photoManifest()} />;
}
