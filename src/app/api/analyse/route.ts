import { NextRequest, NextResponse } from "next/server";
import { anthropicClient, SENTINELLE_MODEL } from "@/lib/anthropic/client";
import { SENTINELLE_RULES } from "@/lib/anthropic/rules";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  buildCircuitMemoryBlock,
  buildPlayersBlock,
  getActiveAlarms,
  getLessons,
  getPlayers,
} from "@/lib/memory";
import { CIRCUITS, SURFACES, type AlarmeSonnee, type Circuit, type Surface } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

const FICHE_TOOL: Anthropic.Tool = {
  name: "publier_fiche",
  description: "Publie la fiche d'analyse complète du match selon les règles SENTINELLE.",
  input_schema: {
    type: "object",
    properties: {
      verdict: { type: "string", enum: ["pari", "hors_perimetre", "abstention"] },
      joueur_pronostic: { type: ["string", "null"] },
      proba: { type: ["number", "null"], description: "Probabilité en pourcentage, 0-100" },
      note: { type: ["integer", "null"], description: "Note sur 10" },
      facteur_dominant: { type: ["string", "null"] },
      these: { type: ["string", "null"] },
      these_condition_invalidation: { type: ["string", "null"] },
      facteurs_secondaires: {
        type: "array",
        items: {
          type: "object",
          properties: {
            facteur: { type: "string" },
            points: { type: "number" },
          },
          required: ["facteur", "points"],
        },
      },
      test_coherence: { type: "string" },
      coherent: { type: "boolean" },
      pre_mortem: { type: "string" },
      score_probable: { type: ["string", "null"] },
      scenario: { type: ["string", "null"] },
      motif_abstention: { type: ["string", "null"] },
      alarmes_evaluees: {
        type: "array",
        items: {
          type: "object",
          properties: {
            alarm_id: { type: "string" },
            sonne: { type: "boolean" },
            parade_appliquee: { type: "boolean" },
            justification: { type: ["string", "null"] },
          },
          required: ["alarm_id", "sonne", "parade_appliquee", "justification"],
        },
      },
    },
    required: [
      "verdict",
      "joueur_pronostic",
      "proba",
      "note",
      "facteur_dominant",
      "these",
      "these_condition_invalidation",
      "facteurs_secondaires",
      "test_coherence",
      "coherent",
      "pre_mortem",
      "score_probable",
      "scenario",
      "motif_abstention",
      "alarmes_evaluees",
    ],
  },
};

type FicheInput = {
  verdict: "pari" | "hors_perimetre" | "abstention";
  joueur_pronostic: string | null;
  proba: number | null;
  note: number | null;
  facteur_dominant: string | null;
  these: string | null;
  these_condition_invalidation: string | null;
  facteurs_secondaires: { facteur: string; points: number }[];
  test_coherence: string;
  coherent: boolean;
  pre_mortem: string;
  score_probable: string | null;
  scenario: string | null;
  motif_abstention: string | null;
  alarmes_evaluees: {
    alarm_id: string;
    sonne: boolean;
    parade_appliquee: boolean;
    justification: string | null;
  }[];
};

