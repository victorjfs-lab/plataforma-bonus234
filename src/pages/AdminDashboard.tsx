import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  Copy,
  Dices,
  Gift,
  GraduationCap,
  Link2,
  Pencil,
  PlayCircle,
  ReceiptText,
  Save,
  Sparkles,
  Ticket,
  TimerReset,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { academyRepository } from "@/lib/academy-repository";
import { marketPortalRepository } from "@/lib/market-portal-repository";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { PortalResultSubmission } from "@/types/market-portal";

const statIcons = [Users, CalendarClock, Sparkles, Ticket];
const accessOptions = [
  { label: "1 mes", value: 30 },
  { label: "3 meses", value: 90 },
  { label: "6 meses", value: 180 },
  { label: "1 ano", value: 365 },
];

type ResultEditFormState = {
  marketLabel: string;
  assetLabel: string;
  financialResult: string;
  percentageResult: string;
  pointsResult: string;
  caption: string;
};

function formatPortalDate(value: string) {
  return format(new Date(value), "dd 'de' MMM", { locale: ptBR });
}

function buildResultEditForm(submission: PortalResultSubmission): ResultEditFormState {
  return {
    marketLabel: submission.marketLabel,
    assetLabel: submission.assetLabel,
    financialResult: submission.financialValue ? String(submission.financialValue) : "",
    percentageResult: submission.percentageValue ? String(submission.percentageValue) : "",
    pointsResult: submission.pointsValue ? String(submission.pointsValue) : "",
    caption: submission.caption,
  };
}

