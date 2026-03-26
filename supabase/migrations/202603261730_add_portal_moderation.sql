alter table public.portal_result_submissions
  add column if not exists moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  add column if not exists reviewed_at timestamptz;

alter table public.portal_student_profiles
  add column if not exists testimonial_submitted_at timestamptz,
  add column if not exists testimonial_status text not null default 'pending'
    check (testimonial_status in ('pending', 'approved', 'rejected')),
  add column if not exists testimonial_reviewed_at timestamptz;

update public.portal_result_submissions
set
  moderation_status = 'approved',
  reviewed_at = coalesce(reviewed_at, submitted_at)
where moderation_status is distinct from 'approved'
  and id in (
    'a1001111-1111-4111-8111-111111111111',
    'a1002222-2222-4222-8222-222222222222',
    'a1003333-3333-4333-8333-333333333333',
    'a1004444-4444-4444-8444-444444444444',
    'a1005555-5555-4555-8555-555555555555',
    'a1006666-6666-4666-8666-666666666666'
  );

update public.portal_student_profiles
set
  testimonial_status = case
    when testimonial_video_url is not null then 'approved'
    else testimonial_status
  end,
  testimonial_submitted_at = coalesce(testimonial_submitted_at, testimonial_points_granted_at),
  testimonial_reviewed_at = case
    when testimonial_video_url is not null then coalesce(testimonial_reviewed_at, testimonial_points_granted_at)
    else testimonial_reviewed_at
  end
where testimonial_video_url is not null;

create index if not exists idx_portal_submissions_moderation_status
  on public.portal_result_submissions(moderation_status, submitted_at desc);

create index if not exists idx_portal_profiles_testimonial_status
  on public.portal_student_profiles(testimonial_status, testimonial_submitted_at desc);
