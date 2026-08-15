import * as React from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, UserSquare2, CheckSquare, Layers, ChevronDown, UserCircle2, LogOut, LayoutGrid } from "lucide-react"
import { useListSupervisors } from "@workspace/api-client-react"
import { useActiveSupervisor } from "@/context/supervisor-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const sidebarNavItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Heatmap", href: "/heatmap", icon: LayoutGrid },
  { title: "Cohorts", href: "/cohorts", icon: Layers },
  { title: "Associates", href: "/associates", icon: Users },
  { title: "Supervisors", href: "/supervisors", icon: UserSquare2 },
  { title: "Check-ins", href: "/checkins", icon: CheckSquare },
]

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  manager: "Manager",
  team_lead: "Team Lead",
  senior_mentor: "Sr. Mentor",
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const { activeSupervisorId, setActiveSupervisorId } = useActiveSupervisor()
  const { data: supervisors } = useListSupervisors()

  const activeSupervisor = supervisors?.find(s => s.id === activeSupervisorId)

  // Group supervisors by role for the dropdown
  const roles = ["director", "manager", "team_lead", "senior_mentor"] as const
  const byRole = roles.reduce<Record<string, typeof supervisors>>((acc, role) => {
    acc[role] = supervisors?.filter(s => s.role === role)
    return acc
  }, {})

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 border-r bg-sidebar">
        <div className="flex h-14 items-center border-b px-6">
          <span className="text-lg font-bold text-sidebar-foreground">Onboard<span className="text-primary">Sync</span></span>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4">
            {sidebarNavItems.map((item, index) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground" : "text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64 flex flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-8 shrink-0 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            {sidebarNavItems.find(i => location === i.href || (i.href !== "/" && location.startsWith(i.href)))?.title || 'Overview'}
          </div>

          {/* Supervisor selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-9 px-3">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                {activeSupervisor ? (
                  <span className="text-sm font-medium">{activeSupervisor.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Select supervisor</span>
                )}
                {activeSupervisor && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    {ROLE_LABELS[activeSupervisor.role]}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Acting as supervisor
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {roles.map(role => {
                const group = byRole[role]
                if (!group?.length) return null
                return (
                  <React.Fragment key={role}>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium pt-2 pb-1 px-2">
                      {ROLE_LABELS[role]}
                    </DropdownMenuLabel>
                    {group.map(s => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() => setActiveSupervisorId(s.id)}
                        className={cn("gap-2", activeSupervisorId === s.id && "bg-accent")}
                      >
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                          {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{s.name}</span>
                          {s.title && <span className="text-xs text-muted-foreground">{s.title}</span>}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </React.Fragment>
                )
              })}
              {activeSupervisorId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveSupervisorId(null)} className="gap-2 text-muted-foreground">
                    <LogOut className="h-4 w-4" />
                    <span>Clear selection</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
