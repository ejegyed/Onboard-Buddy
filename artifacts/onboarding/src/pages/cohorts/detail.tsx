import { useState } from "react"
import { useParams, Link } from "wouter"
import { useGetCohortDashboard, useGetCohort } from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatPhase, formatDate } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export default function CohortDetail() {
  const { id } = useParams()
  const cohortId = Number(id)
  
  const { data: cohort, isLoading: isCohortLoading } = useGetCohort(cohortId, {
    query: { enabled: !!cohortId }
  })
  const { data: dashboard, isLoading: isDashboardLoading } = useGetCohortDashboard(cohortId, {
    query: { enabled: !!cohortId }
  })

  if (isCohortLoading || isDashboardLoading) return <div className="p-8">Loading cohort details...</div>
  if (!cohort || !dashboard) return <div className="p-8">Cohort not found.</div>

  const phases = ["pre_start", "first_day", "week_1", "week_2", "week_3", "week_4"] as const

  return (
    <div className="space-y-6">
      <Link href="/cohorts" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Cohorts
      </Link>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{cohort.name}</h2>
          <p className="text-muted-foreground mt-1">Started {formatDate(cohort.startDate)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{dashboard.completionRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Overall Completion</p>
        </div>
      </div>
      <Progress value={dashboard.completionRate} className="h-3" />

      <div className="grid gap-6 md:grid-cols-3 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Associates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalAssociates || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{dashboard.completedCheckins || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalCheckins || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Associate Matrix</CardTitle>
          <CardDescription>Phase completion status across all associates in this cohort.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Associate</TableHead>
                {phases.map(p => (
                  <TableHead key={p} className="text-center">{formatPhase(p)}</TableHead>
                ))}
                <TableHead className="text-right">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.associates.map((assoc) => {
                return (
                  <TableRow key={assoc.associateId}>
                    <TableCell className="font-medium">
                      <Link href={`/associates/${assoc.associateId}`} className="text-primary hover:underline">
                        Associate #{assoc.associateId}
                      </Link>
                    </TableCell>
                    {phases.map(phaseKey => {
                      const phaseData = assoc.phases.find(p => p.phase === phaseKey)
                      const isComplete = phaseData?.completedCount === phaseData?.totalCount && phaseData?.totalCount !== 0
                      const progress = phaseData?.totalCount ? (phaseData.completedCount! / phaseData.totalCount) * 100 : 0
                      return (
                        <TableCell key={phaseKey} className="text-center">
                          {isComplete ? (
                            <Badge variant="success" className="mx-auto block w-fit">Done</Badge>
                          ) : (
                            <div className="w-16 mx-auto flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">{phaseData?.completedCount || 0}/{phaseData?.totalCount || 4}</span>
                              <Progress value={progress} className="h-1.5" />
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right font-medium">
                      {assoc.overallPercent?.toFixed(0)}%
                    </TableCell>
                  </TableRow>
                )
              })}
              {dashboard.associates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No associates assigned to this cohort yet.
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
