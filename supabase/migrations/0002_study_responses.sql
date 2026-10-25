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
alter table study_responses add constraint study_responses_once unique (study, terac_submission_id);
