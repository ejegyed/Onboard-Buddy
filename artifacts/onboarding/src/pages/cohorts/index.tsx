import { useState } from "react"
import { Link } from "wouter"
import { useListCohorts, useCreateCohort } from "@workspace/api-client-react"
import { getListCohortsQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils"
import { Plus } from "lucide-react"

export default function CohortsList() {
  const queryClient = useQueryClient()
  const { data: cohorts, isLoading } = useListCohorts()
  const createCohort = useCreateCohort()
  const [open, setOpen] = useState(false)
  
  const [formData, setFormData] = useState({ name: "", startDate: "", description: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createCohort.mutate({ data: formData }, {
      onSuccess: () => {
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: getListCohortsQueryKey() })
        setFormData({ name: "", startDate: "", description: "" })
      }
    })
  }

  if (isLoading) return <div className="p-8">Loading cohorts...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Cohorts</h2>
          <p className="text-muted-foreground mt-1">Manage onboarding groups and timelines.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Cohort</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Cohort</DialogTitle>
                <DialogDescription>Define a new group of associates starting together.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Cohort Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Q3 2023 Engineering" 
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createCohort.isPending}>
                  {createCohort.isPending ? "Creating..." : "Create Cohort"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts?.map((cohort) => (
              <TableRow key={cohort.id}>
                <TableCell className="font-medium text-primary">
                  <Link href={`/cohorts/${cohort.id}`} className="hover:underline">
                    {cohort.name}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(cohort.startDate)}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-xs">{cohort.description || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/cohorts/${cohort.id}`}>View Dashboard</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {cohorts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No cohorts found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
