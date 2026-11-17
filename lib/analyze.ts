import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { actorLabel, behaviorLabel, stageLabel, type BehaviorId } from "./constants";
import { sanitizeDeep } from "./guard";
import { detectPii } from "./pii";
import { BASE_AVOID, BASE_FINAL_REVIEW, BASE_PHRASES, BASE_STRATEGY, PLAYBOOK } from "./playbook";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { REFERENCES, type ReferenceId } from "./references";
import { assessRisk, type RiskAssessment } from "./riskRules";
import { AiAnalysisSchema, type AiAnalysis, type AnalysisResult, type AnalyzeRequest } from "./schema";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const EMERGENCY_BEHAVIORS: BehaviorId[] = ["weapon", "physical", "self_harm", "threat_harm", "stalking"];

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const hasCredentials = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

/** AI 없이 규칙과 기본 지침만으로 만드는 분석. 키가 없거나 AI 호출이 실패했을 때 쓴다. */
function buildRulesAnalysis(req: AnalyzeRequest): AiAnalysis {
  const entries = req.behaviors.map((b) => PLAYBOOK[b]);
  const strategies = entries.flatMap((e) => (e.strategy ? [e.strategy] : []));
  const mechanisms = entries.flatMap((e) => (e.mechanism ? [e.mechanism] : []));

  return {
    summary: `${actorLabel(req.actor)}이(가) 제기한 민원으로, 현재 '${stageLabel(req.stage)}' 단계입니다. 확인된 행동은 ${
      req.behaviors.length ? req.behaviors.map(behaviorLabel).join(", ") : "선택되지 않았습니다"
    }${req.behaviors.length ? "입니다" : ""}. 이 결과는 AI 분석 없이 규칙 기반 기본 지침만으로 작성되었습니다.`,
    confirmedFacts: [
      `민원 주체: ${actorLabel(req.actor)}`,
      `진행 단계: ${stageLabel(req.stage)}`,
      ...req.behaviors.map((b) => `확인된 행동: ${behaviorLabel(b)}`),
    ],
    claimsAndUnverified: [
      {
        type: "미확인 정보",
        text: "자유서술 내용은 규칙 기반 모드에서 사실·주장으로 자동 분류되지 않습니다. 서술 가운데 직접 확인한 것과 전해 들은 것을 직접 구분하세요.",
      },
    ],
    psychologicalMechanisms: mechanisms.slice(0, 3),
    riskSignalNotes: [],
    followUpQuestions: [],
    strategies: [...strategies.slice(0, 2), BASE_STRATEGY].slice(0, 3),
    recommendedPhrases: [...entries.flatMap((e) => e.phrases), ...BASE_PHRASES].slice(0, 6),
    phrasesToAvoid: [...entries.flatMap((e) => e.avoid ?? []), ...BASE_AVOID].slice(0, 4),
    evidenceToPreserve: uniq(entries.flatMap((e) => e.evidence)),
    reportItems: uniq(entries.flatMap((e) => e.report)),
    referenceIds: [],
    finalReviewChecklist: [],
  };
}

async function callClaude(req: AnalyzeRequest, risk: RiskAssessment): Promise<AiAnalysis> {
  const client = new Anthropic({ timeout: 100_000, maxRetries: 1 });
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // 안전 분류기가 요청을 거절하면 서버 측에서 대체 모델로 다시 시도한다.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: zodOutputFormat(AiAnalysisSchema) },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserMessage(req, risk) }],
  });

  if (response.stop_reason === "refusal") throw new AiUnavailable("refusal");
  if (response.stop_reason === "max_tokens") throw new AiUnavailable("truncated");
  if (!response.parsed_output) throw new AiUnavailable("unparsed");
  return response.parsed_output;
}

class AiUnavailable extends Error {
  constructor(public readonly kind: string) {
    super(kind);
  }
}

