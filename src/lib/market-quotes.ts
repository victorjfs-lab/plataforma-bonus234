export type MarketQuote = {
  symbol: string;
  value: string;
  change: string;
};

export const fallbackMarketQuotes: MarketQuote[] = [
  { symbol: "INDICE", value: "--", change: "0,00%" },
  { symbol: "DOLAR", value: "5,18", change: "-0,14%" },
  { symbol: "BITCOIN", value: "68.420", change: "+2,11%" },
  { symbol: "OURO", value: "2.168,40", change: "+0,48%" },
  { symbol: "SP500", value: "5.218,17", change: "+0,36%" },
  { symbol: "PETR4", value: "38,72", change: "+1,28%" },
  { symbol: "VALE3", value: "61,44", change: "+0,64%" },
  { symbol: "ITUB4", value: "33,18", change: "+0,42%" },
  { symbol: "MGLU3", value: "11,26", change: "-0,85%" },
];

type MarketQuotesResponse = {
  quotes?: MarketQuote[];
};

function dedupeQuotes(quotes: MarketQuote[]) {
  const seen = new Set<string>();
  return quotes.filter((item) => {
    if (seen.has(item.symbol)) {
      return false;
    }

    seen.add(item.symbol);
    return true;
  });
}

export async function getMarketQuotes(): Promise<MarketQuote[]> {
  try {
    const serverResponse = await fetch("/api/market-quotes");

    if (serverResponse.ok) {
      const payload = (await serverResponse.json()) as MarketQuotesResponse;
      const quotes = payload.quotes ?? [];

      if (quotes.length) {
        return dedupeQuotes([
          ...quotes,
          ...fallbackMarketQuotes.filter(
            (fallbackItem) => !quotes.some((quote) => quote.symbol === fallbackItem.symbol),
          ),
        ]);
      }
    }
  } catch {
    // Fall through to the static fallback to keep the home stable.
  }

  return fallbackMarketQuotes;
}
