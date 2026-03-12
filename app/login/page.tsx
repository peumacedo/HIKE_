import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default function LoginPage() {
  async function signIn(formData: FormData) {
    'use server';

    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect('/login?error=invalid_credentials');
    }

    redirect('/dashboard');
  }

  return (
    <main>
      <h1>Hike Advisory Cockpit</h1>
      <p>Login com email e senha (Supabase Auth)</p>
      <form action={signIn} style={{ display: 'grid', gap: '0.75rem', maxWidth: 320 }}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Senha" required />
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
