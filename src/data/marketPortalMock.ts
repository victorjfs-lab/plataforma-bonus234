import type { PortalPrize, PortalResultSubmission, PortalStudentProfile } from "@/types/market-portal";

const baseNow = new Date();

function toIso(offsetDays: number, hour: number, minute = 0) {
  const date = new Date(baseNow);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const portalPrizesSeed: PortalPrize[] = [
  {
    id: "prize-monthly-capital",
    title: "Premio principal do mes",
    description: "R$ 2.000 em capital para o aluno sorteado acelerar a propria operacao.",
    imageUrl:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
    badge: "Sorteio mensal",
    drawDate: toIso(7, 20),
    highlight: "Cada 4 pontos vira 1 cupom para o sorteio",
  },
  {
    id: "prize-desk-kit",
    title: "Kit setup de mesa",
    description: "Mouse, headset e acessorios para deixar a rotina de mercado mais profissional.",
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    badge: "Premio extra",
    drawDate: toIso(7, 20),
    highlight: "Pontue todos os dias para acelerar seus cupons",
  },
  {
    id: "prize-mentoring",
    title: "Mentoria individual",
    description: "Sessao de 1 hora para revisar operacoes, diario e plano de evolucao.",
    imageUrl:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    badge: "Experiencia premium",
    drawDate: toIso(7, 20),
    highlight: "Video de depoimento e avatar ajudam a subir de nivel",
  },
];

export const portalSubmissionsSeed: PortalResultSubmission[] = [
  {
    id: "result-marina-01",
    studentKey: "marina@aluno.local",
    studentName: "Marina Costa",
    studentEmail: "marina@aluno.local",
    marketLabel: "Indice futuro",
    assetLabel: "WIN",
    financialLabel: "+R$ 820",
    percentageLabel: "+0,45%",
    pointsLabel: null,
    profitLabel: "+R$ 820",
    caption: "Entrada limpa na abertura com parcial curta e protecao no ajuste.",
    imageUrl:
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1200&q=80",
    submittedAt: toIso(-1, 10, 15),
    awardedPoints: 2,
    moderationStatus: "approved",
    reviewedAt: toIso(-1, 12, 0),
  },
  {
    id: "result-lucas-01",
    studentKey: "lucas@aluno.local",
    studentName: "Lucas Andrade",
    studentEmail: "lucas@aluno.local",
    marketLabel: "Mini dolar",
    assetLabel: "WDO",
    financialLabel: "+R$ 540",
    percentageLabel: null,
    pointsLabel: "+135 pts",
    profitLabel: "+R$ 540",
    caption: "Segui o plano do contexto macro e deixei o trade respirar ate o alvo final.",
    imageUrl:
      "https://images.unsplash.com/photo-1642790551116-18e150f248e7?auto=format&fit=crop&w=1200&q=80",
    submittedAt: toIso(-3, 15, 40),
    awardedPoints: 2,
    moderationStatus: "approved",
    reviewedAt: toIso(-3, 18, 20),
  },
  {
    id: "result-camila-01",
    studentKey: "camila@cliente.com",
    studentName: "Camila Rocha",
    studentEmail: "camila@cliente.com",
    marketLabel: "Swing trade",
    assetLabel: "PETR4",
    financialLabel: "+R$ 390",
    percentageLabel: "+3,8%",
    pointsLabel: null,
    profitLabel: "+3,8%",
    caption: "Print do fechamento da operacao com saida parcial e stop no zero.",
    imageUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    submittedAt: toIso(-5, 18, 5),
    awardedPoints: 2,
    moderationStatus: "approved",
    reviewedAt: toIso(-5, 20, 30),
  },
  {
    id: "result-joao-01",
    studentKey: "joao@cliente.com",
    studentName: "Joao Martins",
    studentEmail: "joao@cliente.com",
    marketLabel: "Acoes",
    assetLabel: "VALE3",
    financialLabel: "+R$ 280",
    percentageLabel: null,
    pointsLabel: "+92 pts",
    profitLabel: "+2,1%",
    caption: "Trade baseado em fluxo com confirmacao no volume da tarde.",
    imageUrl:
      "https://images.unsplash.com/photo-1638913659197-5bd84e8f3b12?auto=format&fit=crop&w=1200&q=80",
    submittedAt: toIso(-7, 14, 10),
    awardedPoints: 2,
    moderationStatus: "approved",
    reviewedAt: toIso(-7, 18, 10),
  },
  {
    id: "result-marina-02",
    studentKey: "marina@aluno.local",
    studentName: "Marina Costa",
    studentEmail: "marina@aluno.local",
    marketLabel: "Mini indice",
    assetLabel: "WIN",
    financialLabel: "+R$ 430",
    percentageLabel: "+0,24%",
    pointsLabel: null,
    profitLabel: "+R$ 430",
    caption: "Segundo resultado da semana mantendo a mesma leitura de contexto.",
    imageUrl:
      "https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1200&q=80",
    submittedAt: toIso(-9, 11, 35),
    awardedPoints: 2,
    moderationStatus: "approved",
    reviewedAt: toIso(-9, 13, 20),
  },
  {
    id: "result-pedro-01",
    studentKey: "pedro@aluno.local",
    studentName: "Pedro Lima",
    studentEmail: "pedro@aluno.local",
    marketLabel: "Mini dolar",
    assetLabel: "WDO",
    financialLabel: "+R$ 610",
    percentageLabel: null,
    pointsLabel: "+148 pts",
    profitLabel: "+R$ 610",
    caption: "Operacao curta apos dado economico com risco bem travado.",
    imageUrl:
      "https://images.unsplash.com/photo-1642052502451-ea542de7147c?auto=format&fit=crop&w=1200&q=80",
    submittedAt: toIso(-11, 9, 55),
    awardedPoints: 2,
    moderationStatus: "approved",
    reviewedAt: toIso(-11, 12, 20),
  },
  {
    id: "result-novo-pendente-01",
    studentKey: "marina@aluno.local",
    studentName: "Marina Costa",
    studentEmail: "marina@aluno.local",
    marketLabel: "Mini indice",
    assetLabel: "WINJ26",
    financialLabel: "+R$ 980",
    percentageLabel: null,
    pointsLabel: "+410 pts",
    profitLabel: "+R$ 980",
    caption: "Resultado enviado hoje aguardando validacao do admin.",
    imageUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    submittedAt: toIso(0, 11, 20),
    awardedPoints: 2,
    moderationStatus: "pending",
    reviewedAt: null,
  },
];

export const portalProfilesSeed: PortalStudentProfile[] = [
  {
    studentKey: "marina@aluno.local",
    studentName: "Marina Costa",
    studentEmail: "marina@aluno.local",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
    avatarPointsGrantedAt: toIso(-2, 8, 0),
    testimonialVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    testimonialCaption: "A plataforma ajudou a organizar meus envios e deixar meus resultados visiveis.",
    testimonialSubmittedAt: toIso(-4, 17, 30),
    testimonialPointsGrantedAt: toIso(-4, 19, 0),
    testimonialStatus: "approved",
    testimonialReviewedAt: toIso(-4, 19, 0),
  },
  {
    studentKey: "lucas@aluno.local",
    studentName: "Lucas Andrade",
    studentEmail: "lucas@aluno.local",
    avatarImageUrl: null,
    avatarPointsGrantedAt: null,
    testimonialVideoUrl: null,
    testimonialCaption: null,
    testimonialSubmittedAt: null,
    testimonialPointsGrantedAt: null,
    testimonialStatus: "pending",
    testimonialReviewedAt: null,
  },
  {
    studentKey: "pedro@aluno.local",
    studentName: "Pedro Lima",
    studentEmail: "pedro@aluno.local",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
    avatarPointsGrantedAt: toIso(-20, 10, 0),
    testimonialVideoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    testimonialCaption: "Gostei da dinamica dos cupons e da visibilidade que o mural da para os alunos.",
    testimonialSubmittedAt: toIso(-1, 15, 15),
    testimonialPointsGrantedAt: null,
    testimonialStatus: "pending",
    testimonialReviewedAt: null,
  },
];

export const marketPortalSeedState = {
  prizes: portalPrizesSeed,
  submissions: portalSubmissionsSeed,
  profiles: portalProfilesSeed,
};
