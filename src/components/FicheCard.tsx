"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Autopsy, Match } from "@/lib/types";
import { Badge, Card, inputClass } from "@/components/ui";

function noteTone(note: number | null): "accent" | "warning" | "danger" | "default" {
  if (note === null) return "default";
  if (note >= 7) return "accent";
  if (note >= 5) return "warning";
  return "danger";
}

export default function FicheCard({ match: initialMatch }: { match: Match }) {
  const router = useRouter();
  const [match, setMatch] = useState(initialMatch);
  const [open, setOpen] = useState(false);
  const [gagnant, setGagnant] = useState<string>("");
  const [scoreExact, setScoreExact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autopsy, setAutopsy] = useState<Autopsy | null>(null);

  const verdictLabel =
    match.verdict === "hors_perimetre"
      ? "Hors périmètre"
      : match.verdict === "abstention"
        ? "Abstention"
        : "Pari";

  async function handleResultSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!gagnant || !scoreExact.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${match.id}/resultat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gagnant, score_exact: scoreExact.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue.");
      setMatch(data.match as Match);
      setAutopsy(data.autopsy as Autopsy);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge>{match.circuit}</Badge>
            <Badge
              tone={
                match.verdict === "pari" ? "accent" : match.verdict === "abstention" ? "warning" : "default"
              }
            >
              {verdictLabel}
            </Badge>
            {match.is_retro && <Badge tone="warning">Rétro</Badge>}
            {match.coherent === false && <Badge tone="danger">Incohérence détectée</Badge>}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-foreground">
            {match.joueur_a} vs {match.joueur_b}
          </p>
          <p className="text-xs text-muted">
            {match.tournoi} · {match.surface}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${match.note && match.note >= 7 ? "text-accent" : "text-foreground"}`}>
            {match.note ?? "—"}
            <span className="text-sm text-muted">/10</span>
          </p>
          {match.note !== null && <Badge tone={noteTone(match.note)}>note</Badge>}
        </div>
      </div>

      {match.joueur_pronostic && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted">Favori de la fiche</p>
            <p className="font-medium text-foreground">{match.joueur_pronostic}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Proba / Value</p>
            <p className="font-medium text-foreground">
              {match.proba ?? "—"}%{" "}
              {match.value !== null && (
                <span className={match.value >= 5 ? "text-accent" : "text-muted"}>
                  ({match.value >= 0 ? "+" : ""}
                  {match.value} pts)
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {match.these && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <p className="text-xs font-medium text-muted">Thèse</p>
          <p className="mt-1 text-foreground">{match.these}</p>
          {match.these_condition_invalidation && (
            <p className="mt-1 text-xs text-muted">
              Fausse si : {match.these_condition_invalidation}
            </p>
          )}
        </div>
      )}

      {match.motif_abstention && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {match.motif_abstention}
        </div>
      )}

      {match.alarmes_sonnees && match.alarmes_sonnees.length > 0 && (
        <div className="space-y-1.5">
          {match.alarmes_sonnees.map((a, i) => (
            <div key={i} className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs">
              <p className="font-medium text-danger">⚠ ALARME sonnée</p>
              <p className="mt-1 text-foreground">{a.declencheur}</p>
              <p className="mt-1 text-muted">
                {a.appliquee ? "Parade appliquée : " : "Parade NON appliquée — "}
                {a.appliquee ? a.parade : a.justification}
              </p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-accent"
      >
        {open ? "Masquer" : "Voir"} cohérence, pre-mortem et facteurs
      </button>

      {open && (
        <div className="space-y-2 border-t border-border pt-3 text-xs text-muted">
          {match.test_coherence && (
            <p>
              <span className="font-medium text-foreground">Cohérence : </span>
              {match.test_coherence}
            </p>
          )}
          {match.pre_mortem && (
            <p>
              <span className="font-medium text-foreground">Pre-mortem : </span>
              {match.pre_mortem}
            </p>
          )}
          {match.score_probable && (
            <p>
              <span className="font-medium text-foreground">Score probable : </span>
              {match.score_probable}
            </p>
          )}
          {match.scenario && (
            <p>
              <span className="font-medium text-foreground">Scénario : </span>
              {match.scenario}
            </p>
          )}
          {match.facteurs_secondaires && match.facteurs_secondaires.length > 0 && (
            <div>
              <p className="font-medium text-foreground">Facteurs secondaires :</p>
              <ul className="ml-4 list-disc">
                {match.facteurs_secondaires.map((f, i) => (
                  <li key={i}>
                    {f.facteur} ({f.points >= 0 ? "+" : ""}
                    {f.points} pts)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {match.gagnant ? (
        <div className="rounded-lg border border-border bg-surface-2 p-2.5 text-xs">
          <span className="font-medium text-foreground">Résultat : </span>
          {match.gagnant} — {match.score_exact}
        </div>
      ) : (
        <form onSubmit={handleResultSubmit} className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted">Saisir le résultat</p>
          <div className="flex gap-2">
            {[match.joueur_a, match.joueur_b].map((j) => (
              <label
                key={j}
                className="flex-1 cursor-pointer rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-center text-xs text-foreground has-[:checked]:border-accent has-[:checked]:bg-accent/15 has-[:checked]:text-accent"
              >
                <input
                  type="radio"
                  name={`gagnant-${match.id}`}
                  value={j}
                  checked={gagnant === j}
                  onChange={() => setGagnant(j)}
                  className="sr-only"
                />
                {j}
              </label>
            ))}
          </div>
          <input
            value={scoreExact}
            onChange={(e) => setScoreExact(e.target.value)}
            placeholder="Score exact, ex. 6-4 7-5"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={submitting || !gagnant || !scoreExact.trim()}
            className="w-full rounded-lg bg-accent-strong py-2 text-xs font-semibold text-background disabled:opacity-60"
          >
            {submitting ? "Autopsie en cours…" : "Enregistrer et lancer l'autopsie"}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      )}

      {autopsy && (
        <div className="space-y-1.5 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs">
          <p className="font-medium text-accent">Autopsie</p>
          <p className="text-foreground">
            Thèse {autopsy.these_juste ? "juste" : "fausse"} · facteur dominant{" "}
            {autopsy.facteur_dominant_juste ? "correct" : "incorrect"}
            {autopsy.chance && " · victoire chanceuse"}
            {autopsy.recidive && " · RÉCIDIVE"}
          </p>
          <p className="text-muted">{autopsy.explication}</p>
        </div>
      )}
    </Card>
  );
}
