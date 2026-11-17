// 입력 선택지 정의. 클라이언트와 서버가 같은 목록을 사용한다.

export const ACTORS = [
  { id: "worker", label: "근로자(진정인·신고인)" },
  { id: "employer", label: "사업주·사용자 측" },
  { id: "family", label: "가족·지인 등 대리인" },
  { id: "third", label: "제3자(이해관계 불분명)" },
  { id: "unknown", label: "확인되지 않음" },
] as const;

export const STAGES = [
  { id: "intake", label: "접수·초기 상담" },
  { id: "investigation", label: "조사·감독 진행 중" },
  { id: "notified", label: "처리결과 통지 후" },
  { id: "closed_repeat", label: "종결 후 반복 제기" },
] as const;

export const BEHAVIOR_GROUPS = [
  { id: "communication", label: "의사소통 양상" },
  { id: "rights", label: "권리 행사 예고" },
  { id: "boundary", label: "경계 침범" },
  { id: "safety", label: "안전 관련" },
] as const;

export type BehaviorGroupId = (typeof BEHAVIOR_GROUPS)[number]["id"];

export const BEHAVIORS = [
  { id: "verbal_abuse", group: "communication", label: "폭언·욕설·고성" },
  { id: "repeated_contact", group: "communication", label: "같은 내용의 반복 전화·방문·민원 제기" },
  { id: "long_occupation", group: "communication", label: "장시간 통화·면담으로 업무 점거" },
  { id: "complaint_threat", group: "rights", label: "감사·고소·언론 제보·상급기관 민원 예고" },
  { id: "recording_threat", group: "rights", label: "녹음·촬영 또는 온라인 게시 예고" },
  { id: "sexual_harassment", group: "boundary", label: "성희롱성 발언·행동" },
  { id: "personal_info", group: "boundary", label: "담당자 개인정보 탐색·사적 연락 시도" },
  { id: "refuse_leave", group: "boundary", label: "퇴거 요청 불응" },
  { id: "intoxicated", group: "boundary", label: "음주 상태로 방문" },
  { id: "threat_harm", group: "safety", label: "신체 위해를 가하겠다는 발언" },
  { id: "stalking", group: "safety", label: "청사 주변 대기·미행·퇴근길 접근" },
  { id: "self_harm", group: "safety", label: "자해·자살 언급" },
  { id: "weapon", group: "safety", label: "흉기·위험물 소지 또는 사용 언급" },
  { id: "physical", group: "safety", label: "물리력 행사(폭행·기물 파손·투척)" },
] as const satisfies readonly { id: string; group: BehaviorGroupId; label: string }[];

export type ActorId = (typeof ACTORS)[number]["id"];
export type StageId = (typeof STAGES)[number]["id"];
export type BehaviorId = (typeof BEHAVIORS)[number]["id"];

export const BEHAVIOR_IDS = BEHAVIORS.map((b) => b.id) as [BehaviorId, ...BehaviorId[]];
export const ACTOR_IDS = ACTORS.map((a) => a.id) as [ActorId, ...ActorId[]];
export const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]];

export const behaviorLabel = (id: BehaviorId) => BEHAVIORS.find((b) => b.id === id)?.label ?? id;
export const actorLabel = (id: ActorId) => ACTORS.find((a) => a.id === id)?.label ?? id;
export const stageLabel = (id: StageId) => STAGES.find((s) => s.id === id)?.label ?? id;

export const LIMITS = {
  narrativeMin: 30,
  narrativeMax: 3000,
  answerMax: 500,
  maxClarifications: 8,
} as const;
