"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  COLOR_PALETTE,
  ChoreError,
  DEFAULT_EMOJI,
  EMOJI_PALETTE,
  createChore,
  updateChore,
  type PaletteColor,
} from "@/lib/chore/operations";
import type {
  ChoreDoc,
  ChoreMode,
  FixedScheduleEntry,
  GroupDoc,
} from "@/lib/types/firestore";
import { mapFirestoreError } from "@/lib/firebase/errors";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
};

export interface ChoreFormProps {
  group: GroupDoc;
  initial?: ChoreDoc;
}

export function ChoreForm({ group, initial }: ChoreFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [mode, setMode] = useState<ChoreMode>(initial?.mode ?? "rotation");
  const [color, setColor] = useState<string>(initial?.color ?? COLOR_PALETTE[0]);
  const [emoji, setEmoji] = useState<string>(initial?.emoji ?? DEFAULT_EMOJI);
  const [rotationOrder, setRotationOrder] = useState<string[]>(
    initial?.rotationOrder ?? [],
  );
  const [allowProxyComplete, setAllowProxyComplete] = useState(
    initial?.allowProxyComplete ?? false,
  );
  const [fixedSchedule, setFixedSchedule] = useState<FixedScheduleEntry[]>(
    initial?.fixedSchedule ?? [],
  );
  const [rules, setRules] = useState<string[]>(initial?.rules ?? []);
  const [newRule, setNewRule] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && initial) {
        await updateChore(initial.id, {
          name,
          color,
          emoji,
          rotationOrder: mode === "rotation" ? rotationOrder : [],
          allowProxyComplete,
          fixedSchedule: mode === "fixed" ? fixedSchedule : [],
          rules,
        });
      } else {
        await createChore({
          groupId: group.id,
          name,
          mode,
          color,
          emoji,
          rotationOrder: mode === "rotation" ? rotationOrder : [],
          allowProxyComplete,
          fixedSchedule: mode === "fixed" ? fixedSchedule : [],
          rules,
        });
      }
      router.push("/chores");
    } catch (err) {
      setError(
        err instanceof ChoreError
          ? err.message
          : mapFirestoreError(err, "저장 실패."),
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Field label="이름">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 설거지"
          maxLength={30}
          className="input"
        />
      </Field>

      <Field label="아이콘">
        <EmojiPicker value={emoji} onChange={setEmoji} />
      </Field>

      <Field label="색상">
        <ColorPicker value={color} onChange={setColor} />
      </Field>

      <Field label="모드">
        <ModePicker value={mode} onChange={setMode} disabled={isEdit} />
        {isEdit && (
          <p className="mt-1.5 text-xs text-muted">
            모드는 등록 후 변경할 수 없습니다 (이력 일관성).
          </p>
        )}
      </Field>

      {mode === "rotation" ? (
        <>
          <Field label="참여 멤버 · 순서">
            <RotationOrderEditor
              group={group}
              value={rotationOrder}
              onChange={setRotationOrder}
            />
          </Field>
          <Field label="대신 완료 허용">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowProxyComplete}
                onChange={(e) => setAllowProxyComplete(e.target.checked)}
              />
              <span>
                참여 멤버 누구나 대신 완료할 수 있습니다 (통계는 차례 멤버
                기준 귀속).
              </span>
            </label>
          </Field>
        </>
      ) : (
        <Field label="고정 스케줄">
          <FixedScheduleEditor
            group={group}
            value={fixedSchedule}
            onChange={setFixedSchedule}
          />
        </Field>
      )}

      <Field label="완료 규칙 (참고용)">
        <RulesEditor
          value={rules}
          onChange={setRules}
          newRule={newRule}
          setNewRule={setNewRule}
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-brand py-2.5 font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "저장 중…" : isEdit ? "저장" : "추가"}
        </button>
        <Link
          href="/chores"
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background"
        >
          취소
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

function ModePicker({
  value,
  onChange,
  disabled,
}: {
  value: ChoreMode;
  onChange: (v: ChoreMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["rotation", "fixed"] as const).map((m) => {
        const label = m === "rotation" ? "순번제" : "고정제";
        const hint = m === "rotation" ? "차례대로 돌아감" : "요일/주기 지정";
        const active = value === m;
        return (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m)}
            className={[
              "rounded-lg border px-3 py-2.5 text-left transition",
              active
                ? "border-brand bg-brand/10"
                : "border-border bg-surface hover:bg-background",
              disabled && "cursor-not-allowed opacity-50",
            ].filter(Boolean).join(" ")}
          >
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted">{hint}</p>
          </button>
        );
      })}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: PaletteColor) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`색상 ${c}`}
            className={[
              "h-8 w-8 rounded-full border-2 transition",
              selected ? "border-foreground ring-2 ring-brand/40" : "border-transparent",
            ].join(" ")}
            style={{ backgroundColor: c }}
          />
        );
      })}
    </div>
  );
}

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOJI_PALETTE.map((e) => {
        const selected = value === e;
        return (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            aria-label={`아이콘 ${e}`}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition",
              selected
                ? "border-brand bg-brand/10 ring-2 ring-brand/30"
                : "border-border bg-surface hover:bg-background",
            ].join(" ")}
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}

