import {
  addMonths,
  endOfDay,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { marketPortalSeedState } from "@/data/marketPortalMock";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  PortalAdminOverview,
  PortalHomeData,
  PortalModerationStatus,
  PortalPrize,
  PortalResultSubmission,
  PortalStudentDashboard,
  PortalStudentProfile,
  SubmitPortalResultInput,
  SubmitPortalTestimonialInput,
  UpdatePortalAvatarInput,
} from "@/types/market-portal";

const STORAGE_KEY = "market-results-portal-state";
const POINTS_PER_RESULT = 2;
const POINTS_PER_AVATAR = 10;
const POINTS_PER_TESTIMONIAL = 25;
const MAX_DAILY_SUBMISSIONS = 3;
const POINTS_PER_COUPON = 4;
const WEEKLY_RANKING_BONUS = [10, 8, 6, 4, 2];

type PortalState = typeof marketPortalSeedState;
type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function cloneSeedState(): PortalState {
  return JSON.parse(JSON.stringify(marketPortalSeedState)) as PortalState;
}

function toAppError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as SupabaseLikeError;
    const parts = [candidate.message, candidate.details, candidate.hint].filter(Boolean);
    return new Error(parts.join(" ").trim() || fallbackMessage);
  }

  return new Error(fallbackMessage);
}

