export interface PlaceholderPageProps {
  icon: string;
  title: string;
  description: string;
}

export function PlaceholderPage({
  icon,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-border">
        <div className="text-5xl">{icon}</div>
        <h1 className="mt-3 text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
    </main>
  );
}
