export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      matches: {
        Relationships: [];
        Row: {
          id: string;
          circuit: string;
          tournoi: string;
          surface: string;
          joueur_a: string;
          joueur_b: string;
          cote_a: number;
          cote_b: number;
          stats_brutes: string;
          is_retro: boolean;
          created_at: string;
          verdict: string | null;
          joueur_pronostic: string | null;
          proba: number | null;
          note: number | null;
          facteur_dominant: string | null;
          these: string | null;
          these_condition_invalidation: string | null;
          facteurs_secondaires: Json;
          test_coherence: string | null;
          coherent: boolean | null;
          pre_mortem: string | null;
          score_probable: string | null;
          scenario: string | null;
          value: number | null;
          motif_abstention: string | null;
          alarmes_sonnees: Json;
          analysis_raw: Json | null;
          gagnant: string | null;
          score_exact: string | null;
          resultat_saisi_at: string | null;
        };
        Insert: {
          id?: string;
          circuit: string;
          tournoi: string;
          surface: string;
          joueur_a: string;
          joueur_b: string;
          cote_a: number;
          cote_b: number;
          stats_brutes: string;
          is_retro?: boolean;
          created_at?: string;
          verdict?: string | null;
          joueur_pronostic?: string | null;
          proba?: number | null;
          note?: number | null;
          facteur_dominant?: string | null;
          these?: string | null;
          these_condition_invalidation?: string | null;
          facteurs_secondaires?: Json;
          test_coherence?: string | null;
          coherent?: boolean | null;
          pre_mortem?: string | null;
          score_probable?: string | null;
          scenario?: string | null;
          value?: number | null;
          motif_abstention?: string | null;
          alarmes_sonnees?: Json;
          analysis_raw?: Json | null;
          gagnant?: string | null;
          score_exact?: string | null;
          resultat_saisi_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
      };
      alarms: {
        Relationships: [];
        Row: {
          id: string;
          circuit: string;
          declencheur: string;
          erreur: string;
          parade: string;
          statut: string;
          renforcements: number;
          faux_positifs: number;
          match_origine_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          circuit: string;
          declencheur: string;
          erreur: string;
          parade: string;
          statut?: string;
          renforcements?: number;
          faux_positifs?: number;
          match_origine_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alarms"]["Insert"]>;
      };
      alarm_events: {
        Relationships: [];
        Row: {
          id: string;
          alarm_id: string;
          match_id: string;
          parade_appliquee: boolean;
          justification: string | null;
          resultat: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          alarm_id: string;
          match_id: string;
          parade_appliquee: boolean;
          justification?: string | null;
          resultat?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alarm_events"]["Insert"]>;
      };
      lessons: {
        Relationships: [];
        Row: {
          id: string;
          circuit: string;
          surface: string;
          regle: string;
          conditions_application: string;
          conditions_non_application: string;
          matchs_preuves: Json;
          contre_exemples: Json;
          confirmations: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          circuit: string;
          surface: string;
          regle: string;
          conditions_application: string;
          conditions_non_application: string;
          matchs_preuves?: Json;
          contre_exemples?: Json;
          confirmations?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lessons"]["Insert"]>;
      };
      players: {
        Relationships: [];
        Row: {
          id: string;
          nom: string;
          circuit: string;
          style_notes: string | null;
          lecons_apprises: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          circuit: string;
          style_notes?: string | null;
          lecons_apprises?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
      };
      autopsies: {
        Relationships: [];
        Row: {
          id: string;
          match_id: string;
          these_juste: boolean;
          facteur_dominant_juste: boolean;
          explication: string;
          chance: boolean;
          action_alarme: string;
          alarme_id: string | null;
          action_lecon: string;
          lecon_id: string | null;
          recidive: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          these_juste: boolean;
          facteur_dominant_juste: boolean;
          explication: string;
          chance?: boolean;
          action_alarme: string;
          alarme_id?: string | null;
          action_lecon: string;
          lecon_id?: string | null;
          recidive?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["autopsies"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
