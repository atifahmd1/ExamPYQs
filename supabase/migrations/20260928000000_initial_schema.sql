-- ExamPYQs Database Schema - Initial Migration
-- Production Grade, Normalized PostgreSQL Schema with RLS Policies & Indexes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. ENUMS
-- ==========================================

CREATE TYPE user_role AS ENUM ('student', 'editor', 'admin');
CREATE TYPE question_status AS ENUM ('draft', 'review', 'approved', 'published', 'archived');
CREATE TYPE source_type AS ENUM ('official_pyq', 'ai_generated');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE test_type AS ENUM ('pyq_paper', 'subject_test', 'chapter_test', 'custom_test');
CREATE TYPE attempt_mode AS ENUM ('learning', 'test');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE progress_status AS ENUM ('unattempted', 'correct', 'incorrect');

-- ==========================================
-- 2. USER PROFILES
-- ==========================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. EXAM HIERARCHY
-- ==========================================

-- Generic exam entity (e.g., BPSC, UPSC, GATE, JEE)
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g., 'bpsc', 'gate', 'jee-main'
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General', -- e.g., State PSC, Engineering, Banking
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exam paper/session (e.g., BPSC TRE 3.0 CS 2024)
CREATE TABLE public.exam_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g., 'tre-3-cs-2024'
    title TEXT NOT NULL,
    year INTEGER NOT NULL,
    session_name TEXT, -- e.g., 'TRE 3.0', 'Shift 1'
    shift TEXT,
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    rules_config JSONB DEFAULT '{}'::jsonb, -- e.g., {"negative_marking_rate": 0.25, "marking_per_question": 1.0}
    status question_status NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_exam_paper_code UNIQUE (exam_id, code)
);

-- Subjects (e.g., Computer Science, General Studies, Physics)
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g., 'computer-science', 'dbms'
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chapters inside subjects
CREATE TABLE public.chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g., 'dbms-normalization'
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_subject_chapter_code UNIQUE (subject_id, code)
);

-- Topics inside chapters
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_chapter_topic_code UNIQUE (chapter_id, code)
);

-- ==========================================
-- 4. QUESTION BANK & EXPLANATIONS
-- ==========================================

CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    paper_id UUID REFERENCES public.exam_papers(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    source_type source_type NOT NULL DEFAULT 'official_pyq',
    official_source_ref TEXT, -- e.g. "BPSC TRE 2.0 CS Q.42"
    derived_from_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    difficulty difficulty_level NOT NULL DEFAULT 'medium',
    marks NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    negative_marks NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    status question_status NOT NULL DEFAULT 'draft',
    language TEXT NOT NULL DEFAULT 'en',
    text_hash TEXT NOT NULL, -- SHA-256 for duplicate detection
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_letter VARCHAR(2) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    explanation TEXT,
    CONSTRAINT uk_question_option_letter UNIQUE (question_id, option_letter)
);

CREATE TABLE public.question_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID UNIQUE NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    overall_explanation TEXT NOT NULL,
    concept_summary TEXT,
    key_takeaway TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.question_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    CONSTRAINT uk_question_tag UNIQUE (question_id, tag_name)
);

-- ==========================================
-- 5. TESTS & ATTEMPTS (UNIFIED QUIZ ENGINE)
-- ==========================================

CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    test_type test_type NOT NULL DEFAULT 'custom_test',
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    paper_id UUID REFERENCES public.exam_papers(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    total_questions INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    marking_rule JSONB NOT NULL DEFAULT '{"positive": 1.0, "negative": 0.25}'::jsonb,
    status question_status NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    CONSTRAINT uk_test_question UNIQUE (test_id, question_id)
);

CREATE TABLE public.user_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL allowed for anonymous
    session_token TEXT, -- For anonymous tracking
    test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
    mode attempt_mode NOT NULL DEFAULT 'learning',
    status attempt_status NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    score NUMERIC(6,2) DEFAULT 0.00,
    total_correct INTEGER DEFAULT 0,
    total_incorrect INTEGER DEFAULT 0,
    total_unattempted INTEGER DEFAULT 0,
    accuracy_percentage NUMERIC(5,2) DEFAULT 0.00,
    time_taken_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.user_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
    selected_letter VARCHAR(2),
    is_correct BOOLEAN,
    marks_awarded NUMERIC(4,2) DEFAULT 0.00,
    time_spent_seconds INTEGER DEFAULT 0,
    marked_for_review BOOLEAN NOT NULL DEFAULT false,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_attempt_question UNIQUE (attempt_id, question_id)
);

