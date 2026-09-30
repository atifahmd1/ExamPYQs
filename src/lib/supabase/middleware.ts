// src/lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  /*
   * IMPORTANT:
   * Use getUser(), not getSession().
   *
   * getUser() validates the authenticated user
   * with Supabase Auth.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * ADMIN ROUTES
   */
  if (pathname.startsWith('/admin')) {
    /*
     * 1. User must be logged in
     */
    if (!user) {
      const url = request.nextUrl.clone();

      url.pathname = '/login';
      url.searchParams.set(
        'redirectTo',
        pathname
      );

      return NextResponse.redirect(url);
    }

    /*
     * 2. Check user's role in database
     */
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    /*
     * 3. No profile / DB error / non-admin
     *    => deny access
     */
    if (
      error ||
      !profile ||
      profile.role !== 'admin'
    ) {
      console.warn('[Middleware] Access denied to /admin:', {
        userId: user.id,
        userEmail: user.email,
        foundProfile: profile,
        dbError: error,
      });

      const url = request.nextUrl.clone();

      url.pathname = '/unauthorized';

      return NextResponse.redirect(url);
    }
  }

  return response;
}