function isUuidLike(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function readPortalState(): PortalState {
  if (typeof window === "undefined") {
    return cloneSeedState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const initial = cloneSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PortalState>;
    const seed = cloneSeedState();

    return {
      prizes: parsed.prizes?.length ? parsed.prizes : seed.prizes,
      submissions: parsed.submissions?.length ? parsed.submissions : seed.submissions,
      profiles: parsed.profiles?.length ? parsed.profiles : seed.profiles,
    };
  } catch {
    const fallback = cloneSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function writePortalState(state: PortalState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updatePortalState(updater: (current: PortalState) => PortalState) {
  const nextState = updater(readPortalState());
  writePortalState(nextState);
  return nextState;
}

function sortNewestFirst(items: PortalResultSubmission[]) {
  return [...items].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

function getApprovedSubmissions(items: PortalResultSubmission[]) {
  return items.filter((item) => item.moderationStatus === "approved");
}

function getPendingSubmissions(items: PortalResultSubmission[]) {
  return items.filter((item) => item.moderationStatus === "pending");
}

function getRejectedSubmissions(items: PortalResultSubmission[]) {
  return items.filter((item) => item.moderationStatus === "rejected");
}

function getApprovedProfilesWithTestimonials(items: PortalStudentProfile[]) {
  return items.filter(
    (item) => Boolean(item.testimonialVideoUrl) && item.testimonialStatus === "approved",
  );
}

function getPendingProfilesWithTestimonials(items: PortalStudentProfile[]) {
  return items.filter(
    (item) => Boolean(item.testimonialVideoUrl) && item.testimonialStatus === "pending",
  );
}

function getRejectedProfilesWithTestimonials(items: PortalStudentProfile[]) {
  return items.filter(
    (item) => Boolean(item.testimonialVideoUrl) && item.testimonialStatus === "rejected",
  );
}

function getNextDrawDate(prizes: PortalState["prizes"]) {
  return prizes
    .map((prize) => prize.drawDate)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
}

function normalizeStudentKey(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function mapPrizeRow(row: any): PortalPrize {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    badge: row.badge,
    drawDate: row.draw_date,
    highlight: row.highlight,
  };
}

function mapSubmissionRow(row: any): PortalResultSubmission {
  return {
    id: row.id,
    studentKey: row.student_key,
    studentName: row.student_name,
    studentEmail: row.student_email,
    marketLabel: row.market_label,
    assetLabel: row.asset_label,
    financialLabel: row.financial_label,
    percentageLabel: row.percentage_label,
    pointsLabel: row.points_label,
    profitLabel: row.profit_label,
    caption: row.caption,
    imageUrl: row.image_url,
    submittedAt: row.submitted_at,
    awardedPoints: row.awarded_points,
    moderationStatus: row.moderation_status ?? "approved",
    reviewedAt: row.reviewed_at ?? null,
  };
}

function mapProfileRow(row: any): PortalStudentProfile {
  return {
    studentKey: row.student_key,
    studentName: row.student_name,
    studentEmail: row.student_email,
    avatarImageUrl: row.avatar_image_url,
    avatarPointsGrantedAt: row.avatar_points_granted_at,
    testimonialVideoUrl: row.testimonial_video_url,
    testimonialSubmittedAt: row.testimonial_submitted_at ?? row.testimonial_points_granted_at ?? null,
    testimonialPointsGrantedAt: row.testimonial_points_granted_at,
    testimonialStatus: row.testimonial_status ?? (row.testimonial_video_url ? "approved" : "pending"),
    testimonialReviewedAt: row.testimonial_reviewed_at ?? null,
  };
}

async function trySupabase<T>(operation: () => Promise<T>, fallback: () => Promise<T>) {
  if (!isSupabaseConfigured || !supabase) {
    return fallback();
  }

  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase indisponivel") {
      return fallback();
    }

    throw error;
  }
}

function isStudentSubmission(
  item: PortalResultSubmission,
  studentKey: string,
  email?: string | null,
) {
  return (
    item.studentKey === studentKey ||
    item.studentEmail.toLowerCase() === email?.toLowerCase()
  );
}

function getStudentSubmissions(
  submissions: PortalResultSubmission[],
  studentKey: string,
  email?: string | null,
) {
  return submissions.filter((item) => isStudentSubmission(item, studentKey, email));
}

function getStudentProfile(
  profiles: PortalStudentProfile[],
  studentKey: string,
  studentName: string,
  email?: string | null,
) {
  return (
    profiles.find(
      (profile) =>
        profile.studentKey === studentKey ||
        (email ? profile.studentKey === normalizeStudentKey(email) : false),
    ) ?? {
      studentKey,
      studentName,
      studentEmail: email ?? null,
      avatarImageUrl: null,
      avatarPointsGrantedAt: null,
      testimonialVideoUrl: null,
      testimonialSubmittedAt: null,
      testimonialPointsGrantedAt: null,
      testimonialStatus: "pending",
      testimonialReviewedAt: null,
    }
  );
}

function parsePositiveNumber(rawValue: string) {
  const normalized = rawValue.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyLabel(value: number) {
  return `+R$ ${formatNumber(value)}`;
}

function formatPercentLabel(value: number) {
  return `+${formatNumber(value)}%`;
}

function formatPointsLabel(value: number) {
  return `+${formatNumber(value)} pts`;
}

function parseLaunchedPoints(value: string | null) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return numericValue;
}

function parseFinancialValue(value: string | null) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return numericValue;
}

function isSameYear(date: Date, now: Date) {
  return date.getFullYear() === now.getFullYear();
}

function isSameBimester(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    Math.floor(date.getMonth() / 2) === Math.floor(now.getMonth() / 2)
  );
}

function filterSubmissionsByPeriod(
  submissions: PortalResultSubmission[],
  now: Date,
  period: "month" | "bimester" | "week",
) {
  return submissions.filter((item) => {
    const submittedAt = new Date(item.submittedAt);

    if (period === "month") {
      return isSameMonth(submittedAt, now);
    }

    if (period === "bimester") {
      return isSameBimester(submittedAt, now);
    }

    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const itemWeekStart = startOfWeek(submittedAt, { weekStartsOn: 1 }).getTime();
    return currentWeekStart === itemWeekStart;
  });
}

function getProfileBonusPointsForPeriod(
  profile: PortalStudentProfile,
  now: Date,
  period: "month" | "bimester",
) {
  const matchesPeriod = (value: string | null) => {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    return period === "month" ? isSameMonth(date, now) : isSameBimester(date, now);
  };

  let bonusPoints = 0;

  if (matchesPeriod(profile.avatarPointsGrantedAt)) {
    bonusPoints += POINTS_PER_AVATAR;
  }

  if (matchesPeriod(profile.testimonialPointsGrantedAt)) {
    bonusPoints += POINTS_PER_TESTIMONIAL;
  }

  return bonusPoints;
}

function buildSubmissionLeaderboard(submissions: PortalResultSubmission[]) {
  const studentMap = new Map<
    string,
    { studentName: string; submissions: number; points: number; lastSubmissionAt: string }
  >();

  for (const submission of submissions) {
    const current = studentMap.get(submission.studentKey);
    if (!current) {
      studentMap.set(submission.studentKey, {
        studentName: submission.studentName,
        submissions: 1,
        points: submission.awardedPoints,
        lastSubmissionAt: submission.submittedAt,
      });
      continue;
    }

    studentMap.set(submission.studentKey, {
      studentName: current.studentName,
      submissions: current.submissions + 1,
      points: current.points + submission.awardedPoints,
      lastSubmissionAt:
        new Date(submission.submittedAt).getTime() > new Date(current.lastSubmissionAt).getTime()
          ? submission.submittedAt
          : current.lastSubmissionAt,
    });
  }

  return [...studentMap.entries()]
    .map(([studentKey, item], index, source) => ({
      studentKey,
      studentName: item.studentName,
      submissions: item.submissions,
      points: item.points,
      lastSubmissionAt: item.lastSubmissionAt,
      bonusPoints: 0,
    }))
    .sort((a, b) => {
      if (b.submissions !== a.submissions) {
        return b.submissions - a.submissions;
      }

      return new Date(b.lastSubmissionAt).getTime() - new Date(a.lastSubmissionAt).getTime();
    })
    .map((item, index) => ({
      ...item,
      bonusPoints: WEEKLY_RANKING_BONUS[index] ?? 0,
    }));
}

function getWeeklyBonusPointsForStudent(
  submissions: PortalResultSubmission[],
  studentKey: string,
) {
  const groupedWeeks = new Map<string, PortalResultSubmission[]>();

  for (const submission of submissions) {
    const weekKey = startOfWeek(new Date(submission.submittedAt), { weekStartsOn: 1 })
      .toISOString()
      .slice(0, 10);

    const current = groupedWeeks.get(weekKey) ?? [];
    current.push(submission);
    groupedWeeks.set(weekKey, current);
  }

  let totalBonus = 0;

  for (const weekSubmissions of groupedWeeks.values()) {
    const leaderboard = buildSubmissionLeaderboard(weekSubmissions);
    const studentEntry = leaderboard.find((item) => item.studentKey === studentKey);
    if (studentEntry) {
      totalBonus += studentEntry.bonusPoints;
    }
  }

  return totalBonus;
}

function getStudentPeriodScore(
  submissions: PortalResultSubmission[],
  profile: PortalStudentProfile,
  now: Date,
  period: "month" | "bimester",
) {
  const periodSubmissions = filterSubmissionsByPeriod(submissions, now, period);
  const submissionPoints = periodSubmissions.reduce((total, item) => total + item.awardedPoints, 0);
  const profileBonusPoints = getProfileBonusPointsForPeriod(profile, now, period);
  const weeklyBonusPoints = getWeeklyBonusPointsForStudent(periodSubmissions, profile.studentKey);

  return submissionPoints + profileBonusPoints + weeklyBonusPoints;
}

function getPointsToNextCoupon(score: number) {
  const remainder = score % POINTS_PER_COUPON;
  return remainder === 0 ? POINTS_PER_COUPON : POINTS_PER_COUPON - remainder;
}

function getStudentCoupons(score: number) {
  return Math.floor(score / POINTS_PER_COUPON);
}

function getCouponsByStudentForPeriod(
  state: PortalState,
  now: Date,
  period: "month" | "bimester",
) {
  const periodSubmissions = filterSubmissionsByPeriod(state.submissions, now, period);
  const leaderboard = buildSubmissionLeaderboard(periodSubmissions);
  const leaderMap = new Map(leaderboard.map((item) => [item.studentKey, item]));

  const studentKeys = new Set([
    ...periodSubmissions.map((item) => item.studentKey),
    ...state.profiles.map((item) => item.studentKey),
  ]);

  return [...studentKeys].map((studentKey) => {
    const profile = getStudentProfile(
      state.profiles,
      studentKey,
      leaderMap.get(studentKey)?.studentName || state.profiles.find((item) => item.studentKey === studentKey)?.studentName || "Aluno",
      null,
    );
    const studentSubmissions = periodSubmissions.filter((item) => item.studentKey === studentKey);
    const score = getStudentPeriodScore(studentSubmissions, profile, now, period);
    const rankingEntry = leaderMap.get(studentKey);

    return {
      studentKey,
      studentName: profile.studentName,
      points: score,
      coupons: getStudentCoupons(score),
      submissions: studentSubmissions.length,
      bonusPoints: rankingEntry?.bonusPoints ?? 0,
      lastSubmissionAt:
        rankingEntry?.lastSubmissionAt ||
        profile.testimonialPointsGrantedAt ||
        profile.avatarPointsGrantedAt ||
        "",
    };
  });
}

function buildStudentMissions(
  profile: PortalStudentProfile,
  todaySubmissionCount: number,
  now: Date,
) {
  const testimonialLockedUntil = profile.testimonialPointsGrantedAt
    ? addMonths(new Date(profile.testimonialPointsGrantedAt), 6)
    : null;
  const testimonialLocked = testimonialLockedUntil
    ? testimonialLockedUntil.getTime() > now.getTime()
    : false;

  return [
    {
      id: "daily-result",
      title: "Enviar resultado do dia",
      description: "Vale 2 pontos por envio com print. Limite de 3 resultados por dia.",
      rewardPoints: POINTS_PER_RESULT,
      progressLabel: `${todaySubmissionCount}/${MAX_DAILY_SUBMISSIONS} hoje`,
      actionLabel: "Publicar print",
      completed: todaySubmissionCount > 0,
      locked: todaySubmissionCount >= MAX_DAILY_SUBMISSIONS,
    },
    {
      id: "avatar-photo",
      title: "Colocar foto no avatar",
      description: "Missao unica para ganhar 10 pontos extras e deixar seu perfil completo.",
      rewardPoints: POINTS_PER_AVATAR,
      progressLabel: profile.avatarPointsGrantedAt ? "Concluido" : "Pendente",
      actionLabel: profile.avatarPointsGrantedAt ? "Avatar enviado" : "Enviar avatar",
      completed: Boolean(profile.avatarPointsGrantedAt),
      locked: Boolean(profile.avatarPointsGrantedAt),
    },
    {
      id: "testimonial-video",
      title: "Enviar video de depoimento",
      description: "Gera 25 pontos e so pode ser usado uma vez a cada 6 meses.",
      rewardPoints: POINTS_PER_TESTIMONIAL,
      progressLabel: testimonialLockedUntil
        ? testimonialLocked
          ? `Liberado novamente em ${testimonialLockedUntil.toLocaleDateString("pt-BR")}`
          : "Disponivel agora"
        : profile.testimonialStatus === "pending"
          ? "Video em validacao"
          : "Disponivel agora",
      actionLabel:
        testimonialLocked
          ? "Aguardando"
          : profile.testimonialStatus === "pending"
            ? "Em validacao"
            : "Enviar video",
      completed: Boolean(profile.testimonialPointsGrantedAt),
      locked: testimonialLocked,
    },
  ];
}

function validateSubmissionInput(input: SubmitPortalResultInput) {
  if (!input.imageUrl.trim()) {
    throw new Error("O print do resultado e obrigatorio.");
  }

  if (!input.marketLabel.trim()) {
    throw new Error("Informe o mercado do resultado.");
  }

  if (!input.assetLabel.trim()) {
    throw new Error("Informe o ativo operado.");
  }

  if (!input.caption.trim()) {
    throw new Error("Adicione uma descricao curta do resultado.");
  }

  const financialValue = input.financialResult ? parsePositiveNumber(input.financialResult) : null;
  const percentageValue = input.percentageResult
    ? parsePositiveNumber(input.percentageResult)
    : null;
  const pointsValue = input.pointsResult ? parsePositiveNumber(input.pointsResult) : null;

  if (!percentageValue && !pointsValue) {
    throw new Error("Preencha percentual ou pontos. Um dos dois e obrigatorio.");
  }

  if (percentageValue && pointsValue) {
    throw new Error("Escolha apenas um formato de resultado: percentual ou pontos.");
  }

  if (input.financialResult && !financialValue) {
    throw new Error("O resultado financeiro precisa ser positivo quando informado.");
  }

  return {
    financialLabel: financialValue ? formatCurrencyLabel(financialValue) : null,
    percentageLabel: percentageValue ? formatPercentLabel(percentageValue) : null,
    pointsLabel: pointsValue ? formatPointsLabel(pointsValue) : null,
  };
}

async function getSupabasePortalState(): Promise<PortalState> {
  if (!supabase) {
    throw new Error("Supabase indisponivel");
  }

  const results = await Promise.all([
    supabase
      .from("portal_prizes")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("portal_result_submissions")
      .select("*")
      .order("submitted_at", { ascending: false }),
    supabase
      .from("portal_student_profiles")
      .select("*")
      .order("updated_at", { ascending: false }),
  ]);

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw failed.error;
  }

  const [prizesResult, submissionsResult, profilesResult] = results;

  return {
    prizes: (prizesResult.data ?? []).map(mapPrizeRow),
    submissions: (submissionsResult.data ?? []).map(mapSubmissionRow),
    profiles: (profilesResult.data ?? []).map(mapProfileRow),
  };
}

