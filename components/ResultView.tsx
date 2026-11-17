"use client";

import { useState } from "react";
import { downloadFile, toMarkdown, toWordHtml, type ExportInput } from "@/lib/exportDoc";
import type { AnalysisResult } from "@/lib/schema";
import { RiskPanel } from "./RiskPanel";

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-base font-bold">{title}</h2>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      <div className="mt-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

const Empty = () => <p className="text-sm text-muted">해당 내용이 없습니다.</p>;

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return <Empty />;
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

function ExportBar({ result, input }: { result: AnalysisResult; input: ExportInput }) {
  const [copied, setCopied] = useState(false);
  const stamp = result.generatedAt.slice(0, 16).replace(/[-:T]/g, "");
  const btn = "rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-accent";

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-muted">내보내기</span>
      <button
        type="button"
        className={btn}
        onClick={() => downloadFile(`특이민원분석_${stamp}.doc`, toWordHtml(toMarkdown(result, input)), "application/msword")}
      >
        Word 문서
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => downloadFile(`특이민원분석_${stamp}.md`, toMarkdown(result, input), "text/markdown")}
      >
        Markdown
      </button>
      <button type="button" className={btn} onClick={() => window.print()}>
        인쇄 · PDF
      </button>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(toMarkdown(result, input));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* 클립보드 권한이 없으면 무시한다 */
          }
        }}
      >
        {copied ? "복사됨" : "텍스트 복사"}
      </button>
    </div>
  );
}

interface Props {
  result: AnalysisResult;
  input: ExportInput;
  stale: boolean;
  loading: boolean;
  onReanalyze: (clarifications: { question: string; answer: string }[]) => void;
}

