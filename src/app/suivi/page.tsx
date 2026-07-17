import { computeSuiviStats } from "@/lib/stats";
import { Card, SectionTitle, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export default async function SuiviPage() {
  const stats = await computeSuiviStats();

  const objectifAtteint = stats.winrate !== null && stats.coteMoyenne !== null && stats.winrate >= 55 && stats.coteMoyenne >= 1.85;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Suivi</h1>
        <p className="mt-1 text-sm text-muted">
          Statistiques calculées, hors matchs rétro. Objectif : zéro récidive.
        </p>
      </div>

      <section>
        <SectionTitle hint="métrique reine">Récidives</SectionTitle>
        <Card>
          <p className="text-xs text-muted">
            Défaites dont l&apos;autopsie conclut « erreur déjà connue »
          </p>
          <p className={`mt-1 text-3xl font-bold ${stats.recidives === 0 ? "text-accent" : "text-danger"}`}>
            {stats.recidives}
          </p>
          <p className="mt-1 text-xs text-muted">
            Objectif : 0 · {stats.nbAutopsies} autopsie{stats.nbAutopsies > 1 ? "s" : ""} au total
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle>Performance</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Winrate" value={stats.winrate !== null ? `${stats.winrate}%` : "—"} hint={`${stats.nbParis} pari(s) résolu(s)`} />
          <StatTile label="ROI (unités)" value={stats.roi !== null ? `${stats.roi >= 0 ? "+" : ""}${stats.roi}%` : "—"} />
          <StatTile
            label="Thèses justes"
            value={stats.tauxThesesJustes !== null ? `${stats.tauxThesesJustes}%` : "—"}
            hint="indépendant des résultats"
          />
          <Card>
            <p className="text-xs text-muted">Objectif 55%+ @ ≥1.85</p>
            <p className={`mt-1 text-2xl font-bold ${objectifAtteint ? "text-accent" : "text-foreground"}`}>
              {stats.coteMoyenne !== null ? stats.coteMoyenne : "—"}
            </p>
            {objectifAtteint && <Badge tone="accent">Atteint</Badge>}
          </Card>
        </div>
      </section>

      <section>
        <SectionTitle hint="actives en premier">Alarmes</SectionTitle>
        {stats.alarmesActives.length === 0 && stats.alarmesVeille.length === 0 ? (
          <Card className="text-sm text-muted">Aucune alarme pour l&apos;instant.</Card>
        ) : (
          <div className="space-y-2">
            {[...stats.alarmesActives, ...stats.alarmesVeille].map((a) => {
              const total = a.renforcements + a.faux_positifs;
              const efficacite = total > 0 ? Math.round((a.renforcements / total) * 100) : null;
              return (
                <Card key={a.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge tone={a.statut === "active" ? "danger" : "default"}>
                      {a.statut === "active" ? "Active" : "En veille"}
                    </Badge>
                    <Badge>{a.circuit}</Badge>
                    <span className="text-xs text-muted">
                      +{a.renforcements} renforcement{a.renforcements > 1 ? "s" : ""} · {a.faux_positifs} faux positif
                      {a.faux_positifs > 1 ? "s" : ""}
                      {efficacite !== null && ` · efficacité ${efficacite}%`}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{a.declencheur}</p>
                  <p className="text-xs text-muted">Parade : {a.parade}</p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Calibration</SectionTitle>
        <Card>
          <div className="grid grid-cols-5 gap-2 text-center text-xs sm:grid-cols-10">
            {stats.calibration.map((c) => (
              <div key={c.note}>
                <p className="font-semibold text-foreground">{c.note}</p>
                <p className="text-muted">{c.count > 0 ? `${c.winrate}%` : "—"}</p>
                <p className="text-muted">({c.count})</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Répartition par tranche de cote</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {stats.repartitionCote.map((b) => (
            <Card key={b.label}>
              <p className="text-xs text-muted">{b.label}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{b.winrate !== null ? `${b.winrate}%` : "—"}</p>
              <p className="text-xs text-muted">{b.count} pari(s)</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
