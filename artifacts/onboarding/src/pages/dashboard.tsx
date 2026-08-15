import { useState, useMemo } from "react"
import { useGetDashboardSummary, useGetPendingCheckins, useListCohorts, useGetCohortDashboard, useListAssociates } from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatPhase, formatRole } from "@/lib/utils"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Users, BookOpenCheck, ShieldAlert, GraduationCap } from "lucide-react"

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary()
  const { data: pending, isLoading: isPendingLoading } = useGetPendingCheckins()
  const { data: cohorts, isLoading: isCohortsLoading } = useListCohorts()
  
  // Get active cohort for quick glance
  const activeCohortId = cohorts && cohorts.length > 0 ? cohorts[0].id : null
  const { data: cohortDashboard, isLoading: isCohortDashboardLoading } = useGetCohortDashboard(activeCohortId || 0, {
    query: { enabled: !!activeCohortId }
  })
  const { data: cohortAssociates } = useListAssociates(
    { cohortId: activeCohortId ?? undefined },
    { query: { enabled: !!activeCohortId } }
  )
  const associateNameMap = useMemo(() => {
    const m: Record<number, string> = {}
    cohortAssociates?.forEach((a) => (m[a.id] = a.name))
    return m
  }, [cohortAssociates])

  if (isSummaryLoading || isPendingLoading || isCohortsLoading) {
    return <div className="space-y-6">
      <div className="h-10 w-48 bg-muted animate-pulse rounded"></div>
      <div className="grid gap-6 md:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl"></div>)}
      </div>
    </div>
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Platform overview and pending actions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Associates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalAssociates || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {summary?.totalCohorts || 0} active cohorts</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.completionRate?.toFixed(1) || 0}%</div>
            <Progress value={summary?.completionRate || 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Check-ins</CardTitle>
            <ShieldAlert className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{summary?.pendingCheckins || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Require supervisor action</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Supervisors</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalSupervisors || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Mentors, Leads, Managers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Action Required</CardTitle>
              <CardDescription>Pending check-ins across all cohorts.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/checkins">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px]">
            {pending && pending.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associate</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link href={`/associates/${p.associateId}`} className="hover:underline text-primary">
                          {p.associateName}
                        </Link>
                        <div className="text-xs text-muted-foreground">{p.cohortName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatPhase(p.phase)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{p.supervisorName}</div>
                        <div className="text-xs text-muted-foreground">{formatRole(p.supervisorRole)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/associates/${p.associateId}`}>Resolve</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                No pending check-ins. All caught up!
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Active Cohort Glance</CardTitle>
            <CardDescription>{cohortDashboard?.cohort.name || "Loading..."}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {!isCohortDashboardLoading && cohortDashboard ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-muted-foreground">Overall Progress</span>
                    <span className="font-bold">{cohortDashboard.completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={cohortDashboard.completionRate} className="h-2" />
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium border-b pb-2">Associates</h4>
                  {cohortDashboard.associates.slice(0, 5).map(assoc => {
                    const associateDetails = pending?.find(p => p.associateId === assoc.associateId)
                    return (
                      <div key={assoc.associateId} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <Link href={`/associates/${assoc.associateId}`} className="text-sm font-medium hover:underline text-primary">
                            {associateNameMap[assoc.associateId] ?? `Associate #${assoc.associateId}`}
                          </Link>
                          <span className="text-xs text-muted-foreground">{assoc.overallPercent?.toFixed(0)}%</span>
                        </div>
                        <Progress value={assoc.overallPercent || 0} className="h-1.5" />
                      </div>
                    )
                  })}
                </div>
                
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/cohorts/${cohortDashboard.cohort.id}`}>View Cohort Details</Link>
                </Button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a cohort to view stats
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
