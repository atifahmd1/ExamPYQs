import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

interface ImportQuestion {
    slug: string;

    exam_name: string;
    exam_year: number;
    date: string | null;
    shift: string;
    class_level: string | null;

    language: string;
    subject: string;
    topic: string;
    subtopic: string | null;
    difficulty_level: 'easy' | 'medium' | 'hard';

    question_type: 'MCQ' | 'MSQ' | 'NAT';
    question: string;
    question_image_url: string | null;
    has_latex: boolean;

    meta_title: string | null;
    meta_description: string | null;
    core_concept_summary: string | null;
    reference: string | null;

    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    option_e: string | null;

    correct_op: 'A' | 'B' | 'C' | 'D' | 'E';

    option_a_explanation: string | null;
    option_b_explanation: string | null;
    option_c_explanation: string | null;
    option_d_explanation: string | null;
    option_e_explanation: string | null;

    option_concept_tags: Record<string, string[]> | null;

    solution_image_url: string | null;
    solution_video_url: string | null;

    ideal_time_seconds: number | null;
    marks: number;
    negative_marks: number;

    is_published: boolean;
    verification_status:
    | 'unverified'
    | 'community_verified'
    | 'verified';

    uploaded_by_user_id: string | null;
}

export async function POST(
    request: Request
) {
    try {
        /*
         * 1. Verify logged-in user
         */
        const supabase = await createClient();

        const {
            data: {
                user,
            },
            error: authError,
        } = await supabase.auth.getUser();

        if (
            authError ||
            !user
        ) {
            return NextResponse.json(
                {
                    error:
                        'You must be logged in.',
                },
                { status: 401 }
            );
        }

        /*
         * 2. Create SERVER-ONLY admin client (bypasses RLS or uses service key if available, else falls back to authenticated client)
         */
        const serviceRoleKey =
            process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabaseUrl =
            process.env.NEXT_PUBLIC_SUPABASE_URL;

        let dbClient = supabase;

        if (serviceRoleKey && supabaseUrl) {
            dbClient = createSupabaseAdminClient(
                supabaseUrl,
                serviceRoleKey,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                }
            ) as any;
        }

        /*
         * 3. Verify admin role.
         */
        const {
            data: profile,
            error: profileError,
        } =
            await dbClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

        if (
            profileError ||
            profile?.role !== 'admin'
        ) {
            return NextResponse.json(
                {
                    error:
                        'You do not have permission to import questions.',
                },
                { status: 403 }
            );
        }

        /*
         * 4. Read payload
         */
        const body = await request.json();

        const questions =
            body?.questions;

        if (
            !Array.isArray(questions) ||
            questions.length === 0
        ) {
            return NextResponse.json(
                {
                    error:
                        'No questions were provided.',
                },
                { status: 400 }
            );
        }

        /*
         * 5. Protect against accidentally huge uploads.
         */
        if (questions.length > 5000) {
            return NextResponse.json(
                {
                    error:
                        'Maximum 5000 questions per import.',
                },
                { status: 400 }
            );
        }

        /*
         * 6. Force uploader identity from authenticated user.
         */
        const rows: ImportQuestion[] =
            questions.map(
                (question: ImportQuestion) => ({
                    ...question,
                    uploaded_by_user_id:
                        user.id,
                })
            );

        /*
         * 7. Upsert using slug.
         */
        const {
            data,
            error,
        } = await dbClient
            .from('questions')
            .upsert(
                rows,
                {
                    onConflict: 'slug',
                    ignoreDuplicates: false,
                }
            )
            .select('question_id');

        if (error) {
            console.error(
                'Question import error:',
                error
            );

            return NextResponse.json(
                {
                    error:
                        error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            insertedCount:
                data?.length ?? rows.length,
            skippedCount: 0,
        });

    } catch (error: any) {
        console.error(
            'Question import exception:',
            error
        );

        return NextResponse.json(
            {
                error:
                    error?.message ||
                    'Unexpected server error.',
            },
            { status: 500 }
        );
    }
}
