/**
 * Student clearance rows use keys like library, finance, academic-software-engineering.
 * Portal URLs use short academic slugs (e.g. /dept/software-engineering).
 */



/** clearance_status.department_key and student dashboard keys */
export function canonicalClearanceDepartmentKey(dept: string | null | undefined): string {
  const raw = (dept || "").toLowerCase().trim().replace(/\s+/g, "-")
  if (!raw) return ""
  if (raw.startsWith("academic-")) return raw
  
  const coreDepts = ["library", "transport", "finance", "hostel", "admin", "student"]
  if (coreDepts.includes(raw)) return raw
  
  return `academic-${raw}`
}

/** Last segment of /dept/[slug] for academic staff (short slug) */
export function departmentPortalPathSlug(deptName?: string | null): string {
  const raw = (deptName || "").toLowerCase().trim().replace(/\s+/g, "-")
  if (!raw) return "unknown"
  if (raw.startsWith("academic-")) return raw.slice("academic-".length) || "unknown"
  return raw
}

export function isAcademicClearancePortal(routeDeptKey: string): boolean {
  return canonicalClearanceDepartmentKey(routeDeptKey).startsWith("academic-")
}
