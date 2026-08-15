import { useState } from "react"
import { useParams, Link } from "wouter"
import {
  useGetAssociate,
  useGetAssociateProgress,
  useCompleteCheckin,
  useListTools,
  getGetAssociateProgressQueryKey,
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPhase, formatRole } from "@/lib/utils"
import { useActiveSupervisor } from "@/context/supervisor-context"
import { ArrowLeft, CheckCircle2, Clock, Lock, UserCircle2 } from "lucide-react"

const phases = ["pre_start", "first_day", "week_1", "week_2", "week_3", "week_4"] as const
const roles = ["director", "manager", "team_lead", "senior_mentor"] as const

// Days from cohort start date when each phase becomes available.
// null = always available.
const PHASE_OFFSETS: Record<string, number | null> = {
  pre_start: null,
  first_day: 0,
  week_1: 1,
  week_2: 8,
  week_3: 15,
  week_4: 22,
}

function getPhaseStartDate(cohortStartDate: string, phase: string): Date | null {
  const offset = PHASE_OFFSETS[phase]
  if (offset === null) return null
  const d = new Date(cohortStartDate)
  d.setUTCDate(d.getUTCDate() + offset)
  return d
}

function isPhaseAvailable(cohortStartDate: string, phase: string): boolean {
  const phaseStart = getPhaseStartDate(cohortStartDate, phase)
  if (!phaseStart) return true
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return today >= phaseStart
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const GRADE_LABELS: Record<string, string> = {
  below_expectations: "Below Expectations",
  meets_expectations: "Meets Expectations",
  exceeds_expectations: "Exceeds Expectations",
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Low Risk", color: "text-green-600" },
  medium: { label: "Medium Risk", color: "text-yellow-600" },
  high: { label: "High Risk", color: "text-red-600" },
}

export default function AssociateDetail() {
  const { id } = useParams()
  const associateId = Number(id)
  const queryClient = useQueryClient()
  const { activeSupervisorId } = useActiveSupervisor()

  const { data: associate, isLoading: isAssocLoading } = useGetAssociate(associateId, { query: { enabled: !!associateId } })
  const { data: progress, isLoading: isProgLoading } = useGetAssociateProgress(associateId, { query: { enabled: !!associateId } })
  const { data: tools } = useListTools()
  const activeTools = tools?.filter(t => t.active) ?? []

  const completeCheckin = useCompleteCheckin()

  const [activeCheckin, setActiveCheckin] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [riskStatus, setRiskStatus] = useState<string>("")
  const [toolGrades, setToolGrades] = useState<Record<number, string>>({})

  const openDialog = (checkinId: number) => {
    setActiveCheckin(checkinId)
    setNotes("")
    setRiskStatus("")
    setToolGrades({})
  }

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCheckin || !activeSupervisorId) return

    completeCheckin.mutate(
      {
        id: activeCheckin,
        data: {
          supervisorId: activeSupervisorId,
          notes: notes || undefined,
          riskStatus: riskStatus as "low" | "medium" | "high",
          toolGrades: activeTools.map(t => ({
            toolId: t.id,
            grade: toolGrades[t.id] as "below_expectations" | "meets_expectations" | "exceeds_expectations",
          })),
        },
      },
      {
        onSuccess: () => {
          setActiveCheckin(null)
          queryClient.invalidateQueries({ queryKey: getGetAssociateProgressQueryKey(associateId) })
        },
      }
    )
  }

  const allGradesSet = activeTools.every(t => !!toolGrades[t.id])
  const canSubmit = !!riskStatus && (activeTools.length === 0 || allGradesSet)

  if (isAssocLoading || isProgLoading) return <div className="p-8">Loading profile...</div>
  if (!associate || !progress) return <div className="p-8">Associate not found.</div>

  const startDate = associate.cohort?.startDate

  // Build lookup map: checkinMap[phase][role] = checkin
  const checkinMap: Record<string, Record<string, any>> = {}
  phases.forEach(p => {
    checkinMap[p] = {}
    roles.forEach(r => (checkinMap[p][r] = null))
  })
  progress.phases.forEach(p => {
    p.checkins.forEach(c => {
      checkinMap[c.phase][c.supervisorRole] = c
    })
  })

  return (
    <div className="space-y-8">
      <Link href="/associates" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Associates
      </Link>

      {/* Header Profile */}
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-b pb-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">{associate.name}</h2>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span>{associate.email}</span>
            <span>•</span>
            <span className="font-medium text-foreground">{associate.position || "No Position"}</span>
            <span>•</span>
            <span>{associate.department || "No Department"}</span>
          </div>
          <div className="mt-2 text-sm">
            Cohort:{" "}
            <Link href={`/cohorts/${associate.cohortId}`} className="text-primary hover:underline font-medium">
              {associate.cohort?.name}
            </Link>
            {startDate && (
              <span className="text-muted-foreground ml-2">
                (started {new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
              </span>
            )}
          </div>
        </div>

        <div className="w-full md:w-64 bg-card p-4 rounded-xl border shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <span className="text-sm font-semibold">Onboarding Progress</span>
            <span className="text-xl font-bold text-primary">{progress.overallPercent?.toFixed(0)}%</span>
          </div>
          <Progress value={progress.overallPercent || 0} className="h-2" />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {progress.completedCheckins} of {progress.totalCheckins} Check-ins done
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Supervisor Team */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Supervisor Team</CardTitle>
            <CardDescription>Assigned mentors and leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { role: "Director", ref: associate.director },
              { role: "Manager", ref: associate.manager },
              { role: "Team Lead", ref: associate.teamLead },
              { role: "Senior Mentor", ref: associate.seniorMentor },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.role}</span>
                {s.ref ? (
                  <Link href={`/supervisors/${s.ref.id}`} className="text-sm font-medium hover:underline text-foreground">
                    {s.ref.name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Unassigned</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Phase Grid */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Phase Completion Grid</CardTitle>
            <CardDescription>
              {activeSupervisorId
                ? "Click your pending check-ins to complete them."
                : "Select a supervisor from the header to complete check-ins."}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Phase</TableHead>
                  {roles.map(r => (
                    <TableHead key={r} className="text-center">{formatRole(r)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.map(phase => {
                  const phaseProgress = progress.phases.find(p => p.phase === phase)
                  const phaseComplete = phaseProgress?.completedCount === phaseProgress?.totalCount && (phaseProgress?.totalCount ?? 0) > 0
                  const locked = startDate ? !isPhaseAvailable(startDate, phase) : false
                  const phaseStart = startDate ? getPhaseStartDate(startDate, phase) : null

                  return (
                    <TableRow key={phase} className={phaseComplete ? "bg-muted/20" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {locked && <Lock className="h-3 w-3 text-muted-foreground/60" />}
                          {formatPhase(phase)}
                          {phaseComplete && <CheckCircle2 className="h-4 w-4 text-green-500 ml-1" />}
                        </div>
                        {locked && phaseStart && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Starts {formatDate(phaseStart)}
                          </div>
                        )}
                      </TableCell>
                      {roles.map(role => {
                        const checkin = checkinMap[phase][role]
                        if (!checkin) return <TableCell key={role} className="text-center text-muted-foreground">—</TableCell>

                        const isCompleted = checkin.status === "completed"
                        const isMine = activeSupervisorId !== null && checkin.supervisorId === activeSupervisorId
                        const canClick = !isCompleted && !locked && isMine

                        // Cell appearance
                        let cellClass = "w-full h-14 rounded-md flex flex-col items-center justify-center transition-all "
                        let icon: React.ReactNode
                        let label: React.ReactNode

                        if (isCompleted) {
                          cellClass += "bg-green-500/10 text-green-600 border border-transparent cursor-default"
                          icon = <CheckCircle2 className="h-4 w-4 mb-0.5" />
                          label = <span className="text-[10px] font-semibold uppercase tracking-wider">Done</span>
                        } else if (locked) {
                          cellClass += "bg-muted/30 text-muted-foreground/50 border border-dashed border-muted cursor-not-allowed"
                          icon = <Lock className="h-3.5 w-3.5 mb-0.5" />
                          label = <span className="text-[10px] uppercase tracking-wider">Locked</span>
                        } else if (!activeSupervisorId) {
                          cellClass += "bg-background border border-dashed border-input text-muted-foreground/60 cursor-not-allowed"
                          icon = <UserCircle2 className="h-4 w-4 mb-0.5" />
                          label = <span className="text-[10px] uppercase tracking-wider">Select user</span>
                        } else if (!isMine) {
                          cellClass += "bg-background border border-dashed border-input text-muted-foreground/50 cursor-not-allowed"
                          icon = <Clock className="h-4 w-4 mb-0.5" />
                          label = <span className="text-[10px] uppercase tracking-wider">Not yours</span>
                        } else {
                          // Clickable pending
                          cellClass += "bg-background border border-dashed border-input hover:border-primary hover:bg-accent/50 cursor-pointer"
                          icon = <Clock className="h-4 w-4 text-muted-foreground mb-0.5" />
                          label = <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</span>
                        }

                        return (
                          <TableCell key={role} className="text-center p-1">
                            <button
                              onClick={() => canClick && openDialog(checkin.id)}
                              disabled={!canClick}
                              className={cellClass}
                              title={
                                locked && phaseStart ? `Phase starts ${formatDate(phaseStart)}`
                                : !activeSupervisorId ? "Select a supervisor from the header"
                                : !isMine ? `Belongs to ${checkin.supervisor?.name ?? "another supervisor"}`
                                : isCompleted ? "Completed"
                                : "Click to complete"
                              }
                            >
                              {icon}
                              {label}
                            </button>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Completion Dialog */}
      <Dialog open={!!activeCheckin} onOpenChange={(open) => !open && setActiveCheckin(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleComplete}>
            <DialogHeader>
              <DialogTitle>Complete Check-in</DialogTitle>
              <DialogDescription>
                Grade the associate and assess their risk level to mark this check-in complete.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-5">
              {/* Risk Status */}
              <div className="space-y-2">
                <Label>
                  Risk Status <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRiskStatus(level)}
                      className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-all ${
                        riskStatus === level
                          ? level === "low"
                            ? "border-green-500 bg-green-500/10 text-green-700"
                            : level === "medium"
                            ? "border-yellow-500 bg-yellow-500/10 text-yellow-700"
                            : "border-red-500 bg-red-500/10 text-red-700"
                          : "border-input bg-background text-muted-foreground hover:bg-accent/50"
                      }`}
                    >
                      {RISK_LABELS[level].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool Grades */}
              {activeTools.length > 0 && (
                <div className="space-y-3">
                  <Label>
                    Tool Proficiency Grades <span className="text-destructive">*</span>
                  </Label>
                  <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                    {activeTools.map(tool => (
                      <div key={tool.id} className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium flex-1">{tool.name}</span>
                        <Select
                          value={toolGrades[tool.id] ?? ""}
                          onValueChange={val => setToolGrades(prev => ({ ...prev, [tool.id]: val }))}
                        >
                          <SelectTrigger className="w-[200px] h-8 text-xs">
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(GRADE_LABELS).map(([val, label]) => (
                              <SelectItem key={val} value={val} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Meeting Notes <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Summarize the check-in discussion..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveCheckin(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={completeCheckin.isPending || !canSubmit}>
                {completeCheckin.isPending ? "Saving..." : "Mark Complete"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
