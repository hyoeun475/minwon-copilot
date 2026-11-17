// 개인정보 입력 감지. 클라이언트(입력 중 경고)와 서버(요청 차단)가 함께 사용한다.
// 감지 결과에는 원문을 담지 않고 유형과 건수만 담는다.

export type PiiKind = "rrn" | "phone" | "email" | "bizno" | "card" | "name";

export interface PiiFinding {
  kind: PiiKind;
  label: string;
  count: number;
  /** hard: 서버가 요청을 거부한다. soft: 경고만 한다(오탐 가능). */
  severity: "hard" | "soft";
}

const HARD_PATTERNS: { kind: PiiKind; label: string; re: RegExp }[] = [
  { kind: "rrn", label: "주민등록번호·외국인등록번호", re: /\d{6}\s?[-–]?\s?[1-8]\d{6}/g },
  { kind: "phone", label: "휴대전화번호", re: /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g },
  { kind: "phone", label: "유선 전화번호", re: /0(?:2|[3-6]\d)[-\s.]\d{3,4}[-\s.]\d{4}/g },
  { kind: "email", label: "이메일 주소", re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { kind: "bizno", label: "사업자등록번호", re: /\d{3}-\d{2}-\d{5}/g },
  { kind: "card", label: "카드·계좌로 보이는 긴 숫자열", re: /\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}/g },
];

// 실명 추정: 흔한 성씨로 시작하는 2~4자 + 호칭. 오탐이 있을 수 있어 경고만 한다.
const SURNAMES = "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구나지엄채원천방공현함변염여추도소석선설마길연표명기반왕금옥육인맹제모탁국어은편용";
const NAME_RE = new RegExp(
  `(?<![가-힣])[${SURNAMES}][가-힣]{1,3}\\s?(?:씨|님|군|양|대표|사장|과장|부장|팀장|주무관|감독관|근로감독관|노동감독관)(?![가-힣])`,
  "g",
);
const NAME_ALLOW = /^(민원인|진정인|신고인|고소인|피진정인|사업주|사용자|근로자|감독관|주무관|담당자|선생|고객|상급자|관리자|대리인|이해관계인|제보자|신청인|한\s?감독관|한\s?주무관)/;

export function detectPii(text: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  for (const { kind, label, re } of HARD_PATTERNS) {
    const count = text.match(re)?.length ?? 0;
    if (count > 0) findings.push({ kind, label, count, severity: "hard" });
  }
  const names = (text.match(NAME_RE) ?? []).filter((m) => !NAME_ALLOW.test(m));
  if (names.length > 0) {
    findings.push({ kind: "name", label: "실명으로 보이는 표현", count: names.length, severity: "soft" });
  }
  return findings;
}

export const hasHardPii = (findings: PiiFinding[]) => findings.some((f) => f.severity === "hard");
