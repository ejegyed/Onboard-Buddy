import * as React from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, UserSquare2, CheckSquare, Layers } from "lucide-react"

const sidebarNavItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Cohorts", href: "/cohorts", icon: Layers },
  { title: "Associates", href: "/associates", icon: Users },
  { title: "Supervisors", href: "/supervisors", icon: UserSquare2 },
  { title: "Check-ins", href: "/checkins", icon: CheckSquare },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                HR
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