function buildHomeData(state: PortalState): PortalHomeData {
  const submissions = sortNewestFirst(getApprovedSubmissions(state.submissions));
  const approvedState = { ...state, submissions };
  const now = new Date();
  const todaysSubmissions = submissions.filter((item) => isSameDay(new Date(item.submittedAt), now));
  const weeklySubmissions = filterSubmissionsByPeriod(submissions, now, "week");
  const monthlySubmissions = filterSubmissionsByPeriod(submissions, now, "month");
  const yearlySubmissions = submissions.filter((item) => isSameYear(new Date(item.submittedAt), now));
  const monthlyCoupons = getCouponsByStudentForPeriod(approvedState, now, "month").reduce(
    (total, item) => total + item.coupons,
    0,
  );
  const bimonthCoupons = getCouponsByStudentForPeriod(approvedState, now, "bimester").reduce(
    (total, item) => total + item.coupons,
    0,
  );
  const todaysAssetTotals = new Map<
    string,
    { points: number; financial: number; marketLabel: string; assetLabel: string }
  >();

  for (const item of todaysSubmissions) {
    const assetKey = `${item.marketLabel}::${item.assetLabel}`;
    const current = todaysAssetTotals.get(assetKey) ?? {
      points: 0,
      financial: 0,
      marketLabel: item.marketLabel,
      assetLabel: item.assetLabel,
    };

    todaysAssetTotals.set(assetKey, {
      ...current,
      points: current.points + parseLaunchedPoints(item.pointsLabel),
      financial: current.financial + parseFinancialValue(item.financialLabel),
    });
  }

  const topAssetToday = [...todaysAssetTotals.values()].sort((a, b) => b.points - a.points)[0] ?? null;

  return {
    prizes: state.prizes,
    approvedResults: submissions,
    studentAvatars: Object.fromEntries(
      state.profiles.map((profile) => [profile.studentKey, profile.avatarImageUrl]),
    ),
    testimonialVideos: getApprovedProfilesWithTestimonials(state.profiles)
      .sort((a, b) => {
        const aTime = a.testimonialPointsGrantedAt
          ? new Date(a.testimonialPointsGrantedAt).getTime()
          : 0;
        const bTime = b.testimonialPointsGrantedAt
          ? new Date(b.testimonialPointsGrantedAt).getTime()
          : 0;
        return bTime - aTime;
      })
      .map((profile) => ({
        studentKey: profile.studentKey,
        studentName: profile.studentName,
        avatarImageUrl: profile.avatarImageUrl,
        videoUrl: profile.testimonialVideoUrl as string,
        submittedAt: profile.testimonialPointsGrantedAt,
      })),
    stats: {
      activeStudents: new Set(submissions.map((item) => item.studentKey)).size,
      couponsThisMonth: monthlyCoupons,
      couponsThisBimester: bimonthCoupons,
      publishedResults: submissions.length,
      totalPointsToday: todaysSubmissions.reduce(
        (total, item) => total + parseLaunchedPoints(item.pointsLabel),
        0,
      ),
      topAssetTodayLabel: topAssetToday?.marketLabel?.toUpperCase() ?? "MINI INDICE",
      totalFinancialToday: topAssetToday ? formatCurrencyLabel(topAssetToday.financial) : "+R$ 0",
      totalPointsThisWeek: weeklySubmissions.reduce(
        (total, item) => total + parseLaunchedPoints(item.pointsLabel),
        0,
      ),
      totalPointsThisMonth: monthlySubmissions.reduce(
        (total, item) => total + parseLaunchedPoints(item.pointsLabel),
        0,
      ),
      totalPointsThisYear: yearlySubmissions.reduce(
        (total, item) => total + parseLaunchedPoints(item.pointsLabel),
        0,
      ),
      nextDrawDate: getNextDrawDate(state.prizes),
    },
  };
}

