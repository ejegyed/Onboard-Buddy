import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(dateString));
}

export function formatRole(role: string) {
  return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function formatPhase(phase: string) {
  return phase.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
