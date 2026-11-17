import { RISK_META, type RiskAssessment, type RiskLevel } from "@/lib/riskRules";
import type { AiAnalysis } from "@/lib/schema";

export const LEVEL_STYLE: Record<RiskLevel, { box: string; chip: string; text: string }> = {
  emergency: { box: "border-emergency bg-emergency-soft", chip: "bg-emergency text-white", text: "text-emergency" },
  protect: { box: "border-protect bg-protect-soft", chip: "bg-protect text-white", text: "text-protect" },
  caution: { box: "border-caution bg-caution-soft", chip: "bg-caution text-white", text: "text-caution" },
  general: { box: "border-line bg-general-soft", chip: "bg-general text-white", text: "text-general" },
};

interface Props {
  risk: RiskAssessment;
  notes?: AiAnalysis["riskSignalNotes"];
  /** 분석 전 실시간 미리보기 여부 */
  preview?: boolean;
}

export function RiskPanel({ risk, notes = [], preview = false }: Props) {
  const style = LEVEL_STYLE[risk.level];
  const meta = RISK_META[risk.level];

  return (
    <section aria-labelledby="risk-title" className={`rounded-lg border-l-4 border ${style.box} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`rounded px-2 py-0.5 text-xs font-bold tracking-wide ${style.chip}`}>
          {preview ? "규칙 기반 미리보기" : "규칙 기반 등급"}
        </span>
        <h2 id="risk-title" className={`text-lg font-bold ${style.text}`}>
          {meta.label}
        </h2>
      </div>
      <p className="mt-1.5 text-sm text-ink">{meta.description}</p>

      {risk.emergency && (
        <div role="alert" className="mt-4 rounded-md bg-surface p-4 ring-1 ring-emergency/40">
          <h3 className="text-sm font-bold text-emergency">지금 먼저 할 일</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm font-medium">
            {risk.safetyActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      )}

      {risk.rationale.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {risk.rationale.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      )}

      {risk.signals.length > 0 && (
        <ul className="mt-4 divide-y divide-line/70 rounded-md bg-surface/70 text-sm">
          {risk.signals.map((s) => {
            const note = notes.find((n) => n.behaviorId === s.behaviorId)?.observation;
            return (
              <li key={s.behaviorId} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{s.label}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${LEVEL_STYLE[s.level].chip}`}>
                    {RISK_META[s.level].short}
                  </span>
                </div>
                <p className="mt-0.5 text-muted">{s.note}</p>
                {note && <p className="mt-1 text-ink">이 사례에서: {note}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {risk.narrativeHints.length > 0 && (
        <div className="mt-4 rounded-md border border-dashed border-protect/60 bg-surface p-3 text-sm">
          <h3 className="font-bold text-protect">확인이 필요한 표현</h3>
          <ul className="mt-1 space-y-1">
            {risk.narrativeHints.map((h) => (
              <li key={h.behaviorId}>{h.message}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