function buildStudentDashboard(
  state: PortalState,
  identity: {
    accountId?: string | null;
    email?: string | null;
    fullName?: string | null;
  },
): PortalStudentDashboard {
  const studentKey = normalizeStudentKey(identity.accountId || identity.email || "");
  const studentName = identity.fullName || "Aluno";
  const approvedSubmissions = sortNewestFirst(getApprovedSubmissions(state.submissions));
  const allSubmissions = sortNewestFirst(state.submissions);
  const studentSubmissions = getStudentSubmissions(approvedSubmissions, studentKey, identity.email);
  const profile = getStudentProfile(state.profiles, studentKey, studentName, identity.email);
  const now = new Date();
  const todaySubmissionCount = getStudentSubmissions(allSubmissions, studentKey, identity.email).filter((item) =>
    isSameDay(new Date(item.submittedAt), now),
  ).length;
  const score = getStudentPeriodScore(studentSubmissions, profile, now, "month");
  const bimonthScore = getStudentPeriodScore(studentSubmissions, profile, now, "bimester");

  return {
    prizes: state.prizes,
    recentSubmissions: studentSubmissions.slice(0, 6),
    approvedResults: approvedSubmissions.slice(0, 9),
    score,
    bimonthScore,
    totalPublishedResults: studentSubmissions.length,
    monthlyCoupons: getStudentCoupons(score),
    bimonthCoupons: getStudentCoupons(bimonthScore),
    nextDrawDate: getNextDrawDate(state.prizes),
    todaySubmissionCount,
    dailySubmissionSlotsRemaining: Math.max(0, MAX_DAILY_SUBMISSIONS - todaySubmissionCount),
    todayPointsEarned:
      studentSubmissions.filter((item) => isSameDay(new Date(item.submittedAt), now)).length *
      POINTS_PER_RESULT,
    pointsToNextCoupon: getPointsToNextCoupon(score),
    avatarImageUrl: profile.avatarImageUrl,
    testimonialVideoUrl: profile.testimonialVideoUrl,
    missions: buildStudentMissions(profile, todaySubmissionCount, now),
  };
}

