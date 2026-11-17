// 규칙 기반 위험 신호 평가.
// 위험 등급은 "확인된 행동(체크 항목)"으로만 결정되며, AI 출력이 이 결과를 바꿀 수 없다.

import { type BehaviorId, behaviorLabel } from "./constants";

export type RiskLevel = "emergency" | "protect" | "caution" | "general";

export const RISK_META: Record<RiskLevel, { label: string; short: string; description: string }> = {
  emergency: {
    label: "긴급 — 안전 대응 우선",
    short: "긴급",
    description: "즉각적 위해 가능성과 관련된 행동이 확인되었습니다. 응대보다 안전 확보가 먼저입니다.",
  },
  protect: {
    label: "보호조치 필요",
    short: "보호조치",
    description: "담당자 보호를 위한 기관 차원의 조치가 필요한 행동이 확인되었습니다.",
  },
  caution: {
    label: "주의 — 절차적 대응",
    short: "주의",
    description: "응대 원칙과 기록을 갖추고 절차에 따라 대응할 상황입니다. 고위험으로 단정할 근거는 확인되지 않았습니다.",
  },
  general: {
    label: "일반 응대",
    short: "일반",
    description: "확인된 행동 기준으로는 통상적인 민원 응대 범위입니다.",
  },
};

const ORDER: RiskLevel[] = ["general", "caution", "protect", "emergency"];
const maxLevel = (a: RiskLevel, b: RiskLevel) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

const BASE_LEVEL: Record<BehaviorId, RiskLevel> = {
  verbal_abuse: "caution",
  repeated_contact: "caution",
  long_occupation: "caution",
  complaint_threat: "general",
  recording_threat: "general",
  sexual_harassment: "protect",
  personal_info: "protect",
  refuse_leave: "caution",
  intoxicated: "caution",
  threat_harm: "protect",
  stalking: "protect",
  self_harm: "emergency",
  weapon: "emergency",
  physical: "emergency",
};

const SIGNAL_NOTE: Record<BehaviorId, string> = {
  verbal_abuse: "담당자 보호 대상 행위입니다. 다만 폭언만으로 신체적 위해 가능성이 높다고 단정하지 않습니다.",
  repeated_contact: "업무 부담 요인입니다. 반복 제기 자체는 위험 신호가 아니며, 처리 결과에 대한 불복 수단일 수 있습니다.",
  long_occupation: "다른 민원인의 이용과 담당자 건강에 영향을 줍니다. 시간 제한 안내 절차로 대응합니다.",
  complaint_threat: "감사 청구·고소·언론 제보는 민원인의 정당한 권리 행사입니다. 위험 신호로 보지 않습니다.",
  recording_threat: "녹음·게시 예고 자체는 위험 신호가 아닙니다. 담당자 신상 공개로 이어질 때는 별도 판단이 필요합니다.",
  sexual_harassment: "응대를 중단하고 담당자를 교체·보호할 사유입니다.",
  personal_info: "업무 관계를 벗어난 접근입니다. 다른 안전 관련 행동과 함께 나타나면 위험도가 높아집니다.",
  refuse_leave: "청사 관리 절차(관리자·청원경찰 개입)로 대응할 사안입니다.",
  intoxicated: "판단력과 충동 조절이 저하된 상태일 수 있어 단독 응대를 피합니다.",
  threat_harm: "발언의 구체성(대상·방법·시점)에 따라 대응 수준이 달라집니다. 구체적이면 긴급 대응으로 전환합니다.",
  stalking: "업무 공간 밖에서의 접근은 담당자 개인 안전 문제입니다. 일시·장소를 기록하고 기관에 알립니다.",
  self_harm: "민원인의 생명 안전 문제입니다. 민원 처리와 별개로 즉시 보호 연계가 필요합니다.",
  weapon: "즉각적 위해 가능성이 있습니다. 응대를 중단하고 거리를 확보합니다.",
  physical: "이미 물리력이 행사되었습니다. 응대를 중단하고 안전을 확보합니다.",
};

export interface RiskSignal {
  behaviorId: BehaviorId;
  label: string;
  level: RiskLevel;
  note: string;
}

