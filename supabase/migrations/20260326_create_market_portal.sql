create table if not exists public.portal_prizes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text not null,
  badge text not null,
  draw_date timestamptz not null,
  highlight text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portal_student_profiles (
  student_key text primary key,
  academy_user_id uuid references public.academy_users(id) on delete set null,
  student_name text not null,
  student_email text,
  avatar_image_url text,
  avatar_points_granted_at timestamptz,
  testimonial_video_url text,
  testimonial_points_granted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portal_result_submissions (
  id uuid primary key default gen_random_uuid(),
  student_key text not null,
  academy_user_id uuid references public.academy_users(id) on delete set null,
  student_name text not null,
  student_email text not null,
  market_label text not null,
  asset_label text not null,
  financial_value numeric(12, 2),
  percentage_value numeric(10, 2),
  points_value numeric(12, 2),
  financial_label text,
  percentage_label text,
  points_label text,
  profit_label text not null,
  caption text not null,
  image_url text not null,
  awarded_points integer not null default 2,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (percentage_value is not null and points_value is null)
    or (percentage_value is null and points_value is not null)
  ),
  check (financial_value is null or financial_value > 0),
  check (percentage_value is null or percentage_value > 0),
  check (points_value is null or points_value > 0),
  check (awarded_points >= 0)
);

create index if not exists idx_portal_prizes_sort_order
  on public.portal_prizes(sort_order, draw_date);

create index if not exists idx_portal_profiles_academy_user
  on public.portal_student_profiles(academy_user_id);

create index if not exists idx_portal_profiles_email
  on public.portal_student_profiles(lower(student_email));

create index if not exists idx_portal_submissions_submitted_at
  on public.portal_result_submissions(submitted_at desc);

create index if not exists idx_portal_submissions_student_key
  on public.portal_result_submissions(student_key, submitted_at desc);

create index if not exists idx_portal_submissions_academy_user
  on public.portal_result_submissions(academy_user_id, submitted_at desc);

drop trigger if exists trg_portal_prizes_updated_at on public.portal_prizes;
create trigger trg_portal_prizes_updated_at
before update on public.portal_prizes
for each row execute function public.set_updated_at();

drop trigger if exists trg_portal_profiles_updated_at on public.portal_student_profiles;
create trigger trg_portal_profiles_updated_at
before update on public.portal_student_profiles
for each row execute function public.set_updated_at();

alter table public.portal_prizes enable row level security;
alter table public.portal_student_profiles enable row level security;
alter table public.portal_result_submissions enable row level security;

drop policy if exists "public can read active portal prizes" on public.portal_prizes;
create policy "public can read active portal prizes"
on public.portal_prizes for select
using (is_active = true);

drop policy if exists "public can read portal profiles" on public.portal_student_profiles;
create policy "public can read portal profiles"
on public.portal_student_profiles for select
using (true);

drop policy if exists "public can read portal submissions" on public.portal_result_submissions;
create policy "public can read portal submissions"
on public.portal_result_submissions for select
using (true);