/** 로그에는 오류 종류와 상태 코드만 남긴다. 입력 원문과 API 오류 본문은 남기지 않는다. */
function describeFailure(err: unknown): { log: string; notice: string } {
  if (err instanceof AiUnavailable) {
    return {
      log: `ai_unavailable kind=${err.kind}`,
      notice:
        err.kind === "refusal"
          ? "AI가 이 입력에 대한 분석을 제공하지 않았습니다. 규칙 기반 기본 안내를 표시합니다."
          : "AI 응답이 완전하지 않아 규칙 기반 기본 안내를 표시합니다.",
    };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { log: `auth status=${err.status}`, notice: "AI 인증에 실패했습니다(API 키 확인 필요). 규칙 기반 기본 안내를 표시합니다." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { log: "rate_limit status=429", notice: "AI 사용량 한도에 도달했습니다. 규칙 기반 기본 안내를 표시합니다." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { log: "connection", notice: "AI 서버에 연결하지 못했습니다. 규칙 기반 기본 안내를 표시합니다." };
  }
  if (err instanceof Anthropic.APIError) {
    return { log: `api status=${err.status}`, notice: "AI 분석 중 오류가 발생했습니다. 규칙 기반 기본 안내를 표시합니다." };
  }
  return { log: `unknown ${err instanceof Error ? err.name : typeof err}`, notice: "AI 분석 중 오류가 발생했습니다. 규칙 기반 기본 안내를 표시합니다." };
}

export async function analyzeCase(req: AnalyzeRequest): Promise<AnalysisResult> {
  // 1) 위험 등급: 규칙만으로 결정
  const risk = assessRisk({ behaviors: req.behaviors, inPerson: req.inPerson, narrative: req.narrative });
  const notices: string[] = [];
  let mode: AnalysisResult["mode"] = "rules";
  let analysis = buildRulesAnalysis(req);

  // 2) AI 분석 (가능할 때만)
  if (!hasCredentials()) {
    notices.push("API 키가 설정되지 않아 규칙 기반 기본 안내만 표시합니다. (.env.local의 ANTHROPIC_API_KEY)");
  } else {
    try {
      const raw = await callClaude(req, risk);
      const { value, report } = sanitizeDeep(raw);
      analysis = value;
      notices.push(...report.notices);
      mode = "ai";
    } catch (err) {
      const { log, notice } = describeFailure(err);
      console.error(`[analyze] ${log}`);
      notices.push(notice);
    }
  }

  // 3) 서버 강제 사항 — AI 출력과 무관하게 적용
  const checked = new Set(req.behaviors);

  // 위험 신호 설명은 체크된 행동에 대한 것만 남긴다.
  analysis.riskSignalNotes = analysis.riskSignalNotes.filter((n) => checked.has(n.behaviorId));

  // 긴급이면 안전 대응 전략을 맨 앞에 고정한다.
  if (risk.emergency) {
    const safety = EMERGENCY_BEHAVIORS.filter((b) => checked.has(b)).flatMap((b) => {
      const s = PLAYBOOK[b].strategy;
      return s ? [s] : [];
    });
    const titles = new Set(safety.map((s) => s.title));
    analysis.strategies = [...safety, ...analysis.strategies.filter((s) => !titles.has(s.title))].slice(0, 4);
    notices.push("긴급 등급이므로 안전 대응 전략을 서버에서 맨 앞에 배치했습니다.");
  }

  // 규칙이 만든 확인 질문을 앞에 둔다.
  const seenQ = new Set<string>();
  analysis.followUpQuestions = [...risk.ruleQuestions, ...analysis.followUpQuestions]
    .filter((q) => (seenQ.has(q.question) ? false : (seenQ.add(q.question), true)))
    .slice(0, 6);

  // 근거자료: 선별 목록에 있는 것만. 체크된 행동의 기본 근거와 기관 내부 지침은 항상 포함한다.
  const refIds = new Set<ReferenceId>([
    ...analysis.referenceIds,
    ...req.behaviors.flatMap((b) => PLAYBOOK[b].refs),
    "agency_internal",
  ]);
  const references = REFERENCES.filter((r) => refIds.has(r.id));
  analysis.referenceIds = references.map((r) => r.id);

  // 최종 검토사항에는 고정 문구를 항상 포함한다.
  analysis.finalReviewChecklist = uniq([...analysis.finalReviewChecklist, ...BASE_FINAL_REVIEW]);

  return {
    ...analysis,
    mode,
    generatedAt: new Date().toISOString(),
    risk,
    references,
    notices,
    softPii: detectPii(req.narrative).filter((f) => f.severity === "soft"),
  };
}
