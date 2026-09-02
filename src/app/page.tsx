import { redirect } from 'next/navigation';
import { OutlawApp } from '@/components/outlaw-app';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <OutlawApp userId={user.id} />;
}
