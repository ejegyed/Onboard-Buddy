import { useState } from "react"
import { Link } from "wouter"
import { useListCheckins } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPhase, formatRole, formatDate } from "@/lib/utils"
import { CheckCircle2, Clock, Filter } from "lucide-react"

export default function CheckinsList() {
  const [phaseFilter, setPhaseFilter] = useState<string>("all")
  
  const { data: checkins, isLoading } = useListCheckins(
    phaseFilter !== "all" ? { phase: phaseFilter as any } : undefined
  )

  const phases = ["pre_start", "first_day", "week_1", "week_2", "week_3", "week_4"]

  if (isLoading) return <div className="p-8">Loading check-ins...</div>

  // We sort checkins so pending is at the top
  const sortedCheckins = [...(checkins || [])].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Global Check-ins</h2>
          <p className="text-muted-foreground mt-1">Audit log of all onboarding touchpoints.</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b flex gap-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filter Phase:
          </div>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="All Phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {phases.map(p => <SelectItem key={p} value={p}>{formatPhase(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Associate</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Completed Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCheckins.map(c => (
              <TableRow key={c.id} className={c.status === 'completed' ? "bg-muted/10" : "bg-card hover:bg-muted/30"}>
                <TableCell>
                  {c.status === 'completed' ? (
                    <Badge variant="success" className="flex w-fit items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Done</Badge>
                  ) : (
                    <Badge variant="warning" className="flex w-fit items-center gap-1"><Clock className="h-3 w-3"/> Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium text-foreground">{formatPhase(c.phase)}</TableCell>
                <TableCell>
                  {c.associate ? (
                    <Link href={`/associates/${c.associateId}`} className="text-primary hover:underline font-medium">
                      {c.associate.name}
                    </Link>
                  ) : (
                    `Assoc #${c.associateId}`
                  )}
                </TableCell>
                <TableCell>
                  {c.supervisor ? (
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.supervisor.name}</div>
                      <div className="text-xs text-muted-foreground">{formatRole(c.supervisorRole)}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm">Sup #${c.supervisorId}</div>
                      <div className="text-xs text-muted-foreground">{formatRole(c.supervisorRole)}</div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.completedAt ? formatDate(c.completedAt) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/associates/${c.associateId}`}>View Grid</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sortedCheckins.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No check-ins found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
