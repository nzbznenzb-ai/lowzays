"use client";

import { useState } from "react";
import { CIRCUITS, SURFACES, SURFACE_LABELS, type Match } from "@/lib/types";
import { Card, SectionTitle, Label, inputClass } from "@/components/ui";
import FicheCard from "@/components/FicheCard";

export default function AnalysePage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Match | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      circuit: formData.get("circuit"),
      joueur_a: formData.get("joueur_a"),
      joueur_b: formData.get("joueur_b"),
      tournoi: formData.get("tournoi"),
      surface: formData.get("surface"),
      cote_a: formData.get("cote_a"),
      cote_b: formData.get("cote_b"),
      stats_brutes: formData.get("stats_brutes"),
      is_retro: formData.get("is_retro") === "on",
    };

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur inconnue.");
      }
      setResult(data.match as Match);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Nouvelle analyse</h1>
        <p className="mt-1 text-sm text-muted">
          Colle les stats en vrac, l&apos;IA produit la fiche complète.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-4">
          <SectionTitle>Match</SectionTitle>

          <div>
            <Label>Circuit</Label>
            <div className="flex gap-2">
              {CIRCUITS.map((c) => (
                <label
                  key={c}
                  className="flex-1 cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-2 text-center text-sm text-foreground has-[:checked]:border-accent has-[:checked]:bg-accent/15 has-[:checked]:text-accent"
                >
                  <input
                    type="radio"
                    name="circuit"
                    value={c}
                    defaultChecked={c === "ATP"}
                    className="sr-only"
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Joueur A</Label>
              <input
                name="joueur_a"
                required
                className={inputClass}
                placeholder="Nom du joueur A"
              />
            </div>
            <div>
              <Label>Joueur B</Label>
              <input
                name="joueur_b"
                required
                className={inputClass}
                placeholder="Nom du joueur B"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Tournoi</Label>
              <input
                name="tournoi"
                required
                className={inputClass}
                placeholder="Ex. Roland-Garros"
              />
            </div>
            <div>
              <Label>Surface</Label>
              <select name="surface" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Choisir…
                </option>
                {SURFACES.map((s) => (
                  <option key={s} value={s}>
                    {SURFACE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cote joueur A</Label>
              <input
                name="cote_a"
                type="number"
                step="0.01"
                min="1"
                required
                className={inputClass}
                placeholder="1.85"
              />
            </div>
            <div>
              <Label>Cote joueur B</Label>
              <input
                name="cote_b"
                type="number"
                step="0.01"
                min="1"
                required
                className={inputClass}
                placeholder="1.95"
              />
            </div>
          </div>

          <div>
            <Label>Stats en vrac</Label>
            <textarea
              name="stats_brutes"
              required
              rows={8}
              className={inputClass}
              placeholder="Colle ici toutes les stats, forme, historique, confrontations, blessures avec source…"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="is_retro" className="rounded border-border" />
            Match déjà joué (rétro — alimente la mémoire, exclu des statistiques)
          </label>
        </Card>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-accent-strong py-3 text-sm font-semibold text-background transition-opacity disabled:opacity-60"
        >
          {submitting ? "Analyse en cours…" : "Lancer l'analyse"}
        </button>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-center text-sm text-danger">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="space-y-2">
          <SectionTitle>Fiche générée</SectionTitle>
          <FicheCard match={result} />
        </div>
      )}
    </div>
  );
}
