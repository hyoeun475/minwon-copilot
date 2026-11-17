// 선별된 근거자료 목록.
// AI는 이 목록의 id만 선택할 수 있고, 조문 내용을 스스로 서술하지 못한다(guard.ts에서 차단).
//
// checkedAt: 담당자가 원문을 직접 확인한 날짜(YYYY-MM-DD). null이면 화면에 "원문 확인 필요"로 표시된다.
// 시연 전에 각 항목의 원문을 확인하고 날짜를 채워 넣을 것.

export interface Reference {
  id: string;
  title: string;
  kind: "법령" | "지침·매뉴얼" | "정책자료";
  source: string;
  /** 이 자료를 참고하는 맥락. 조문 내용의 요약이 아니라 "무엇을 확인하러 가는지"만 적는다. */
  useFor: string;
  url: string;
  checkedAt: string | null;
}

export const REFERENCES = [
  {
    id: "minwon_act_4",
    title: "민원 처리에 관한 법률 제4조 (민원 처리 담당자의 의무와 보호)",
    kind: "법령",
    source: "국가법령정보센터",
    useFor: "기관이 민원 처리 담당자를 보호하기 위해 취해야 하는 조치의 근거를 확인할 때",
    url: "https://www.law.go.kr/법령/민원처리에관한법률",
    checkedAt: null,
  },
  {
    id: "minwon_decree_4",
    title: "민원 처리에 관한 법률 시행령 제4조 (민원 처리 담당자의 보호)",
    kind: "법령",
    source: "국가법령정보센터",
    useFor: "녹음·영상 기록, 통화·면담 종료, 안전요원 등 구체적 보호조치의 요건을 확인할 때",
    url: "https://www.law.go.kr/법령/민원처리에관한법률시행령",
    checkedAt: null,
  },
  {
    id: "minwon_act_23",
    title: "민원 처리에 관한 법률 제23조 (반복 및 중복 민원의 처리)",
    kind: "법령",
    source: "국가법령정보센터",
    useFor: "같은 내용의 민원이 반복될 때 종결 처리 요건과 절차를 확인할 때",
    url: "https://www.law.go.kr/법령/민원처리에관한법률",
    checkedAt: null,
  },
  {
    id: "osh_act_41",
    title: "산업안전보건법 제41조 (고객의 폭언 등으로 인한 건강장해 예방조치 등)",
    kind: "법령",
    source: "국가법령정보센터",
    useFor: "폭언 등을 겪은 담당자의 업무 일시 중단·전환, 휴게 등 사후 보호조치를 확인할 때",
    url: "https://www.law.go.kr/법령/산업안전보건법",
    checkedAt: null,
  },
  {
    id: "mois_manual",
    title: "민원인의 위법행위 및 반복민원 대응방안(공직자 민원응대 매뉴얼)",
    kind: "지침·매뉴얼",
    source: "행정안전부",
    useFor: "유형별(폭언·협박·성희롱·장시간 통화 등) 단계별 응대 절차와 표준 안내 문구를 확인할 때",
    url: "https://www.mois.go.kr",
    checkedAt: null,
  },
  {
    id: "gov_plan_2024",
    title: "악성민원 방지 및 민원공무원 보호 강화 대책",
    kind: "정책자료",
    source: "관계부처 합동",
    useFor: "기관 차원의 대응 원칙(기관 대응, 담당자 보호, 법적 대응 지원)의 정책 방향을 확인할 때",
    url: "https://www.korea.kr",
    checkedAt: null,
  },
  {
    id: "agency_internal",
    title: "소속 기관 특이민원 대응 내부 지침·비상연락 체계",
    kind: "지침·매뉴얼",
    source: "소속 지방고용노동관서",
    useFor: "보고 경로, 비상벨·청원경찰 호출, 법적 대응 지원 창구 등 실제 절차를 확인할 때",
    url: "",
    checkedAt: null,
  },
] as const satisfies readonly Reference[];

export type ReferenceId = (typeof REFERENCES)[number]["id"];
export const REFERENCE_IDS = REFERENCES.map((r) => r.id) as [ReferenceId, ...ReferenceId[]];