export interface NarrativeHint {
  behaviorId: BehaviorId;
  label: string;
  message: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  emergency: boolean;
  signals: RiskSignal[];
  /** 등급 산정 근거(사람이 읽는 설명) */
  rationale: string[];
  /** 긴급일 때 맨 위에 표시할 즉시 행동 */
  safetyActions: string[];
  /** 서술에는 보이지만 체크되지 않은 표현. 등급에 반영하지 않고 확인만 요청한다. */
  narrativeHints: NarrativeHint[];
  /** 규칙이 생성한 추가 확인 질문 */
  ruleQuestions: { question: string; why: string }[];
}

const NARRATIVE_KEYWORDS: { behaviorId: BehaviorId; re: RegExp }[] = [
  { behaviorId: "weapon", re: /흉기|칼을|칼로|망치|둔기|휘발유|시너|신나|인화|라이터|불\s?지르|불을\s?지르|폭발|염산/ },
  { behaviorId: "physical", re: /때렸|때리|밀쳤|밀치|멱살|던졌|던지|부쉈|부수|걷어찼|내리쳤|뺨/ },
  { behaviorId: "self_harm", re: /자살|자해|죽어\s?버리|목숨을\s?끊|뛰어내리|분신|같이\s?죽/ },
  { behaviorId: "threat_harm", re: /죽이|죽여|가만\s?안\s?둔|가만두지|찾아가서|밤길|무사하지|해코지|가족.{0,8}(알고|찾아)/ },
  { behaviorId: "stalking", re: /따라왔|따라오|미행|퇴근길|주차장에서\s?기다|집\s?앞|기다리고\s?있/ },
  { behaviorId: "personal_info", re: /집\s?주소|개인\s?(휴대폰|번호|연락처)|SNS|사는\s?곳|가족\s?관계/ },
  { behaviorId: "sexual_harassment", re: /성희롱|성적인|외모.{0,6}(평가|언급)|신체.{0,6}언급/ },
  { behaviorId: "intoxicated", re: /술\s?냄새|음주|취한|만취/ },
];

export interface RiskInput {
  behaviors: BehaviorId[];
  inPerson: boolean;
  narrative: string;
}

