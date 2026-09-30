
-- ============================================================
-- Exampyqs - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- PostgreSQL / Supabase
--
-- Apply to a CLEAN database:
--   npx supabase db push
--
-- This migration is intentionally ordered by dependency:
-- enums -> base tables -> dependent tables -> functions/triggers
-- -> indexes -> RLS policies.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. ENUMS
-- ============================================================

CREATE TYPE public.user_role AS ENUM (
  'student',
  'editor',
  'admin'
);

CREATE TYPE public.content_status AS ENUM (
  'draft',
  'review',
  'published',
  'archived'
);

CREATE TYPE public.difficulty_level AS ENUM (
  'easy',
  'medium',
  'hard'
);

CREATE TYPE public.question_language AS ENUM (
  'english',
  'hindi',
  'bilingual',
  'other'
);

CREATE TYPE public.question_type AS ENUM (
  'single_choice',
  'multiple_choice',
  'true_false',
  'assertion_reason',
  'match_following',
  'numerical'
);

CREATE TYPE public.source_type AS ENUM (
  'official_paper',
  'official_answer_key',
  'editor_created',
  'community',
  'ai_generated'
);

CREATE TYPE public.media_type AS ENUM (
  'image',
  'diagram',
  'table',
  'formula',
  'other'
);

CREATE TYPE public.community_feedback_type AS ENUM (
  'verify',
  'object'
);

CREATE TYPE public.feedback_component AS ENUM (
  'question',
  'options',
  'answer',
  'explanation'
);

CREATE TYPE public.duplicate_review_decision AS ENUM (
  'same_question',
  'different_question',
  'needs_review'
);

CREATE TYPE public.test_type AS ENUM (
  'practice',
  'mock',
  'previous_year',
  'custom',
  'ai_generated'
);

CREATE TYPE public.attempt_mode AS ENUM (
  'practice',
  'exam'
);

CREATE TYPE public.attempt_status AS ENUM (
  'in_progress',
  'completed',
  'abandoned'
);

CREATE TYPE public.progress_status AS ENUM (
  'unseen',
  'attempted',
  'correct',
  'incorrect',
  'skipped'
);

CREATE TYPE public.ai_source_type AS ENUM (
  'question',
  'question_explanation',
  'option_explanation',
  'concept_tag'
);

-- ============================================================
-- 3. PROFILES
-- Must exist before functions such as is_admin().
-- ============================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'student',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Application profile for Supabase Auth users. Role controls application permissions.';

-- ============================================================
-- 4. EXAMS
-- ============================================================

CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  conducting_body text,
  description text,
  website_url text,
  status public.content_status NOT NULL DEFAULT 'published',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.exam_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  title text NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  paper_code text,
  shift text,
  language public.question_language NOT NULL DEFAULT 'english',
  exam_date date,
  source_url text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, year, paper_code, shift)
);

-- ============================================================
-- 5. TAXONOMY
-- subjects -> chapters -> topics -> subtopics
-- ============================================================

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, slug),
  UNIQUE (id, subject_id)
);

CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, slug),
  UNIQUE (id, chapter_id)
);

CREATE TABLE public.subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic_id, slug),
  UNIQUE (id, topic_id)
);

