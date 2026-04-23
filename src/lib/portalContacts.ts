export interface PortalContact {
  key: string
  label: string
  email: string
  phone: string
}

const DEFAULT_PORTAL_PHONE = "+923001234567"
const DEFAULT_PORTAL_EMAIL_DOMAIN = "university.com"

export function normalizeDepartmentKey(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, "-")
}

export function getPortalContact(key: string): PortalContact {
  const normalizedKey = normalizeDepartmentKey(key)

  if (normalizedKey === "transport") {
    return {
      key: "transport",
      label: "Transport",
      email: process.env.NEXT_PUBLIC_TRANSPORT_EMAIL || `transport@${DEFAULT_PORTAL_EMAIL_DOMAIN}`,
      phone: process.env.NEXT_PUBLIC_TRANSPORT_PHONE || "+923054128282",
    }
  }

  if (normalizedKey === "library") {
    return {
      key: "library",
      label: "Library",
      email: process.env.NEXT_PUBLIC_LIBRARY_EMAIL || `library@${DEFAULT_PORTAL_EMAIL_DOMAIN}`,
      phone: process.env.NEXT_PUBLIC_LIBRARY_PHONE || "+923219876543",
    }
  }

  if (normalizedKey === "finance") {
    return {
      key: "finance",
      label: "Finance",
      email: process.env.NEXT_PUBLIC_FINANCE_EMAIL || `finance@${DEFAULT_PORTAL_EMAIL_DOMAIN}`,
      phone: process.env.NEXT_PUBLIC_FINANCE_PHONE || "+923334445556",
    }
  }

  if (normalizedKey === "hostel") {
    return {
      key: "hostel",
      label: "Hostel",
      email: process.env.NEXT_PUBLIC_HOSTEL_EMAIL || `hostel@${DEFAULT_PORTAL_EMAIL_DOMAIN}`,
      phone: process.env.NEXT_PUBLIC_HOSTEL_PHONE || "+923456789012",
    }
  }

  if (normalizedKey.startsWith("academic-")) {
    return {
      key: normalizedKey,
      label: `Academic (${key.replace(/^academic-/, "")})`,
      email: process.env.NEXT_PUBLIC_ACADEMIC_EMAIL || `academic@${DEFAULT_PORTAL_EMAIL_DOMAIN}`,
      phone: process.env.NEXT_PUBLIC_ACADEMIC_PHONE || "+923001112233",
    }
  }

  return {
    key: normalizedKey,
    label: key,
    email: `${normalizedKey}@${DEFAULT_PORTAL_EMAIL_DOMAIN}`,
    phone: process.env.NEXT_PUBLIC_DEPARTMENT_DEFAULT_PHONE || DEFAULT_PORTAL_PHONE,
  }
}
