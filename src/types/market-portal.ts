export type PortalPrize = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge: string;
  drawDate: string;
  highlight: string;
};

export type PortalModerationStatus = "pending" | "approved" | "rejected";
export type PortalRaffleCycleType = "monthly" | "bimonthly";
export type PortalRaffleStatus = "open" | "closed" | "drawn";

export type PortalResultSubmission = {
  id: string;
  studentKey: string;
  studentName: string;
  studentEmail: string;
  marketLabel: string;
  assetLabel: string;
  financialLabel: string | null;
  percentageLabel: string | null;
  pointsLabel: string | null;
  profitLabel: string;
  caption: string;
  imageUrl: string;
  submittedAt: string;
  awardedPoints: number;
  moderationStatus: PortalModerationStatus;
  reviewedAt: string | null;
};

export type PortalStudentProfile = {
  studentKey: string;
  studentName: string;
  studentEmail?: string | null;
  avatarImageUrl: string | null;
  avatarPointsGrantedAt: string | null;
  testimonialVideoUrl: string | null;
  testimonialSubmittedAt: string | null;
  testimonialPointsGrantedAt: string | null;
  testimonialStatus: PortalModerationStatus;
  testimonialReviewedAt: string | null;
};

export type PortalHomeData = {
  prizes: PortalPrize[];
  approvedResults: PortalResultSubmission[];
  studentAvatars: Record<string, string | null>;
  testimonialVideos: Array<{
    studentKey: string;
    studentName: string;
    avatarImageUrl: string | null;
    videoUrl: string;
    submittedAt: string | null;
  }>;
  stats: {
    activeStudents: number;
    couponsThisMonth: number;
    couponsThisBimester: number;
    publishedResults: number;
    totalPointsToday: number;
    topAssetTodayLabel: string;
    totalFinancialToday: string;
    totalPointsThisWeek: number;
    totalPointsThisMonth: number;
    totalPointsThisYear: number;
    nextDrawDate: string;
  };
};

export type PortalStudentMission = {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  progressLabel: string;
  actionLabel: string;
  completed: boolean;
  locked: boolean;
};

export type PortalStudentDashboard = {
  prizes: PortalPrize[];
  recentSubmissions: PortalResultSubmission[];
  approvedResults: PortalResultSubmission[];
  score: number;
  bimonthScore: number;
  totalPublishedResults: number;
  monthlyCoupons: number;
  bimonthCoupons: number;
  nextDrawDate: string;
  todaySubmissionCount: number;
  dailySubmissionSlotsRemaining: number;
  todayPointsEarned: number;
  pointsToNextCoupon: number;
  avatarImageUrl: string | null;
  testimonialVideoUrl: string | null;
  missions: PortalStudentMission[];
};

export type PortalAdminOverview = {
  prizes: PortalPrize[];
  recentSubmissions: PortalResultSubmission[];
  wallHighlights: PortalResultSubmission[];
  pendingSubmissions: PortalResultSubmission[];
  rejectedSubmissions: PortalResultSubmission[];
  pendingTestimonials: PortalStudentProfile[];
  rejectedTestimonials: PortalStudentProfile[];
  stats: {
    resultsToday: number;
    couponsThisMonth: number;
    couponsThisBimester: number;
    activeStudents: number;
    nextDrawDate: string;
    pendingResults: number;
    pendingTestimonials: number;
  };
  leaderboard: Array<{
    studentKey: string;
    studentName: string;
    submissions: number;
    bonusPoints: number;
    points: number;
    lastSubmissionAt: string;
  }>;
  raffles: {
    currentMonthlyEntries: PortalRaffleEntrySnapshot[];
    currentBimonthlyEntries: PortalRaffleEntrySnapshot[];
    history: PortalRaffleRecord[];
  };
};

export type PortalRaffleEntrySnapshot = {
  id: string;
  raffleId: string;
  studentKey: string;
  studentName: string;
  studentEmail: string | null;
  points: number;
  coupons: number;
  rangeStart: number;
  rangeEnd: number;
  createdAt: string;
};

export type PortalRaffleRecord = {
  id: string;
  cycleType: PortalRaffleCycleType;
  title: string;
  prizeTitle: string;
  drawDate: string;
  status: PortalRaffleStatus;
  totalCoupons: number;
  winningNumber: number | null;
  winnerStudentKey: string | null;
  winnerStudentName: string | null;
  createdAt: string;
  closedAt: string | null;
  drawnAt: string | null;
};

export type SubmitPortalResultInput = {
  studentKey: string;
  studentName: string;
  studentEmail: string;
  marketLabel: string;
  assetLabel: string;
  financialResult: string;
  percentageResult: string;
  pointsResult: string;
  caption: string;
  imageUrl: string;
};

export type UpdatePortalAvatarInput = {
  studentKey: string;
  studentName: string;
  imageUrl: string;
};

export type SubmitPortalTestimonialInput = {
  studentKey: string;
  studentName: string;
  studentEmail?: string;
  videoUrl: string;
};
