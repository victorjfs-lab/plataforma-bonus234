import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Gift,
  ImagePlus,
  Sparkles,
  Target,
  Ticket,
  UploadCloud,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { marketPortalRepository } from "@/lib/market-portal-repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type AssetPreset = "mini-indice" | "mini-dolar" | "outro";

const assetPresetOptions: Array<{
  value: AssetPreset;
  label: string;
  marketLabel: string;
  defaultTicker: string;
}> = [
  { value: "mini-indice", label: "Mini indice", marketLabel: "Mini indice", defaultTicker: "WIN" },
  { value: "mini-dolar", label: "Mini dolar", marketLabel: "Mini dolar", defaultTicker: "WDO" },
  { value: "outro", label: "Outro", marketLabel: "Outro", defaultTicker: "" },
];

function formatPortalDate(value: string) {
  return format(new Date(value), "dd 'de' MMM", { locale: ptBR });
}

export default function StudentHome() {
  const { account, session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [assetPreset, setAssetPreset] = useState<AssetPreset>("mini-indice");
  const [customAssetLabel, setCustomAssetLabel] = useState("WIN");
  const [financialResult, setFinancialResult] = useState("");
  const [percentageResult, setPercentageResult] = useState("");
  const [pointsResult, setPointsResult] = useState("");
  const [caption, setCaption] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState("");
  const [resultImageName, setResultImageName] = useState("Nenhum print enviado");
  const [avatarImageUrl, setAvatarImageUrl] = useState("");
  const [avatarImageName, setAvatarImageName] = useState("Nenhuma foto enviada");
  const [testimonialVideoFile, setTestimonialVideoFile] = useState<File | null>(null);
  const [testimonialVideoName, setTestimonialVideoName] = useState("Nenhum video enviado");
  const [isProcessingResultImage, setIsProcessingResultImage] = useState(false);
  const [isProcessingAvatarImage, setIsProcessingAvatarImage] = useState(false);

  const studentKey = account?.id || session?.user.email?.toLowerCase() || "";
  const studentName = account?.fullName || "Aluno";
  const studentEmail = session?.user.email || account?.email || "aluno@portal.local";
  const selectedAssetPreset =
    assetPresetOptions.find((item) => item.value === assetPreset) ?? assetPresetOptions[0];
  const resolvedMarketLabel =
    assetPreset === "outro" ? "Outro" : selectedAssetPreset.marketLabel;
  const resolvedAssetLabel = customAssetLabel.trim();

  const { data: portalData, isLoading, isError, error } = useQuery({
    queryKey: ["portal-student", account?.id, session?.user.email],
    queryFn: () =>
      marketPortalRepository.getStudentDashboard({
        accountId: account?.id,
        email: session?.user.email,
        fullName: account?.fullName,
      }),
    enabled: Boolean(account?.id || session?.user.email),
  });

  useEffect(() => {
    if (!portalData) {
      return;
    }

    setAvatarImageUrl(portalData.avatarImageUrl ?? "");
    setTestimonialVideoName(
      portalData.testimonialVideoUrl ? "Video ja enviado" : "Nenhum video enviado",
    );
  }, [portalData]);

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    uploadImage: (file: File) => Promise<string>,
    onSuccess: (imageUrl: string, fileName: string) => void,
    setProcessing: (value: boolean) => void,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setProcessing(true);

    try {
      const imageUrl = await uploadImage(file);
      onSuccess(imageUrl, file.name);
    } catch (error) {
      toast({
        title: "Nao foi possivel enviar a imagem",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  }

  const invalidatePortal = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["portal-student", account?.id, session?.user.email],
      }),
      queryClient.invalidateQueries({ queryKey: ["portal-home"] }),
      queryClient.invalidateQueries({ queryKey: ["portal-admin"] }),
    ]);
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      marketPortalRepository.submitResult({
        studentKey,
        studentName,
        studentEmail,
        marketLabel: resolvedMarketLabel,
        assetLabel: resolvedAssetLabel,
        financialResult,
        percentageResult,
        pointsResult,
        caption,
        imageUrl: resultImageUrl,
      }),
    onSuccess: async () => {
      await invalidatePortal();
      setIsResultDialogOpen(false);
      toast({
        title: "Resultado enviado",
        description: "Seu print foi para validacao. Ele so entra no mural depois da aprovacao do admin.",
      });
      setAssetPreset("mini-indice");
      setCustomAssetLabel("WIN");
      setFinancialResult("");
      setPercentageResult("");
      setPointsResult("");
      setCaption("");
      setResultImageUrl("");
      setResultImageName("Nenhum print enviado");
    },
    onError: (mutationError) => {
      toast({
        title: "Nao foi possivel publicar",
        description:
          mutationError instanceof Error ? mutationError.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: () =>
      marketPortalRepository.updateAvatar({
        studentKey,
        studentName,
        imageUrl: avatarImageUrl,
      }),
    onSuccess: async () => {
      await invalidatePortal();
      toast({
        title: "Avatar atualizado",
        description: "Foto salva com sucesso. Voce ganhou 10 pontos pela missao do avatar.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "Nao foi possivel salvar o avatar",
        description:
          mutationError instanceof Error ? mutationError.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const testimonialMutation = useMutation({
    mutationFn: async () => {
      if (!testimonialVideoFile) {
        throw new Error("Selecione um arquivo de video antes de salvar.");
      }

      const uploadedUrl = await marketPortalRepository.uploadTestimonialVideoFile({
        studentKey,
        file: testimonialVideoFile,
      });

      return marketPortalRepository.submitTestimonialVideo({
        studentKey,
        studentName,
        studentEmail,
        videoUrl: uploadedUrl,
      });
    },
    onSuccess: async () => {
      await invalidatePortal();
      setTestimonialVideoFile(null);
      setTestimonialVideoName("Video enviado para validacao");
      toast({
        title: "Video enviado",
        description: "Seu depoimento foi para validacao e so aparece no site depois da aprovacao.",
      });
    },
    onError: (mutationError) => {
      toast({
        title: "Nao foi possivel registrar o video",
        description:
          mutationError instanceof Error ? mutationError.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  if (account?.role === "admin") {
    return <Navigate to="/app/admin" replace />;
  }

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-5 text-sm text-white/60 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        Preparando sua area...
      </div>
    );
  }

  if (isError || !portalData) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/10 text-amber-50">
        <CardContent className="p-6 text-sm leading-7">
          Nao foi possivel carregar sua area.
          <br />
          {error instanceof Error ? error.message : "Tente sair e entrar novamente."}
        </CardContent>
      </Card>
    );
  }

  const topStats = [
    {
      label: "Envio",
      value: `${portalData.todaySubmissionCount}/3`,
      hint: "prints hoje",
      accent: "border-amber-300/20 bg-amber-300/10",
    },
    {
      label: "Pontuacao",
      value: `${portalData.score} pts`,
      hint: `${portalData.pointsToNextCoupon} pts para 1 cupom no mes`,
      accent: "border-emerald-400/20 bg-emerald-400/10",
    },
    {
      label: "Total publicacoes",
      value: String(portalData.totalPublishedResults),
      hint: "prints validados",
      accent: "border-white/10 bg-white/5",
    },
    {
      label: "Cupons no mes",
      value: String(portalData.monthlyCoupons),
      hint: `${portalData.bimonthCoupons} acumulados no bimestre`,
      accent: "border-amber-300/20 bg-amber-300/10",
    },
    {
      label: "Dia do sorteio",
      value: formatPortalDate(portalData.nextDrawDate),
      hint: "fechamento do ciclo",
      accent: "border-cyan-400/20 bg-cyan-400/10",
    },
  ];

  const avatarMission = portalData.missions.find((item) => item.id === "avatar-photo");
  const testimonialMission = portalData.missions.find((item) => item.id === "testimonial-video");

  return (
    <div className="space-y-8 text-white">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111417] shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
        <div className="p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-200/90">
            <Sparkles className="h-3.5 w-3.5" />
            Area do aluno
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
            {topStats.map((stat) => (
              <div key={stat.label} className={`rounded-[1.35rem] border px-4 py-4 ${stat.accent}`}>
                <p className="text-[0.68rem] uppercase tracking-[0.26em] text-white/45">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                <p className="mt-2 text-sm text-white/62">{stat.hint}</p>
              </div>
            ))}
          </div>

          <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                className="mt-10 h-16 rounded-[1.35rem] border border-amber-300/25 bg-[linear-gradient(135deg,#f3c15d_0%,#d99b29_100%)] px-8 text-2xl font-semibold tracking-[-0.04em] text-slate-950 shadow-[0_20px_40px_rgba(217,155,41,0.22)] transition hover:scale-[1.01] hover:brightness-105"
              >
                enviar resultado
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-white/10 bg-[#111417] p-0 text-white shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
              <div className="max-h-[90vh] overflow-y-auto rounded-lg">
                <DialogHeader className="border-b border-white/10 px-6 py-5 sm:px-8">
                  <DialogTitle className="text-2xl text-white">Enviar resultado</DialogTitle>
                  <DialogDescription className="max-w-2xl text-white/60">
                    Print e descricao curta obrigatorios. Selecione o ativo, informe percentual ou
                    pontos lancados no sistema com valor positivo, escolhendo apenas um dos dois.
                    O financeiro e opcional.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 px-6 py-6 sm:px-8">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white/82">
                        Ativo
                      </Label>
                      <Select
                        value={assetPreset}
                        onValueChange={(value: AssetPreset) => {
                          setAssetPreset(value);
                          const nextPreset = assetPresetOptions.find((item) => item.value === value);
                          setCustomAssetLabel(nextPreset?.defaultTicker ?? "");
                        }}
                      >
                        <SelectTrigger className="border-white/10 bg-white/5 text-white">
                          <SelectValue placeholder="Selecione o ativo" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetPresetOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assetLabel" className="text-white/82">
                        {assetPreset === "outro" ? "Digite o ativo" : "Contrato / ticker"}
                      </Label>
                      <Input
                        id="assetLabel"
                        value={customAssetLabel}
                        onChange={(event) => setCustomAssetLabel(event.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                        placeholder={
                          assetPreset === "mini-indice"
                            ? "Ex: WIN, WINJ26"
                            : assetPreset === "mini-dolar"
                              ? "Ex: WDO, WDOJ26"
                              : "Ex: PETR4, VALE3, DOL"
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="financialResult" className="text-white/82">
                        Financeiro
                      </Label>
                      <Input
                        id="financialResult"
                        value={financialResult}
                        onChange={(event) => setFinancialResult(event.target.value)}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                        placeholder="Opcional. Ex: 850"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="percentageResult" className="text-white/82">
                        Percentual
                      </Label>
                      <Input
                        id="percentageResult"
                        value={percentageResult}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setPercentageResult(nextValue);
                          if (nextValue.trim()) {
                            setPointsResult("");
                          }
                        }}
                        disabled={Boolean(pointsResult.trim())}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                        placeholder="Ex: 3,2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pointsResult" className="text-white/82">
                        Pontos lancados
                      </Label>
                      <Input
                        id="pointsResult"
                        value={pointsResult}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setPointsResult(nextValue);
                          if (nextValue.trim()) {
                            setPercentageResult("");
                          }
                        }}
                        disabled={Boolean(percentageResult.trim())}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                        placeholder="Ex: 120"
                      />
                    </div>
                  </div>

                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                    Escolha apenas um entre percentual e pontos lancados no sistema. O financeiro pode ser preenchido se desejar.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="caption" className="text-white/82">
                      Descricao curta
                    </Label>
                    <Textarea
                      id="caption"
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                      className="min-h-28 border-white/10 bg-white/5 text-white placeholder:text-white/30"
                      placeholder="Explique rapidamente o contexto da operacao"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resultImage" className="text-white/82">
                      Print do resultado
                    </Label>
                    <Input
                      id="resultImage"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        void handleImageUpload(
                          event,
                          (file) =>
                            marketPortalRepository.uploadResultImageFile({
                              studentKey,
                              file,
                            }),
                          (dataUrl, fileName) => {
                            setResultImageUrl(dataUrl);
                            setResultImageName(fileName);
                          },
                          setIsProcessingResultImage,
                        )
                      }
                      className="border-white/10 bg-white/5 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                    />
                    <p className="text-xs text-white/40">
                      {isProcessingResultImage ? "Processando print..." : resultImageName}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/5">
                    <div
                      className="flex h-56 items-center justify-center bg-cover bg-center"
                      style={{
                        backgroundImage: resultImageUrl
                          ? `linear-gradient(180deg, rgba(8,10,12,0.08), rgba(8,10,12,0.56)), url(${resultImageUrl})`
                          : "linear-gradient(180deg, rgba(32,36,43,0.9), rgba(18,20,24,1))",
                      }}
                    >
                      {!resultImageUrl ? (
                        <div className="flex flex-col items-center gap-3 text-white/50">
                          <UploadCloud className="h-9 w-9" />
                          <p className="text-sm">O print aparece aqui antes de publicar</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending || isProcessingResultImage}
                      className="h-12 rounded-xl bg-white px-6 text-base font-semibold text-slate-950 hover:bg-white/90"
                    >
                      {isProcessingResultImage
                        ? "Preparando print..."
                        : submitMutation.isPending
                          ? "Publicando..."
                          : "Publicar print e ganhar 2 pontos"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <Card className="border-white/10 bg-[linear-gradient(180deg,#12161b_0%,#0f1317_100%)] text-white shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-amber-200" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">Missoes bonus</p>
              <h2 className="mt-2 text-2xl text-white">Extras de pontuacao</h2>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Enviar resultado do dia</p>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  Vale 2 pontos por envio com print e aceita ate 3 publicacoes por dia.
                </p>
              </div>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100">
                +2 pts
              </span>
            </div>
            <p className="mt-4 text-sm text-white/48">{portalData.todaySubmissionCount}/3 hoje</p>
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Colocar foto no avatar</p>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  Missao unica para ganhar 10 pontos extras e completar seu perfil.
                </p>
              </div>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100">
                +10 pts
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[92px_minmax(0,1fr)]">
              <div
                className="h-24 rounded-[1rem] bg-cover bg-center"
                style={{
                  backgroundImage: avatarImageUrl
                    ? `linear-gradient(180deg, rgba(8,10,12,0.08), rgba(8,10,12,0.45)), url(${avatarImageUrl})`
                    : "linear-gradient(180deg, rgba(32,36,43,0.9), rgba(18,20,24,1))",
                }}
              />
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    void handleImageUpload(
                      event,
                      (file) =>
                        marketPortalRepository.uploadAvatarImageFile({
                          studentKey,
                          file,
                        }),
                      (dataUrl, fileName) => {
                        setAvatarImageUrl(dataUrl);
                        setAvatarImageName(fileName);
                      },
                      setIsProcessingAvatarImage,
                    )
                  }
                  className="border-white/10 bg-white/5 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-white/40">
                    {isProcessingAvatarImage ? "Processando foto..." : avatarImageName}
                  </p>
                  <Button
                    onClick={() => avatarMutation.mutate()}
                    disabled={
                      avatarMutation.isPending || isProcessingAvatarImage || avatarMission?.locked
                    }
                    variant="outline"
                    className="h-10 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    {avatarMission?.locked ? "Concluido" : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Enviar video de depoimento</p>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  Gera 25 pontos e pode ser usado uma vez a cada 6 meses.
                </p>
              </div>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100">
                +25 pts
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                type="file"
                accept="video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setTestimonialVideoFile(file);
                  setTestimonialVideoName(file?.name ?? "Nenhum video enviado");
                }}
                className="border-white/10 bg-white/5 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/40">
                  {testimonialMission?.locked ? testimonialMission.progressLabel : testimonialVideoName}
                </p>
                <Button
                  onClick={() => testimonialMutation.mutate()}
                  disabled={
                    testimonialMutation.isPending ||
                    testimonialMission?.locked ||
                    testimonialMission?.actionLabel === "Em validacao"
                  }
                  variant="outline"
                  className="h-10 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Gift className="mr-2 h-4 w-4" />
                  {testimonialMission?.locked
                    ? "Bloqueado"
                    : testimonialMutation.isPending
                      ? "Enviando..."
                      : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
