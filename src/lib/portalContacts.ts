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

  return {
    key: normalizedKey,
    label: key,
    email: `${normalizedKey}@${DEFAULT_PORTAL_EMAIL_DOMAIN}`,
    phone: process.env.NEXT_PUBLIC_DEPARTMENT_DEFAULT_PHONE || DEFAULT_PORTAL_PHONE,
  }
}