-- ============================================================
-- 6. CANONICAL QUESTIONS
-- ============================================================

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  slug text NOT NULL UNIQUE,
  question_text text NOT NULL,

  question_type public.question_type NOT NULL DEFAULT 'single_choice',
  difficulty public.difficulty_level NOT NULL DEFAULT 'medium',
  language public.question_language NOT NULL DEFAULT 'english',

  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE RESTRICT,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE RESTRICT,
  subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE RESTRICT,

  source_type public.source_type NOT NULL DEFAULT 'official_paper',
  source_reference text,

  has_latex boolean NOT NULL DEFAULT false,

  -- Exact duplicate candidate lookup.
  text_hash text,

  -- Normalized text used for fuzzy duplicate candidate lookup.
  normalized_question_text text,

  -- SEO/content fields.
  meta_title text,
  meta_description text,
  core_concept_summary text,
  reference text,
  ideal_time_seconds integer CHECK (ideal_time_seconds IS NULL OR ideal_time_seconds > 0),

  status public.content_status NOT NULL DEFAULT 'draft',

  -- Overall editorial verification.
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,

  -- Community counters.
  community_verified_count integer NOT NULL DEFAULT 0 CHECK (community_verified_count >= 0),
  community_objection_count integer NOT NULL DEFAULT 0 CHECK (community_objection_count >= 0),
  community_verified boolean NOT NULL DEFAULT false,
  community_flagged boolean NOT NULL DEFAULT false,

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Taxonomy hierarchy constraints.
  CONSTRAINT fk_question_chapter_subject
    FOREIGN KEY (chapter_id, subject_id)
    REFERENCES public.chapters (id, subject_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_question_topic_chapter
    FOREIGN KEY (topic_id, chapter_id)
    REFERENCES public.topics (id, chapter_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_question_subtopic_topic
    FOREIGN KEY (subtopic_id, topic_id)
    REFERENCES public.subtopics (id, topic_id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_question_verification_pair
    CHECK (
      (verified_by IS NULL AND verified_at IS NULL)
      OR
      (verified_by IS NOT NULL AND verified_at IS NOT NULL)
    )
);

-- ============================================================
-- 7. QUESTION OPTIONS
-- ============================================================

CREATE TABLE public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL CHECK (display_order > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (question_id, option_key),
  UNIQUE (question_id, display_order),
  UNIQUE (id, question_id)
);

-- ============================================================
-- 8. OPTION EXPLANATIONS
-- First-class educational knowledge unit.
-- ============================================================

CREATE TABLE public.option_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_option_id uuid NOT NULL UNIQUE REFERENCES public.question_options(id) ON DELETE CASCADE,
  explanation text NOT NULL,
  concept_summary text,
  key_takeaway text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. QUESTION EXPLANATION
-- ============================================================

CREATE TABLE public.question_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL UNIQUE REFERENCES public.questions(id) ON DELETE CASCADE,
  explanation text NOT NULL,
  solution_steps text,
  concept_summary text,
  key_takeaway text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. TAGS
-- ============================================================

CREATE TABLE public.question_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, tag)
);

CREATE TABLE public.option_concept_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_option_id uuid NOT NULL REFERENCES public.question_options(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_option_id, tag)
);

-- ============================================================
-- 11. QUESTION MEDIA
-- ============================================================

CREATE TABLE public.question_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  media_type public.media_type NOT NULL,
  storage_path text NOT NULL,
  alt_text text,
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, storage_path)
);

-- ============================================================
-- 12. QUESTION OCCURRENCES
-- Canonical question appearing in a particular paper.
-- ============================================================

CREATE TABLE public.question_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  exam_paper_id uuid NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,

  question_number integer,
  marks numeric(6,2),
  negative_marks numeric(6,2),

  source_reference text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (exam_paper_id, question_number),
  UNIQUE (question_id, exam_paper_id, question_number),
  UNIQUE (id, question_id)
);

-- ============================================================
-- 13. OCCURRENCE OPTIONS
-- Preserves original option order for each paper occurrence.
-- ============================================================

CREATE TABLE public.question_occurrence_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL,
  question_id uuid NOT NULL,
  question_option_id uuid NOT NULL,

  display_order integer NOT NULL CHECK (display_order > 0),

  created_at timestamptz NOT NULL DEFAULT now(),

  FOREIGN KEY (occurrence_id, question_id)
    REFERENCES public.question_occurrences (id, question_id)
    ON DELETE CASCADE,

  FOREIGN KEY (question_option_id, question_id)
    REFERENCES public.question_options (id, question_id)
    ON DELETE RESTRICT,

  UNIQUE (occurrence_id, display_order),
  UNIQUE (occurrence_id, question_option_id)
);

-- ============================================================
-- 14. DUPLICATE REVIEW
-- Candidate duplicate detection is advisory.
-- Editor decides whether questions are actually the same.
-- ============================================================

CREATE TABLE public.question_duplicate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  candidate_question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,

  similarity_score numeric(6,5),
  decision public.duplicate_review_decision NOT NULL DEFAULT 'needs_review',

  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (source_question_id <> candidate_question_id),
  CHECK (
    similarity_score IS NULL
    OR (similarity_score >= 0 AND similarity_score <= 1)
  ),
  UNIQUE (source_question_id, candidate_question_id)
);

-- ============================================================
-- 15. EDITORIAL VERIFICATION CHECKS
-- Component-level verification.
-- ============================================================

