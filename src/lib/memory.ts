import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Alarm, Circuit, Lesson, Player, Surface } from "@/lib/types";

export async function getActiveAlarms(circuit: Circuit): Promise<Alarm[]> {
  const { data, error } = await supabaseAdmin()
    .from("alarms")
    .select("*")
    .eq("circuit", circuit)
    .eq("statut", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Alarm[];
}

export async function getLessons(circuit: Circuit, surface: Surface): Promise<Lesson[]> {
  const { data, error } = await supabaseAdmin()
    .from("lessons")
    .select("*")
    .eq("circuit", circuit)
    .eq("surface", surface)
    .order("confirmations", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Lesson[];
}

export async function getPlayers(circuit: Circuit, names: string[]): Promise<Player[]> {
  if (names.length === 0) return [];
  const { data, error } = await supabaseAdmin()
    .from("players")
    .select("*")
    .eq("circuit", circuit)
    .in("nom", names);

  if (error) throw error;
  return (data ?? []) as Player[];
}

export function buildCircuitMemoryBlock(circuit: Circuit, surface: Surface, alarms: Alarm[], lessons: Lesson[]): string {
  const alarmsText =
    alarms.length === 0
      ? "Aucune alarme active pour ce circuit."
      : alarms
          .map(
            (a) =>
              `- id: ${a.id}\n  déclencheur: ${a.declencheur}\n  erreur passée: ${a.erreur}\n  parade: ${a.parade}\n  renforcements: ${a.renforcements}`
          )
          .join("\n");

  const lessonsText =
    lessons.length === 0
      ? "Aucune leçon enregistrée pour ce circuit et cette surface."
      : lessons
          .map(
            (l) =>
              `- règle: ${l.regle}\n  s'applique si: ${l.conditions_application}\n  ne s'applique pas si: ${l.conditions_non_application}\n  confirmations: ${l.confirmations}`
          )
          .join("\n");

  return `=== MÉMOIRE — Circuit ${circuit}, surface ${surface} ===

ALARMES ACTIVES (à scanner avant analyse) :
${alarmsText}

LEÇONS CONNUES :
${lessonsText}`;
}

export function buildPlayersBlock(joueurA: string, joueurB: string, players: Player[]): string {
  function playerText(name: string): string {
    const p = players.find((pl) => pl.nom === name);
    if (!p) return `${name} : aucune fiche existante.`;
    const lecons = p.lecons_apprises.length
      ? p.lecons_apprises.map((l) => `  - ${l.texte}`).join("\n")
      : "  (aucune ligne apprise)";
    return `${name} :\n  style: ${p.style_notes ?? "non renseigné"}\n  lignes apprises:\n${lecons}`;
  }

  return `=== FICHES JOUEURS ===\n${playerText(joueurA)}\n\n${playerText(joueurB)}`;
}
