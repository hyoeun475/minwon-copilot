"use client";

import { useMemo } from "react";
import {
  ACTORS,
  BEHAVIOR_GROUPS,
  BEHAVIORS,
  LIMITS,
  STAGES,
  type ActorId,
  type BehaviorId,
  type StageId,
} from "@/lib/constants";
import { detectPii, hasHardPii } from "@/lib/pii";
import { SAMPLE_CASES } from "@/lib/sampleCases";

export interface FormState {
  narrative: string;
  actor: ActorId;
  stage: StageId;
  behaviors: BehaviorId[];
  inPerson: boolean;
  fictionalConfirmed: boolean;
}

export const EMPTY_FORM: FormState = {
  narrative: "",
  actor: "worker",
  stage: "intake",
  behaviors: [],
  inPerson: false,
  fictionalConfirmed: false,
};

interface Props {
  form: FormState;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  loading: boolean;
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-5">
      <legend className="float-left mb-3 flex w-full items-baseline gap-2">
        <span className="font-mono text-sm font-bold text-accent">{n}</span>
        <span className="text-base font-bold">{title}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function Choice<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.id}
          className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
            value === o.id ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-accent"
          }`}
        >
          <input type="radio" name={name} className="sr-only" checked={value === o.id} onChange={() => onChange(o.id)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function CaseForm({ form, onChange, onSubmit, loading }: Props) {
  const pii = useMemo(() => detectPii(form.narrative), [form.narrative]);
  const hardPii = hasHardPii(pii);
  const length = form.narrative.trim().length;
  const tooShort = length < LIMITS.narrativeMin;
  const canSubmit = !loading && !tooShort && !hardPii && form.fictionalConfirmed;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => onChange({ ...form, [key]: value });
  const toggle = (id: BehaviorId) =>
    set("behaviors", form.behaviors.includes(id) ? form.behaviors.filter((b) => b !== id) : [...form.behaviors, id]);

  const blockReason = hardPii
    ? "개인정보로 보이는 내용을 지워야 분석할 수 있습니다."
    : tooShort
      ? `사례를 ${LIMITS.narrativeMin}자 이상 서술하세요.`
      : !form.fictionalConfirmed
        ? "가상 사례 확인에 체크하세요."
        : null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <div>
        <p className="text-sm font-semibold text-muted">가상 사례 불러오기</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {SAMPLE_CASES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                onChange({
                  narrative: c.narrative,
                  actor: c.actor,
                  stage: c.stage,
                  behaviors: c.behaviors,
                  inPerson: c.inPerson,
                  fictionalConfirmed: form.fictionalConfirmed,
                })
              }
              className="rounded-md border border-line bg-surface p-3 text-left transition-colors hover:border-accent"
            >
              <span className="block text-sm font-bold">{c.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{c.teaser}</span>
            </button>
          ))}
        </div>
      </div>

      <Step n={1} title="사건 서술" hint="가상 사례만 입력">
        <label htmlFor="narrative" className="sr-only">
          사건 자유서술
        </label>
        <textarea
          id="narrative"
          value={form.narrative}
          onChange={(e) => set("narrative", e.target.value)}
          maxLength={LIMITS.narrativeMax}
          rows={9}
          aria-describedby="narrative-help"
          placeholder="무슨 일이 있었는지 시간 순서로 적으세요. 직접 보거나 들은 것과 전해 들은 것을 구분해 적으면 분석이 정확해집니다. 인물은 '민원인 A', '사업주 B'처럼 적습니다."
          className={`w-full rounded-md border bg-surface p-3 text-[15px] leading-relaxed placeholder:text-muted/70 ${
            hardPii ? "border-emergency" : "border-line"
          }`}
        />
        <div id="narrative-help" className="mt-1 flex justify-between text-xs text-muted">
          <span>실명·연락처·주민등록번호·실제 사건번호는 적지 마세요.</span>
          <span className="tabular-nums">
            {length.toLocaleString()} / {LIMITS.narrativeMax.toLocaleString()}
          </span>
        </div>

        {pii.length > 0 && (
          <div
            role="alert"
            className={`mt-2 rounded-md border p-3 text-sm ${
              hardPii ? "border-emergency bg-emergency-soft" : "border-protect bg-protect-soft"
            }`}
          >
            <p className="font-bold">{hardPii ? "개인정보로 보이는 내용이 있습니다" : "실명이 포함되지 않았는지 확인하세요"}</p>
            <ul className="mt-1">
              {pii.map((f) => (
                <li key={f.label}>
                  · {f.label} {f.count}건{f.severity === "soft" && " (오탐일 수 있습니다)"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Step>

      <Step n={2} title="민원 주체">
        <Choice name="actor" options={ACTORS} value={form.actor} onChange={(v) => set("actor", v)} />
      </Step>

      <Step n={3} title="사건 진행 단계">
        <Choice name="stage" options={STAGES} value={form.stage} onChange={(v) => set("stage", v)} />
      </Step>

      <Step n={4} title="확인된 행동" hint="직접 보거나 들은 것만 체크">
        <div className="space-y-4">
          {BEHAVIOR_GROUPS.map((g) => (
            <div key={g.id}>
              <p className="text-xs font-bold tracking-wide text-muted">{g.label}</p>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {BEHAVIORS.filter((b) => b.group === g.id).map((b) => {
                  const on = form.behaviors.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        on ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent"
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggle(b.id)} className="mt-0.5 size-4 accent-accent" />
                      <span>{b.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={form.inPerson}
              onChange={(e) => set("inPerson", e.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              <b>지금 대면 상황이 진행 중</b>
              <span className="block text-xs text-muted">민원인이 현재 같은 공간에 있는 경우</span>
            </span>
          </label>
        </div>
      </Step>

      <div className="border-t border-line pt-5">
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.fictionalConfirmed}
            onChange={(e) => set("fictionalConfirmed", e.target.checked)}
            className="mt-0.5 size-4 accent-accent"
          />
          <span>
            입력한 내용은 <b>교육용 가상 사례</b>이며, 실제 사건 원문·개인정보·수사기록이 포함되어 있지 않습니다.
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full rounded-md bg-accent px-4 py-3 text-base font-bold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
        >
          {loading ? "분석하는 중…" : "사례 분석하기"}
        </button>
        {blockReason && !loading && <p className="mt-2 text-center text-xs text-muted">{blockReason}</p>}
      </div>
    </form>
  );
}