CREATE TABLE public.question_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL UNIQUE REFERENCES public.questions(id) ON DELETE CASCADE,

  question_text_verified boolean NOT NULL DEFAULT false,
  options_verified boolean NOT NULL DEFAULT false,
  answer_verified boolean NOT NULL DEFAULT false,
  explanation_verified boolean NOT NULL DEFAULT false,

  question_text_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  options_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  answer_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  explanation_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  question_text_verified_at timestamptz,
  options_verified_at timestamptz,
  answer_verified_at timestamptz,
  explanation_verified_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 16. COMMUNITY FEEDBACK
-- Separate from editorial verification.
-- ============================================================

CREATE TABLE public.question_community_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  feedback_type public.community_feedback_type NOT NULL,
  component public.feedback_component NOT NULL,

  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (question_id, user_id, feedback_type, component)
);

-- ============================================================
-- 17. AI GENERATED QUESTIONS
-- ============================================================

CREATE TABLE public.ai_generated_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  question_text text NOT NULL,
  question_type public.question_type NOT NULL DEFAULT 'single_choice',
  difficulty public.difficulty_level NOT NULL DEFAULT 'medium',
  language public.question_language NOT NULL DEFAULT 'english',

  status public.content_status NOT NULL DEFAULT 'draft',

  generated_by_model text,
  generation_prompt_version text,

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_question_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  ai_question_id uuid NOT NULL
    REFERENCES public.ai_generated_questions(id)
    ON DELETE CASCADE,

  source_type public.ai_source_type NOT NULL,

  question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
  option_explanation_id uuid REFERENCES public.option_explanations(id) ON DELETE SET NULL,
  question_explanation_id uuid REFERENCES public.question_explanations(id) ON DELETE SET NULL,
  concept_tag text,

  source_excerpt text,
  display_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ai_source_reference
  CHECK (
    (source_type = 'question' AND question_id IS NOT NULL)
    OR
    (source_type = 'question_explanation' AND question_explanation_id IS NOT NULL)
    OR
    (source_type = 'option_explanation' AND option_explanation_id IS NOT NULL)
    OR
    (source_type = 'concept_tag' AND concept_tag IS NOT NULL)
  )
);

-- ============================================================
-- 18. TESTS
-- ============================================================

CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,

  test_type public.test_type NOT NULL DEFAULT 'practice',

  exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,

  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  total_marks numeric(8,2),
  negative_marks numeric(8,2),

  status public.content_status NOT NULL DEFAULT 'draft',

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,

  display_order integer NOT NULL CHECK (display_order > 0),
  marks numeric(6,2),
  negative_marks numeric(6,2),

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (test_id, question_id),
  UNIQUE (test_id, display_order)
);

-- ============================================================
-- 19. USER ATTEMPTS
-- ============================================================

CREATE TABLE public.user_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,

  mode public.attempt_mode NOT NULL DEFAULT 'practice',
  status public.attempt_status NOT NULL DEFAULT 'in_progress',

  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  total_questions integer NOT NULL DEFAULT 0,
  attempted_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  incorrect_answers integer NOT NULL DEFAULT 0,
  skipped_questions integer NOT NULL DEFAULT 0,

  score numeric(10,2),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (total_questions >= 0),
  CHECK (attempted_questions >= 0),
  CHECK (correct_answers >= 0),
  CHECK (incorrect_answers >= 0),
  CHECK (skipped_questions >= 0)
);

-- ============================================================
-- 20. ATTEMPT ANSWERS
-- ============================================================

CREATE TABLE public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  attempt_id uuid NOT NULL REFERENCES public.user_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,

  selected_option_id uuid,

  is_correct boolean,
  is_skipped boolean NOT NULL DEFAULT false,

  time_spent_seconds integer CHECK (
    time_spent_seconds IS NULL OR time_spent_seconds >= 0
  ),

  answered_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (attempt_id, question_id),

  FOREIGN KEY (selected_option_id, question_id)
    REFERENCES public.question_options (id, question_id)
    ON DELETE SET NULL
);

-- ============================================================
-- 21. USER QUESTION PROGRESS
-- ============================================================

CREATE TABLE public.user_question_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,

  status public.progress_status NOT NULL DEFAULT 'unseen',

  attempt_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  incorrect_count integer NOT NULL DEFAULT 0,

  last_attempted_at timestamptz,
  next_review_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, question_id),

  CHECK (attempt_count >= 0),
  CHECK (correct_count >= 0),
  CHECK (incorrect_count >= 0)
);

-- ============================================================
-- 22. BOOKMARKS
-- ============================================================

CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,

  note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, question_id)
);

-- ============================================================
-- 23. EVENTS
-- ============================================================

CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  event_name text NOT NULL,
  event_properties jsonb NOT NULL DEFAULT '{}'::jsonb,

  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 24. DAILY ANALYTICS
-- ============================================================

CREATE TABLE public.daily_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  analytics_date date NOT NULL UNIQUE,

  total_users integer NOT NULL DEFAULT 0,
  active_users integer NOT NULL DEFAULT 0,
  new_users integer NOT NULL DEFAULT 0,

  questions_attempted integer NOT NULL DEFAULT 0,
  questions_answered_correctly integer NOT NULL DEFAULT 0,

  tests_started integer NOT NULL DEFAULT 0,
  tests_completed integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 25. AUDIT LOGS
-- ============================================================

CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  action text NOT NULL,
  table_name text,
  record_id uuid,

  old_data jsonb,
  new_data jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 26. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- These functions are intentionally created AFTER profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('editor', 'admin')
      AND is_active = true
  );
$$;

-- ============================================================
-- 27. AUTH -> PROFILE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 28. PROTECT PROFILE ROLE
-- Users must not promote themselves to editor/admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an admin can change a user role';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_role_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_role();

-- ============================================================
-- 29. COMMUNITY COUNTER TRIGGER
-- 3 verifies => community_verified
-- 5 objections => community_flagged
-- They are independent and can both be true.
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_community_question_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  verify_count integer;
  objection_count integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE feedback_type = 'verify'),
    COUNT(*) FILTER (WHERE feedback_type = 'object')
  INTO verify_count, objection_count
  FROM public.question_community_feedback
  WHERE question_id = COALESCE(NEW.question_id, OLD.question_id);

  UPDATE public.questions
  SET
    community_verified_count = verify_count,
    community_objection_count = objection_count,
    community_verified = verify_count >= 3,
    community_flagged = objection_count >= 5,
    updated_at = now()
  WHERE id = COALESCE(NEW.question_id, OLD.question_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER refresh_community_question_state_trigger
AFTER INSERT OR UPDATE OR DELETE
ON public.question_community_feedback
FOR EACH ROW
EXECUTE FUNCTION public.refresh_community_question_state();

-- ============================================================
-- 30. EDITORIAL VERIFICATION SYNC
-- Overall verification becomes true only when all components
-- are verified.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_question_editorial_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  verifier uuid;
BEGIN
  IF NEW.question_text_verified
     AND NEW.options_verified
     AND NEW.answer_verified
     AND NEW.explanation_verified
  THEN
    verifier := COALESCE(
      NEW.explanation_verified_by,
      NEW.answer_verified_by,
      NEW.options_verified_by,
      NEW.question_text_verified_by
    );

    UPDATE public.questions
    SET
      verified_by = verifier,
      verified_at = COALESCE(
        NEW.explanation_verified_at,
        NEW.answer_verified_at,
        NEW.options_verified_at,
        NEW.question_text_verified_at,
        now()
      ),
      updated_at = now()
    WHERE id = NEW.question_id;
  ELSE
    UPDATE public.questions
    SET
      verified_by = NULL,
      verified_at = NULL,
      updated_at = now()
    WHERE id = NEW.question_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_question_editorial_verification_trigger
AFTER INSERT OR UPDATE
ON public.question_verification_checks
FOR EACH ROW
EXECUTE FUNCTION public.sync_question_editorial_verification();

-- ============================================================
-- 31. UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER exam_papers_updated_at
BEFORE UPDATE ON public.exam_papers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER topics_updated_at
BEFORE UPDATE ON public.topics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subtopics_updated_at
BEFORE UPDATE ON public.subtopics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER question_options_updated_at
BEFORE UPDATE ON public.question_options
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER option_explanations_updated_at
BEFORE UPDATE ON public.option_explanations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER question_explanations_updated_at
BEFORE UPDATE ON public.question_explanations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER question_occurrences_updated_at
BEFORE UPDATE ON public.question_occurrences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER duplicate_reviews_updated_at
BEFORE UPDATE ON public.question_duplicate_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER verification_checks_updated_at
BEFORE UPDATE ON public.question_verification_checks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER community_feedback_updated_at
BEFORE UPDATE ON public.question_community_feedback
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER ai_generated_questions_updated_at
BEFORE UPDATE ON public.ai_generated_questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_attempts_updated_at
BEFORE UPDATE ON public.user_attempts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER attempt_answers_updated_at
BEFORE UPDATE ON public.attempt_answers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_question_progress_updated_at
BEFORE UPDATE ON public.user_question_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER bookmarks_updated_at
BEFORE UPDATE ON public.bookmarks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER daily_analytics_updated_at
BEFORE UPDATE ON public.daily_analytics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 32. INDEXES
-- ============================================================

CREATE INDEX idx_profiles_role
  ON public.profiles(role);

CREATE INDEX idx_profiles_active
  ON public.profiles(is_active);

CREATE INDEX idx_exam_papers_exam
  ON public.exam_papers(exam_id);

CREATE INDEX idx_exam_papers_year
  ON public.exam_papers(year);

CREATE INDEX idx_chapters_subject
  ON public.chapters(subject_id);

CREATE INDEX idx_topics_chapter
  ON public.topics(chapter_id);

CREATE INDEX idx_subtopics_topic
  ON public.subtopics(topic_id);

CREATE INDEX idx_questions_subject
  ON public.questions(subject_id);

CREATE INDEX idx_questions_chapter
  ON public.questions(chapter_id);

CREATE INDEX idx_questions_topic
  ON public.questions(topic_id);

CREATE INDEX idx_questions_subtopic
  ON public.questions(subtopic_id);

CREATE INDEX idx_questions_status
  ON public.questions(status);

CREATE INDEX idx_questions_difficulty
  ON public.questions(difficulty);

CREATE INDEX idx_questions_source_type
  ON public.questions(source_type);

CREATE INDEX idx_questions_text_hash
  ON public.questions(text_hash);

CREATE INDEX idx_questions_created_by
  ON public.questions(created_by);

CREATE INDEX idx_questions_verified_by
  ON public.questions(verified_by);

CREATE INDEX idx_questions_normalized_trgm
  ON public.questions
  USING gin (normalized_question_text gin_trgm_ops);

CREATE INDEX idx_question_options_question
  ON public.question_options(question_id);

CREATE INDEX idx_question_options_correct
  ON public.question_options(question_id, is_correct);

CREATE INDEX idx_question_tags_question
  ON public.question_tags(question_id);

CREATE INDEX idx_option_concept_tags_option
  ON public.option_concept_tags(question_option_id);

CREATE INDEX idx_question_media_question
  ON public.question_media(question_id);

CREATE INDEX idx_occurrences_paper
  ON public.question_occurrences(exam_paper_id);

CREATE INDEX idx_occurrences_question
  ON public.question_occurrences(question_id);

CREATE INDEX idx_occurrence_options_option
  ON public.question_occurrence_options(question_option_id);

CREATE INDEX idx_occurrence_options_question
  ON public.question_occurrence_options(question_id);

CREATE INDEX idx_duplicate_reviews_source
  ON public.question_duplicate_reviews(source_question_id);

CREATE INDEX idx_duplicate_reviews_candidate
  ON public.question_duplicate_reviews(candidate_question_id);

CREATE INDEX idx_verification_checks_question
  ON public.question_verification_checks(question_id);

CREATE INDEX idx_community_feedback_question
  ON public.question_community_feedback(question_id);

CREATE INDEX idx_community_feedback_user
  ON public.question_community_feedback(user_id);

CREATE INDEX idx_ai_generated_questions_status
  ON public.ai_generated_questions(status);

CREATE INDEX idx_ai_question_sources_ai_question
  ON public.ai_question_sources(ai_question_id);

CREATE INDEX idx_ai_question_sources_question
  ON public.ai_question_sources(question_id);

CREATE INDEX idx_tests_exam
  ON public.tests(exam_id);

CREATE INDEX idx_tests_status
  ON public.tests(status);

CREATE INDEX idx_test_questions_test
  ON public.test_questions(test_id);

CREATE INDEX idx_test_questions_question
  ON public.test_questions(question_id);

CREATE INDEX idx_attempts_user
  ON public.user_attempts(user_id);

CREATE INDEX idx_attempts_test
  ON public.user_attempts(test_id);

CREATE INDEX idx_attempts_status
  ON public.user_attempts(status);

CREATE INDEX idx_attempt_answers_attempt
  ON public.attempt_answers(attempt_id);

CREATE INDEX idx_attempt_answers_question
  ON public.attempt_answers(question_id);

CREATE INDEX idx_progress_user
  ON public.user_question_progress(user_id);

CREATE INDEX idx_progress_question
  ON public.user_question_progress(question_id);

CREATE INDEX idx_progress_next_review
  ON public.user_question_progress(user_id, next_review_at);

CREATE INDEX idx_bookmarks_user
  ON public.bookmarks(user_id);

CREATE INDEX idx_bookmarks_question
  ON public.bookmarks(question_id);

CREATE INDEX idx_events_user
  ON public.events(user_id);

CREATE INDEX idx_events_name_date
  ON public.events(event_name, occurred_at);

CREATE INDEX idx_daily_analytics_date
  ON public.daily_analytics(analytics_date);

CREATE INDEX idx_audit_logs_actor
  ON public.audit_logs(actor_user_id);

CREATE INDEX idx_audit_logs_table_record
  ON public.audit_logs(table_name, record_id);

CREATE INDEX idx_audit_logs_created_at
  ON public.audit_logs(created_at);

-- ============================================================
-- 33. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_concept_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_occurrence_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_duplicate_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_community_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_question_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 34. PROFILES POLICIES
-- ============================================================

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_editor_or_admin()
);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_admin_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY profiles_admin_delete
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- 35. PUBLIC CONTENT READ POLICIES
-- Published content can be read by authenticated users.
-- Editors/admins can also read draft/review content.
-- ============================================================

