import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { analyzeCase } from "@/lib/analyze";
import { detectPii, hasHardPii } from "@/lib/pii";
import { AnalyzeRequestSchema, type AnalyzeError } from "@/lib/schema";

export const maxDuration = 120;

// 단순 메모리 기반 요청 제한(시연용). 인스턴스가 여러 개인 배포에서는 외부 저장소로 바꿔야 한다.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function accessAllowed(given: string | null): boolean {
  const expected = process.env.ACCESS_CODE;
  if (!expected) return true;
  const a = createHash("sha256").update(given ?? "").digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const fail =(status: number, body: AnalyzeError) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return fail(429, { error: "rate_limited", message: "요청이 너무 많습니다. 1분 뒤에 다시 시도하세요." });
  }

  // 배포 환경에서는 ACCESS_CODE를 설정해 교육 참여자만 AI 분석을 호출하게 한다.
  if (!accessAllowed(request.headers.get("x-access-code"))) {
    return fail(401, { error: "unauthorized", message: "참여 코드가 올바르지 않습니다. 교육 담당자에게 받은 코드를 입력하세요." });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail(400, { error: "invalid_input", message: "요청 형식이 올바르지 않습니다." });
  }

  const parsed = AnalyzeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return fail(400, {
      error: "invalid_input",
      message: "입력값을 확인하세요. 서술 길이, 선택 항목, 가상 사례 확인 체크가 필요합니다.",
    });
  }
  const req = parsed.data;

  // 개인정보는 클라이언트 경고와 별개로 서버에서 다시 확인하고, 있으면 AI로 보내지 않는다.
  const text = [req.narrative, ...req.clarifications.map((c) => c.answer)].join("\n");
  const pii = detectPii(text);
  if (hasHardPii(pii)) {
    return fail(422, {
      error: "pii_detected",
      message: "개인정보로 보이는 내용이 포함되어 분석하지 않았습니다. 해당 내용을 지우거나 가상의 값으로 바꾸세요.",
      pii: pii.filter((f) => f.severity === "hard"),
    });
  }

  try {
    const result = await analyzeCase(req);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // 입력 원문은 로그에 남기지 않는다.
    console.error(`[analyze] unhandled ${err instanceof Error ? err.name : "error"}`);
    return fail(500, { error: "server_error", message: "분석 중 오류가 발생했습니다. 잠시 뒤 다시 시도하세요." });
  }
}