export function assessRisk({ behaviors, inPerson, narrative }: RiskInput): RiskAssessment {
  const set = new Set(behaviors);
  const rationale: string[] = [];
  let level: RiskLevel = "general";

  const signals: RiskSignal[] = behaviors.map((id) => {
    level = maxLevel(level, BASE_LEVEL[id]);
    return { behaviorId: id, label: behaviorLabel(id), level: BASE_LEVEL[id], note: SIGNAL_NOTE[id] };
  });

  // 결합 규칙: 위해 발언이 대면 상황 또는 사적 접근과 결합하면 긴급으로 올린다.
  if (set.has("threat_harm") && inPerson) {
    level = "emergency";
    rationale.push("신체 위해 발언이 현재 대면 상황에서 확인되어 긴급으로 분류했습니다.");
  }
  if (set.has("threat_harm") && (set.has("stalking") || set.has("personal_info"))) {
    level = "emergency";
    rationale.push("신체 위해 발언과 담당자 개인에 대한 접근 시도가 함께 확인되어 긴급으로 분류했습니다.");
  }
  if (level !== "emergency" && set.has("intoxicated") && inPerson && (set.has("verbal_abuse") || set.has("refuse_leave"))) {
    level = maxLevel(level, "protect");
    rationale.push("음주 상태의 대면 응대 중 폭언 또는 퇴거 불응이 확인되어 보호조치 필요로 분류했습니다.");
  }

  for (const id of ["self_harm", "weapon", "physical"] as const) {
    if (set.has(id)) rationale.push(`'${behaviorLabel(id)}'이(가) 확인되어 긴급으로 분류했습니다.`);
  }

  if (level === "protect") {
    const causes = signals.filter((s) => s.level === "protect").map((s) => `'${s.label}'`);
    if (causes.length) rationale.push(`${causes.join(", ")}이(가) 확인되어 보호조치 필요로 분류했습니다.`);
  }

  // 상한 규칙: 폭언·반복 연락·권리 행사 예고만으로는 '주의'를 넘지 않는다.
  const lowOnly = behaviors.every((b) =>
    ["verbal_abuse", "repeated_contact", "long_occupation", "complaint_threat", "recording_threat"].includes(b),
  );
  if (behaviors.length > 0 && lowOnly) {
    rationale.push("폭언·반복 연락·권리 행사 예고만 확인되었습니다. 이것만으로 고위험으로 분류하지 않습니다.");
  }
  if (behaviors.length === 0) {
    rationale.push("확인된 행동이 선택되지 않았습니다. 위험 등급은 체크된 행동으로만 산정합니다.");
  }

  const emergency = level === "emergency";

  const safetyActions: string[] = [];
  if (emergency) {
    safetyActions.push("응대를 중단하고 민원인과 거리를 둔 뒤 출입구 쪽으로 이동합니다. 혼자 대응하지 않습니다.");
    safetyActions.push("비상벨을 누르거나 동료·청원경찰에게 즉시 알립니다.");
    if (set.has("weapon") || set.has("physical") || set.has("threat_harm")) {
      safetyActions.push("위해가 임박했거나 진행 중이면 112에 신고합니다.");
    }
    if (set.has("self_harm")) {
      safetyActions.push("자해·자살 위험이 임박해 보이면 112·119에 신고하고, 민원인을 혼자 두지 않습니다.");
      safetyActions.push("임박하지 않으면 자살예방 상담전화(109) 연계를 안내하고 관리자에게 보고합니다.");
    }
    safetyActions.push("상황이 안정된 뒤에 기록·보고를 진행합니다. 민원 내용에 대한 설득은 지금 하지 않습니다.");
  }

  const narrativeHints: NarrativeHint[] = NARRATIVE_KEYWORDS.filter(
    ({ behaviorId, re }) => !set.has(behaviorId) && re.test(narrative),
  ).map(({ behaviorId }) => ({
    behaviorId,
    label: behaviorLabel(behaviorId),
    message: `서술에 '${behaviorLabel(behaviorId)}'과(와) 관련될 수 있는 표현이 있으나 확인된 행동으로 체크되지 않았습니다. 실제로 확인된 행동이면 체크한 뒤 다시 분석하세요.`,
  }));

  const ruleQuestions: { question: string; why: string }[] = [];
  if (set.has("threat_harm")) {
    ruleQuestions.push({
      question: "위해 발언에 대상·방법·시점이 구체적으로 포함되어 있었습니까?",
      why: "발언의 구체성에 따라 긴급 대응 여부가 달라집니다.",
    });
  }
  if (set.has("repeated_contact")) {
    ruleQuestions.push({
      question: "반복 제기된 민원이 이전과 같은 내용입니까, 새로운 사실이나 자료가 포함되어 있습니까?",
      why: "새로운 사실이 있으면 반복 민원이 아니라 새 민원으로 검토해야 합니다.",
    });
  }
  if (set.has("self_harm")) {
    ruleQuestions.push({
      question: "자해·자살 언급에 구체적인 계획이나 수단이 포함되어 있었습니까?",
      why: "구체적 계획이 있으면 즉시 신고·보호 연계가 필요합니다.",
    });
  }
  if (set.has("stalking") || set.has("personal_info")) {
    ruleQuestions.push({
      question: "업무 공간 밖에서의 접근이 몇 차례, 언제 있었습니까?",
      why: "일시·횟수 기록이 기관 보호조치와 법적 대응 검토의 기초가 됩니다.",
    });
  }
  if (behaviors.length > 0) {
    ruleQuestions.push({
      question: "민원인이 요구하는 것 가운데 절차상 아직 처리되지 않았거나 설명되지 않은 부분이 있습니까?",
      why: "행동과 별개로 민원 내용에 정당한 부분이 있는지 확인해야 합니다.",
    });
  }

  return { level, emergency, signals, rationale, safetyActions, narrativeHints, ruleQuestions };
}