CREATE POLICY exams_read
ON public.exams
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_editor_or_admin()
);

CREATE POLICY exam_papers_read
ON public.exam_papers
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_editor_or_admin()
);

CREATE POLICY subjects_read
ON public.subjects
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_editor_or_admin()
);

CREATE POLICY chapters_read
ON public.chapters
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_editor_or_admin()
);

CREATE POLICY topics_read
ON public.topics
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_editor_or_admin()
);

CREATE POLICY subtopics_read
ON public.subtopics
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_editor_or_admin()
);

CREATE POLICY questions_read
ON public.questions
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_editor_or_admin()
);

CREATE POLICY question_options_read
ON public.question_options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.questions q
    WHERE q.id = question_id
      AND (
        q.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY option_explanations_read
ON public.option_explanations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.question_options qo
    JOIN public.questions q ON q.id = qo.question_id
    WHERE qo.id = question_option_id
      AND (
        q.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY question_explanations_read
ON public.question_explanations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.questions q
    WHERE q.id = question_id
      AND (
        q.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY question_tags_read
ON public.question_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.questions q
    WHERE q.id = question_id
      AND (
        q.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY option_concept_tags_read
ON public.option_concept_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.question_options qo
    JOIN public.questions q ON q.id = qo.question_id
    WHERE qo.id = question_option_id
      AND (
        q.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY question_media_read
ON public.question_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.questions q
    WHERE q.id = question_id
      AND (
        q.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY occurrences_read
ON public.question_occurrences
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.exam_papers ep
    WHERE ep.id = exam_paper_id
      AND (
        ep.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY occurrence_options_read
ON public.question_occurrence_options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.question_occurrences qo
    JOIN public.exam_papers ep ON ep.id = qo.exam_paper_id
    WHERE qo.id = occurrence_id
      AND (
        ep.status = 'published'
        OR public.is_editor_or_admin()
      )
  )
);

-- ============================================================
-- 36. EDITOR / ADMIN CONTENT MANAGEMENT
-- ============================================================

CREATE POLICY exams_editor_manage
ON public.exams
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY exam_papers_editor_manage
ON public.exam_papers
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY subjects_editor_manage
ON public.subjects
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY chapters_editor_manage
ON public.chapters
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY topics_editor_manage
ON public.topics
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY subtopics_editor_manage
ON public.subtopics
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY questions_editor_manage
ON public.questions
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY question_options_editor_manage
ON public.question_options
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY option_explanations_editor_manage
ON public.option_explanations
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY question_explanations_editor_manage
ON public.question_explanations
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY question_tags_editor_manage
ON public.question_tags
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY option_concept_tags_editor_manage
ON public.option_concept_tags
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY question_media_editor_manage
ON public.question_media
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY occurrences_editor_manage
ON public.question_occurrences
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY occurrence_options_editor_manage
ON public.question_occurrence_options
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY duplicate_reviews_editor_manage
ON public.question_duplicate_reviews
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY verification_checks_editor_manage
ON public.question_verification_checks
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

-- ============================================================
-- 37. COMMUNITY FEEDBACK POLICIES
-- ============================================================

CREATE POLICY community_feedback_read
ON public.question_community_feedback
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_editor_or_admin()
);

CREATE POLICY community_feedback_insert
ON public.question_community_feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY community_feedback_update_own
ON public.question_community_feedback
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY community_feedback_delete_own
ON public.question_community_feedback
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 38. AI CONTENT POLICIES
-- ============================================================

CREATE POLICY ai_questions_read
ON public.ai_generated_questions
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR created_by = auth.uid()
  OR public.is_editor_or_admin()
);

CREATE POLICY ai_questions_editor_manage
ON public.ai_generated_questions
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY ai_sources_read
ON public.ai_question_sources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_generated_questions aq
    WHERE aq.id = ai_question_id
      AND (
        aq.status = 'published'
        OR aq.created_by = auth.uid()
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY ai_sources_editor_manage
ON public.ai_question_sources
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

-- ============================================================
-- 39. TEST POLICIES
-- ============================================================

CREATE POLICY tests_read
ON public.tests
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR created_by = auth.uid()
  OR public.is_editor_or_admin()
);

CREATE POLICY tests_editor_manage
ON public.tests
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

CREATE POLICY test_questions_read
ON public.test_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = test_id
      AND (
        t.status = 'published'
        OR t.created_by = auth.uid()
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY test_questions_editor_manage
ON public.test_questions
FOR ALL
TO authenticated
USING (public.is_editor_or_admin())
WITH CHECK (public.is_editor_or_admin());

-- ============================================================
-- 40. USER ATTEMPT POLICIES
-- ============================================================

CREATE POLICY attempts_select_own
ON public.user_attempts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_editor_or_admin()
);

CREATE POLICY attempts_insert_own
ON public.user_attempts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY attempts_update_own
ON public.user_attempts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY attempts_delete_own
ON public.user_attempts
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY attempt_answers_select_own
ON public.attempt_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_attempts a
    WHERE a.id = attempt_id
      AND (
        a.user_id = auth.uid()
        OR public.is_editor_or_admin()
      )
  )
);

CREATE POLICY attempt_answers_insert_own
ON public.attempt_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_attempts a
    WHERE a.id = attempt_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY attempt_answers_update_own
ON public.attempt_answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_attempts a
    WHERE a.id = attempt_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_attempts a
    WHERE a.id = attempt_id
      AND a.user_id = auth.uid()
  )
);

