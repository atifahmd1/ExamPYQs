import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'placeholder-anon-key';

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reqUrl = request.nextUrl.clone();
  const devRoleCookie = request.cookies.get('exampyqs_dev_role')?.value;

  // Admin Route Protection
  if (reqUrl.pathname.startsWith('/admin')) {
    // Check if dev role cookie is set to admin
    if (devRoleCookie === 'admin') {
      return supabaseResponse;
    }

    if (!user) {
      reqUrl.pathname = '/login';
      reqUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(reqUrl);
    }

    // Grant access if email contains admin or role is admin
    if (user.email?.toLowerCase().includes('admin')) {
      return supabaseResponse;
    }

    // Verify role in profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      reqUrl.pathname = '/unauthorized';
      return NextResponse.redirect(reqUrl);
    }
  }

  return supabaseResponse;
}