export default function AdminDashboard() {
  const { account, isDemoMode } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [requestDurations, setRequestDurations] = useState<Record<string, number>>({});
  const [renewDurations, setRenewDurations] = useState<Record<string, number>>({});
  const [monthlyDrawDate, setMonthlyDrawDate] = useState("2026-04-30");
  const [bimonthlyDrawDate, setBimonthlyDrawDate] = useState("2026-05-30");
  const [editingSubmission, setEditingSubmission] = useState<PortalResultSubmission | null>(null);
  const [editResultForm, setEditResultForm] = useState<ResultEditFormState>({
    marketLabel: "",
    assetLabel: "",
    financialResult: "",
    percentageResult: "",
    pointsResult: "",
    caption: "",
  });

  const { data, isLoading, error: adminOverviewError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => academyRepository.getAdminOverview(),
    enabled: account?.role === "admin",
  });

  const {
    data: portalData,
    isLoading: isPortalLoading,
    error: portalOverviewError,
  } = useQuery({
    queryKey: ["portal-admin"],
    queryFn: () => marketPortalRepository.getAdminOverview(),
    enabled: account?.role === "admin",
  });

  const invalidatePortalQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["portal-admin"] }),
      queryClient.invalidateQueries({ queryKey: ["portal-home"] }),
      queryClient.invalidateQueries({ queryKey: ["portal-student"] }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: ({ requestId, durationDays }: { requestId: string; durationDays: number }) =>
      academyRepository.approveEnrollmentRequest(requestId, durationDays),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Acesso liberado",
        description: "O aluno foi aprovado e ja pode entrar no portal.",
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: ({ enrollmentId, durationDays }: { enrollmentId: string; durationDays: number }) =>
      academyRepository.renewEnrollment(enrollmentId, durationDays),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Acesso renovado",
        description: "A validade do aluno foi renovada com o prazo escolhido.",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => academyRepository.deleteAcademyUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast({
        title: "Usuario removido",
        description: "O aluno foi removido da area administrativa.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel excluir o usuario",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const reviewResultMutation = useMutation({
    mutationFn: ({
      submissionId,
      status,
    }: {
      submissionId: string;
      status: "approved" | "rejected";
    }) => marketPortalRepository.reviewResultSubmission(submissionId, status),
    onSuccess: async (_, variables) => {
      await invalidatePortalQueries();
      toast({
        title: variables.status === "approved" ? "Resultado aprovado" : "Resultado rejeitado",
        description:
          variables.status === "approved"
            ? "O print foi liberado e ja pode aparecer no site."
            : "O print foi barrado e nao aparece no site.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel revisar o resultado",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: ({
      submissionId,
      values,
    }: {
      submissionId: string;
      values: ResultEditFormState;
    }) => marketPortalRepository.updateResultSubmission(submissionId, values),
    onSuccess: async () => {
      await invalidatePortalQueries();
      setEditingSubmission(null);
      toast({
        title: "Resultado atualizado",
        description: "Os dados do resultado foram corrigidos com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel salvar a correcao",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const reviewTestimonialMutation = useMutation({
    mutationFn: ({
      studentKey,
      status,
    }: {
      studentKey: string;
      status: "approved" | "rejected";
    }) => marketPortalRepository.reviewTestimonial(studentKey, status),
    onSuccess: async (_, variables) => {
      await invalidatePortalQueries();
      toast({
        title: variables.status === "approved" ? "Video aprovado" : "Video rejeitado",
        description:
          variables.status === "approved"
            ? "O depoimento foi liberado e ja pode aparecer na home."
            : "O depoimento foi barrado e nao aparece no site.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel revisar o video",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createRaffleMutation = useMutation({
    mutationFn: ({
      cycleType,
      title,
      prizeTitle,
      drawDate,
    }: {
      cycleType: "monthly" | "bimonthly";
      title: string;
      prizeTitle: string;
      drawDate: string;
    }) => marketPortalRepository.createRaffleSnapshot({ cycleType, title, prizeTitle, drawDate }),
    onSuccess: async () => {
      await invalidatePortalQueries();
      toast({
        title: "Ciclo fechado",
        description: "Os cupons foram congelados e o sorteio ja pode ser realizado com seguranca.",
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel fechar o ciclo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const drawRaffleMutation = useMutation({
    mutationFn: (raffleId: string) => marketPortalRepository.drawRaffle(raffleId),
    onSuccess: async (payload) => {
      await invalidatePortalQueries();
      toast({
        title: "Sorteio realizado",
        description: `${payload.winner.studentName} venceu com o numero ${payload.raffle.winningNumber}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Nao foi possivel sortear",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (account?.role !== "admin") {
    return <Navigate to="/app/minha-area" replace />;
  }

  if (isLoading || isPortalLoading || !data || !portalData) {
    if (adminOverviewError || portalOverviewError) {
      return (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-5 text-sm text-destructive shadow-sm">
          {adminOverviewError instanceof Error
            ? adminOverviewError.message
            : portalOverviewError instanceof Error
              ? portalOverviewError.message
              : "Nao foi possivel carregar o painel administrativo agora."}
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
        Preparando painel administrativo...
      </div>
    );
  }

  const stats = [
    { label: "Alunos ativos", value: data.stats.activeStudents },
    { label: "Pedidos pendentes", value: data.stats.pendingRequests },
    { label: "Resultados pendentes", value: portalData.stats.pendingResults },
    { label: "Videos pendentes", value: portalData.stats.pendingTestimonials },
  ];

  async function copyLink(slug: string) {
    const fullUrl =
      typeof window === "undefined"
        ? `/cadastro/${slug}`
        : `${window.location.origin}/cadastro/${slug}`;

    await navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Link copiado",
      description: fullUrl,
    });
  }

  function openResultEditor(submission: PortalResultSubmission) {
    setEditingSubmission(submission);
    setEditResultForm(buildResultEditForm(submission));
  }

  return (
    <div className="space-y-8">
      <Dialog
        open={Boolean(editingSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSubmission(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar resultado</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ativo</label>
              <select
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editResultForm.marketLabel}
                onChange={(event) =>
                  setEditResultForm((current) => ({
                    ...current,
                    marketLabel: event.target.value,
                  }))
                }
              >
                <option value="Mini indice">Mini indice</option>
                <option value="Mini dolar">Mini dolar</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contrato / ticker</label>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editResultForm.assetLabel}
                onChange={(event) =>
                  setEditResultForm((current) => ({
                    ...current,
                    assetLabel: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Financeiro</label>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editResultForm.financialResult}
                onChange={(event) =>
                  setEditResultForm((current) => ({
                    ...current,
                    financialResult: event.target.value,
                  }))
                }
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Percentual</label>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editResultForm.percentageResult}
                onChange={(event) =>
                  setEditResultForm((current) => ({
                    ...current,
                    percentageResult: event.target.value,
                    pointsResult: event.target.value ? "" : current.pointsResult,
                  }))
                }
                placeholder="Preencha percentual ou pontos"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Pontos lancados</label>
              <input
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editResultForm.pointsResult}
                onChange={(event) =>
                  setEditResultForm((current) => ({
                    ...current,
                    pointsResult: event.target.value,
                    percentageResult: event.target.value ? "" : current.percentageResult,
                  }))
                }
                placeholder="Preencha percentual ou pontos"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Descricao curta</label>
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-3 text-sm"
                value={editResultForm.caption}
                onChange={(event) =>
                  setEditResultForm((current) => ({
                    ...current,
                    caption: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingSubmission(null)}>
              Cancelar
            </Button>
            <Button
              className="gap-2"
              disabled={updateResultMutation.isPending || !editingSubmission}
              onClick={() => {
                if (!editingSubmission) {
                  return;
                }

                updateResultMutation.mutate({
                  submissionId: editingSubmission.id,
                  values: editResultForm,
                });
              }}
            >
              <Save className="h-4 w-4" />
              Salvar correcao
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#102f3c_0%,#0b1f29_100%)] p-8 text-white shadow-lg">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-emerald-300">Operacao do portal</p>
            <h1 className="mt-3 text-4xl">Liberacao de alunos, mural de resultados e cupons.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">
              Aqui voce controla quem entra, acompanha os resultados publicados e mantem o
              sorteio mensal sempre vivo na frente da comunidade.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/65">Resultados do dia</p>
              <p className="mt-2 text-3xl font-semibold">{portalData.stats.resultsToday}</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/65">Proximo sorteio</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatPortalDate(portalData.stats.nextDrawDate)}
              </p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                <Link to="/app/admin/produtos">Ir para Produtos</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link to="/app/admin/produtos/novo">Criar novo conteudo</Link>
              </Button>
            </div>
            {isDemoMode ? (
              <div className="sm:col-span-2 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/75">
                No modo demonstracao, novos alunos aprovados usam a senha padrao <b>acesso123</b>.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        {stats.map((item, index) => {
          const Icon = statIcons[index];
          return (
            <Card key={item.label} className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Links de cadastro</CardTitle>
            <CardDescription>
              Cada link pode ser enviado para uma turma, campanha ou lista especifica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.links.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-border/70 bg-secondary/40 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{link.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {link.description}
                    </p>
                    <p className="mt-3 text-sm text-primary">/cadastro/{link.slug}</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Ativo
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button variant="outline" onClick={() => void copyLink(link.slug)} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Solicitacoes de acesso</CardTitle>
            <CardDescription>
              Aprove o cadastro e defina o prazo para o aluno entrar no portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitacao no momento.</p>
            ) : (
              data.requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-border/70 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <p className="font-semibold">{request.fullName}</p>
                      <p className="text-sm text-muted-foreground">{request.email}</p>
                      <p className="text-sm text-muted-foreground">{request.whatsapp}</p>
                      <p className="text-sm text-primary">
                        {request.courseTitle} · {request.linkTitle}
                      </p>
                      {request.notes ? (
                        <p className="text-sm leading-6 text-muted-foreground">{request.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div
                        className={`rounded-full px-4 py-2 text-sm font-medium ${
                          request.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {request.status === "approved" ? "Aprovado" : "Pendente"}
                      </div>
                      {request.status === "pending" ? (
                        <>
                          <select
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={requestDurations[request.id] ?? 365}
                            onChange={(event) =>
                              setRequestDurations((current) => ({
                                ...current,
                                [request.id]: Number(event.target.value),
                              }))
                            }
                          >
                            {accessOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            onClick={() =>
                              approveMutation.mutate({
                                requestId: request.id,
                                durationDays: requestDurations[request.id] ?? 365,
                              })
                            }
                            disabled={approveMutation.isPending}
                          >
                            Liberar acesso
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Sorteio mensal</CardTitle>
            <CardDescription>
              Cada 4 pontos aprovados viram 1 cupom. Feche o ciclo e sorteie com snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Participantes com cupons</p>
                <p className="mt-1 text-2xl font-semibold">
                  {portalData.raffles.currentMonthlyEntries.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">Total de cupons</p>
                <p className="mt-1 text-2xl font-semibold">
                  {portalData.raffles.currentMonthlyEntries.reduce(
                    (total, item) => total + item.coupons,
                    0,
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data do sorteio</label>
                <input
                  type="date"
                  value={monthlyDrawDate}
                  onChange={(event) => setMonthlyDrawDate(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                className="gap-2"
                disabled={createRaffleMutation.isPending}
                onClick={() =>
                  createRaffleMutation.mutate({
                    cycleType: "monthly",
                    title: "Sorteio mensal Smart Flow News",
                    prizeTitle: "Premiacao mensal",
                    drawDate: new Date(`${monthlyDrawDate}T20:00:00`).toISOString(),
                  })
                }
              >
                <ReceiptText className="h-4 w-4" />
                Fechar ciclo mensal
              </Button>
            </div>

            <div className="space-y-3">
              {portalData.raffles.currentMonthlyEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda nao ha cupons do mes.</p>
              ) : (
                portalData.raffles.currentMonthlyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4"
                  >
                    <div>
                      <p className="font-semibold">{entry.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.points} pts · {entry.coupons} cupons
                      </p>
                    </div>
                    <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                      {entry.rangeStart} - {entry.rangeEnd}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Sorteio bimestral extra</CardTitle>
            <CardDescription>
              O acumulado do bimestre fica separado para premio extra e pode ser sorteado depois.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-secondary/30 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Participantes com cupons</p>
                <p className="mt-1 text-2xl font-semibold">
                  {portalData.raffles.currentBimonthlyEntries.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">Total de cupons</p>
                <p className="mt-1 text-2xl font-semibold">
                  {portalData.raffles.currentBimonthlyEntries.reduce(
                    (total, item) => total + item.coupons,
                    0,
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data do sorteio</label>
                <input
                  type="date"
                  value={bimonthlyDrawDate}
                  onChange={(event) => setBimonthlyDrawDate(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                className="gap-2"
                disabled={createRaffleMutation.isPending}
                onClick={() =>
                  createRaffleMutation.mutate({
                    cycleType: "bimonthly",
                    title: "Sorteio bimestral Smart Flow News",
                    prizeTitle: "Premio extra do bimestre",
                    drawDate: new Date(`${bimonthlyDrawDate}T20:00:00`).toISOString(),
                  })
                }
              >
                <ReceiptText className="h-4 w-4" />
                Fechar ciclo bimestral
              </Button>
            </div>

            <div className="space-y-3">
              {portalData.raffles.currentBimonthlyEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda nao ha cupons do bimestre.</p>
              ) : (
                portalData.raffles.currentBimonthlyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4"
                  >
                    <div>
                      <p className="font-semibold">{entry.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.points} pts · {entry.coupons} cupons
                      </p>
                    </div>
                    <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                      {entry.rangeStart} - {entry.rangeEnd}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Historico de sorteios</CardTitle>
            <CardDescription>
              Aqui voce ve os ciclos fechados, o numero sorteado e o vencedor registrado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portalData.raffles.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum sorteio fechado ainda.</p>
            ) : (
              portalData.raffles.history.map((raffle) => (
                <div key={raffle.id} className="rounded-2xl border border-border/70 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-semibold">{raffle.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {raffle.prizeTitle} · {formatPortalDate(raffle.drawDate)}
                      </p>
                      <p className="mt-2 text-sm text-primary">
                        {raffle.totalCoupons} cupons no snapshot
                      </p>
                      {raffle.winnerStudentName ? (
                        <p className="mt-2 text-sm font-medium text-emerald-700">
                          Vencedor: {raffle.winnerStudentName} · numero {raffle.winningNumber}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground">
                        {raffle.status === "drawn"
                          ? "Sorteado"
                          : raffle.status === "closed"
                            ? "Fechado"
                            : "Aberto"}
                      </div>
                      {raffle.status !== "drawn" ? (
                        <Button
                          className="gap-2"
                          disabled={drawRaffleMutation.isPending}
                          onClick={() => drawRaffleMutation.mutate(raffle.id)}
                        >
                          <Dices className="h-4 w-4" />
                          Sortear agora
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Resultados aguardando aprovacao</CardTitle>
            <CardDescription>
              So entram na home e no mural depois da sua aprovacao.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portalData.pendingSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum resultado pendente no momento.</p>
            ) : (
              portalData.pendingSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-2xl border border-border/70 bg-card p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <p className="font-semibold">{submission.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {submission.marketLabel} · {submission.assetLabel}
                      </p>
                      <p className="text-sm text-primary">{formatPortalDate(submission.submittedAt)}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{submission.caption}</p>
                      <div className="flex flex-wrap gap-2">
                        {submission.financialLabel ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            {submission.financialLabel}
                          </span>
                        ) : null}
                        {submission.percentageLabel ? (
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                            {submission.percentageLabel}
                          </span>
                        ) : null}
                        {submission.pointsLabel ? (
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                            {submission.pointsLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => openResultEditor(submission)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        disabled={reviewResultMutation.isPending}
                        onClick={() =>
                          reviewResultMutation.mutate({
                            submissionId: submission.id,
                            status: "approved",
                          })
                        }
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={reviewResultMutation.isPending}
                        onClick={() =>
                          reviewResultMutation.mutate({
                            submissionId: submission.id,
                            status: "rejected",
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Videos aguardando aprovacao</CardTitle>
            <CardDescription>
              Os depoimentos so aparecem no site depois da sua liberacao.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portalData.pendingTestimonials.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum video pendente no momento.</p>
            ) : (
              portalData.pendingTestimonials.map((profile) => (
                <div
                  key={profile.studentKey}
                  className="rounded-2xl border border-border/70 bg-card p-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{profile.studentName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {profile.studentEmail ?? profile.studentKey}
                        </p>
                        <p className="mt-2 text-sm text-primary">
                          Enviado em{" "}
                          {profile.testimonialSubmittedAt
                            ? formatPortalDate(profile.testimonialSubmittedAt)
                            : "agora"}
                        </p>
                      </div>
                      <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                        Pendente
                      </div>
                    </div>

                    {profile.testimonialVideoUrl ? (
                      <div className="overflow-hidden rounded-2xl border border-border/70 bg-slate-950">
                        <video
                          className="h-56 w-full bg-black object-cover"
                          controls
                          preload="metadata"
                          playsInline
                          src={profile.testimonialVideoUrl}
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        disabled={reviewTestimonialMutation.isPending}
                        onClick={() =>
                          reviewTestimonialMutation.mutate({
                            studentKey: profile.studentKey,
                            status: "approved",
                          })
                        }
                      >
                        <PlayCircle className="h-4 w-4" />
                        Aprovar video
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={reviewTestimonialMutation.isPending}
                        onClick={() =>
                          reviewTestimonialMutation.mutate({
                            studentKey: profile.studentKey,
                            status: "rejected",
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                        Rejeitar video
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Resultados aprovados</CardTitle>
            <CardDescription>
              O que a comunidade postou recentemente e entrou no mural do portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portalData.recentSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="flex flex-col gap-4 rounded-2xl border border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{submission.studentName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {submission.marketLabel} · {submission.assetLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{submission.caption}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => openResultEditor(submission)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
                    {submission.profitLabel}
                  </div>
                  <div className="rounded-full bg-secondary px-4 py-2 text-sm text-foreground">
                    {formatPortalDate(submission.submittedAt)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Ranking semanal por envios</CardTitle>
            <CardDescription>
              O top 5 da semana recebe bonus de 10, 8, 6, 4 e 2 pontos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portalData.leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum envio computado nesta semana ainda.</p>
            ) : (
              portalData.leaderboard.map((student, index) => (
                <div
                  key={student.studentKey}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#102c37] text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{student.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        Ultimo print em {formatPortalDate(student.lastSubmissionAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{student.submissions} envios</p>
                    <div className="mt-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                      +{student.bonusPoints} pts
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Premios em destaque</CardTitle>
            <CardDescription>
              Use essa vitrine na home para reforcar a campanha do sorteio mensal.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            {portalData.prizes.map((prize) => (
              <div
                key={prize.id}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card"
              >
                <div
                  className="h-44 bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(8,10,12,0.08), rgba(8,10,12,0.48)), url(${prize.imageUrl})` }}
                />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                      {prize.badge}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatPortalDate(prize.drawDate)}
                    </span>
                  </div>
                  <p className="text-xl font-semibold">{prize.title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{prize.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Alunos e validades</CardTitle>
            <CardDescription>
              Acompanhe quem esta ativo, quem precisa de renovacao e quem pode ser removido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.students.map((student) => (
              <div
                key={student.account.id}
                className="rounded-2xl border border-border/70 bg-card p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <p className="font-semibold">{student.account.fullName}</p>
                    <p className="text-sm text-muted-foreground">{student.account.email}</p>
                    <p className="text-sm text-primary">
                      {student.course?.title ?? "Sem conteudo liberado"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground">
                      {student.enrollment?.status === "active"
                        ? `${student.daysRemaining} dias restantes`
                        : student.enrollment?.status === "expired"
                          ? "Expirado"
                          : "Sem acesso"}
                    </div>
                    {student.enrollment ? (
                      <>
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={renewDurations[student.enrollment.id] ?? 365}
                          onChange={(event) =>
                            setRenewDurations((current) => ({
                              ...current,
                              [student.enrollment!.id]: Number(event.target.value),
                            }))
                          }
                        >
                          {accessOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          onClick={() =>
                            renewMutation.mutate({
                              enrollmentId: student.enrollment!.id,
                              durationDays: renewDurations[student.enrollment!.id] ?? 365,
                            })
                          }
                          disabled={renewMutation.isPending}
                        >
                          Renovar acesso
                        </Button>
                      </>
                    ) : null}
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      disabled={deleteUserMutation.isPending || student.account.role === "admin"}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Deseja mesmo excluir o usuario ${student.account.fullName}?`,
                          )
                        ) {
                          return;
                        }

                        deleteUserMutation.mutate(student.account.id);
                      }}
                    >
                      Excluir usuario
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
