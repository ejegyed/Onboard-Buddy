import { useState } from "react"
import { Link } from "wouter"
import { useListAssociates, useListCohorts, useListSupervisors, useCreateAssociate, getListAssociatesQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus } from "lucide-react"

export default function AssociatesList() {
  const queryClient = useQueryClient()
  const { data: associates, isLoading: isAssociatesLoading } = useListAssociates()
  const { data: cohorts } = useListCohorts()
  const { data: supervisors } = useListSupervisors()
  const createAssociate = useCreateAssociate()
  
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState({
    name: "", email: "", cohortId: "", position: "", department: "",
    directorId: "", managerId: "", teamLeadId: "", seniorMentorId: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createAssociate.mutate({ 
      data: {
        name: formData.name,
        email: formData.email,
        cohortId: Number(formData.cohortId),
        position: formData.position,
        department: formData.department,
        directorId: formData.directorId ? Number(formData.directorId) : undefined,
        managerId: formData.managerId ? Number(formData.managerId) : undefined,
        teamLeadId: formData.teamLeadId ? Number(formData.teamLeadId) : undefined,
        seniorMentorId: formData.seniorMentorId ? Number(formData.seniorMentorId) : undefined,
      }
    }, {
      onSuccess: () => {
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: getListAssociatesQueryKey() })
        setFormData({ name: "", email: "", cohortId: "", position: "", department: "", directorId: "", managerId: "", teamLeadId: "", seniorMentorId: "" })
      }
    })
  }

  const filteredAssociates = associates?.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isAssociatesLoading) return <div className="p-8">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Associates</h2>
          <p className="text-muted-foreground mt-1">Manage onboarding personnel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Associate</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Associate</DialogTitle>
                <DialogDescription>Register a new hire and assign their supervisors.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Name</Label>
                  <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Email</Label>
                  <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Position</Label>
                  <Input value={formData.position} onChange={e => setFormData(p => ({ ...p, position: e.target.value }))} />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Department</Label>
                  <Input value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Cohort</Label>
                  <Select value={formData.cohortId} onValueChange={v => setFormData(p => ({ ...p, cohortId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Cohort" /></SelectTrigger>
                    <SelectContent>
                      {cohorts?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Supervisor Assignments */}
                <div className="col-span-2 mt-4"><h4 className="text-sm font-medium border-b pb-2">Supervisor Assignments</h4></div>
                
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Director</Label>
                  <Select value={formData.directorId} onValueChange={v => setFormData(p => ({ ...p, directorId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Director" /></SelectTrigger>
                    <SelectContent>
                      {supervisors?.filter(s => s.role === 'director').map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Manager</Label>
                  <Select value={formData.managerId} onValueChange={v => setFormData(p => ({ ...p, managerId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Manager" /></SelectTrigger>
                    <SelectContent>
                      {supervisors?.filter(s => s.role === 'manager').map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Team Lead</Label>
                  <Select value={formData.teamLeadId} onValueChange={v => setFormData(p => ({ ...p, teamLeadId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Team Lead" /></SelectTrigger>
                    <SelectContent>
                      {supervisors?.filter(s => s.role === 'team_lead').map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Senior Mentor</Label>
                  <Select value={formData.seniorMentorId} onValueChange={v => setFormData(p => ({ ...p, seniorMentorId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Mentor" /></SelectTrigger>
                    <SelectContent>
                      {supervisors?.filter(s => s.role === 'senior_mentor').map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAssociate.isPending || !formData.cohortId}>
                  {createAssociate.isPending ? "Saving..." : "Add Associate"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search associates..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Email</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssociates?.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="font-medium text-primary">
                    <Link href={`/associates/${a.id}`} className="hover:underline">{a.name}</Link>
                  </div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </TableCell>
                <TableCell>{a.cohort?.name || "—"}</TableCell>
                <TableCell>{a.position || "—"}</TableCell>
                <TableCell>{a.department || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/associates/${a.id}`}>View Profile</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredAssociates?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No associates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
