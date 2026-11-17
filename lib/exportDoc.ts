import { actorLabel, behaviorLabel, stageLabel, type ActorId, type BehaviorId, type StageId } from "./constants";
import { RISK_META } from "./riskRules";
import type { AnalysisResult } from "./schema";

export interface ExportInput {
  narrative: string;
  actor: ActorId;
  stage: StageId;
  behaviors: BehaviorId[];
  inPerson: boolean;
}

const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- 해당 없음");

export function toMarkdown(r: AnalysisResult, input: ExportInput): string {
  const date = new Date(r.generatedAt).toLocaleString("ko-KR");
  const out: string[] = [];
  const h = (t: string) => out.push(`\n## ${t}\n`);

  out.push(`# 특이민원 심리·대응 분석 결과 (교육용 가상 사례)`);
  out.push(
    `\n> 이 문서는 교육용 가상 사례에 대한 참고자료입니다. 정신의학적 진단이나 법적 판단이 아니며, 최종 판단은 담당자와 소속 기관이 합니다.\n`,
  );
  out.push(`- 작성 일시: ${date}`);
  out.push(`- 분석 방식: ${r.mode === "ai" ? "규칙 기반 위험 확인 + AI 분석" : "규칙 기반 기본 안내"}`);
  out.push(`- 민원 주체: ${actorLabel(input.actor)}`);
  out.push(`- 진행 단계: ${stageLabel(input.stage)}`);
  out.push(`- 현재 대면 상황: ${input.inPerson ? "예" : "아니오"}`);
  out.push(`- 확인된 행동: ${input.behaviors.map(behaviorLabel).join(", ") || "없음"}`);

  h("입력한 사례 서술");
  out.push(input.narrative);

  h("사건 요약");
  out.push(r.summary);

  h("확인된 사실");
  out.push(list(r.confirmedFacts));

  h("주장 및 확인되지 않은 정보");
  out.push(list(r.claimsAndUnverified.map((c) => `[${c.type}] ${c.text}`)));

  h("가능한 심리적 기제 (가설)");
  out.push(
    r.psychologicalMechanisms.length
      ? r.psychologicalMechanisms
          .map((m) => `- **${m.name}**: ${m.hypothesis}\n  - 근거: ${m.basis}\n  - 다른 설명 가능성: ${m.alternative}`)
          .join("\n")
      : "- 제시된 가설 없음",
  );

  h("관찰된 위험 신호");
  out.push(`**규칙 기반 등급: ${RISK_META[r.risk.level].label}**\n`);
  out.push(list(r.risk.rationale));
  if (r.risk.safetyActions.length) out.push(`\n**즉시 행동**\n\n${list(r.risk.safetyActions)}`);
  out.push("");
  out.push(
    list(
      r.risk.signals.map((s) => {
        const note = r.riskSignalNotes.find((n) => n.behaviorId === s.behaviorId)?.observation;
        return `${s.label} (${RISK_META[s.level].short}) — ${s.note}${note ? ` / 이 사례: ${note}` : ""}`;
      }),
    ),
  );

  h("추가 확인해야 할 정보");
  out.push(list(r.followUpQuestions.map((q) => `${q.question} (${q.why})`)));

  h("권장 대응전략");
  out.push(
    r.strategies
      .map((s, i) => `### ${i + 1}. ${s.title}\n\n- 적용 조건: ${s.when}\n${s.steps.map((x, j) => `- ${j + 1}단계: ${x}`).join("\n")}\n- 주의: ${s.caution}`)
      .join("\n\n"),
  );

  h("권장 발언");
  out.push(list(r.recommendedPhrases.map((p) => `(${p.situation}) "${p.phrase}"`)));

  h("피해야 할 발언");
  out.push(list(r.phrasesToAvoid.map((p) => `"${p.phrase}" — ${p.reason} → 대신: "${p.alternative}"`)));

  h("기록 및 보고사항");
  out.push(`**증거 보존**\n\n${list(r.evidenceToPreserve)}\n\n**보고**\n\n${list(r.reportItems)}`);

  h("근거자료와 확인일");
  out.push(list(r.references.map((ref) => `[${ref.kind}] ${ref.title} — ${ref.source} / 확인일: ${ref.checkedAt ?? "원문 확인 필요"}`)));

  h("담당자 최종 검토사항");
  out.push(r.finalReviewChecklist.map((c) => `- [ ] ${c}`).join("\n"));

  if (r.notices.length) {
    h("시스템 알림");
    out.push(list(r.notices));
  }
  return out.join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

/** 위 Markdown을 Word에서 열 수 있는 단순 HTML 문서로 바꾼다. */
export function toWordHtml(markdown: string): string {
  const body: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) body.push("</ul>");
    inList = false;
  };
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    const li = line.match(/^(\s*)- (?:\[ \] )?(.*)$/);
    if (li) {
      if (!inList) body.push("<ul>");
      inList = true;
      body.push(`<li style="margin-left:${li[1].length * 12}px">${inline(li[2])}</li>`);
      continue;
    }
    closeList();
    if (!line) continue;
    if (line.startsWith("### ")) body.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (line.startsWith("## ")) body.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) body.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith("> ")) body.push(`<p style="color:#555;border-left:3px solid #999;padding-left:8px">${inline(line.slice(2))}</p>`);
    else body.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return `<html><head><meta charset="utf-8"><style>body{font-family:'맑은 고딕',sans-serif;font-size:11pt;line-height:1.6}h1{font-size:16pt}h2{font-size:13pt;border-bottom:1px solid #999;padding-bottom:2px}h3{font-size:11.5pt}</style></head><body>${body.join("\n")}</body></html>`;
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob(["﻿", content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
