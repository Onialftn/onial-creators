import { createBrowserClient } from "@supabase/ssr";

/** Cliente da Supabase no navegador (só a chave pública; o acesso é limitado pelas regras do banco). */
export function supabaseNavegador() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
