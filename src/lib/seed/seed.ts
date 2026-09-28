import { createClient } from '@supabase/supabase-js';
import { computeTextHash } from '../utils';
import seedData from './seed-data.json';

export async function runSeedProcess() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🌱 Starting ExamPYQs Seed Import Process...');

  // 1. Upsert Exam
  const { data: examData, error: examErr } = await supabase
    .from('exams')
    .upsert(
      {
        code: seedData.exam.code,
        title: seedData.exam.title,
        category: seedData.exam.category,
        description: seedData.exam.description,
        is_active: true,
      },
      { onConflict: 'code' }
    )
    .select()
    .single();

  if (examErr) {
    console.error('Failed to seed exam:', examErr);
    throw examErr;
  }

  // 2. Upsert Exam Paper
  const { data: paperData, error: paperErr } = await supabase
    .from('exam_papers')
    .upsert(
      {
        exam_id: examData.id,
        code: seedData.paper.code,
        title: seedData.paper.title,
        year: seedData.paper.year,
        session_name: seedData.paper.session_name,
        shift: seedData.paper.shift,
        total_marks: seedData.paper.total_marks,
        duration_minutes: seedData.paper.duration_minutes,
        status: 'published',
      },
      { onConflict: 'exam_id,code' }
    )
    .select()
    .single();

  if (paperErr) {
    console.error('Failed to seed paper:', paperErr);
    throw paperErr;
  }

  // 3. Process Subjects, Chapters, Topics
  for (const subj of seedData.subjects) {
    const { data: subjectRow, error: subjErr } = await supabase
      .from('subjects')
      .upsert(
        {
          code: subj.code,
          title: subj.title,
          description: subj.description,
        },
        { onConflict: 'code' }
      )
      .select()
      .single();

    if (subjErr) continue;

    for (const ch of subj.chapters) {
      const { data: chapterRow, error: chErr } = await supabase
        .from('chapters')
        .upsert(
          {
            subject_id: subjectRow.id,
            code: ch.code,
            title: ch.title,
          },
          { onConflict: 'subject_id,code' }
        )
        .select()
        .single();

      if (chErr) continue;

      for (const top of ch.topics) {
        await supabase.from('topics').upsert(
          {
            chapter_id: chapterRow.id,
            code: top.code,
            title: top.title,
          },
          { onConflict: 'chapter_id,code' }
        );
      }
    }
  }

  // 4. Seed Questions with Options, Explanations & Duplicate Hashing
  let importedCount = 0;
  for (const q of seedData.questions) {
    const textHash = computeTextHash(q.question_text);

    // Fetch subject, chapter, topic IDs
    const { data: subj } = await supabase.from('subjects').select('id').eq('code', q.subject_code).single();
    const { data: ch } = await supabase.from('chapters').select('id').eq('code', q.chapter_code).single();
    const { data: top } = await supabase.from('topics').select('id').eq('code', q.topic_code).single();

    const { data: qRow, error: qErr } = await supabase
      .from('questions')
      .insert({
        exam_id: examData.id,
        paper_id: paperData.id,
        subject_id: subj?.id || null,
        chapter_id: ch?.id || null,
        topic_id: top?.id || null,
        question_text: q.question_text,
        source_type: q.source_type as 'official_pyq' | 'ai_generated',
        official_source_ref: q.official_source_ref,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        marks: q.marks,
        negative_marks: q.negative_marks,
        status: 'published',
        text_hash: textHash,
      })
      .select()
      .single();

    if (qErr) {
      console.warn(`Skipping question insert (${q.official_source_ref}):`, qErr.message);
      continue;
    }

    // Insert options
    const optionRows = q.options.map((opt) => ({
      question_id: qRow.id,
      option_letter: opt.letter,
      option_text: opt.text,
      is_correct: opt.is_correct,
      explanation: opt.explanation,
    }));
    await supabase.from('question_options').insert(optionRows);

    // Insert explanation
    await supabase.from('question_explanations').insert({
      question_id: qRow.id,
      overall_explanation: q.overall_explanation,
      concept_summary: q.concept_summary,
      key_takeaway: q.key_takeaway,
    });

    // Insert tags
    if (q.tags && q.tags.length > 0) {
      const tagRows = q.tags.map((t) => ({ question_id: qRow.id, tag_name: t }));
      await supabase.from('question_tags').insert(tagRows);
    }

    importedCount++;
  }

  console.log(`✅ Seed process completed successfully. Total questions imported: ${importedCount}`);
  return { success: true, count: importedCount };
}
