import { NextRequest, NextResponse } from "next/server";
import { anthropicClient, FALLBACK_BETA, SENTINELLE_FALLBACK_MODEL, SENTINELLE_MODEL } from "@/lib/anthropic/client";
import { AUTOPSY_RULES } from "@/lib/anthropic/rules";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getActiveAlarms, getLessons } from "@/lib/memory";
import type { Circuit, Match, Surface } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const AUTOPSY_TOOL: Anthropic.Tool = {
  name: "publier_autopsie",
  description: "Publie l'autopsie du match après saisie du résultat.",
  input_schema: {
    type: "object",
    properties: {
      these_juste: { type: "boolean" },
      facteur_dominant_juste: { type: "boolean" },
      explication: { type: "string" },
      alarme_manquante_id: { type: ["string", "null"] },
      alarme_texte: {
        type: ["object", "null"],
        properties: {
          declencheur: { type: "string" },
          erreur: { type: "string" },
          parade: { type: "string" },
        },
        required: ["declencheur", "erreur", "parade"],
      },
      lecon_action: { type: "string", enum: ["creation", "confirmation", "fusion", "aucune"] },
      lecon_id_concernee: { type: ["string", "null"] },
      lecon_texte: {
        type: ["object", "null"],
        properties: {
          regle: { type: "string" },
          conditions_application: { type: "string" },
          conditions_non_application: { type: "string" },
        },
        required: ["regle", "conditions_application", "conditions_non_application"],
      },
      ligne_apprise_joueur: { type: "string" },
    },
    required: [
      "these_juste",
      "facteur_dominant_juste",
      "explication",
      "alarme_manquante_id",
      "alarme_texte",
      "lecon_action",
      "lecon_id_concernee",
      "lecon_texte",
      "ligne_apprise_joueur",
    ],
  },
};