function RotationOrderEditor({
  group,
  value,
  onChange,
}: {
  group: GroupDoc;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const allMembers = group.memberUids;
  const inOrder = value;
  const notInOrder = allMembers.filter((uid) => !inOrder.includes(uid));

  const nameOf = (uid: string) => group.memberNames?.[uid] ?? uid.slice(0, 6);

  function add(uid: string) {
    onChange([...inOrder, uid]);
  }
  function remove(uid: string) {
    onChange(inOrder.filter((x) => x !== uid));
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...inOrder];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs text-muted">현재 순서</p>
        {inOrder.length === 0 ? (
          <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">
            아래에서 멤버를 추가하세요.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {inOrder.map((uid, idx) => (
              <li
                key={uid}
                className="flex items-center gap-2 rounded-lg bg-background px-3 py-2"
              >
                <span className="w-5 text-center text-xs font-bold text-muted">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm text-foreground">{nameOf(uid)}</span>
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface disabled:opacity-30"
                  aria-label="위로"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === inOrder.length - 1}
                  className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface disabled:opacity-30"
                  aria-label="아래로"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => remove(uid)}
                  className="rounded px-1.5 py-0.5 text-xs text-muted hover:text-chore-red"
                >
                  제외
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {notInOrder.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-muted">추가할 멤버</p>
          <div className="flex flex-wrap gap-1.5">
            {notInOrder.map((uid) => (
              <button
                key={uid}
                type="button"
                onClick={() => add(uid)}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background"
              >
                + {nameOf(uid)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FixedScheduleEditor({
  group,
  value,
  onChange,
}: {
  group: GroupDoc;
  value: FixedScheduleEntry[];
  onChange: (next: FixedScheduleEntry[]) => void;
}) {
  const nameOf = (uid: string) => group.memberNames?.[uid] ?? uid.slice(0, 6);

  function addWeekly() {
    onChange([
      ...value,
      { uid: group.memberUids[0] ?? "", type: "weekly", weekdays: [] },
    ]);
  }
  function addInterval() {
    onChange([
      ...value,
      {
        uid: group.memberUids[0] ?? "",
        type: "interval",
        intervalDays: 7,
        startDate: new Date().toISOString().slice(0, 10),
      },
    ]);
  }
  function patch(idx: number, next: FixedScheduleEntry) {
    onChange(value.map((e, i) => (i === idx ? next : e)));
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">
          스케줄을 추가하세요. 같은 멤버에게 여러 entry를 둘 수도 있습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((entry, idx) => (
            <li
              key={idx}
              className="space-y-2 rounded-lg bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <select
                  value={entry.uid}
                  onChange={(e) => patch(idx, { ...entry, uid: e.target.value })}
                  className="input flex-1"
                >
                  {group.memberUids.map((uid) => (
                    <option key={uid} value={uid}>
                      {nameOf(uid)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded px-2 py-1 text-xs text-muted hover:text-chore-red"
                >
                  삭제
                </button>
              </div>

              {entry.type === "weekly" ? (
                <WeekdayPicker
                  value={entry.weekdays}
                  onChange={(weekdays) => patch(idx, { ...entry, weekdays })}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">
                    <span className="block text-muted">N일 주기</span>
                    <input
                      type="number"
                      min={1}
                      value={entry.intervalDays}
                      onChange={(e) =>
                        patch(idx, {
                          ...entry,
                          intervalDays: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="input mt-0.5"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="block text-muted">시작일</span>
                    <input
                      type="date"
                      value={entry.startDate}
                      onChange={(e) =>
                        patch(idx, { ...entry, startDate: e.target.value })
                      }
                      className="input mt-0.5"
                    />
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addWeekly}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
        >
          + 요일 지정
        </button>
        <button
          type="button"
          onClick={addInterval}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
        >
          + 주기 지정
        </button>
      </div>
    </div>
  );
}

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
  function toggle(dow: number) {
    if (value.includes(dow)) onChange(value.filter((d) => d !== dow));
    else onChange([...value, dow].sort((a, b) => a - b));
  }
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4, 5, 6].map((d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={[
              "h-8 w-8 rounded-full text-xs font-semibold transition",
              active
                ? "bg-brand text-brand-foreground"
                : "bg-surface text-muted hover:bg-background",
            ].join(" ")}
          >
            {WEEKDAY_LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}

function RulesEditor({
  value,
  onChange,
  newRule,
  setNewRule,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  newRule: string;
  setNewRule: (s: string) => void;
}) {
  function add() {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setNewRule("");
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((rule, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-md bg-background px-3 py-1.5"
            >
              <span className="flex-1 text-sm text-foreground">· {rule}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs text-muted hover:text-chore-red"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="예: 음식물쓰레기 비우기"
          maxLength={50}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
        >
          추가
        </button>
      </div>
    </div>
  );
}
