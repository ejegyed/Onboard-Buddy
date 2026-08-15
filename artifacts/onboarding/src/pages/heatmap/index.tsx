import { useState, useMemo } from "react"
import { Link } from "wouter"
import {
  useListCohorts,
  useGetCohortDashboard,
  useListAssociates,
} from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPhase } from "@/lib/utils"
import { Lock } from "lucide-react"

const phases = ["pre_start", "first_day", "week_1", "week_2", "week_3", "week_4"] as const

const PHASE_OFFSETS: Record<string, number | null> = {
  pre_start: null,
  first_day: 0,
  week_1: 1,
  week_2: 8,
  week_3: 15,
  week_4: 22,
}

function isPhaseAvailable(cohortStartDate: string, phase: string): boolean {
  const offset = PHASE_OFFSETS[phase]
  if (offset === null) return true
  const d = new Date(cohortStartDate)
  d.setUTCDate(d.getUTCDate() + offset)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return today >= d
}

function getCellStyle(pct: number): string {
  if (pct === 100) return "bg-green-500 text-white"
  if (pct >= 75) return "bg-green-200 text-green-900"
  if (pct >= 50) return "bg-yellow-200 text-yellow-900"
  if (pct >= 25) return "bg-orange-200 text-orange-900"
  if (pct > 0) return "bg-red-200 text-red-900"
  return "bg-muted/50 text-muted-foreground"
}

function getHighestRisk(checkins: any[]): "low" | "medium" | "high" | null {
  const completed = checkins.filter((c: any) => c.status === "completed" && c.riskStatus)
  if (completed.some((c: any) => c.riskStatus === "high")) return "high"
  if (completed.some((c: any) => c.riskStatus === "medium")) return "medium"
  if (completed.some((c: any) => c.riskStatus === "low")) return "low"
  return null
}

const RISK_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-400",
}

