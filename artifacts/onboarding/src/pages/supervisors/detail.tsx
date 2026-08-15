import { useParams, Link } from "wouter"
import { useGetSupervisor, useListCheckins } from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPhase, formatRole, formatDate } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react"

export default function SupervisorDetail() {
  const { id } = useParams()
  const supervisorId = Number(id)
  
  const { data: supervisor, isLoading: isSupLoading } = useGetSupervisor(supervisorId, { query: { enabled: !!supervisorId } })
  const { data: checkins, isLoading: isCheckinsLoading } = useListCheckins({ supervisorId }, { query: { enabled: !!supervisorId } })

  if (isSupLoading || isCheckinsLoading) return <div className="p-8">Loading...</div>
  if (!supervisor) return <div className="p-8">Supervisor not found.</div>

  const pendingCount = checkins?.filter(c => c.status === 'pending').length || 0
  const completedCount = checkins?.filter(c => c.status === 'completed').length || 0

  return (
    <div className="space-y-6">
      <Link href="/supervisors" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Supervisors
      </Link>

      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-b pb-8">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">{supervisor.name}</h2>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span>{supervisor.email}</span>
            <span>•</span>
            <span className="font-medium text-foreground">{supervisor.title || "No Title"}</span>
            <span>•</span>
            <Badge variant="secondary">{formatRole(supervisor.role)}</Badge>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Card className="w-32 hover-elevate">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="w-32 hover-elevate">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Done</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-success">{completedCount}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Check-ins</CardTitle>
          <CardDescription>All check-ins this supervisor is responsible for.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Associate</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkins?.map(c => (
                <TableRow key={c.id} className={c.status === 'completed' ? "bg-muted/20" : ""}>
                  <TableCell>
                    {c.status === 'completed' ? (
                      <Badge variant="success" className="flex w-fit items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Done</Badge>
                    ) : (
                      <Badge variant="outline" className="flex w-fit items-center gap-1"><Clock className="h-3 w-3"/> Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{formatPhase(c.phase)}</TableCell>
                  <TableCell>
                    {c.associate ? (
                      <Link href={`/associates/${c.associateId}`} className="text-primary hover:underline">
                        {c.associate.name}
                      </Link>
                    ) : (
                      `Associate #${c.associateId}`
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {c.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant={c.status === 'pending' ? "default" : "ghost"} size="sm" asChild>
                      <Link href={`/associates/${c.associateId}`}>
                        {c.status === 'pending' ? "Resolve" : "View"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {checkins?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No check-ins assigned.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
