-- Answers from Terac participants, collected on our hosted task pages (/study/*).
create table if not exists study_responses (
  id uuid primary key default gen_random_uuid(),
  study text not null,
  terac_submission_id text,
  submission_id text,
  task_id text,
  answers jsonb not null,
  created_at timestamptz not null default now()
);
alter table study_responses enable row level security;
create unique index if not exists study_responses_once on study_responses (study, terac_submission_id) where terac_submission_id is not null;
