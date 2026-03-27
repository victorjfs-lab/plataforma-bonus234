import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const uploadsDir = path.resolve(__dirname, "uploads");
const port = Number(process.env.PORT || 3000);
const brapiBaseUrl = process.env.BRAPI_BASE_URL || "https://brapi.dev/api";
const brapiApiKey = process.env.BRAPI_API_KEY?.trim() || "";
const publicFreeTickers = ["PETR4", "VALE3", "ITUB4", "MGLU3"];
const configuredBrapiTickers = (process.env.BRAPI_TICKERS || publicFreeTickers.join(","))
  .split(",")
  .map((item) => sanitizeSegment(item).toUpperCase())
  .filter(Boolean);
const activeBrapiTickers = brapiApiKey
  ? configuredBrapiTickers
  : configuredBrapiTickers.filter((item) => publicFreeTickers.includes(item));
const brapiIndexSymbols = [{ symbol: "^BVSP", label: "INDICE" }];
const yahooSymbols = [
  { symbol: "BRL=X", label: "DOLAR" },
  { symbol: "BTC-USD", label: "BITCOIN" },
  { symbol: "GC=F", label: "OURO" },
  { symbol: "^GSPC", label: "SP500" },
];

const marketQuotesCache = {
  expiresAt: 0,
  payload: null,
};

const app = express();

function sanitizeSegment(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function formatDecimal(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(value) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${formatDecimal(Math.abs(value))}%`;
}

function normalizeBrapiQuotes(results) {
  return (Array.isArray(results) ? results : [])
    .filter(
      (item) =>
        typeof item?.symbol === "string" &&
        typeof item?.regularMarketPrice === "number" &&
        typeof item?.regularMarketChangePercent === "number",
    )
    .map((item) => ({
      symbol: item.symbol,
      value: formatDecimal(item.regularMarketPrice),
      change: formatChange(item.regularMarketChangePercent),
    }));
}

async function fetchBrapiQuote(item) {
  const response = await fetch(`${brapiBaseUrl}/quote/${encodeURIComponent(item.symbol)}`, {
    headers: brapiApiKey ? { Authorization: `Bearer ${brapiApiKey}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`brapi retornou ${response.status} para ${item.symbol}`);
  }

  const payload = await response.json();
  const quote = payload?.results?.[0];

  if (
    typeof quote?.regularMarketPrice !== "number" ||
    typeof quote?.regularMarketChangePercent !== "number"
  ) {
    throw new Error(`Cotacao incompleta para ${item.symbol}`);
  }

  return {
    symbol: item.label,
    value: formatDecimal(quote.regularMarketPrice),
    change: formatChange(quote.regularMarketChangePercent),
  };
}

async function fetchYahooQuote(item) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=5d`,
  );

  if (!response.ok) {
    throw new Error(`Yahoo retornou ${response.status} para ${item.symbol}`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const currentPrice = meta?.regularMarketPrice;
  // `chartPreviousClose` can refer to the beginning of the requested range,
  // which inflates the daily variation for some assets like ^BVSP.
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose;

  if (typeof currentPrice !== "number" || typeof previousClose !== "number" || previousClose === 0) {
    throw new Error(`Cotacao incompleta para ${item.symbol}`);
  }

  const changePercent = ((currentPrice - previousClose) / previousClose) * 100;

  return {
    symbol: item.label,
    value: formatDecimal(currentPrice),
    change: formatChange(changePercent),
  };
}

async function fetchMarketQuotesBundle() {
  const tickers = activeBrapiTickers.length ? activeBrapiTickers : publicFreeTickers;

  const [brapiQuotes, brapiIndexQuotes, yahooQuotes] = await Promise.all([
    (async () => {
      const response = await fetch(`${brapiBaseUrl}/quote/${tickers.join(",")}`, {
        headers: brapiApiKey ? { Authorization: `Bearer ${brapiApiKey}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`brapi retornou ${response.status}`);
      }

      const payload = await response.json();
      return normalizeBrapiQuotes(payload?.results);
    })(),
    Promise.allSettled(brapiIndexSymbols.map((item) => fetchBrapiQuote(item))),
    Promise.allSettled(yahooSymbols.map((item) => fetchYahooQuote(item))),
  ]);

  const fulfilledBrapiIndexQuotes = brapiIndexQuotes
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value);

  const fulfilledYahooQuotes = yahooQuotes
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value);

  return [...fulfilledBrapiIndexQuotes, ...fulfilledYahooQuotes, ...brapiQuotes];
}

app.disable("x-powered-by");
app.use(
  "/api/uploads/testimonial-video",
  express.raw({
    type: ["video/*", "application/octet-stream"],
    limit: "250mb",
  }),
);
app.use("/uploads", express.static(uploadsDir));

app.get("/api/market-quotes", async (_req, res) => {
  if (marketQuotesCache.payload && marketQuotesCache.expiresAt > Date.now()) {
    res.status(200).json(marketQuotesCache.payload);
    return;
  }

  try {
    const normalizedPayload = {
      provider: brapiApiKey ? "mixed-brapi-yahoo" : "mixed-public",
      fetchedAt: new Date().toISOString(),
      quotes: await fetchMarketQuotesBundle(),
    };

    marketQuotesCache.payload = normalizedPayload;
    marketQuotesCache.expiresAt = Date.now() + 60_000;

    res.status(200).json(normalizedPayload);
  } catch (error) {
    if (marketQuotesCache.payload) {
      res.status(200).json(marketQuotesCache.payload);
      return;
    }

    res.status(502).json({
      error: error instanceof Error ? error.message : "Nao foi possivel consultar as cotacoes.",
    });
  }
});

app.post("/api/uploads/testimonial-video", async (req, res) => {
  try {
    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Arquivo de video vazio." });
      return;
    }

    const fileNameParam = Array.isArray(req.query.fileName) ? req.query.fileName[0] : req.query.fileName;
    const studentKeyParam = Array.isArray(req.query.studentKey)
      ? req.query.studentKey[0]
      : req.query.studentKey;

    const rawFileName = sanitizeSegment(fileNameParam || "video");
    const rawStudentKey = sanitizeSegment(studentKeyParam || "aluno");
    const ext = rawFileName.includes(".") ? rawFileName.split(".").pop() : "";
    const baseName = ext ? rawFileName.slice(0, -(ext.length + 1)) : rawFileName;
    const safeBaseName = baseName || "video";
    const safeExt = ext || "mp4";
    const relativePath = path.join(
      "testimonial-videos",
      rawStudentKey || "aluno",
      `${Date.now()}-${safeBaseName}.${safeExt}`,
    );
    const fullPath = path.join(uploadsDir, relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, req.body);

    const publicUrl = `${req.protocol}://${req.get("host")}/uploads/${relativePath.replace(/\\/g, "/")}`;
    res.status(200).json({ url: publicUrl });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Nao foi possivel salvar o video.",
    });
  }
});

app.use(express.static(distDir, { extensions: ["html"] }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Course platform running on port ${port}`);
});
