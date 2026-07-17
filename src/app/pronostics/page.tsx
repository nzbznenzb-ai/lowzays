import { CIRCUITS, type Match } from "@/lib/types";
import { EmptyState } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase/server";
import FicheCard from "@/components/FicheCard";

export const dynamic = "force-dynamic";

async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabaseAdmin()
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as Match[];
}

export default async function PronosticsPage() {
  const matches = await getMatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pronostics</h1>
        <p className="mt-1 text-sm text-muted">
          Fiches publiées, avec saisie du résultat et autopsie.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto text-sm">
        <button className="rounded-full border border-accent/30 bg-accent/15 px-3 py-1.5 text-accent">
          Tous
        </button>
        {CIRCUITS.map((c) => (
          <button
            key={c}
            className="rounded-full border border-border px-3 py-1.5 text-muted"
          >
            {c}
          </button>
        ))}
      </div>

      {matches.length === 0 ? (
        <EmptyState>
          Aucun pronostic pour l&apos;instant. Lance une analyse depuis la page
          Analyse pour voir la fiche apparaître ici.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <FicheCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