function StatCard({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <Card className={danger && value !== "0" ? "border-red-200 bg-red-50/40" : ""}>
      <CardContent className="pt-5 pb-4">
        <p className={`text-2xl font-bold ${danger && value !== "0" ? "text-red-600" : "text-foreground"}`}>{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function HeatmapPage() {
  const [cohortId, setCohortId] = useState<number | null>(null)

  const { data: cohorts } = useListCohorts()
  const { data: dashboard, isLoading } = useGetCohortDashboard(cohortId!, {
    query: { enabled: !!cohortId },
  })
  const { data: associates } = useListAssociates(
    { cohortId: cohortId ?? undefined },
    { query: { enabled: !!cohortId } }
  )

  // Map associateId → name
  const nameMap = useMemo(() => {
    const m: Record<number, string> = {}
    associates?.forEach((a) => (m[a.id] = a.name))
    return m
  }, [associates])

  // Sort by overall completion descending
  const sorted = useMemo(
    () =>
      [...(dashboard?.associates ?? [])].sort(
        (a, b) => (b.overallPercent ?? 0) - (a.overallPercent ?? 0)
      ),
    [dashboard]
  )

  const cohort = dashboard?.cohort
  const startDate = cohort?.startDate

  // Phase-level averages across all associates
  const phaseAverages = phases.map((phase) => {
    let doneSum = 0
    let totalSum = 0
    sorted.forEach((a) => {
      const p = a.phases.find((ph) => ph.phase === phase)
      doneSum += p?.completedCount ?? 0
      totalSum += p?.totalCount ?? 0
    })
    return totalSum > 0 ? Math.round((doneSum / totalSum) * 100) : 0
  })

  // Count associates with at least one high-risk completed check-in
  const highRiskCount = sorted.filter((a) =>
    a.phases.some((p) =>
      (p.checkins as any[]).some((c) => c.riskStatus === "high")
    )
  ).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Performance Heatmap</h2>
        <p className="text-muted-foreground mt-1">
          Phase-by-phase completion and risk overview for each associate in a cohort.
        </p>
      </div>

      {/* Cohort selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select
          value={cohortId ? String(cohortId) : ""}
          onValueChange={(v) => setCohortId(Number(v))}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a cohort…" />
          </SelectTrigger>
          <SelectContent>
            {cohorts?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {cohort && (
          <span className="text-sm text-muted-foreground">
            Started{" "}
            {new Date(cohort.startDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {dashboard?.totalAssociates} associate{dashboard?.totalAssociates !== 1 ? "s" : ""}
            {" · "}
            <span className="font-medium text-foreground">{dashboard?.completionRate}% overall completion</span>
          </span>
        )}
      </div>

      {/* Empty state */}
      {!cohortId && (
        <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed gap-2 text-muted-foreground">
          <span className="text-4xl">📊</span>
          <p className="font-medium">Select a cohort to view the heatmap</p>
          <p className="text-sm">Compare completion and risk across all associates and phases</p>
        </div>
      )}

      {cohortId && isLoading && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading heatmap data…
        </div>
      )}

      {cohortId && dashboard && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Associates" value={String(dashboard.totalAssociates ?? 0)} />
            <StatCard
              label="Overall Completion"
              value={`${dashboard.completionRate}%`}
              sub={`${dashboard.completedCheckins} of ${dashboard.totalCheckins} check-ins`}
            />
            <StatCard
              label="Fully Complete Phases"
              value={String(
                phases.filter((phase) => {
                  const avg = phaseAverages[phases.indexOf(phase)]
                  return avg === 100
                }).length
              )}
              sub={`out of ${phases.length} phases`}
            />
            <StatCard
              label="Associates at High Risk"
              value={String(highRiskCount)}
              sub="at least one high-risk check-in"
              danger
            />
          </div>

          {/* Heatmap grid */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Completion Heatmap</CardTitle>
                  <CardDescription>
                    Each cell shows completed / total check-ins for that phase.
                    The colored dot indicates the highest risk flag from completed check-ins.
                  </CardDescription>
                </div>
                {/* Color legend */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pt-1">
                  <span>Low</span>
                  {[
                    "bg-muted/50",
                    "bg-red-200",
                    "bg-orange-200",
                    "bg-yellow-200",
                    "bg-green-200",
                    "bg-green-500",
                  ].map((c, i) => (
                    <div key={i} className={`w-5 h-5 rounded ${c} border border-black/5`} />
                  ))}
                  <span>High</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 pr-6 min-w-[180px]">
                      Associate
                    </th>
                    {phases.map((phase) => {
                      const locked = startDate ? !isPhaseAvailable(startDate, phase) : false
                      return (
                        <th
                          key={phase}
                          className={`text-center text-[11px] font-semibold uppercase tracking-wider pb-3 px-1 min-w-[90px] ${
                            locked ? "text-muted-foreground/40" : "text-muted-foreground"
                          }`}
                        >
                          {formatPhase(phase)}
                          {locked && (
                            <div className="flex justify-center mt-0.5">
                              <Lock className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </th>
                      )
                    })}
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pb-3 px-1 min-w-[80px]">
                      Overall
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sorted.map((assoc, idx) => {
                    const name = nameMap[assoc.associateId] ?? `Associate #${idx + 1}`
                    const initials = name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()

                    return (
                      <tr key={assoc.associateId} className="group">
                        {/* Associate name cell */}
                        <td className="pr-6 py-1">
                          <Link
                            href={`/associates/${assoc.associateId}`}
                            className="flex items-center gap-2.5 hover:text-primary transition-colors w-fit"
                          >
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold shrink-0 group-hover:bg-primary/10 transition-colors">
                              {initials}
                            </div>
                            <div>
                              <p className="font-medium leading-tight">{name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {assoc.overallPercent}% overall
                              </p>
                            </div>
                          </Link>
                        </td>

                        {/* Phase cells */}
                        {phases.map((phase) => {
                          const phaseData = assoc.phases.find((p) => p.phase === phase)
                          const done = phaseData?.completedCount ?? 0
                          const total = phaseData?.totalCount ?? 0
                          const pct = total > 0 ? Math.round((done / total) * 100) : 0
                          const locked = startDate ? !isPhaseAvailable(startDate, phase) : false
                          const risk = getHighestRisk((phaseData?.checkins as any[]) ?? [])

                          if (locked) {
                            return (
                              <td key={phase} className="px-1 py-1">
                                <div className="h-14 rounded-lg bg-muted/20 border border-dashed border-muted-foreground/15 flex items-center justify-center">
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground/25" />
                                </div>
                              </td>
                            )
                          }

                          return (
                            <td key={phase} className="px-1 py-1">
                              <Link href={`/associates/${assoc.associateId}`}>
                                <div
                                  className={`h-14 rounded-lg flex flex-col items-center justify-center relative cursor-pointer hover:opacity-85 hover:scale-[1.02] transition-all ${getCellStyle(pct)}`}
                                >
                                  <span className="text-sm font-bold leading-tight">
                                    {done}/{total}
                                  </span>
                                  <span className="text-[10px] opacity-75">{pct}%</span>

                                  {/* Risk dot */}
                                  {risk && (
                                    <div
                                      className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-1 ring-white/50 ${RISK_DOT[risk]}`}
                                      title={`Highest risk: ${risk}`}
                                    />
                                  )}
                                </div>
                              </Link>
                            </td>
                          )
                        })}

                        {/* Overall cell */}
                        <td className="px-1 py-1">
                          <Link href={`/associates/${assoc.associateId}`}>
                            <div
                              className={`h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-85 transition-opacity ${getCellStyle(assoc.overallPercent ?? 0)}`}
                            >
                              <span className="text-sm font-bold leading-tight">
                                {assoc.completedCheckins}/{assoc.totalCheckins}
                              </span>
                              <span className="text-[10px] opacity-75">{assoc.overallPercent}%</span>
                            </div>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Footer: phase averages */}
                <tfoot>
                  <tr className="border-t border-border/60">
                    <td className="pr-6 py-3">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Phase Avg
                      </span>
                    </td>
                    {phases.map((phase, i) => {
                      const locked = startDate ? !isPhaseAvailable(startDate, phase) : false
                      const avg = phaseAverages[i]
                      if (locked) {
                        return (
                          <td key={phase} className="px-1 py-3">
                            <div className="h-10 rounded-lg bg-muted/20 flex items-center justify-center">
                              <Lock className="h-3 w-3 text-muted-foreground/25" />
                            </div>
                          </td>
                        )
                      }
                      return (
                        <td key={phase} className="px-1 py-3">
                          <div
                            className={`h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getCellStyle(avg)}`}
                          >
                            {avg}%
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-1 py-3">
                      <div
                        className={`h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getCellStyle(dashboard.completionRate ?? 0)}`}
                      >
                        {dashboard.completionRate}%
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Risk legend */}
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Risk dot legend:</span>
            {(["low", "medium", "high"] as const).map((level) => (
              <div key={level} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${RISK_DOT[level]}`} />
                <span className="capitalize">{level} risk</span>
              </div>
            ))}
            <span className="text-muted-foreground/60">· No dot = no completed check-ins yet</span>
          </div>
        </>
      )}
    </div>
  )
}
