import { useState, useRef } from "react"
import { useParams, Link } from "wouter"
import { useGetAssociate, useGetAssociateProgress, useCompleteCheckin, getGetAssociateProgressQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { formatPhase, formatRole } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react"

export default function AssociateDetail() {
  const { id } = useParams()
  const associateId = Number(id)
  const queryClient = useQueryClient()
  
  const { data: associate, isLoading: isAssocLoading } = useGetAssociate(associateId, { query: { enabled: !!associateId } })
  const { data: progress, isLoading: isProgLoading } = useGetAssociateProgress(associateId, { query: { enabled: !!associateId } })
  const completeCheckin = useCompleteCheckin()

  const [activeCheckin, setActiveCheckin] = useState<number | null>(null)
  const [notes, setNotes] = useState("")

  const phases = ["pre_start", "first_day", "week_1", "week_2", "week_3", "week_4"] as const
  const roles = ["director", "manager", "team_lead", "senior_mentor"] as const

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCheckin) return
    completeCheckin.mutate({ id: activeCheckin, data: { notes } }, {
      onSuccess: () => {
        setActiveCheckin(null)
        setNotes("")
        queryClient.invalidateQueries({ queryKey: getGetAssociateProgressQueryKey(associateId) })
      }
    })
  }

  if (isAssocLoading || isProgLoading) return <div className="p-8">Loading profile...</div>
  if (!associate || !progress) return <div className="p-8">Associate not found.</div>

  // Create a map for quick checkin lookup: checkinMap[phase][role] = checkin
  const checkinMap: Record<string, Record<string, any>> = {}
  phases.forEach(p => {
    checkinMap[p] = {}
    roles.forEach(r => checkinMap[p][r] = null)
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
            Cohort: <Link href={`/cohorts/${associate.cohortId}`} className="text-primary hover:underline font-medium">{associate.cohort?.name}</Link>
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
              { role: "Senior Mentor", ref: associate.seniorMentor }
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
            <CardDescription>Click a pending check-in to complete it.</CardDescription>
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
                  const phaseComplete = phaseProgress?.completedCount === phaseProgress?.totalCount && phaseProgress?.totalCount! > 0
                  return (
                    <TableRow key={phase} className={phaseComplete ? "bg-muted/20" : ""}>
                      <TableCell className="font-medium">
                        {formatPhase(phase)}
                        {phaseComplete && <CheckCircle2 className="inline ml-2 h-4 w-4 text-success" />}
                      </TableCell>
                      {roles.map(role => {
                        const checkin = checkinMap[phase][role]
                        if (!checkin) return <TableCell key={role} className="text-center text-muted-foreground">—</TableCell>
                        
                        const isCompleted = checkin.status === 'completed'
                        return (
                          <TableCell key={role} className="text-center p-1">
                            <button
                              onClick={() => !isCompleted && setActiveCheckin(checkin.id)}
                              disabled={isCompleted}
                              className={`w-full h-14 rounded-md flex flex-col items-center justify-center transition-all ${
                                isCompleted 
                                  ? "bg-chart-1/10 text-chart-1 cursor-default border border-transparent" 
                                  : "bg-background border border-dashed border-input hover:border-primary hover:bg-accent/50 cursor-pointer"
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mb-1" />
                                  <span className="text-[10px] font-medium uppercase tracking-wider">Done</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</span>
                                </>
                              )}
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

      <Dialog open={!!activeCheckin} onOpenChange={(open) => !open && setActiveCheckin(null)}>
        <DialogContent>
          <form onSubmit={handleComplete}>
            <DialogHeader>
              <DialogTitle>Complete Check-in</DialogTitle>
              <DialogDescription>Mark this phase check-in as complete and add optional notes.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Meeting Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Summarize the check-in discussion..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActiveCheckin(null)}>Cancel</Button>
              <Button type="submit" disabled={completeCheckin.isPending}>
                {completeCheckin.isPending ? "Saving..." : "Mark Complete"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