drop policy if exists "authenticated users can manage portal prizes" on public.portal_prizes;
create policy "authenticated users can manage portal prizes"
on public.portal_prizes for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage portal profiles" on public.portal_student_profiles;
create policy "authenticated users can manage portal profiles"
on public.portal_student_profiles for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users can manage portal submissions" on public.portal_result_submissions;
create policy "authenticated users can manage portal submissions"
on public.portal_result_submissions for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into public.portal_prizes (
  id,
  title,
  description,
  image_url,
  badge,
  draw_date,
  highlight,
  sort_order,
  is_active
)
values
  (
    'f1011111-1111-4111-8111-111111111111',
    'Premio principal do mes',
    'R$ 2.000 em capital para o aluno sorteado acelerar a propria operacao.',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    'Sorteio mensal',
    timezone('utc', now()) + interval '30 days',
    'Cada 4 pontos vira 1 cupom para o sorteio',
    1,
    true
  ),
  (
    'f2022222-2222-4222-8222-222222222222',
    'Kit setup de mesa',
    'Mouse, headset e acessorios para deixar a rotina de mercado mais profissional.',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    'Premio extra',
    timezone('utc', now()) + interval '30 days',
    'Pontue todos os dias para acelerar seus cupons',
    2,
    true
  ),
  (
    'f3033333-3333-4333-8333-333333333333',
    'Mentoria individual',
    'Sessao de 1 hora para revisar operacoes, diario e plano de evolucao.',
    'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
    'Experiencia premium',
    timezone('utc', now()) + interval '30 days',
    'Video de depoimento e avatar ajudam a subir de nivel',
    3,
    true
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  badge = excluded.badge,
  draw_date = excluded.draw_date,
  highlight = excluded.highlight,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.portal_student_profiles (
  student_key,
  academy_user_id,
  student_name,
  student_email,
  avatar_image_url,
  avatar_points_granted_at,
  testimonial_video_url,
  testimonial_points_granted_at
)
values
  (
    '22222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'Marina Costa',
    'marina@aluno.local',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    timezone('utc', now()) - interval '2 days',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    timezone('utc', now()) - interval '4 days'
  ),
  (
    'lucas@aluno.local',
    null,
    'Lucas Andrade',
    'lucas@aluno.local',
    null,
    null,
    null,
    null
  )
on conflict (student_key) do update
set
  academy_user_id = excluded.academy_user_id,
  student_name = excluded.student_name,
  student_email = excluded.student_email,
  avatar_image_url = excluded.avatar_image_url,
  avatar_points_granted_at = excluded.avatar_points_granted_at,
  testimonial_video_url = excluded.testimonial_video_url,
  testimonial_points_granted_at = excluded.testimonial_points_granted_at,
  updated_at = timezone('utc', now());

insert into public.portal_result_submissions (
  id,
  student_key,
  academy_user_id,
  student_name,
  student_email,
  market_label,
  asset_label,
  financial_value,
  percentage_value,
  points_value,
  financial_label,
  percentage_label,
  points_label,
  profit_label,
  caption,
  image_url,
  awarded_points,
  submitted_at
)
values
  (
    'a1001111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'Marina Costa',
    'marina@aluno.local',
    'Mini indice',
    'WIN',
    1200,
    null,
    500,
    '+R$ 1.200',
    null,
    '+500 pts',
    '+R$ 1.200',
    'Setup 5C',
    'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1200&q=80',
    2,
    timezone('utc', now()) - interval '1 day'
  ),
  (
    'a1002222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'Marina Costa',
    'marina@aluno.local',
    'Mini indice',
    'WIN',
    1250,
    null,
    900,
    '+R$ 1.250',
    null,
    '+900 pts',
    '+R$ 1.250',
    'Descricao curta do contexto, da entrada e da saida.',
    'https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80',
    2,
    timezone('utc', now())
  ),
  (
    'a1003333-3333-4333-8333-333333333333',
    'lucas@aluno.local',
    null,
    'Lucas Andrade',
    'lucas@aluno.local',
    'Mini dolar',
    'WDO',
    540,
    null,
    135,
    '+R$ 540',
    null,
    '+135 pts',
    '+R$ 540',
    'Segui o plano do contexto macro e deixei o trade respirar ate o alvo final.',
    'https://images.unsplash.com/photo-1642790551116-18e150f248e7?auto=format&fit=crop&w=1200&q=80',
    2,
    timezone('utc', now()) - interval '3 days'
  ),
  (
    'a1004444-4444-4444-8444-444444444444',
    'camila@cliente.com',
    null,
    'Camila Rocha',
    'camila@cliente.com',
    'Swing trade',
    'PETR4',
    390,
    3.8,
    null,
    '+R$ 390',
    '+3,8%',
    null,
    '+R$ 390',
    'Print do fechamento da operacao com saida parcial e stop no zero.',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    2,
    timezone('utc', now()) - interval '5 days'
  ),
  (
    'a1005555-5555-4555-8555-555555555555',
    'joao@cliente.com',
    null,
    'Joao Martins',
    'joao@cliente.com',
    'Acoes',
    'VALE3',
    280,
    null,
    92,
    '+R$ 280',
    null,
    '+92 pts',
    '+R$ 280',
    'Trade baseado em fluxo com confirmacao no volume da tarde.',
    'https://images.unsplash.com/photo-1638913659197-5bd84e8f3b12?auto=format&fit=crop&w=1200&q=80',
    2,
    timezone('utc', now()) - interval '7 days'
  ),
  (
    'a1006666-6666-4666-8666-666666666666',
    'pedro@aluno.local',
    null,
    'Pedro Lima',
    'pedro@aluno.local',
    'Mini dolar',
    'WDO',
    610,
    null,
    148,
    '+R$ 610',
    null,
    '+148 pts',
    '+R$ 610',
    'Operacao curta apos dado economico com risco bem travado.',
    'https://images.unsplash.com/photo-1642052502451-ea542de7147c?auto=format&fit=crop&w=1200&q=80',
    2,
    timezone('utc', now()) - interval '11 days'
  )
on conflict (id) do update
set
  student_key = excluded.student_key,
  academy_user_id = excluded.academy_user_id,
  student_name = excluded.student_name,
  student_email = excluded.student_email,
  market_label = excluded.market_label,
  asset_label = excluded.asset_label,
  financial_value = excluded.financial_value,
  percentage_value = excluded.percentage_value,
  points_value = excluded.points_value,
  financial_label = excluded.financial_label,
  percentage_label = excluded.percentage_label,
  points_label = excluded.points_label,
  profit_label = excluded.profit_label,
  caption = excluded.caption,
  image_url = excluded.image_url,
  awarded_points = excluded.awarded_points,
  submitted_at = excluded.submitted_at;
