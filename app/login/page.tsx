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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-executive">
        <h1 className="text-xl font-semibold text-slate-900">Hike Advisory Cockpit</h1>
        <p className="mt-1 text-sm text-slate-600">Acesse com seu usuário do Supabase Auth.</p>
        <form action={signIn} className="mt-5 grid gap-3">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="email" type="email" placeholder="Email" required />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="password"
            type="password"
            placeholder="Senha"
            required
          />
          <button type="submit" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
