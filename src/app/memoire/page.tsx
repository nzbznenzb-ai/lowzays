import { CIRCUITS, SURFACE_LABELS, type Alarm, type Lesson, type Player } from "@/lib/types";
import { Card, SectionTitle, Badge, EmptyState } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getMemoryData() {
  const db = supabaseAdmin();
  const [{ data: alarms }, { data: lessons }, { data: players }] = await Promise.all([
    db.from("alarms").select("*").order("statut", { ascending: true }).order("created_at", { ascending: false }),
    db.from("lessons").select("*").order("confirmations", { ascending: false }),
    db.from("players").select("*").order("nom", { ascending: true }),
  ]);
  return {
    alarms: (alarms ?? []) as Alarm[],
    lessons: (lessons ?? []) as Lesson[],
    players: (players ?? []) as Player[],
  };
}

export default async function MemoirePage() {
  const { alarms, lessons, players } = await getMemoryData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mémoire</h1>
        <p className="mt-1 text-sm text-muted">
          Alarmes, leçons fusionnées et fiches joueurs.
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

      <section>
        <SectionTitle hint="actives en premier">Alarmes</SectionTitle>
        {alarms.length === 0 ? (
          <EmptyState>Aucune alarme pour l&apos;instant.</EmptyState>
        ) : (
          <div className="space-y-2">
            {alarms.map((a) => (
              <Card key={a.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge tone={a.statut === "active" ? "danger" : "default"}>
                    {a.statut === "active" ? "Active" : "En veille"}
                  </Badge>
                  <Badge>{a.circuit}</Badge>
                  <span className="text-xs text-muted">
                    +{a.renforcements} · {a.faux_positifs} FP
                  </span>
                </div>
                <p className="text-sm text-foreground">{a.declencheur}</p>
                <p className="text-xs text-muted">Erreur : {a.erreur}</p>
                <p className="text-xs text-muted">Parade : {a.parade}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Leçons</SectionTitle>
        {lessons.length === 0 ? (
          <EmptyState>Aucune leçon enregistrée.</EmptyState>
        ) : (
          <div className="space-y-2">
            {lessons.map((l) => (
              <Card key={l.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge>{l.circuit}</Badge>
                  <Badge>{SURFACE_LABELS[l.surface]}</Badge>
                  <span className="text-xs text-muted">{l.confirmations} confirmation{l.confirmations > 1 ? "s" : ""}</span>
                </div>
                <p className="text-sm text-foreground">{l.regle}</p>
                <p className="text-xs text-muted">S&apos;applique si : {l.conditions_application}</p>
                <p className="text-xs text-muted">Ne s&apos;applique pas si : {l.conditions_non_application}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Fiches joueurs</SectionTitle>
        {players.length === 0 ? (
          <EmptyState>Aucune fiche joueur.</EmptyState>
        ) : (
          <div className="space-y-2">
            {players.map((p) => (
              <Card key={p.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{p.nom}</p>
                  <Badge>{p.circuit}</Badge>
                </div>
                {p.style_notes && <p className="text-xs text-muted">{p.style_notes}</p>}
                <ul className="ml-4 list-disc text-xs text-muted">
                  {p.lecons_apprises.map((l, i) => (
                    <li key={i}>{l.texte}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
