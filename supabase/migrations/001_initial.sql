create extension if not exists "pgcrypto";

create table if not exists public.tenders (
  id text primary key,
  title text not null,
  issuer text not null,
  region text not null,
  publication_date date not null,
  deadline_date date not null,
  procedure_type text not null,
  estimated_value_min bigint not null,
  estimated_value_max bigint not null,
  focus_areas text[] not null default '{}',
  keywords text[] not null default '{}',
  required_evidence text[] not null default '{}',
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id text primary key,
  name text not null,
  headquarter text not null,
  service_regions text[] not null default '{}',
  focus_areas text[] not null default '{}',
  keywords text[] not null default '{}',
  certifications text[] not null default '{}',
  min_project_volume bigint not null,
  max_project_volume bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.match_results (
  tender_id text not null references public.tenders(id) on delete cascade,
  company_id text not null references public.companies(id) on delete cascade,
  fit_score integer not null check (fit_score >= 0 and fit_score <= 100),
  reasons jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  criteria jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now(),
  primary key (tender_id, company_id)
);

create index if not exists idx_tenders_deadline on public.tenders(deadline_date);
create index if not exists idx_companies_focus_areas on public.companies using gin(focus_areas);
create index if not exists idx_matches_fit_score on public.match_results(fit_score desc);
