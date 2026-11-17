// AI 출력 사후검증. 프롬프트로 요청한 제한을 서버에서 한 번 더 강제한다.

const RULES: { name: string; mask: string; re: RegExp }[] = [
  {
    name: "진단성 표현",
    mask: "[진단성 표현 삭제]",
    re: /(성격\s?장애|인격\s?장애|조현병|정신분열증?|편집증|망상\s?장애|피해\s?망상|사이코패스|소시오패스|정신\s?질환자?|정신병|나르시시스트|자기애성|경계선\s?성격|반사회성|분노\s?조절\s?장애|조울증|양극성\s?장애|우울증|강박증|ADHD)/g,
  },
  {
    name: "범죄 단정 표현",
    mask: "[법적 평가 삭제]",
    re: /(협박죄|모욕죄|폭행죄|상해죄|공무집행\s?방해죄?|업무\s?방해죄?|명예\s?훼손죄?|퇴거\s?불응죄|재물\s?손괴죄?|스토킹\s?범죄|범죄에\s?해당(합니다|한다|됨)|범죄자|가해자)/g,
  },
  {
    name: "미검증 법령·판례 인용",
    mask: "[미검증 인용 삭제]",
    re: /(형법|[가-힣]*처벌법|제\s?\d+\s?조(의\s?\d+)?(\s?제\s?\d+\s?항)?|대법원|헌법재판소|고등법원|지방법원|판례|\d{2,4}\s?(도|다|두|누|헌마|헌바|고단|고합)\s?\d{2,})/g,
  },
];

export interface GuardReport {
  notices: string[];
}

export function sanitizeDeep<T>(value: T): { value: T; report: GuardReport } {
  const counts = new Map<string, number>();

  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      let out = v;
      for (const rule of RULES) {
        out = out.replace(rule.re, () => {
          counts.set(rule.name, (counts.get(rule.name) ?? 0) + 1);
          return rule.mask;
        });
      }
      return out;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };

  const sanitized = walk(value) as T;
  const notices = [...counts].map(
    ([name, n]) => `AI 출력에서 ${name} ${n}건을 서버 검증 단계에서 삭제했습니다. 해당 부분은 담당자가 직접 확인하세요.`,
  );
  return { value: sanitized, report: { notices } };
}
