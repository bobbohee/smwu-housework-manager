export interface RandomResultCardProps {
  allUids: string[];
  winners: string[];
  memberNames: Record<string, string>;
  onReset: () => void;
}

const PINK = "#ec4899"; // pink-500

export function RandomResultCard({
  allUids,
  winners,
  memberNames,
  onReset,
}: RandomResultCardProps) {
  const winnerSet = new Set(winners);

  return (
    <div className="mt-6 text-center">
      <p className="mb-4 text-sm text-muted">당첨자 발표!</p>

      <div className="mb-8 flex flex-wrap items-start justify-center gap-6">
        {allUids.map((uid) => {
          const isWinner = winnerSet.has(uid);
          const name = memberNames[uid] ?? uid.slice(0, 4);
          return (
            <div
              key={uid}
              className="flex flex-col items-center"
            >
              <div
                className="mb-1.5 flex h-16 w-16 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: isWinner ? PINK : "var(--border)",
                  backgroundColor: isWinner ? PINK + "1F" : "var(--surface)",
                }}
              >
                <span className="text-3xl">{isWinner ? "💣" : "😌"}</span>
              </div>
              <div
                className="text-[13px]"
                style={{ color: isWinner ? PINK : "var(--muted)" }}
              >
                <span className={isWinner ? "font-bold" : ""}>{name}</span>
              </div>
              <div
                className="text-[11px]"
                style={{ color: isWinner ? PINK : "var(--muted)" }}
              >
                <span className={isWinner ? "font-semibold" : ""}>
                  {isWinner ? "당첨!" : "꽝"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-lg border border-border bg-transparent py-2.5 text-sm font-semibold text-muted hover:bg-surface"
        >
          다시하기
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-[2] rounded-lg bg-brand py-2.5 text-sm font-bold text-brand-foreground hover:opacity-90"
        >
          확인
        </button>
      </div>
    </div>
  );
}
