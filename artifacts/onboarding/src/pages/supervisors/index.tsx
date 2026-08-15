import { useState } from "react"
import { Link } from "wouter"
import { useListSupervisors, useCreateSupervisor, getListSupervisorsQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus } from "lucide-react"
import { formatRole } from "@/lib/utils"

export default function SupervisorsList() {
  const queryClient = useQueryClient()
  const { data: supervisors, isLoading } = useListSupervisors()
  const createSupervisor = useCreateSupervisor()
  
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  
  const [formData, setFormData] = useState({
    name: "", email: "", title: "", role: "manager" as any
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createSupervisor.mutate({ data: formData }, {
      onSuccess: () => {
        setOpen(false)
        queryClient.invalidateQueries({ queryKey: getListSupervisorsQueryKey() })
        setFormData({ name: "", email: "", title: "", role: "manager" })
      }
    })
  }

  const filtered = supervisors?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || s.role === roleFilter
    return matchesSearch && matchesRole
  })

  const roles = ["director", "manager", "team_lead", "senior_mentor"]

  if (isLoading) return <div className="p-8">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Supervisors</h2>
          <p className="text-muted-foreground mt-1">Manage mentors, leads, and directors.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Supervisor</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New Supervisor</DialogTitle>
                <DialogDescription>Register a new supervisor who will participate in onboarding.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input required type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. VP of Engineering" />
                </div>
                <div className="space-y-2">
                  <Label>Platform Role</Label>
                  <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{formatRole(r)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createSupervisor.isPending}>
                  {createSupervisor.isPending ? "Saving..." : "Add Supervisor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search supervisors..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map(r => <SelectItem key={r} value={r}>{formatRole(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Platform Role</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium text-primary">
                    <Link href={`/supervisors/${s.id}`} className="hover:underline">{s.name}</Link>
                  </div>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{formatRole(s.role)}</Badge>
                </TableCell>
                <TableCell>{s.title || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/supervisors/${s.id}`}>View Details</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No supervisors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
