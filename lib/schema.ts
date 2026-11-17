import { z } from "zod";
import { ACTOR_IDS, BEHAVIOR_IDS, LIMITS, STAGE_IDS } from "./constants";
import { REFERENCE_IDS, type Reference } from "./references";
import type { RiskAssessment } from "./riskRules";
import type { PiiFinding } from "./pii";

// ── 요청 ────────────────────────────────────────────────────────────────
export const AnalyzeRequestSchema = z.object({
  narrative: z.string().trim().min(LIMITS.narrativeMin).max(LIMITS.narrativeMax),
  actor: z.enum(ACTOR_IDS),
  stage: z.enum(STAGE_IDS),
  behaviors: z.array(z.enum(BEHAVIOR_IDS)).max(BEHAVIOR_IDS.length),
  inPerson: z.boolean(),
  fictionalConfirmed: z.literal(true),
  clarifications: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(300),
        answer: z.string().trim().min(1).max(LIMITS.answerMax),
      }),
    )
    .max(LIMITS.maxClarifications)
    .default([]),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ── AI 구조화 출력 ──────────────────────────────────────────────────────
// 위험 등급 필드는 일부러 두지 않는다. 등급은 서버 규칙(riskRules.ts)만 결정한다.
export const AiAnalysisSchema = z.object({
  summary: z.string().describe("사건 요약 2~3문장. 평가 없이 서술한다."),
  confirmedFacts: z.array(z.string()).describe("담당자가 직접 확인했다고 볼 수 있는 사실만."),
  claimsAndUnverified: z
    .array(
      z.object({
        type: z.enum(["민원인 주장", "담당자 추정", "미확인 정보"]),
        text: z.string(),
      }),
    )
    .describe("확인되지 않은 주장·추정·전해 들은 정보."),
  psychologicalMechanisms: z
    .array(
      z.object({
        name: z.string().describe("기제의 일상어 이름. 진단명·장애명 금지."),
        hypothesis: z.string().describe("'~일 수 있습니다' 형태의 가설."),
        basis: z.string().describe("이 가설을 떠올리게 한 입력 속 근거."),
        alternative: z.string().describe("같은 행동에 대한 다른 설명 가능성."),
      }),
    )
    .describe("가능한 심리적 기제 가설 1~3개."),
  riskSignalNotes: z
    .array(
      z.object({
        behaviorId: z.enum(BEHAVIOR_IDS),
        observation: z.string().describe("이 사건에서 해당 행동이 나타난 맥락."),
      }),
    )
    .describe("체크된 행동에 대해서만 작성한다."),
  followUpQuestions: z
    .array(z.object({ question: z.string(), why: z.string() }))
    .describe("판단에 필요한데 입력에 없는 정보 2~4개."),
  strategies: z
    .array(
      z.object({
        title: z.string(),
        when: z.string().describe("이 전략이 맞는 조건."),
        steps: z.array(z.string()),
        caution: z.string().describe("이 전략의 한계나 주의점."),
      }),
    )
    .describe("권장 대응전략 2~3개."),
  recommendedPhrases: z
    .array(z.object({ situation: z.string(), phrase: z.string() }))
    .describe("현장에서 그대로 말할 수 있는 문장 3~5개."),
  phrasesToAvoid: z
    .array(z.object({ phrase: z.string(), reason: z.string(), alternative: z.string() }))
    .describe("피해야 할 발언 2~4개와 이유, 대체 표현."),
  evidenceToPreserve: z.array(z.string()),
  reportItems: z.array(z.string()),
  referenceIds: z.array(z.enum(REFERENCE_IDS)).describe("제공된 근거자료 목록에서만 선택."),
  finalReviewChecklist: z.array(z.string()).describe("담당자가 최종 판단 전에 직접 확인할 사항 3~5개."),
});
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;

// ── 응답 ────────────────────────────────────────────────────────────────
export interface AnalysisResult extends AiAnalysis {
  /** ai: Claude 분석 포함. rules: 규칙 기반 기본 안내만(키 미설정 또는 AI 호출 실패). */
  mode: "ai" | "rules";
  generatedAt: string;
  risk: RiskAssessment;
  references: Reference[];
  /** 서버 검증 과정에서 생긴 알림(삭제된 표현, 대체 동작 등) */
  notices: string[];
  softPii: PiiFinding[];
}

export type AnalyzeErrorCode = "invalid_input" | "unauthorized" | "pii_detected" | "rate_limited" | "server_error";

export interface AnalyzeError {
  error: AnalyzeErrorCode;
  message: string;
  pii?: PiiFinding[];
}
