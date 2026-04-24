/**
 * Student clearance rows use keys like library, finance, academic-software-engineering.
 * Portal URLs use short academic slugs (e.g. /dept/software-engineering).
 */

const ACADEMIC_SUBJECT_SLUGS = new Set([
  "computer-science",
  "software-engineering",
  "mathematics",
  "humanities",
  "environmental-sciences",
])

/** clearance_status.department_key and student dashboard keys */
export function canonicalClearanceDepartmentKey(dept: string | null | undefined): string {
  const raw = (dept || "").toLowerCase().trim().replace(/\s+/g, "-")
  if (!raw) return ""
  if (raw.startsWith("academic-")) return raw
  if (ACADEMIC_SUBJECT_SLUGS.has(raw)) return `academic-${raw}`
  return raw
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
