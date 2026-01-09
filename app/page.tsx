import { DashboardCard } from "@/components/dashboard-card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8 md:p-24">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-foreground">
            Forex Dashboard Concepts
          </h1>
          <p className="mx-auto max-w-[700px] text-zinc-500 md:text-xl dark:text-zinc-400">
            Explore different trading interface layouts and design systems.
            Select a concept below to preview.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Trader Focused"
            description="High-speed execution layout with prominent order controls and real-time P&L."
            href="/dashboards/trader-focused"
            badge="Action-Oriented"
          />
          <DashboardCard
            title="Analytics Heavy"
            description="Data-dense grid layout featuring multiple timeframes, indicators, and market overview."
            href="/dashboards/analytics-heavy"
            badge="Data-Dense"
          />
          <DashboardCard
            title="Beginner Friendly"
            description="Simplified interface with guided tooltips and educational context for new traders."
            href="/dashboards/beginner-friendly"
            badge="Simplified"
          />
        </div>
      </div>
    </main>
  );
}
