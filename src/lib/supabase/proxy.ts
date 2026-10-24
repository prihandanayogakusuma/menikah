import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

const PUBLIC_PATHS = ["/login", "/register", "/auth", "/setup", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    if (request.nextUrl.pathname !== "/setup") {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Penting: jangan ada logic di antara createServerClient dan getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path !== "/") url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/register")) {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(next && next.startsWith("/") ? next : "/dashboard", request.url));
  }

  return response;
}