type AutopsyInput = {
  these_juste: boolean;
  facteur_dominant_juste: boolean;
  explication: string;
  alarme_manquante_id: string | null;
  alarme_texte: { declencheur: string; erreur: string; parade: string } | null;
  lecon_action: "creation" | "confirmation" | "fusion" | "aucune";
  lecon_id_concernee: string | null;
  lecon_texte: { regle: string; conditions_application: string; conditions_non_application: string } | null;
  ligne_apprise_joueur: string;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const gagnant = String(body.gagnant ?? "").trim();
  const score_exact = String(body.score_exact ?? "").trim();
  const contexte_resultat = String(body.contexte_resultat ?? "").trim();

  if (!gagnant || !score_exact) {
    return NextResponse.json({ error: "Gagnant et score exact requis." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: match, error: matchError } = await db.from("matches").select("*").eq("id", id).single();
  if (matchError || !match) {
    return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
  }
  if (match.gagnant) {
    return NextResponse.json({ error: "Résultat déjà saisi pour ce match." }, { status: 400 });
  }
  if (gagnant !== match.joueur_a && gagnant !== match.joueur_b) {
    return NextResponse.json({ error: "Le gagnant doit être l'un des deux joueurs du match." }, { status: 400 });
  }

  const circuit = match.circuit as Circuit;
  const surface = match.surface as Surface;

  const [activeAlarms, lessons] = await Promise.all([getActiveAlarms(circuit), getLessons(circuit, surface)]);

  const alarmesSonneesText =
    !match.alarmes_sonnees || (match.alarmes_sonnees as unknown[]).length === 0
      ? "Aucune alarme n'avait sonné sur ce match."
      : (match.alarmes_sonnees as { alarm_id: string; declencheur: string; appliquee: boolean; justification: string | null }[])
          .map(
            (a) =>
              `- alarm_id: ${a.alarm_id} | déclencheur: ${a.declencheur} | parade appliquée: ${a.appliquee ? "oui" : "non"}${a.justification ? ` | justification: ${a.justification}` : ""}`
          )
          .join("\n");

  const alarmsListText =
    activeAlarms.length === 0
      ? "Aucune alarme active pour ce circuit."
      : activeAlarms.map((a) => `- id: ${a.id} | déclencheur: ${a.declencheur}`).join("\n");

  const lessonsListText =
    lessons.length === 0
      ? "Aucune leçon enregistrée pour ce circuit et cette surface."
      : lessons
          .map(
            (l) =>
              `- id: ${l.id} | règle: ${l.regle} | s'applique si: ${l.conditions_application} | ne s'applique pas si: ${l.conditions_non_application}`
          )
          .join("\n");

  const userText = `=== MATCH D'ORIGINE ===
Circuit: ${circuit} — Surface: ${surface}
Joueur A: ${match.joueur_a} — Joueur B: ${match.joueur_b}
Verdict d'origine: ${match.verdict ?? "aucun"}
Joueur pronostiqué: ${match.joueur_pronostic ?? "aucun"}
Thèse: ${match.these ?? "aucune"}
Condition de falsification: ${match.these_condition_invalidation ?? "aucune"}
Facteur dominant: ${match.facteur_dominant ?? "aucun"}

=== RÉSULTAT RÉEL ===
Gagnant: ${gagnant}
Score exact: ${score_exact}
${contexte_resultat ? `\nObservations/stats du match réellement joué, fournies par l'utilisateur (utilise-les pour une autopsie plus précise et mieux étayée) :\n${contexte_resultat}\n` : ""}
=== ALARMES QUI AVAIENT SONNÉ SUR CE MATCH ===
${alarmesSonneesText}

=== ALARMES ACTIVES DU CIRCUIT (pour couverture manquée) ===
${alarmsListText}

=== LEÇONS CONNUES (circuit + surface) ===
${lessonsListText}`;

  const client = anthropicClient();

  let response;
  try {
    response = await client.beta.messages.create({
      model: SENTINELLE_MODEL,
      max_tokens: 8000,
      betas: [FALLBACK_BETA],
      fallbacks: [{ model: SENTINELLE_FALLBACK_MODEL }],
      output_config: { effort: "high" },
      system: [{ type: "text", text: AUTOPSY_RULES }],
      messages: [{ role: "user", content: userText }],
      tools: [AUTOPSY_TOOL],
      tool_choice: { type: "tool", name: "publier_autopsie" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue lors de l'appel à Claude.";
    return NextResponse.json({ error: `Anthropic : ${message}` }, { status: 502 });
  }

  if (response.stop_reason === "refusal") {
    return NextResponse.json(
      { error: "Claude a refusé de traiter cette demande (classificateur de sécurité)." },
      { status: 502 }
    );
  }

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "L'IA n'a pas produit d'autopsie exploitable." }, { status: 502 });
  }
  const autopsy = toolUse.input as AutopsyInput;

  const alarmesSonnees = (match.alarmes_sonnees ?? []) as {
    alarm_id: string;
    declencheur: string;
    parade: string;
    appliquee: boolean;
    justification: string | null;
  }[];

  let actionAlarme: "creation" | "renforcement" | "reparation" | "aucune" = "aucune";
  let alarmeIdConcernee: string | null = null;
  let recidive = false;

  // 1. Traiter les alarmes qui avaient sonné sur ce match (renforcement / réparation / faux positif)
  for (const a of alarmesSonnees) {
    const { data: alarm } = await db.from("alarms").select("*").eq("id", a.alarm_id).single();
    if (!alarm) continue;

    if (autopsy.these_juste) {
      if (a.appliquee) {
        await db.from("alarms").update({ renforcements: alarm.renforcements + 1, updated_at: new Date().toISOString() }).eq("id", alarm.id);
        await db.from("alarm_events").update({ resultat: "correcte" }).match({ alarm_id: a.alarm_id, match_id: match.id });
        if (actionAlarme === "aucune") {
          actionAlarme = "renforcement";
          alarmeIdConcernee = alarm.id;
        }
      } else {
        const newFauxPositifs = alarm.faux_positifs + 1;
        await db
          .from("alarms")
          .update({
            faux_positifs: newFauxPositifs,
            statut: newFauxPositifs >= 2 ? "veille" : alarm.statut,
            updated_at: new Date().toISOString(),
          })
          .eq("id", alarm.id);
        await db.from("alarm_events").update({ resultat: "faux_positif" }).match({ alarm_id: a.alarm_id, match_id: match.id });
      }
    } else {
      await db.from("alarm_events").update({ resultat: "correcte" }).match({ alarm_id: a.alarm_id, match_id: match.id });
      recidive = true;
      if (autopsy.alarme_texte) {
        await db
          .from("alarms")
          .update({
            declencheur: autopsy.alarme_texte.declencheur,
            erreur: autopsy.alarme_texte.erreur,
            parade: autopsy.alarme_texte.parade,
            updated_at: new Date().toISOString(),
          })
          .eq("id", alarm.id);
      }
      actionAlarme = "reparation";
      alarmeIdConcernee = alarm.id;
    }
  }

  // 2. Thèse fausse mais aucune alarme n'avait sonné : couverture manquée ou erreur inédite
  if (!autopsy.these_juste && alarmesSonnees.length === 0) {
    if (autopsy.alarme_manquante_id && autopsy.alarme_texte) {
      const { data: alarm } = await db.from("alarms").select("*").eq("id", autopsy.alarme_manquante_id).single();
      if (alarm) {
        await db
          .from("alarms")
          .update({
            declencheur: autopsy.alarme_texte.declencheur,
            erreur: autopsy.alarme_texte.erreur,
            parade: autopsy.alarme_texte.parade,
            updated_at: new Date().toISOString(),
          })
          .eq("id", alarm.id);
        await db.from("alarm_events").insert({
          alarm_id: alarm.id,
          match_id: match.id,
          parade_appliquee: false,
          justification: "Couverture manquée détectée en autopsie : l'alarme aurait dû sonner.",
          resultat: "correcte",
        });
        recidive = true;
        actionAlarme = "reparation";
        alarmeIdConcernee = alarm.id;
      }
    } else if (autopsy.alarme_texte) {
      const { data: newAlarm } = await db
        .from("alarms")
        .insert({
          circuit,
          declencheur: autopsy.alarme_texte.declencheur,
          erreur: autopsy.alarme_texte.erreur,
          parade: autopsy.alarme_texte.parade,
          statut: "active",
          match_origine_id: match.id,
        })
        .select()
        .single();
      if (newAlarm) {
        actionAlarme = "creation";
        alarmeIdConcernee = newAlarm.id;
      }
    }
  }

  // 3. Leçons
  let actionLecon: "creation" | "confirmation" | "aucune" = "aucune";
  let leconIdConcernee: string | null = null;

  if (autopsy.lecon_action === "creation" && autopsy.lecon_texte) {
    const { data: newLesson } = await db
      .from("lessons")
      .insert({
        circuit,
        surface,
        regle: autopsy.lecon_texte.regle,
        conditions_application: autopsy.lecon_texte.conditions_application,
        conditions_non_application: autopsy.lecon_texte.conditions_non_application,
        matchs_preuves: [match.id],
        confirmations: 1,
      })
      .select()
      .single();
    if (newLesson) {
      actionLecon = "creation";
      leconIdConcernee = newLesson.id;
    }
  } else if ((autopsy.lecon_action === "confirmation" || autopsy.lecon_action === "fusion") && autopsy.lecon_id_concernee) {
    const { data: lesson } = await db.from("lessons").select("*").eq("id", autopsy.lecon_id_concernee).single();
    if (lesson) {
      const proofs = Array.isArray(lesson.matchs_preuves) ? (lesson.matchs_preuves as string[]) : [];
      const isFusion = autopsy.lecon_action === "fusion" && autopsy.lecon_texte;
      await db
        .from("lessons")
        .update({
          confirmations: lesson.confirmations + 1,
          matchs_preuves: [...proofs, match.id],
          updated_at: new Date().toISOString(),
          ...(isFusion
            ? {
                regle: autopsy.lecon_texte!.regle,
                conditions_application: autopsy.lecon_texte!.conditions_application,
                conditions_non_application: autopsy.lecon_texte!.conditions_non_application,
              }
            : {}),
        })
        .eq("id", lesson.id);
      actionLecon = "confirmation";
      leconIdConcernee = lesson.id;
    }
  }

  // 4. Fiche joueur
  if (match.joueur_pronostic && autopsy.ligne_apprise_joueur) {
    const { data: existingPlayer } = await db
      .from("players")
      .select("*")
      .eq("circuit", circuit)
      .eq("nom", match.joueur_pronostic)
      .maybeSingle();

    const lignes = existingPlayer?.lecons_apprises ?? [];
    const newLignes = [
      ...(Array.isArray(lignes) ? lignes : []),
      { texte: autopsy.ligne_apprise_joueur, match_id: match.id, date: new Date().toISOString() },
    ];

    await db.from("players").upsert(
      {
        nom: match.joueur_pronostic,
        circuit,
        lecons_apprises: newLignes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "nom,circuit" }
    );
  }

  // 5. Chance = victoire avec thèse fausse
  const chance = gagnant === match.joueur_pronostic && !autopsy.these_juste;

  const { data: autopsyRow, error: autopsyError } = await db
    .from("autopsies")
    .insert({
      match_id: match.id,
      these_juste: autopsy.these_juste,
      facteur_dominant_juste: autopsy.facteur_dominant_juste,
      explication: autopsy.explication,
      chance,
      action_alarme: actionAlarme,
      alarme_id: alarmeIdConcernee,
      action_lecon: actionLecon,
      lecon_id: leconIdConcernee,
      recidive,
    })
    .select()
    .single();

  if (autopsyError || !autopsyRow) {
    return NextResponse.json({ error: autopsyError?.message ?? "Échec d'enregistrement de l'autopsie." }, { status: 500 });
  }

  const { data: updatedMatch, error: updateError } = await db
    .from("matches")
    .update({ gagnant, score_exact, resultat_saisi_at: new Date().toISOString() })
    .eq("id", match.id)
    .select()
    .single();

  if (updateError || !updatedMatch) {
    return NextResponse.json({ error: updateError?.message ?? "Échec de mise à jour du match." }, { status: 500 });
  }

  return NextResponse.json({ match: updatedMatch as Match, autopsy: autopsyRow });
}
