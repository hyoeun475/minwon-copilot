"use client";

import { useMemo, useRef, useState } from "react";
import { CaseForm, EMPTY_FORM, type FormState } from "@/components/CaseForm";
import { ResultView } from "@/components/ResultView";
import { LEVEL_STYLE, RiskPanel } from "@/components/RiskPanel";
import { assessRisk, RISK_META } from "@/lib/riskRules";
import type { AnalysisResult, AnalyzeError } from "@/lib/schema";

const keyOf = (f: FormState) => JSON.stringify([f.narrative, f.actor, f.stage, [...f.behaviors].sort(), f.inPerson]);

export default function Home() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzed, setAnalyzed] = useState<FormState | null>(null);
  const [error, setError] = useState<AnalyzeError | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  // 위험 신호는 체크하는 즉시 규칙으로 계산해 보여 준다(서버가 같은 규칙으로 다시 계산한다).
  const preview = useMemo(
    () => assessRisk({ behaviors: form.behaviors, inPerson: form.inPerson, narrative: form.narrative }),
    [form.behaviors, form.inPerson, form.narrative],
  );

  async function analyze(clarifications: { question: string; answer: string }[] = []) {
    const snapshot = form;
    setLoading(true);
    setError(null);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode.trim() },
        body: JSON.stringify({ ...snapshot, clarifications }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data as AnalyzeError);
      } else {
        setResult(data as AnalysisResult);
        setAnalyzed(snapshot);
      }
    } catch {
      setError({ error: "server_error", message: "서버에 연결하지 못했습니다. 네트워크 상태를 확인하고 다시 시도하세요." });
    } finally {
      setLoading(false);
    }
  }

  const stale = Boolean(analyzed && keyOf(analyzed) !== keyOf(form));

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 py-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent">노동감독관 교육 과정</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-[28px]">특이민원 심리·대응 코파일럿</h1>
        </div>
        <p className="max-w-md text-sm text-muted">
          가상 사례를 입력하면 위험 신호를 규칙으로 먼저 확인하고, 가능한 심리적 기제와 대응 문장을 정리합니다.
        </p>
      </header>

      <div className="no-print rounded-md border border-protect/50 bg-protect-soft px-4 py-2.5 text-sm">
        <b>교육용 가상 사건 전용입니다.</b> 실제 사건 원문·개인정보·수사기록을 입력하지 마세요. 입력 내용은 서버에 저장하지 않으며, 분석을 위해
        AI 서비스로 전송됩니다.
      </div>

      <main className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div className="no-print">
          <CaseForm form={form} onChange={setForm} onSubmit={() => analyze()} loading={loading} />
          <div className="mt-5">
            <label htmlFor="access-code" className="text-xs font-semibold text-muted">
              참여 코드 (교육 담당자에게 안내받은 경우)
            </label>
            <input
              id="access-code"
              type="password"
              autoComplete="off"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              aria-invalid={error?.error === "unauthorized"}
              className={`mt-1 w-full rounded-md border bg-surface px-3 py-2 text-sm ${
                error?.error === "unauthorized" ? "border-emergency" : "border-line"
              }`}
            />
          </div>
        </div>

        <div ref={resultRef} className="print-full scroll-mt-4 space-y-4" aria-live="polite">
          {error && (
            <div role="alert" className="rounded-md border border-emergency bg-emergency-soft p-4 text-sm">
              <p className="font-bold text-emergency">분석하지 못했습니다</p>
              <p className="mt-1">{error.message}</p>
              {error.pii && (
                <ul className="mt-1">
                  {error.pii.map((f) => (
                    <li key={f.label}>
                      · {f.label} {f.count}건
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {loading && (
            <div className="rounded-md border border-line bg-surface p-4 text-sm">
              <p className="font-bold">분석하는 중입니다</p>
              <p className="mt-1 text-muted">보통 30초~1분 30초가 걸립니다. 긴급 상황이면 결과를 기다리지 말고 아래 안전 대응을 먼저 하세요.</p>
            </div>
          )}

          {result && analyzed && !loading ? (
            <ResultView
              key={result.generatedAt}
              result={result}
              input={analyzed}
              stale={stale}
              loading={loading}
              onReanalyze={analyze}
            />
          ) : (
            <>
              <RiskPanel risk={preview} preview />
              {!loading && (
                <div className="rounded-lg border border-dashed border-line p-5 text-sm leading-relaxed text-muted">
                  <p className="font-bold text-ink">분석 결과에 담기는 내용</p>
                  <p className="mt-1.5">
                    사건 요약 · 확인된 사실과 주장의 구분 · 가능한 심리적 기제(가설) · 위험 신호 · 추가 확인 질문 · 대응전략 2~3개 · 현장 대응 문장 ·
                    피해야 할 발언 · 기록·보고사항 · 근거자료 · 최종 검토사항
                  </p>
                  <p className="mt-3">
                    위의 등급은 체크한 행동만으로 계산됩니다. 폭언이나 반복 연락만으로는 고위험으로 분류하지 않으며, 감사 청구·고소·언론 제보 예고는
                    민원인의 권리 행사로 봅니다.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 모바일에서는 결과 영역이 폼 아래에 있으므로, 체크한 행동의 등급을 화면 아래에 계속 보여 준다. */}
      {!result && form.behaviors.length > 0 && (
        <button
          type="button"
          onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className={`no-print fixed inset-x-3 bottom-3 z-10 rounded-md border px-4 py-2.5 text-left text-sm font-bold shadow-lg lg:hidden ${LEVEL_STYLE[preview.level].box} ${LEVEL_STYLE[preview.level].text}`}
        >
          규칙 기반 미리보기 · {RISK_META[preview.level].label}
          {preview.emergency && <span className="block font-medium text-ink">눌러서 즉시 행동을 확인하세요.</span>}
        </button>
      )}
    </div>
  );
}
