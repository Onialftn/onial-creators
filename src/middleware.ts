import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Renova a sessão e manda quem não está logado para /login. */
export async function middleware(request: NextRequest) {
  // arquivo de verificação de site do TikTok for Developers: /tiktok<código>.txt
  const tk = /^\/tiktok([A-Za-z0-9]+)\.txt$/.exec(request.nextUrl.pathname);
  if (tk) return new NextResponse(`tiktok-developers-site-verification=${tk[1]}`, { headers: { "content-type": "text/plain; charset=utf-8" } });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const naLogin = request.nextUrl.pathname.startsWith("/login");
  if (!user && !naLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && naLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|api/coletar|privacidade|termos).*)"],
};
