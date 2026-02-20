import { generateText } from "ai"

export async function POST(req: Request) {
  const { ticker, name, sector, price, pctChange, open, high, low, mktCap, pe, eps, beta, div, lo52, hi52 } =
    await req.json()

  const prompt = `You are a senior equity research analyst at a top-tier hedge fund. Assess ${name} (${ticker}) as of Feb 20, 2026.
Live data: Price $${price} (${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}% today) | Open $${open} | Hi $${high} | Lo $${low}
MktCap ${mktCap} | P/E ${pe}x | EPS $${eps} | Beta ${beta} | DivYield ${div}% | 52W $${lo52}--$${hi52} | Sector ${sector}
Reply ONLY with JSON (no markdown):
{"rating":"STRONG BUY"|"BUY"|"HOLD"|"SELL"|"STRONG SELL","targetPrice":N,"updownside":N,"thesis":"<2-3 sentences>","bullCase":"<1-2 sentences>","bearCase":"<1-2 sentences>","keyRisks":["r1","r2","r3"],"catalysts":["c1","c2"],"technicalOutlook":"<brief>","analystConsensus":"<brief>","entryPoint":{"idealEntry":N,"entryLow":N,"entryHigh":N,"entryRationale":"<1 sentence>","entryCondition":"<specific signal>","urgency":"IMMEDIATE"|"PATIENT"|"WAIT"},"holdStrategy":{"minimumHold":"<period>","optimalHold":"<period>","holdRationale":"<1-2 sentences>","reviewTriggers":["t1","t2"],"positionSizing":"<% portfolio>"},"sellSentiment":{"sellSignal":"HOLD"|"TRIM"|"SELL"|"URGENT SELL","sellTriggerPrice":N,"stopLoss":N,"profitTarget":N,"sellRationale":"<1-2 sentences>","redFlags":["f1","f2"],"currentSentiment":"<1 sentence>"}}`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4-20250514",
    prompt,
    maxOutputTokens: 1500,
    temperature: 0.3,
  })

  const cleaned = text.replace(/```json|```/g, "").trim()
  const assessment = JSON.parse(cleaned)

  return Response.json(assessment)
}
