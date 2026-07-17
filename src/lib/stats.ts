import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Alarm, Autopsy, Match } from "@/lib/types";

export type CalibrationRow = { note: number; count: number; winrate: number | null };
export type CoteBucket = { label: string; count: number; winrate: number | null };

export type SuiviStats = {
  recidives: number;
  nbAutopsies: number;
  tauxThesesJustes: number | null;
  nbParis: number;
  winrate: number | null;
  roi: number | null;
  coteMoyenne: number | null;
  alarmesActives: Alarm[];
  alarmesVeille: Alarm[];
  calibration: CalibrationRow[];
  repartitionCote: CoteBucket[];
};

const COTE_BUCKETS = [
  { label: "1.70 – 1.90", min: 1.7, max: 1.9 },
  { label: "1.90 – 2.20", min: 1.9, max: 2.2 },
  { label: "2.20+", min: 2.2, max: Infinity },
];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export async function computeSuiviStats(): Promise<SuiviStats> {
  const db = supabaseAdmin();

  const [{ data: matches, error: mErr }, { data: autopsies, error: aErr }, { data: alarms, error: alErr }] = await Promise.all([
    db.from("matches").select("*").eq("is_retro", false),
    db.from("autopsies").select("*"),
    db.from("alarms").select("*").order("created_at", { ascending: true }),
  ]);
  if (mErr) throw mErr;
  if (aErr) throw aErr;
  if (alErr) throw alErr;

  const matchList = (matches ?? []) as Match[];
  const matchIds = new Set(matchList.map((m) => m.id));
  const relevantAutopsies = ((autopsies ?? []) as Autopsy[]).filter((a) => matchIds.has(a.match_id));

  const recidives = relevantAutopsies.filter((a) => a.recidive).length;
  const nbAutopsies = relevantAutopsies.length;
  const tauxThesesJustes =
    nbAutopsies > 0 ? round1((relevantAutopsies.filter((a) => a.these_juste).length / nbAutopsies) * 100) : null;

  const pariAvecResultat = matchList.filter((m) => m.verdict === "pari" && m.gagnant !== null);
  const nbParis = pariAvecResultat.length;

  const coteDuPronostic = (m: Match) => (m.joueur_pronostic === m.joueur_a ? m.cote_a : m.cote_b);

  let profit = 0;
  let wins = 0;
  let coteSum = 0;
  for (const m of pariAvecResultat) {
    const cote = coteDuPronostic(m);
    coteSum += cote;
    if (m.gagnant === m.joueur_pronostic) {
      wins++;
      profit += cote - 1;
    } else {
      profit -= 1;
    }
  }
  const winrate = nbParis > 0 ? round1((wins / nbParis) * 100) : null;
  const roi = nbParis > 0 ? round1((profit / nbParis) * 100) : null;
  const coteMoyenne = nbParis > 0 ? Math.round((coteSum / nbParis) * 100) / 100 : null;

  const alarmList = (alarms ?? []) as Alarm[];
  const alarmesActives = alarmList.filter((a) => a.statut === "active");
  const alarmesVeille = alarmList.filter((a) => a.statut === "veille");

  const calibration: CalibrationRow[] = [];
  for (let note = 1; note <= 10; note++) {
    const subset = pariAvecResultat.filter((m) => m.note === note);
    calibration.push({
      note,
      count: subset.length,
      winrate: subset.length > 0 ? round1((subset.filter((m) => m.gagnant === m.joueur_pronostic).length / subset.length) * 100) : null,
    });
  }

  const repartitionCote: CoteBucket[] = COTE_BUCKETS.map((b) => {
    const subset = pariAvecResultat.filter((m) => {
      const cote = coteDuPronostic(m);
      return cote >= b.min && cote < b.max;
    });
    return {
      label: b.label,
      count: subset.length,
      winrate: subset.length > 0 ? round1((subset.filter((m) => m.gagnant === m.joueur_pronostic).length / subset.length) * 100) : null,
    };
  });

  return {
    recidives,
    nbAutopsies,
    tauxThesesJustes,
    nbParis,
    winrate,
    roi,
    coteMoyenne,
    alarmesActives,
    alarmesVeille,
    calibration,
    repartitionCote,
  };
}
