-- SENTINELLE — schéma initial
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Sans danger de le relancer plusieurs fois (IF NOT EXISTS partout).

create extension if not exists "pgcrypto";

-- ============================================================
-- MATCHES : une ligne par match analysé (la "fiche")
-- ============================================================
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),

  -- saisie utilisateur
  circuit text not null check (circuit in ('ATP', 'WTA', 'CHALLENGER')),
  tournoi text not null,
  surface text not null check (surface in ('DUR', 'TERRE', 'GAZON', 'INDOOR')),
  joueur_a text not null,
  joueur_b text not null,
  cote_a numeric(6,2) not null check (cote_a >= 1),
  cote_b numeric(6,2) not null check (cote_b >= 1),
  stats_brutes text not null,
  is_retro boolean not null default false,
  created_at timestamptz not null default now(),

  -- sortie de l'analyse IA (la thèse unique)
  verdict text check (verdict in ('pari', 'hors_perimetre', 'abstention')),
  joueur_pronostic text,
  proba numeric(5,2),
  note smallint check (note between 1 and 10),
  facteur_dominant text,
  these text,
  these_condition_invalidation text,
  facteurs_secondaires jsonb not null default '[]',
  test_coherence text,
  coherent boolean,
  pre_mortem text,
  score_probable text,
  scenario text,
  value numeric(6,2),
  motif_abstention text,
  alarmes_sonnees jsonb not null default '[]',
  analysis_raw jsonb,

  -- résultat réel (saisi ensuite)
  gagnant text,
  score_exact text,
  resultat_saisi_at timestamptz
);

create index if not exists idx_matches_circuit on matches (circuit);
create index if not exists idx_matches_gagnant on matches (gagnant);
create index if not exists idx_matches_is_retro on matches (is_retro);
create index if not exists idx_matches_created_at on matches (created_at desc);

-- ============================================================
-- ALARMES : le système immunitaire
-- ============================================================
create table if not exists alarms (
  id uuid primary key default gen_random_uuid(),
  circuit text not null check (circuit in ('ATP', 'WTA', 'CHALLENGER')),
  declencheur text not null,
  erreur text not null,
  parade text not null,
  statut text not null default 'active' check (statut in ('active', 'veille')),
  renforcements integer not null default 0,
  faux_positifs integer not null default 0,
  match_origine_id uuid references matches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alarms_circuit_statut on alarms (circuit, statut);

-- Journal de chaque sonnerie d'alarme (pour calculer l'efficacité)
create table if not exists alarm_events (
  id uuid primary key default gen_random_uuid(),
  alarm_id uuid not null references alarms(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  parade_appliquee boolean not null,
  justification text,
  resultat text check (resultat in ('correcte', 'faux_positif', 'indetermine')) default 'indetermine',
  created_at timestamptz not null default now()
);

create index if not exists idx_alarm_events_alarm on alarm_events (alarm_id);
create index if not exists idx_alarm_events_match on alarm_events (match_id);

-- ============================================================
-- LEÇONS FUSIONNÉES
-- ============================================================
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  circuit text not null check (circuit in ('ATP', 'WTA', 'CHALLENGER')),
  surface text not null check (surface in ('DUR', 'TERRE', 'GAZON', 'INDOOR')),
  regle text not null,
  conditions_application text not null,
  conditions_non_application text not null,
  matchs_preuves jsonb not null default '[]',
  contre_exemples jsonb not null default '[]',
  confirmations integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lessons_circuit_surface on lessons (circuit, surface);

-- ============================================================
-- FICHES JOUEURS
-- ============================================================
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  circuit text not null check (circuit in ('ATP', 'WTA', 'CHALLENGER')),
  style_notes text,
  lecons_apprises jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nom, circuit)
);

-- ============================================================
-- AUTOPSIES : une par match résultat (saisie du résultat)
-- ============================================================
create table if not exists autopsies (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches(id) on delete cascade,
  these_juste boolean not null,
  facteur_dominant_juste boolean not null,
  explication text not null,
  chance boolean not null default false,
  action_alarme text not null check (action_alarme in ('creation', 'renforcement', 'reparation', 'aucune')),
  alarme_id uuid references alarms(id) on delete set null,
  action_lecon text not null check (action_lecon in ('creation', 'confirmation', 'aucune')),
  lecon_id uuid references lessons(id) on delete set null,
  recidive boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_autopsies_match on autopsies (match_id);
create index if not exists idx_autopsies_recidive on autopsies (recidive);

-- ============================================================
-- Sécurité : RLS activé, aucune policy.
-- Le serveur Next.js utilise la service_role key qui bypasse RLS.
-- Si jamais une clé publique (anon) était exposée par erreur,
-- elle ne pourrait rien lire ni écrire.
-- ============================================================
alter table matches enable row level security;
alter table alarms enable row level security;
alter table alarm_events enable row level security;
alter table lessons enable row level security;
alter table players enable row level security;
alter table autopsies enable row level security;
