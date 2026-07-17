export const CIRCUITS = ["ATP", "WTA", "CHALLENGER"] as const;
export type Circuit = (typeof CIRCUITS)[number];

export const SURFACES = ["DUR", "TERRE", "GAZON", "INDOOR"] as const;
export type Surface = (typeof SURFACES)[number];

export const SURFACE_LABELS: Record<Surface, string> = {
  DUR: "Dur",
  TERRE: "Terre battue",
  GAZON: "Gazon",
  INDOOR: "Indoor",
};

export const VERDICTS = ["pari", "abstention"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const ALARM_STATUSES = ["active", "veille"] as const;
export type AlarmStatus = (typeof ALARM_STATUSES)[number];

export type FacteurSecondaire = {
  facteur: string;
  points: number;
};

export type AlarmeSonnee = {
  alarm_id: string;
  declencheur: string;
  parade: string;
  appliquee: boolean;
  justification: string | null;
};

export type Match = {
  id: string;
  circuit: Circuit;
  tournoi: string;
  surface: Surface;
  joueur_a: string;
  joueur_b: string;
  cote_a: number;
  cote_b: number;
  stats_brutes: string;
  is_retro: boolean;
  created_at: string;

  verdict: Verdict | null;
  joueur_pronostic: string | null;
  proba: number | null;
  note: number | null;
  facteur_dominant: string | null;
  these: string | null;
  these_condition_invalidation: string | null;
  facteurs_secondaires: FacteurSecondaire[] | null;
  test_coherence: string | null;
  coherent: boolean | null;
  pre_mortem: string | null;
  score_probable: string | null;
  scenario: string | null;
  value: number | null;
  motif_abstention: string | null;
  alarmes_sonnees: AlarmeSonnee[] | null;

  gagnant: string | null;
  score_exact: string | null;
  resultat_saisi_at: string | null;
};

export type Alarm = {
  id: string;
  circuit: Circuit;
  declencheur: string;
  erreur: string;
  parade: string;
  statut: AlarmStatus;
  renforcements: number;
  faux_positifs: number;
  match_origine_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Lesson = {
  id: string;
  circuit: Circuit;
  surface: Surface;
  regle: string;
  conditions_application: string;
  conditions_non_application: string;
  matchs_preuves: string[];
  contre_exemples: string[];
  confirmations: number;
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  nom: string;
  circuit: Circuit;
  style_notes: string | null;
  lecons_apprises: { texte: string; match_id: string; date: string }[];
  created_at: string;
  updated_at: string;
};

export type Autopsy = {
  id: string;
  match_id: string;
  these_juste: boolean;
  facteur_dominant_juste: boolean;
  explication: string;
  chance: boolean;
  action_alarme: "creation" | "renforcement" | "reparation" | "aucune";
  alarme_id: string | null;
  action_lecon: "creation" | "confirmation" | "aucune";
  lecon_id: string | null;
  recidive: boolean;
  created_at: string;
};