export function ResultView({ result: r, input, stale, loading, onReanalyze }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answered = r.followUpQuestions
    .map((q) => ({ question: q.question, answer: (answers[q.question] ?? "").trim() }))
    .filter((a) => a.answer);

  return (
    <div className="space-y-4">
      {stale && (
        <p className="no-print rounded-md border border-protect bg-protect-soft px-3 py-2 text-sm">
          입력이 바뀌었습니다. 아래 결과는 이전 입력에 대한 것입니다. 다시 분석하세요.
        </p>
      )}

      <RiskPanel risk={r.risk} notes={r.riskSignalNotes} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded px-2 py-1 text-xs font-bold ${
            r.mode === "ai" ? "bg-accent-soft text-accent-strong" : "bg-general-soft text-general"
          }`}
        >
          {r.mode === "ai" ? "규칙 기반 확인 + AI 분석" : "규칙 기반 기본 안내 (AI 분석 없음)"}
        </span>
        <ExportBar result={r} input={input} />
      </div>

      {r.notices.length > 0 && (
        <ul className="rounded-md border border-line bg-general-soft px-3 py-2 text-sm text-general">
          {r.notices.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      )}

      <Card title="사건 요약">
        <p>{r.summary}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="확인된 사실">
          <Bullets items={r.confirmedFacts} />
        </Card>
        <Card title="주장 및 확인되지 않은 정보">
          {r.claimsAndUnverified.length ? (
            <ul className="space-y-2">
              {r.claimsAndUnverified.map((c) => (
                <li key={c.text}>
                  <span className="mr-1.5 rounded bg-general-soft px-1.5 py-0.5 text-xs font-bold text-general">{c.type}</span>
                  {c.text}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <Card title="가능한 심리적 기제" note="가설입니다. 진단이 아닙니다.">
        {r.psychologicalMechanisms.length ? (
          <ul className="space-y-4">
            {r.psychologicalMechanisms.map((m) => (
              <li key={m.name} className="border-l-2 border-accent pl-3">
                <p className="font-bold">{m.name}</p>
                <p className="mt-0.5">{m.hypothesis}</p>
                <dl className="mt-1.5 space-y-0.5 text-sm text-muted">
                  <div>
                    <dt className="inline font-semibold">근거 </dt>
                    <dd className="inline">{m.basis}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">다른 설명 가능성 </dt>
                    <dd className="inline">{m.alternative}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Card>

      <Card title="추가 확인해야 할 정보" note="답을 적으면 분석에 반영됩니다.">
        {r.followUpQuestions.length ? (
          <>
            <ul className="space-y-4">
              {r.followUpQuestions.map((q, i) => (
                <li key={q.question}>
                  <label htmlFor={`fq-${i}`} className="font-semibold">
                    {q.question}
                  </label>
                  <p className="text-sm text-muted">{q.why}</p>
                  <input
                    id={`fq-${i}`}
                    type="text"
                    maxLength={500}
                    value={answers[q.question] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q.question]: e.target.value })}
                    placeholder="확인한 내용을 적으세요 (선택)"
                    className="no-print mt-1.5 w-full rounded-md border border-line bg-paper/50 px-3 py-2 text-sm"
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={loading || answered.length === 0}
              onClick={() => onReanalyze(answered)}
              className="no-print mt-4 rounded-md border border-accent px-4 py-2 text-sm font-bold text-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
            >
              {loading ? "분석하는 중…" : `답변 ${answered.length}건 반영해 다시 분석`}
            </button>
          </>
        ) : (
          <Empty />
        )}
      </Card>

      <Card title="권장 대응전략">
        <ol className="space-y-5">
          {r.strategies.map((s, i) => (
            <li key={s.title}>
              <p className="font-bold">
                <span className="mr-1.5 font-mono text-accent">{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-0.5 text-sm text-muted">적용 조건: {s.when}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {s.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-2 rounded bg-general-soft px-2.5 py-1.5 text-sm text-general">주의: {s.caution}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="권장 발언" note="현장에서 그대로 쓸 수 있는 문장">
          <ul className="space-y-3">
            {r.recommendedPhrases.map((p) => (
              <li key={p.phrase}>
                <p className="text-xs font-bold text-muted">{p.situation}</p>
                <p className="mt-0.5 rounded-md bg-accent-soft px-3 py-2 font-medium text-accent-strong">“{p.phrase}”</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="피해야 할 발언">
          <ul className="space-y-4">
            {r.phrasesToAvoid.map((p) => (
              <li key={p.phrase}>
                <p className="font-medium text-emergency line-through decoration-emergency/50">“{p.phrase}”</p>
                <p className="mt-0.5 text-sm text-muted">{p.reason}</p>
                <p className="mt-1 text-sm">
                  <span className="font-bold text-accent">대신 </span>“{p.alternative}”
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="기록 및 보고사항">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-muted">증거 보존</h3>
            <Bullets items={r.evidenceToPreserve} />
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-muted">보고</h3>
            <Bullets items={r.reportItems} />
          </div>
        </div>
      </Card>

      <Card title="근거자료와 확인일" note="조문 내용은 반드시 원문으로 확인하세요.">
        <ul className="divide-y divide-line/70">
          {r.references.map((ref) => (
            <li key={ref.id} className="py-2.5 first:pt-0 last:pb-0">
              <p className="font-semibold">
                <span className="mr-1.5 rounded bg-general-soft px-1.5 py-0.5 text-xs font-bold text-general">{ref.kind}</span>
                {ref.url ? (
                  <a href={ref.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-4 hover:decoration-accent">
                    {ref.title}
                  </a>
                ) : (
                  ref.title
                )}
              </p>
              <p className="mt-0.5 text-sm text-muted">{ref.useFor}</p>
              <p className="mt-0.5 text-xs">
                <span className="text-muted">출처 {ref.source} · 확인일 </span>
                {ref.checkedAt ? (
                  <span className="font-semibold">{ref.checkedAt}</span>
                ) : (
                  <span className="font-bold text-protect">원문 확인 필요</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="담당자 최종 검토사항">
        <ul className="space-y-2">
          {r.finalReviewChecklist.map((c, i) => (
            <li key={c} className="flex items-start gap-2">
              <input id={`fr-${i}`} type="checkbox" className="mt-1 size-4 accent-accent" />
              <label htmlFor={`fr-${i}`}>{c}</label>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs leading-relaxed text-muted">
        이 결과는 교육용 가상 사례에 대한 참고자료입니다. 정신의학적 진단이나 법적 판단이 아니며, 공무원의 최종 판단을 대체하지 않습니다. 생성 시각{" "}
        {new Date(r.generatedAt).toLocaleString("ko-KR")}
      </p>
    </div>
  );
}
