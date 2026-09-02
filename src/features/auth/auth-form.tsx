'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Mode = 'login' | 'signup' | 'magic';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (error) throw error;
        setMessage('Enlace enviado. Revisa el correo y vuelve al camino.');
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (error) throw error;
        setMessage('Cuenta creada. Si Supabase pide confirmación, revisa el correo.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace('/');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar la autenticación');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-brand">OUTLAW <span>100</span></div>
      <p className="auth-kicker">PARTIDA PERSISTENTE · SUPABASE</p>
      <h1>Tu partida. En cualquier dispositivo.</h1>
      <div className="auth-tabs" role="tablist" aria-label="Método de acceso">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
        <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Crear cuenta</button>
        <button type="button" className={mode === 'magic' ? 'active' : ''} onClick={() => setMode('magic')}>Magic link</button>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        {mode !== 'magic' && <>
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Guardando el caballo…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}</button>
      </form>
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  );
}