-- ============================================================
-- 41. PROGRESS / BOOKMARK POLICIES
-- ============================================================

CREATE POLICY progress_select_own
ON public.user_question_progress
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY progress_insert_own
ON public.user_question_progress
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY progress_update_own
ON public.user_question_progress
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY progress_delete_own
ON public.user_question_progress
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY bookmarks_select_own
ON public.bookmarks
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY bookmarks_insert_own
ON public.bookmarks
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_update_own
ON public.bookmarks
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_delete_own
ON public.bookmarks
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- 42. EVENTS / ANALYTICS / AUDIT
-- ============================================================

CREATE POLICY events_insert_own
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY events_select_own
ON public.events
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

CREATE POLICY analytics_admin_read
ON public.daily_analytics
FOR SELECT
TO authenticated
USING (public.is_editor_or_admin());

CREATE POLICY analytics_admin_manage
ON public.daily_analytics
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY audit_admin_read
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY audit_admin_insert
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ============================================================
-- 43. TABLE / COLUMN COMMENTS
-- ============================================================

COMMENT ON TABLE public.questions IS
  'Canonical question bank. A question can occur in many exam papers.';

COMMENT ON TABLE public.question_occurrences IS
  'Represents a canonical question appearing in a specific exam paper.';

COMMENT ON TABLE public.question_duplicate_reviews IS
  'Stores editor decisions on possible duplicate question candidates.';

COMMENT ON TABLE public.option_explanations IS
  'Educational explanation for an individual answer option; also usable as an AI knowledge source.';

COMMENT ON TABLE public.question_community_feedback IS
  'Community verification/objection feedback, separate from editorial verification.';

COMMENT ON TABLE public.question_verification_checks IS
  'Component-level editorial verification for question, options, answer and explanation.';

COMMIT;
