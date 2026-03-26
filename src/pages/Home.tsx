import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, isSameMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowUpRight,
  CandlestickChart,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  MessageSquareQuote,
  ShieldCheck,
  TrendingUp,
  Trophy,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { fallbackMarketQuotes, getMarketQuotes, type MarketQuote } from "@/lib/market-quotes";
import { marketPortalRepository } from "@/lib/market-portal-repository";

type BoardTab = "resultados" | "depoimentos" | "ranking";
type ResultsPeriod = "dia" | "semana" | "mes" | "ano";

const marketNews = [
  {
    id: "news-method",
    category: "Smartflow",
    title: "Vire sua chave no mercado com Smart Flow",
    description:
      "Acesse a apresentacao oficial do metodo e leve o aluno direto para a pagina da oportunidade.",
    time: "Banner principal",
    imageUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80",
    href: "https://metodo.fluxosimplificado.com/oportunidade_smartflow/",
  },
];

const boardFallbackImages = {
  ranking:
    "https://images.unsplash.com/photo-1642790551116-18e150f248e3?auto=format&fit=crop&w=1200&q=80",
};

function formatPortalDate(value: string) {
  return format(new Date(value), "dd 'de' MMM", { locale: ptBR });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function parsePointsLabelValue(value: string | null) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function QuoteArrow({ quote }: { quote: MarketQuote }) {
  const isNegative = quote.change.startsWith("-");

  return isNegative ? (
    <ArrowDownRight className="h-4 w-4 shrink-0 text-rose-300/75" strokeWidth={2.1} />
  ) : (
    <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-300/75" strokeWidth={2.1} />
  );
}

function ResultCoverOverlay({
  marketLabel,
  assetLabel,
  financialLabel,
  percentageLabel,
  pointsLabel,
  compact = false,
}: {
  marketLabel: string;
  assetLabel: string;
  financialLabel: string | null;
  percentageLabel: string | null;
  pointsLabel: string | null;
  compact?: boolean;
}) {
  const supportMetric = percentageLabel || pointsLabel || null;
  const primaryMetric = financialLabel || supportMetric;
  const supportLabel = pointsLabel ? "Pontuacao" : percentageLabel ? "Percentual" : null;

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-[1rem] bg-slate-950/62 px-3.5 py-2 backdrop-blur">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-white/60">{marketLabel}</p>
          <p
            className={`mt-1 font-semibold tracking-[0.12em] text-white ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {assetLabel}
          </p>
        </div>

        {supportMetric ? (
          <div className="rounded-[1rem] border border-emerald-400/30 bg-slate-950/56 px-3 py-2 text-right backdrop-blur">
            {supportLabel ? (
              <p className="text-[0.58rem] uppercase tracking-[0.24em] text-emerald-200/70">
                {supportLabel}
              </p>
            ) : null}
            <p
              className={`market-metric-font mt-1 font-bold leading-none tracking-[0.02em] text-emerald-300 drop-shadow-[0_8px_20px_rgba(16,185,129,0.26)] ${
                compact ? "text-xl" : "text-2xl"
              }`}
            >
              {supportMetric}
            </p>
          </div>
        ) : null}
      </div>

      <div className="max-w-[85%] space-y-2">
        {primaryMetric ? (
          <p
            className={`market-metric-font font-bold leading-[0.92] tracking-[-0.04em] text-emerald-300 drop-shadow-[0_10px_26px_rgba(16,185,129,0.34)] ${
              compact ? "text-4xl" : "text-6xl"
            }`}
          >
            {primaryMetric}
          </p>
        ) : null}

        {financialLabel ? (
          <div className="h-px w-24 bg-gradient-to-r from-emerald-300/80 to-transparent" />
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<BoardTab>("resultados");
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [resultsPeriod, setResultsPeriod] = useState<ResultsPeriod>("dia");
  const [resultsPage, setResultsPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-home"],
    queryFn: () => marketPortalRepository.getHomeData(),
  });
  const { data: marketQuotes = fallbackMarketQuotes } = useQuery({
    queryKey: ["market-quotes"],
    queryFn: getMarketQuotes,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 30_000,
  });

  const results = data?.approvedResults ?? [];
  const featuredResult = useMemo(() => {
    if (!results.length) {
      return null;
    }

    return [...results].sort((a, b) => {
      const pointsDifference = parsePointsLabelValue(b.pointsLabel) - parsePointsLabelValue(a.pointsLabel);

      if (pointsDifference !== 0) {
        return pointsDifference;
      }

      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    })[0];
  }, [results]);

  const featuredStudentAvatar =
    featuredResult && data?.studentAvatars
      ? data.studentAvatars[featuredResult.studentKey] ?? null
      : null;
  const selectedResult = useMemo(
    () => results.find((item) => item.id === selectedResultId) ?? null,
    [results, selectedResultId],
  );
  const studentPointTotals = useMemo(() => {
    const totals = new Map<string, { monthly: number; total: number }>();
    const now = new Date();

    for (const item of results) {
      const current = totals.get(item.studentKey) ?? { monthly: 0, total: 0 };
      const points = parsePointsLabelValue(item.pointsLabel);

      current.total += points;

      if (isSameMonth(new Date(item.submittedAt), now)) {
        current.monthly += points;
      }

      totals.set(item.studentKey, current);
    }

    return totals;
  }, [results]);
  const selectedResultTotals = selectedResult
    ? studentPointTotals.get(selectedResult.studentKey) ?? { monthly: 0, total: 0 }
    : { monthly: 0, total: 0 };
  const selectedResultAvatar =
    selectedResult && data?.studentAvatars
      ? data.studentAvatars[selectedResult.studentKey] ?? null
      : null;

  const ranking = useMemo(() => {
    const grouped = new Map<
      string,
      { name: string; studentKey: string; count: number; lastDate: string }
    >();
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

    for (const item of results) {
      const itemWeekStart = startOfWeek(new Date(item.submittedAt), { weekStartsOn: 1 }).getTime();

      if (itemWeekStart !== currentWeekStart) {
        continue;
      }

      const current = grouped.get(item.studentName);
      if (!current) {
        grouped.set(item.studentName, {
          name: item.studentName,
          studentKey: item.studentKey,
          count: 1,
          lastDate: item.submittedAt,
        });
        continue;
      }

      grouped.set(item.studentName, {
        ...current,
        count: current.count + 1,
        lastDate:
          new Date(item.submittedAt).getTime() > new Date(current.lastDate).getTime()
            ? item.submittedAt
            : current.lastDate,
      });
    }

    return [...grouped.values()]
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
      })
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        bonusPoints: [10, 8, 6, 4, 2][index] ?? 0,
      }));
  }, [results]);

  const filteredResults = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();

    return results.filter((item) => {
      const submittedAt = new Date(item.submittedAt);

      if (resultsPeriod === "dia") {
        return isSameDay(submittedAt, now);
      }

      if (resultsPeriod === "semana") {
        return startOfWeek(submittedAt, { weekStartsOn: 1 }).getTime() === currentWeekStart;
      }

      if (resultsPeriod === "mes") {
        return isSameMonth(submittedAt, now);
      }

      return submittedAt.getFullYear() === now.getFullYear();
    });
  }, [results, resultsPeriod]);
  const totalResultPages = Math.max(1, Math.ceil(filteredResults.length / 6));
  const pagedResults = filteredResults.slice(resultsPage * 6, resultsPage * 6 + 6);

  useEffect(() => {
    setResultsPage(0);
  }, [activeTab, resultsPeriod]);

  useEffect(() => {
    if (resultsPage > totalResultPages - 1) {
      setResultsPage(Math.max(0, totalResultPages - 1));
    }
  }, [resultsPage, totalResultPages]);

  const boardItems =
    activeTab === "resultados"
      ? pagedResults.map((item) => ({
          id: item.id,
          title: item.studentName,
          avatarUrl: data?.studentAvatars?.[item.studentKey] ?? null,
          subtitle: `${item.marketLabel} / ${item.assetLabel}`,
          metric: item.profitLabel,
          financialLabel: item.financialLabel,
          percentageLabel: item.percentageLabel,
          pointsLabel: item.pointsLabel,
          marketLabel: item.marketLabel,
          assetLabel: item.assetLabel,
          detail: formatPortalDate(item.submittedAt),
          imageUrl: item.imageUrl,
          caption: item.caption,
          videoUrl: null,
        }))
      : activeTab === "depoimentos"
        ? (data?.testimonialVideos ?? []).map((item) => ({
            id: item.studentKey,
            title: item.studentName,
            avatarUrl: item.avatarImageUrl,
            subtitle: "Video enviado na plataforma",
            metric: "Video",
            detail: item.submittedAt ? formatPortalDate(item.submittedAt) : "Depoimento",
            imageUrl: "",
            caption: "Depoimento enviado pelo aluno",
            videoUrl: item.videoUrl,
          }))
        : ranking.map((item, index) => ({
            id: item.name,
            title: `${index + 1}. ${item.name}`,
            avatarUrl: data?.studentAvatars?.[item.studentKey] ?? null,
            subtitle: `${item.count} envios na semana`,
            metric: `+${item.bonusPoints} pts`,
            detail: `Ultima publicacao em ${formatPortalDate(item.lastDate)}`,
            imageUrl: boardFallbackImages.ranking,
            caption: "Bonus semanal por recorrencia de envios no mural",
            videoUrl: null,
          }));

  return (
    <div className="min-h-screen bg-[#edf1f5] text-slate-950 xl:[zoom:0.7]">
      <div className="border-b border-slate-800 bg-[#171d2a] text-white">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0b44c] text-slate-950">
              <CandlestickChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-white/45">
                Smart Flow News
              </p>
              <p className="text-sm font-semibold text-white">Painel do Mercado</p>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-white/10 lg:block" />

          <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto">
            {marketQuotes.map((item) => (
              <div
                key={item.symbol}
                className="min-w-[132px] rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/50">
                  {item.symbol}
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                    <p
                      className={`mt-1 text-xs font-medium ${
                        item.change.startsWith("-") ? "text-rose-300" : "text-emerald-300"
                      }`}
                    >
                      {item.change}
                    </p>
                  </div>
                  <div className="rounded-full bg-white/5 p-1.5">
                    <QuoteArrow quote={item} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1680px] px-4 pb-16 pt-6 sm:px-6 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 bg-[#f7f9fc] px-6 py-4">
                <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Login</p>
              </div>
              <div className="space-y-4 p-6">
                <Link
                  to="/login"
                  className="block rounded-[1.35rem] border border-slate-800 bg-slate-900 p-5 text-center text-white transition hover:bg-slate-800"
                >
                  <div className="flex items-center justify-center gap-3">
                    <UserRound className="h-5 w-5 text-[#f0b44c]" />
                    <p className="text-lg font-semibold">Login</p>
                  </div>
                </Link>
              </div>
            </section>

            <section className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 bg-[#f7f9fc] px-6 py-4">
                <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                  Destaque do dia
                </p>
              </div>

              <div className="p-6">
                <div
                  className="h-[22rem] rounded-[1.5rem] bg-cover bg-center xl:h-[29rem]"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(13,18,28,0.08), rgba(13,18,28,0.52)), url(${featuredResult?.imageUrl ?? "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1200&q=80"})`,
                  }}
                >
                  {featuredResult ? (
                    <ResultCoverOverlay
                      marketLabel={featuredResult.marketLabel}
                      assetLabel={featuredResult.assetLabel}
                      financialLabel={featuredResult.financialLabel}
                      percentageLabel={featuredResult.percentageLabel}
                      pointsLabel={featuredResult.pointsLabel}
                    />
                  ) : null}
                </div>

                <div className="mt-5 rounded-[1.4rem] bg-[#f7f9fc] p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-slate-200">
                      <AvatarImage
                        src={featuredStudentAvatar ?? undefined}
                        alt={featuredResult?.studentName ?? "Smart Flow News"}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-slate-900 text-sm font-semibold text-white">
                        {featuredResult ? getInitials(featuredResult.studentName) : "PB"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-950">
                        {featuredResult?.studentName ?? "Sem destaque"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {featuredResult?.marketLabel ?? "Mercado"} /{" "}
                        {featuredResult?.assetLabel ?? "Ativo"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-base leading-8 text-slate-700">
                    {featuredResult?.caption ??
                      "O melhor resultado do dia fica visivel aqui em destaque."}
                  </p>
                </div>
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-[#f7f9fc] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                    Centro do portal
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 xl:text-[3rem]">
                    <span>Resultados </span>
                    <span className="inline-block bg-[linear-gradient(180deg,#21354d_0%,#0f172a_52%,#050a14_100%)] bg-clip-text font-black tracking-[-0.06em] text-transparent [text-shadow:0_1px_0_rgba(255,255,255,0.3),0_3px_0_rgba(148,163,184,0.45),0_10px_24px_rgba(15,23,42,0.22)]">
                      Smart Flow
                    </span>
                  </h1>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {[
                      { id: "resultados" as const, label: "Resultados" },
                      { id: "depoimentos" as const, label: "Depoimentos" },
                      { id: "ranking" as const, label: "Ranking" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                          activeTab === item.id
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === "resultados" ? (
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {[
                        { id: "dia" as const, label: "Dia" },
                        { id: "semana" as const, label: "Semana" },
                        { id: "mes" as const, label: "Mes" },
                        { id: "ano" as const, label: "Ano" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setResultsPeriod(item.id)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                            resultsPeriod === item.id
                              ? "bg-slate-900 text-white"
                              : "bg-white text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2 2xl:grid-cols-3">
                {isLoading ? (
                  <div className="col-span-full rounded-[1.3rem] border border-slate-200 bg-[#f7f9fc] px-6 py-12 text-center text-sm text-slate-500">
                    Carregando conteudo...
                  </div>
                ) : boardItems.length === 0 ? (
                  <div className="col-span-full rounded-[1.3rem] border border-slate-200 bg-[#f7f9fc] px-6 py-12 text-center text-sm text-slate-500">
                    Ainda nao ha itens para mostrar nessa aba.
                  </div>
                ) : (
                  boardItems.map((item) => (
                    <article
                      key={item.id}
                      className={`overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#fbfcfe] transition hover:border-slate-300 hover:shadow-[0_14px_36px_rgba(15,23,42,0.06)] ${
                        activeTab === "resultados" ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (activeTab === "resultados") {
                          setSelectedResultId(item.id);
                        }
                      }}
                    >
                      {activeTab === "depoimentos" ? (
                        <div className="relative overflow-hidden bg-slate-950">
                          <video
                            className="h-56 w-full bg-slate-950 object-cover xl:h-64"
                            controls
                            preload="metadata"
                            playsInline
                            src={item.videoUrl ?? undefined}
                          />
                          <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-slate-950/78 px-3 py-1 text-[0.64rem] uppercase tracking-[0.24em] text-white backdrop-blur">
                            Depoimento em video
                          </div>
                        </div>
                      ) : (
                        <div
                          className="h-56 bg-cover bg-center xl:h-64"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.58)), url(${item.imageUrl})`,
                          }}
                        >
                          {activeTab === "resultados" ? (
                            <ResultCoverOverlay
                              marketLabel={item.marketLabel}
                              assetLabel={item.assetLabel}
                              financialLabel={item.financialLabel}
                              percentageLabel={item.percentageLabel}
                              pointsLabel={item.pointsLabel}
                              compact
                            />
                          ) : (
                            <div className="flex h-full items-start justify-between gap-3 p-4">
                              <p className="rounded-full bg-white/88 px-3 py-1 text-[0.64rem] uppercase tracking-[0.24em] text-slate-700 backdrop-blur">
                                {item.subtitle}
                              </p>
                              <p className="rounded-full bg-slate-950/82 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
                                {item.metric}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-5 pt-0">
                        <div className="flex items-end gap-3">
                          <Avatar className="-mt-7 h-14 w-14 border-4 border-[#fbfcfe] shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
                            <AvatarImage
                              src={item.avatarUrl ?? undefined}
                              alt={item.title}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-slate-900 text-sm font-semibold text-white">
                              {getInitials(item.title.replace(/^\d+\.\s*/, ""))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                              {item.title}
                            </p>
                            <p className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-500">
                              {item.detail}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-slate-700">
                          {activeTab === "depoimentos" ? item.subtitle : item.caption}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {activeTab === "resultados" && filteredResults.length > 6 ? (
                <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-[#f7f9fc] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setResultsPage((current) => Math.max(0, current - 1))}
                    disabled={resultsPage === 0}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <p className="text-sm font-medium text-slate-500">
                    Pagina {resultsPage + 1} de {totalResultPages}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setResultsPage((current) => Math.min(totalResultPages - 1, current + 1))
                    }
                    disabled={resultsPage >= totalResultPages - 1}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              ) : null}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
              <article>
                <div className="space-y-4">
                  {marketNews.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-[1.55rem] border border-slate-200 bg-[#fbfcfe] shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
                    >
                      <div
                        className="relative overflow-hidden rounded-[1.6rem] bg-slate-950"
                        style={{
                          backgroundImage: `linear-gradient(135deg, rgba(7,12,21,0.9), rgba(12,31,38,0.54)), url(${item.imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,180,76,0.22),transparent_24%),linear-gradient(90deg,rgba(15,23,42,0.9),rgba(15,23,42,0.28))]" />
                        <div className="relative flex min-h-[14.5rem] flex-col justify-between p-5 sm:min-h-[16rem] sm:p-7">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/62">
                            <Clock3 className="h-3.5 w-3.5" />
                            {item.category}
                          </div>

                          <div className="max-w-xl">
                            <h2 className="max-w-[15ch] text-2xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[2.15rem]">
                              {item.title}
                            </h2>
                            <p className="mt-3 max-w-lg text-sm leading-7 text-white/78 sm:text-base">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-200/90">
                              {item.time}
                            </p>
                            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
                              Abrir agora
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </article>

              <article className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="border-b border-slate-200 bg-[#f7f9fc] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4.5 w-4.5 text-slate-900" />
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                      Termometro da comunidade
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <div className="overflow-hidden rounded-[1.35rem] border border-emerald-300/30 bg-[radial-gradient(circle_at_top,#1f8f62_0%,#123d2f_48%,#0b1714_100%)] p-6 text-white shadow-[0_24px_60px_rgba(16,185,129,0.22)]">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/72">
                        Total pontos dia
                      </p>
                      <div className="rounded-full border border-emerald-200/25 bg-white/10 p-2 shadow-[0_0_24px_rgba(52,211,153,0.28)]">
                        <Flame className="h-5 w-5 text-emerald-200 animate-pulse" />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <p className="market-metric-font text-center text-6xl font-bold tracking-[-0.05em] text-emerald-200 drop-shadow-[0_12px_30px_rgba(52,211,153,0.35)]">
                        {data?.stats.totalPointsToday ?? 0}
                      </p>
                    </div>
                    <p className="mt-2 text-sm uppercase tracking-[0.24em] text-emerald-50/84">
                      pontos no {data?.stats.topAssetTodayLabel ?? "MINI INDICE"}
                    </p>
                    <p className="market-metric-font mt-3 text-xl font-semibold tracking-[-0.02em] text-emerald-50">
                      {data?.stats.totalFinancialToday ?? "+R$ 0"} no dia
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-[#fbfcfe] p-6">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                      <Trophy className="h-3.5 w-3.5" />
                      Proximo sorteio alunos
                    </div>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                      30 Abril
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      1 Mentoria completa de R$4000
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-[#fbfcfe] p-6">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                      <MessageSquareQuote className="h-3.5 w-3.5" />
                      Pontos lancados
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
                          Pontos semana
                        </p>
                        <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                          {data?.stats.totalPointsThisWeek ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
                          Pontos mes
                        </p>
                        <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                          {data?.stats.totalPointsThisMonth ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
                          Pontos ano
                        </p>
                        <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                          {data?.stats.totalPointsThisYear ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </main>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedResult && activeTab === "resultados")}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedResultId(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-[1100px] overflow-y-auto rounded-[1.8rem] border border-slate-800 bg-[#11161f] p-0 text-white shadow-[0_28px_80px_rgba(2,6,23,0.58)]">
          {selectedResult ? (
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_380px]">
              <div className="relative min-h-[24rem] overflow-hidden rounded-t-[1.8rem] lg:rounded-l-[1.8rem] lg:rounded-tr-none">
                <img
                  src={selectedResult.imageUrl}
                  alt={`Resultado de ${selectedResult.studentName}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#081018] via-[#081018]/28 to-transparent" />
                <div className="absolute inset-0">
                  <ResultCoverOverlay
                    marketLabel={selectedResult.marketLabel}
                    assetLabel={selectedResult.assetLabel}
                    financialLabel={selectedResult.financialLabel}
                    percentageLabel={selectedResult.percentageLabel}
                    pointsLabel={selectedResult.pointsLabel}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-6 p-6 lg:p-7">
                <div className="pr-8">
                  <DialogTitle className="text-3xl font-semibold tracking-[-0.04em] text-white">
                    {selectedResult.studentName}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm uppercase tracking-[0.22em] text-white/52">
                    {formatPortalDate(selectedResult.submittedAt)} • {selectedResult.marketLabel} /{" "}
                    {selectedResult.assetLabel}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                  <Avatar className="h-16 w-16 border border-white/15">
                    <AvatarImage
                      src={selectedResultAvatar ?? undefined}
                      alt={selectedResult.studentName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-slate-900 text-base font-semibold text-white">
                      {getInitials(selectedResult.studentName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold text-white">{selectedResult.studentName}</p>
                    <p className="text-sm text-white/58">Performance publicada no mural</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-emerald-400/18 bg-[radial-gradient(circle_at_top,#185e44_0%,#11362b_54%,#0a1413_100%)] p-5">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-emerald-100/72">
                      Pontos no mes
                    </p>
                    <p className="market-metric-font mt-3 text-5xl font-bold tracking-[-0.05em] text-emerald-200">
                      {selectedResultTotals.monthly}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-emerald-50/78">
                      Total lancado pelo aluno no ciclo mensal atual.
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-[0.7rem] uppercase tracking-[0.24em] text-white/56">
                      Total acumulado
                    </p>
                    <p className="market-metric-font mt-3 text-5xl font-bold tracking-[-0.05em] text-white">
                      {selectedResultTotals.total}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/62">
                      Soma de todos os pontos lancados por esse aluno na plataforma.
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-white/10 bg-[#0c1119] p-5">
                  <p className="text-[0.7rem] uppercase tracking-[0.24em] text-white/48">
                    Descricao curta
                  </p>
                  <p className="mt-3 text-base leading-8 text-white/80">{selectedResult.caption}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