export async function POST(req: NextRequest) {
  const body = await req.json();

  const circuit = body.circuit as Circuit;
  const surface = body.surface as Surface;
  const joueur_a = String(body.joueur_a ?? "").trim();
  const joueur_b = String(body.joueur_b ?? "").trim();
  const tournoi = String(body.tournoi ?? "").trim();
  const cote_a = Number(body.cote_a);
  const cote_b = Number(body.cote_b);
  const stats_brutes = String(body.stats_brutes ?? "").trim();
  const is_retro = Boolean(body.is_retro);

  if (!CIRCUITS.includes(circuit) || !SURFACES.includes(surface)) {
    return NextResponse.json({ error: "Circuit ou surface invalide." }, { status: 400 });
  }
  if (!joueur_a || !joueur_b || !tournoi || !stats_brutes) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }
  if (!Number.isFinite(cote_a) || cote_a < 1 || !Number.isFinite(cote_b) || cote_b < 1) {
    return NextResponse.json({ error: "Cotes invalides." }, { status: 400 });
  }

  const [alarms, lessons, players] = await Promise.all([
    getActiveAlarms(circuit),
    getLessons(circuit, surface),
    getPlayers(circuit, [joueur_a, joueur_b]),
  ]);

  const memoryBlock = buildCircuitMemoryBlock(circuit, surface, alarms, lessons);
  const playersBlock = buildPlayersBlock(joueur_a, joueur_b, players);

  const matchInfo = `${playersBlock}

=== MATCH À ANALYSER ===
Circuit: ${circuit}
Tournoi: ${tournoi}
Surface: ${surface}
Joueur A: ${joueur_a} (cote: ${cote_a})
Joueur B: ${joueur_b} (cote: ${cote_b})

Stats brutes fournies par l'utilisateur :
${stats_brutes}`;

  const client = anthropicClient();

  let response;
  try {
    response = await client.messages.create({
      model: SENTINELLE_MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: `${SENTINELLE_RULES}\n\n${memoryBlock}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: matchInfo }],
      tools: [FICHE_TOOL],
      tool_choice: { type: "tool", name: "publier_fiche" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue lors de l'appel à Claude.";
    return NextResponse.json({ error: `Anthropic : ${message}` }, { status: 502 });
  }

  console.log(
    `[analyse] cache_read=${response.usage.cache_read_input_tokens ?? 0} cache_write=${response.usage.cache_creation_input_tokens ?? 0} input=${response.usage.input_tokens} output=${response.usage.output_tokens}`
  );

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "L'IA n'a pas produit de fiche exploitable." }, { status: 502 });
  }

  const fiche = toolUse.input as FicheInput;

  let value: number | null = null;
  if (fiche.verdict === "pari" && fiche.joueur_pronostic && fiche.proba !== null) {
    const cote = fiche.joueur_pronostic === joueur_a ? cote_a : fiche.joueur_pronostic === joueur_b ? cote_b : null;
    if (cote) {
      value = Math.round((fiche.proba - 100 / cote) * 100) / 100;
    }
  }

  const alarmesSonnees: AlarmeSonnee[] = fiche.alarmes_evaluees
    .filter((e) => e.sonne)
    .map((e) => {
      const alarm = alarms.find((a) => a.id === e.alarm_id);
      return {
        alarm_id: e.alarm_id,
        declencheur: alarm?.declencheur ?? "",
        parade: alarm?.parade ?? "",
        appliquee: e.parade_appliquee,
        justification: e.justification,
      };
    });

  const db = supabaseAdmin();

  const { data: match, error: insertError } = await db
    .from("matches")
    .insert({
      circuit,
      tournoi,
      surface,
      joueur_a,
      joueur_b,
      cote_a,
      cote_b,
      stats_brutes,
      is_retro,
      verdict: fiche.verdict,
      joueur_pronostic: fiche.joueur_pronostic,
      proba: fiche.proba,
      note: fiche.note,
      facteur_dominant: fiche.facteur_dominant,
      these: fiche.these,
      these_condition_invalidation: fiche.these_condition_invalidation,
      facteurs_secondaires: fiche.facteurs_secondaires,
      test_coherence: fiche.test_coherence,
      coherent: fiche.coherent,
      pre_mortem: fiche.pre_mortem,
      score_probable: fiche.score_probable,
      scenario: fiche.scenario,
      value,
      motif_abstention: fiche.motif_abstention,
      alarmes_sonnees: alarmesSonnees,
      analysis_raw: fiche,
    })
    .select()
    .single();

  if (insertError || !match) {
    return NextResponse.json({ error: insertError?.message ?? "Échec d'enregistrement." }, { status: 500 });
  }

  if (alarmesSonnees.length > 0) {
    await db.from("alarm_events").insert(
      alarmesSonnees.map((a) => ({
        alarm_id: a.alarm_id,
        match_id: match.id,
        parade_appliquee: a.appliquee,
        justification: a.justification,
        resultat: "indetermine",
      }))
    );
  }

  return NextResponse.json({ match });
}