function buildAdminOverview(state: PortalState): PortalAdminOverview {
  const approvedSubmissions = sortNewestFirst(getApprovedSubmissions(state.submissions));
  const pendingSubmissions = sortNewestFirst(getPendingSubmissions(state.submissions));
  const rejectedSubmissions = sortNewestFirst(getRejectedSubmissions(state.submissions));
  const now = new Date();
  const approvedState = { ...state, submissions: approvedSubmissions };
  const monthlyScores = getCouponsByStudentForPeriod(approvedState, now, "month");
  const bimonthScores = getCouponsByStudentForPeriod(approvedState, now, "bimester");
  const weeklyScores = buildSubmissionLeaderboard(
    filterSubmissionsByPeriod(approvedSubmissions, now, "week"),
  );
  const todayCount = approvedSubmissions.filter((item) =>
    isSameDay(new Date(item.submittedAt), now),
  ).length;
  const pendingTestimonials = getPendingProfilesWithTestimonials(state.profiles);
  const rejectedTestimonials = getRejectedProfilesWithTestimonials(state.profiles);

  return {
    prizes: state.prizes,
    recentSubmissions: approvedSubmissions.slice(0, 8),
    wallHighlights: approvedSubmissions.slice(0, 6),
    pendingSubmissions: pendingSubmissions.slice(0, 12),
    rejectedSubmissions: rejectedSubmissions.slice(0, 12),
    pendingTestimonials: pendingTestimonials.slice(0, 12),
    rejectedTestimonials: rejectedTestimonials.slice(0, 12),
    stats: {
      resultsToday: todayCount,
      couponsThisMonth: monthlyScores.reduce((total, item) => total + item.coupons, 0),
      couponsThisBimester: bimonthScores.reduce((total, item) => total + item.coupons, 0),
      activeStudents: new Set(approvedSubmissions.map((item) => item.studentKey)).size,
      nextDrawDate: getNextDrawDate(state.prizes),
      pendingResults: pendingSubmissions.length,
      pendingTestimonials: pendingTestimonials.length,
    },
    leaderboard: weeklyScores.sort((a, b) => {
      if (b.submissions !== a.submissions) {
        return b.submissions - a.submissions;
      }

      return new Date(b.lastSubmissionAt || 0).getTime() - new Date(a.lastSubmissionAt || 0).getTime();
    }),
  };
}

