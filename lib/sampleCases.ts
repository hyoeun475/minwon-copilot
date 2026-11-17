import type { ActorId, BehaviorId, StageId } from "./constants";

export interface SampleCase {
  id: string;
  title: string;
  teaser: string;
  actor: ActorId;
  stage: StageId;
  behaviors: BehaviorId[];
  inPerson: boolean;
  narrative: string;
}

// 모두 교육용으로 지어낸 가상 사례다. 실제 인물·사업장·사건과 무관하다.
export const SAMPLE_CASES: SampleCase[] = [
  {
    id: "case-1",
    title: "사례 1 · 종결 후 반복 전화",
    teaser: "임금체불 진정 종결 뒤 같은 내용으로 매일 전화",
    actor: "worker",
    stage: "closed_repeat",
    behaviors: ["repeated_contact", "verbal_abuse", "long_occupation", "complaint_threat"],
    inPerson: false,
    narrative:
      "민원인 A는 가상의 사업장 '가나물산'에서 퇴직한 뒤 연장근로수당 체불로 진정을 제기했다. 조사 결과 출퇴근 기록 등 입증 자료가 부족해 일부만 인정되어 종결 통지를 했다. 통지 후 2주 동안 민원인 A는 거의 매일 전화해 같은 내용을 다시 설명하고 있으며, 통화는 한 번에 40분 이상 이어진다. 통화 중 '사업주 편만 든다', '돈 받았냐'고 소리치고 욕설을 한 적이 세 차례 있다. 어제는 '감사원에 민원 넣고 언론에 제보하겠다'고 했다. 동료에게 듣기로는 민원인 A가 퇴직 후 생활이 어렵다고 한다. 새로운 증거 자료를 제출한 적은 없다.",
  },
  {
    id: "case-2",
    title: "사례 2 · 감독 중 사업주의 압박",
    teaser: "노동감독 결과에 반발하며 담당자 신상을 언급",
    actor: "employer",
    stage: "investigation",
    behaviors: ["verbal_abuse", "recording_threat", "personal_info", "complaint_threat"],
    inPerson: false,
    narrative:
      "가상의 제조업체 '다라정밀'에 대한 노동감독에서 휴게시간 미부여와 임금명세서 미교부가 확인되어 시정지시를 예고했다. 사업주 B는 전화로 '영세업체 죽이려고 작정했냐'며 고성을 질렀고, 통화를 녹음해 인터넷 카페에 올리겠다고 했다. 이후 담당 감독관의 이름을 검색했다면서 '어느 동네 사는지 대충 안다', '아이가 다니는 학교도 알아볼 수 있다'고 말했다. 직접적으로 해치겠다는 말은 하지 않았다. 사업주 B는 지역 국회의원실에 민원을 넣겠다고도 했다. 감독관은 사업주 B가 최근 거래처 부도로 경영이 어렵다고 추측하고 있다.",
  },
  {
    id: "case-3",
    title: "사례 3 · 음주 방문과 위해 발언",
    teaser: "민원실 대면 중 위해 발언과 자해 언급",
    actor: "worker",
    stage: "notified",
    behaviors: ["intoxicated", "verbal_abuse", "refuse_leave", "threat_harm", "self_harm"],
    inPerson: true,
    narrative:
      "민원인 C는 가상의 건설 현장에서 일하다 해고된 뒤 부당해고와 임금체불을 주장했으나, 근로자성 판단이 어렵다는 취지의 처리 결과를 통지받았다. 오늘 오후 술 냄새가 나는 상태로 민원실에 찾아와 담당 감독관을 지목해 큰 소리로 욕설을 했다. 상담 종료와 퇴거를 두 차례 요청했으나 자리를 떠나지 않고 있다. 민원인 C는 책상을 손바닥으로 내리치며 '너 퇴근할 때 보자, 가만 안 둔다'고 했고, 잠시 뒤에는 '나는 더 살 이유가 없다, 여기서 끝내겠다'고 말했다. 손에 든 물건은 보이지 않는다. 주변에 다른 민원인 두 명이 있다.",
  },
];