-- ==========================================
-- 6. USER PROGRESS & BOOKMARKS
-- ==========================================

CREATE TABLE public.user_question_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    total_attempts INTEGER NOT NULL DEFAULT 0,
    correct_attempts INTEGER NOT NULL DEFAULT 0,
    last_status progress_status NOT NULL DEFAULT 'unattempted',
    last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_question_progress UNIQUE (user_id, question_id)
);

CREATE TABLE public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_bookmark UNIQUE (user_id, question_id)
);

-- ==========================================
-- 7. ANALYTICS & AUDIT LOGS
-- ==========================================

CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.daily_analytics (
    date DATE PRIMARY KEY,
    active_users_count INTEGER DEFAULT 0,
    new_users_count INTEGER DEFAULT 0,
    total_questions_attempted INTEGER DEFAULT 0,
    total_tests_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'CREATE_QUESTION', 'PUBLISH_PAPER', 'BULK_IMPORT'
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 8. INDEXES FOR HIGH PERFORMANCE
-- ==========================================

CREATE INDEX idx_questions_paper_id ON public.questions(paper_id);
CREATE INDEX idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX idx_questions_chapter_id ON public.questions(chapter_id);
CREATE INDEX idx_questions_status ON public.questions(status);
CREATE INDEX idx_questions_hash ON public.questions(text_hash);

CREATE INDEX idx_question_options_question_id ON public.question_options(question_id);
CREATE INDEX idx_user_attempts_user_id ON public.user_attempts(user_id);
CREATE INDEX idx_user_attempts_test_id ON public.user_attempts(test_id);
CREATE INDEX idx_attempt_answers_attempt_id ON public.attempt_answers(attempt_id);
CREATE INDEX idx_user_question_progress_user ON public.user_question_progress(user_id, question_id);
CREATE INDEX idx_events_event_type ON public.events(event_type, created_at);
CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_user_id, created_at);

-- ==========================================
-- 9. TRIGGERS & FUNCTIONS
-- ==========================================

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', Split_part(NEW.email, '@', 1)),
        'student'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_exam_papers_updated_at BEFORE UPDATE ON public.exam_papers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper function to check if current requesting user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Public Read Access for Published Content
CREATE POLICY "Public read active exams" ON public.exams FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Public read published papers" ON public.exam_papers FOR SELECT USING (status = 'published' OR public.is_admin());
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public read chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Public read topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Public read published questions" ON public.questions FOR SELECT USING (status = 'published' OR public.is_admin());
CREATE POLICY "Public read options" ON public.question_options FOR SELECT USING (true);
CREATE POLICY "Public read explanations" ON public.question_explanations FOR SELECT USING (true);
CREATE POLICY "Public read tags" ON public.question_tags FOR SELECT USING (true);
CREATE POLICY "Public read published tests" ON public.tests FOR SELECT USING (status = 'published' OR public.is_admin());
CREATE POLICY "Public read test questions" ON public.test_questions FOR SELECT USING (true);

-- Admin Full Access Policies
CREATE POLICY "Admin write exams" ON public.exams FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write papers" ON public.exam_papers FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write subjects" ON public.subjects FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write chapters" ON public.chapters FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write topics" ON public.topics FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write questions" ON public.questions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write options" ON public.question_options FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write explanations" ON public.question_explanations FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write tags" ON public.question_tags FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write tests" ON public.tests FOR ALL USING (public.is_admin());
CREATE POLICY "Admin write test questions" ON public.test_questions FOR ALL USING (public.is_admin());
CREATE POLICY "Admin access audit logs" ON public.audit_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Admin access analytics" ON public.daily_analytics FOR ALL USING (public.is_admin());

-- User Attempts & Progress Policies
CREATE POLICY "Users access own attempts" ON public.user_attempts FOR ALL USING (auth.uid() = user_id OR user_id IS NULL OR public.is_admin());
CREATE POLICY "Users access own attempt answers" ON public.attempt_answers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_attempts WHERE id = attempt_answers.attempt_id AND (user_id = auth.uid() OR user_id IS NULL)) OR public.is_admin()
);
CREATE POLICY "Users access own progress" ON public.user_question_progress FOR ALL USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users access own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Events insert policy
CREATE POLICY "Anyone can log events" ON public.events FOR INSERT WITH CHECK (true);