function buildTestimonialReviewUpdate(status: PortalModerationStatus, nowIso: string) {
  if (status === "approved") {
    return {
      testimonial_status: status,
      testimonial_reviewed_at: nowIso,
      testimonial_points_granted_at: nowIso,
    };
  }

  return {
    testimonial_status: status,
    testimonial_reviewed_at: nowIso,
    testimonial_points_granted_at: null,
  };
}

async function resolveAcademyUserId(identity: {
  studentKey?: string | null;
  email?: string | null;
}) {
  if (!supabase) {
    throw new Error("Supabase indisponivel");
  }

  if (isUuidLike(identity.studentKey)) {
    return identity.studentKey ?? null;
  }

  const normalizedEmail = identity.email?.toLowerCase().trim();
  if (!normalizedEmail) {
    return null;
  }

  const result = await supabase
    .from("academy_users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data?.id ?? null;
}

async function uploadPortalAssetFile(input: {
  studentKey: string;
  file: File;
  folder: "portal-results" | "portal-avatars" | "portal-testimonials";
}) {
  const normalizedStudentKey = normalizeStudentKey(input.studentKey);

  if (isSupabaseConfigured && supabase) {
    const ext = input.file.name.includes(".") ? input.file.name.split(".").pop() ?? "" : "";
    const safeBaseName = sanitizeFileName(
      ext ? input.file.name.slice(0, -(ext.length + 1)) : input.file.name,
    ) || "arquivo";
    const safeExt = sanitizeFileName(ext) || (input.folder === "portal-testimonials" ? "mp4" : "png");
    const storagePath = `${input.folder}/${normalizedStudentKey}/${Date.now()}-${safeBaseName}.${safeExt}`;

    const uploadResult = await supabase.storage.from("course-assets").upload(storagePath, input.file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadResult.error) {
      throw new Error(
        uploadResult.error.message ||
          "Nao foi possivel enviar o arquivo. Verifique o bucket course-assets no Supabase.",
      );
    }

    return supabase.storage.from("course-assets").getPublicUrl(storagePath).data.publicUrl;
  }

  if (input.folder === "portal-testimonials") {
    const endpoint = `/api/uploads/testimonial-video?studentKey=${encodeURIComponent(
      normalizedStudentKey,
    )}&fileName=${encodeURIComponent(input.file.name)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": input.file.type || "application/octet-stream",
      },
      body: input.file,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Nao foi possivel enviar o video para o servidor.");
    }

    const payload = (await response.json()) as { url: string };
    return payload.url;
  }

  return readFileAsDataUrl(input.file);
}

export const marketPortalRepository = {
  async getHomeData(): Promise<PortalHomeData> {
    return trySupabase(
      async () => buildHomeData(await getSupabasePortalState()),
      async () => buildHomeData(readPortalState()),
    );
  },

  async getStudentDashboard(identity: {
    accountId?: string | null;
    email?: string | null;
    fullName?: string | null;
  }): Promise<PortalStudentDashboard> {
    return trySupabase(
      async () => buildStudentDashboard(await getSupabasePortalState(), identity),
      async () => buildStudentDashboard(readPortalState(), identity),
    );
  },

  async submitResult(input: SubmitPortalResultInput) {
    const normalizedStudentKey = normalizeStudentKey(input.studentKey || input.studentEmail);
    const now = new Date();
    const validated = validateSubmissionInput(input);

    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const dayStart = startOfDay(now).toISOString();
        const dayEnd = endOfDay(now).toISOString();
        const todayCountResult = await supabase
          .from("portal_result_submissions")
          .select("id", { count: "exact", head: true })
          .eq("student_key", normalizedStudentKey)
          .gte("submitted_at", dayStart)
          .lte("submitted_at", dayEnd);

        if (todayCountResult.error) {
          throw todayCountResult.error;
        }

        if ((todayCountResult.count ?? 0) >= MAX_DAILY_SUBMISSIONS) {
          throw new Error("Voce atingiu o limite de 3 resultados hoje. Volte amanha para pontuar de novo.");
        }

        const profitLabel =
          validated.financialLabel || validated.percentageLabel || validated.pointsLabel || "+2 pts";
        const academyUserId = await resolveAcademyUserId({
          studentKey: input.studentKey,
          email: input.studentEmail,
        });

        const insertResult = await supabase
          .from("portal_result_submissions")
          .insert({
            student_key: normalizedStudentKey,
            academy_user_id: academyUserId,
            student_name: input.studentName,
            student_email: input.studentEmail.toLowerCase(),
            market_label: input.marketLabel.trim(),
            asset_label: input.assetLabel.trim().toUpperCase(),
            financial_label: validated.financialLabel,
            percentage_label: validated.percentageLabel,
            points_label: validated.pointsLabel,
            financial_value: input.financialResult ? parsePositiveNumber(input.financialResult) : null,
            percentage_value: input.percentageResult ? parsePositiveNumber(input.percentageResult) : null,
            points_value: input.pointsResult ? parsePositiveNumber(input.pointsResult) : null,
            profit_label: profitLabel,
            caption: input.caption.trim(),
            image_url: input.imageUrl,
            awarded_points: POINTS_PER_RESULT,
            submitted_at: now.toISOString(),
            moderation_status: "pending",
            reviewed_at: null,
          })
          .select("*")
          .single();

        if (insertResult.error) {
          throw insertResult.error;
        }

        return mapSubmissionRow(insertResult.data);
      },
      async () => {
        const nextState = updatePortalState((current) => {
          const todayCount = current.submissions.filter(
            (item) =>
              item.studentKey === normalizedStudentKey && isSameDay(new Date(item.submittedAt), now),
          ).length;

          if (todayCount >= MAX_DAILY_SUBMISSIONS) {
            throw new Error("Voce atingiu o limite de 3 resultados hoje. Volte amanha para pontuar de novo.");
          }

          const profitLabel =
            validated.financialLabel || validated.percentageLabel || validated.pointsLabel || "+2 pts";

          return {
            ...current,
            submissions: [
              {
                id: `submission-${now.getTime()}`,
                studentKey: normalizedStudentKey,
                studentName: input.studentName,
                studentEmail: input.studentEmail.toLowerCase(),
                marketLabel: input.marketLabel.trim(),
                assetLabel: input.assetLabel.trim().toUpperCase(),
                financialLabel: validated.financialLabel,
                percentageLabel: validated.percentageLabel,
                pointsLabel: validated.pointsLabel,
                profitLabel,
                caption: input.caption.trim(),
              imageUrl: input.imageUrl,
              submittedAt: now.toISOString(),
              awardedPoints: POINTS_PER_RESULT,
              moderationStatus: "pending",
              reviewedAt: null,
            },
              ...current.submissions,
            ],
          };
        });

        return nextState.submissions[0];
      },
    );
  },

  async updateAvatar(input: UpdatePortalAvatarInput) {
    const studentKey = normalizeStudentKey(input.studentKey);
    const now = new Date();

    if (!input.imageUrl.trim()) {
      throw new Error("Envie uma foto para o avatar antes de salvar.");
    }

    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const existingResult = await supabase
          .from("portal_student_profiles")
          .select("*")
          .eq("student_key", studentKey)
          .maybeSingle();

        if (existingResult.error) {
          throw existingResult.error;
        }

        if (existingResult.data?.avatar_points_granted_at) {
          throw new Error("A pontuacao do avatar ja foi liberada para esse perfil.");
        }

        const academyUserId = await resolveAcademyUserId({ studentKey });
        const upsertResult = await supabase
          .from("portal_student_profiles")
          .upsert(
            {
              student_key: studentKey,
              academy_user_id: academyUserId,
              student_name: input.studentName,
              avatar_image_url: input.imageUrl,
              avatar_points_granted_at: now.toISOString(),
            },
            { onConflict: "student_key" },
          )
          .select("*")
          .single();

        if (upsertResult.error) {
          throw upsertResult.error;
        }

        return mapProfileRow(upsertResult.data);
      },
      async () =>
        updatePortalState((current) => {
          const existingProfile = getStudentProfile(current.profiles, studentKey, input.studentName);

          if (existingProfile.avatarPointsGrantedAt) {
            throw new Error("A pontuacao do avatar ja foi liberada para esse perfil.");
          }

          const nextProfile: PortalStudentProfile = {
            ...existingProfile,
            studentKey,
            studentName: input.studentName,
            avatarImageUrl: input.imageUrl,
            avatarPointsGrantedAt: now.toISOString(),
          };

          return {
            ...current,
            profiles: [
              nextProfile,
              ...current.profiles.filter((profile) => profile.studentKey !== studentKey),
            ],
          };
        }),
    );
  },

  async submitTestimonialVideo(input: SubmitPortalTestimonialInput) {
    const studentKey = normalizeStudentKey(input.studentKey);
    const now = new Date();

    if (!input.videoUrl.trim()) {
      throw new Error("Informe o link do video de depoimento.");
    }

    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const existingResult = await supabase
          .from("portal_student_profiles")
          .select("*")
          .eq("student_key", studentKey)
          .maybeSingle();

        if (existingResult.error) {
          throw existingResult.error;
        }

        const nextAvailableAt = existingResult.data?.testimonial_points_granted_at
          ? addMonths(new Date(existingResult.data.testimonial_points_granted_at), 6)
          : null;

        if (nextAvailableAt && nextAvailableAt.getTime() > now.getTime()) {
          throw new Error(
            `O proximo video com pontos fica disponivel em ${nextAvailableAt.toLocaleDateString("pt-BR")}.`,
          );
        }

        const academyUserId = await resolveAcademyUserId({ studentKey });
        const upsertResult = await supabase
          .from("portal_student_profiles")
          .upsert(
            {
              student_key: studentKey,
              academy_user_id: academyUserId,
              student_name: input.studentName,
              student_email: input.studentEmail?.toLowerCase() ?? null,
              testimonial_video_url: input.videoUrl.trim(),
              testimonial_submitted_at: now.toISOString(),
              testimonial_status: "pending",
              testimonial_reviewed_at: null,
              testimonial_points_granted_at: null,
            },
            { onConflict: "student_key" },
          )
          .select("*")
          .single();

        if (upsertResult.error) {
          throw upsertResult.error;
        }

        return mapProfileRow(upsertResult.data);
      },
      async () =>
        updatePortalState((current) => {
          const existingProfile = getStudentProfile(current.profiles, studentKey, input.studentName);
          const nextAvailableAt = existingProfile.testimonialPointsGrantedAt
            ? addMonths(new Date(existingProfile.testimonialPointsGrantedAt), 6)
            : null;

          if (nextAvailableAt && nextAvailableAt.getTime() > now.getTime()) {
            throw new Error(
              `O proximo video com pontos fica disponivel em ${nextAvailableAt.toLocaleDateString("pt-BR")}.`,
            );
          }

          const nextProfile: PortalStudentProfile = {
            ...existingProfile,
            studentKey,
            studentName: input.studentName,
            studentEmail: input.studentEmail?.toLowerCase() ?? existingProfile.studentEmail ?? null,
            testimonialVideoUrl: input.videoUrl.trim(),
            testimonialSubmittedAt: now.toISOString(),
            testimonialPointsGrantedAt: null,
            testimonialStatus: "pending",
            testimonialReviewedAt: null,
          };

          return {
            ...current,
            profiles: [
              nextProfile,
              ...current.profiles.filter((profile) => profile.studentKey !== studentKey),
            ],
          };
        }),
    );
  },

  async uploadResultImageFile(input: { studentKey: string; file: File }) {
    return uploadPortalAssetFile({
      studentKey: input.studentKey,
      file: input.file,
      folder: "portal-results",
    });
  },

  async uploadAvatarImageFile(input: { studentKey: string; file: File }) {
    return uploadPortalAssetFile({
      studentKey: input.studentKey,
      file: input.file,
      folder: "portal-avatars",
    });
  },

  async uploadTestimonialVideoFile(input: { studentKey: string; file: File }) {
    return uploadPortalAssetFile({
      studentKey: input.studentKey,
      file: input.file,
      folder: "portal-testimonials",
    });
  },

  async getAdminOverview(): Promise<PortalAdminOverview> {
    return trySupabase(
      async () => buildAdminOverview(await getSupabasePortalState()),
      async () => buildAdminOverview(readPortalState()),
    );
  },

  async reviewResultSubmission(submissionId: string, status: PortalModerationStatus) {
    const reviewedAt = new Date().toISOString();

    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const result = await supabase
          .from("portal_result_submissions")
          .update({
            moderation_status: status,
            reviewed_at: reviewedAt,
          })
          .eq("id", submissionId)
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }

        return mapSubmissionRow(result.data);
      },
      async () => {
        const nextState = updatePortalState((current) => ({
          ...current,
          submissions: current.submissions.map((item) =>
            item.id === submissionId
              ? { ...item, moderationStatus: status, reviewedAt }
              : item,
          ),
        }));

        const updated = nextState.submissions.find((item) => item.id === submissionId);
        if (!updated) {
          throw new Error("Resultado nao encontrado.");
        }

        return updated;
      },
    );
  },

  async reviewTestimonial(studentKey: string, status: PortalModerationStatus) {
    const normalizedStudentKey = normalizeStudentKey(studentKey);
    const reviewedAt = new Date().toISOString();

    return trySupabase(
      async () => {
        if (!supabase) {
          throw new Error("Supabase indisponivel");
        }

        const result = await supabase
          .from("portal_student_profiles")
          .update(buildTestimonialReviewUpdate(status, reviewedAt))
          .eq("student_key", normalizedStudentKey)
          .select("*")
          .single();

        if (result.error) {
          throw result.error;
        }

        return mapProfileRow(result.data);
      },
      async () => {
        const nextState = updatePortalState((current) => ({
          ...current,
          profiles: current.profiles.map((item) =>
            item.studentKey === normalizedStudentKey
              ? {
                  ...item,
                  testimonialStatus: status,
                  testimonialReviewedAt: reviewedAt,
                  testimonialPointsGrantedAt: status === "approved" ? reviewedAt : null,
                }
              : item,
          ),
        }));

        const updated = nextState.profiles.find((item) => item.studentKey === normalizedStudentKey);
        if (!updated) {
          throw new Error("Video de depoimento nao encontrado.");
        }

        return updated;
      },
    );
  },
};
