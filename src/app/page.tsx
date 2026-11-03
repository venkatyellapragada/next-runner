import { redirect } from 'next/navigation';

// The bare domain goes to the audience page: that is what people type if the QR fails.
export default function Home() {
  redirect('/join');
}
