import { auth } from "../../../auth";
import {
  formatBackgroundGroupSummary,
  isBackgroundSummaryRequest,
  isDashboardAdviceMessageHistory,
  isDashboardAdvicePayload,
} from "../../../lib/dashboard-advice";
import { NextResponse } from "next/server";

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const DEFAULT_MODEL = "qwen2.5:3b";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to request dashboard advice." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("dashboard" in body) ||
    !("messages" in body)
  ) {
    return NextResponse.json({ error: "Invalid dashboard advice data." }, { status: 400 });
  }

  if (!isDashboardAdvicePayload(body.dashboard)) {
    return NextResponse.json(
      { error: "Invalid dashboard metrics. Refresh the dashboard and try again." },
      { status: 400 }
    );
  }

  if (!isDashboardAdviceMessageHistory(body.messages)) {
    return NextResponse.json(
      { error: "Invalid chat history. Start a new analysis and try again." },
      { status: 400 }
    );
  }

  const latestMessage = body.messages[body.messages.length - 1]?.content ?? "";
  const asksForBackgroundSummary =
    body.messages.length > 0 &&
    isBackgroundSummaryRequest(latestMessage);

  if (asksForBackgroundSummary) {
    return NextResponse.json({
      advice: formatBackgroundGroupSummary(body.dashboard.backgroundGroups),
    });
  }

  const dashboardContext = body.messages.length
    ? `Studiemetadata en geaggregeerde dashboardgegevens:\n${JSON.stringify(
        body.dashboard,
        null,
        2
      )}`
    : `Interpreteer de dashboardresultaten voor een onderzoeker. Geef betekenis en advies, niet een kopie van de dashboardtabellen.

Bespreek afzonderlijk zowel de constructresultaten als de achtergrondgroepresultaten. Gebruik relevante cijfers om inzichten te onderbouwen, zoals de verandering in totale leerwinst van pre naar post en enkele constructgemiddelden. Kies de meest bruikbare observaties; som niet alle waarden of groepen op.

Bekijk alle achtergrondvragen. Vergelijk antwoordgroepen uitsluitend binnen dezelfde vraag. Neem vraag- en categorielabels exact over. Kleine groepen maken patronen onzeker; trek geen conclusie uit een groep met slechts één deelnemer. Verschillen zijn beschrijvend en bewijzen geen oorzaak.

Constructgemiddelden zijn op een Likert-schaal van 1 tot 7; hoger betekent niet automatisch beter. null / "Niet gemeten" betekent geen gegevens, geen score. Groeps-pre/post/gain zijn gemiddelde aantallen correcte kennisvragen; gain = post minus pre. Er zijn geen statistische toetsen uitgevoerd.

Schrijf een inhoudelijk maar bondig antwoord van ongeveer 150-250 woorden met kopjes "Constructen", "Achtergrondgroepen", "Beperkingen" en "Mogelijke vervolgstap". Noem enkele cijfers die een inzicht ondersteunen, maar herhaal niet het dashboard. Verzin geen waarden of verklaringen.

Samenvatting:
${JSON.stringify(
  {
    study: body.dashboard.study,
    constructs: (() => {
      const measured = body.dashboard.constructs.filter(
        (construct) => construct.average !== null
      );
      const highestAverage = Math.max(
        ...measured.map((construct) => construct.average ?? 0)
      );
      const lowestAverage = Math.min(
        ...measured.map((construct) => construct.average ?? 0)
      );

      return {
        likertScale: "1-7",
        averageMeaning:
          "Gemiddelde Likert-respons van deelnemers, geen maat voor meetdekking.",
        highest: measured.length
          ? {
              average: highestAverage,
              constructs: measured
                .filter((construct) => construct.average === highestAverage)
                .map((construct) => construct.construct),
            }
          : null,
        lowest:
          measured.length && lowestAverage !== highestAverage
            ? {
                average: lowestAverage,
                constructs: measured
                  .filter((construct) => construct.average === lowestAverage)
                  .map((construct) => construct.construct),
              }
            : null,
      };
    })(),
    overallLearningGain: body.dashboard.learningGain
      ? {
          averagePreTestScore: body.dashboard.learningGain.pre,
          averagePostTestScore: body.dashboard.learningGain.post,
          averageChange: body.dashboard.learningGain.gain,
          maximumCorrectAnswers: body.dashboard.learningGain.total,
          participants: body.dashboard.learningGain.participants,
          statisticalTestPerformed: false,
        }
      : null,
    backgroundGroups: body.dashboard.backgroundGroups.map(
      ({ questionText, scoredQuestionCount, answers }) => {
        return {
          question: questionText,
          scoredQuestionCount,
          observedGroupCount: answers.length,
          groups: answers.map(
            ({ answer, participants, pre, post, gain }) => ({
              answer,
              participants,
              pre,
              post,
              gain,
            })
          ),
        };
      }
    ),
  },
  null,
  2
)}`;
  const conversationMessages = body.messages.length
    ? body.messages
    : [
        {
          role: "user" as const,
          content:
            "Geef een inhoudelijke eerste interpretatie van de gegevens. Verplicht: (1) bespreek de hoogste en laagste gemeten constructen met de exacte scores die bij die namen horen; (2) als overallLearningGain beschikbaar is, benoem expliciet hoe het gemiddelde veranderde van pre naar post en wat gain betekent; (3) bespreek achtergrondgroepen alleen als hun groepsgrootte een vergelijking toelaat, anders noem de concrete beperking. Geef praktische duiding, geen volledige opsomming van het dashboard. Schrijf ongeveer 150-250 woorden.",
        },
      ];

  let ollamaResponse: Response;
  try {
    ollamaResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
        stream: false,
        options: { temperature: 0.1, num_predict: 1200 },
        messages: [
          {
            role: "system",
            content:
              "Je bent een zorgvuldige adviseur voor evaluaties van serious games. Antwoord altijd in helder Nederlands, gebruik uitsluitend de meegeleverde geaggregeerde gegevens en verzin geen waarden, categorieën of conclusies. Scores zijn gemiddelden van correct beantwoorde kennisvragen; leerwinst is post minus pre. Constructgemiddelden zijn Likert-responsen op schaal 1-7; null betekent niet gemeten, niet nul. Er zijn geen statistische toetsen uitgevoerd en verschillen zijn niet causaal bewezen. Bij kleine groepen moet je de onzekerheid benoemen, maar kleine groepsgrootte betekent NIET dat gegevens ontbreken: bespreek de bestaande antwoordcategorieën en hun gemeten resultaten beschrijvend als de gebruiker ernaar vraagt. Als achtergrondGroups antwoordgroepen bevat, zijn die gemeten; zeg dan nooit dat die vraag niet gemeten is of dat er geen gegevens zijn. Antwoord bij vervolgvragen op de specifieke vraag en corrigeer eventuele onjuiste beweringen in eerdere AI-antwoorden aan de hand van de meegeleverde gegevens.",
          },
          ...(!body.messages.length
            ? [
                {
                  role: "system" as const,
                  content:
                    "Bij de eerste analyse bespreek je de gemeten constructen en geef je een beknopte interpretatie van achtergrondgroepen zonder de dashboardtabellen volledig te herhalen. Bij vervolgvragen geef je voorrang aan de precieze vraag van de gebruiker. Als die om een samenvatting van achtergrondgroepen vraagt, vat dan ELKE achtergrondvraag en ELKE aanwezige antwoordcategorie samen met de bijbehorende n en gemiddelde pre-, post- en leerwinstscores uit de gegevens. Dit is een beschrijvende samenvatting, geen claim dat de kleine groepen betrouwbaar vergelijkbaar zijn. Maak expliciet onderscheid tussen 'gegevens zijn aanwezig maar de groepen zijn te klein voor een betrouwbare vergelijking' en 'geen gegevens beschikbaar'. Noem nooit dat achtergrondvragen niet gemeten zijn wanneer er antwoordgroepen in de gegevens staan. Negeer voor die specifieke vervolgvraag eerdere AI-uitspraken die daarmee in tegenspraak zijn. Gebruik antwoordlabels exact.",
                },
              ]
            : []),
          {
            role: "user",
            content: dashboardContext,
          },
          ...conversationMessages,
        ],
      }),
    });
  } catch (error) {
    console.error("Dashboard advice could not reach local Ollama:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Ollama took too long to respond. Try again or use a smaller model." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Could not connect to local Ollama. Start Ollama and try again." },
      { status: 503 }
    );
  }

  if (!ollamaResponse.ok) {
    console.error("Local Ollama returned an error:", ollamaResponse.status);
    return NextResponse.json(
      { error: `Ollama returned HTTP ${ollamaResponse.status}. Check that the model is available.` },
      { status: 502 }
    );
  }

  let result: unknown;
  try {
    result = await ollamaResponse.json();
  } catch (error) {
    console.error("Could not parse local Ollama response:", error);
    return NextResponse.json(
      { error: "Ollama returned an unreadable response. Please try again." },
      { status: 502 }
    );
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("message" in result) ||
    typeof result.message !== "object" ||
    result.message === null ||
    !("content" in result.message) ||
    typeof result.message.content !== "string" ||
    !result.message.content.trim()
  ) {
    return NextResponse.json(
      { error: "Ollama returned no advice. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ advice: result.message.content.trim() });
}
