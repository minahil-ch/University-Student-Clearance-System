"use client"
export const dynamic = 'force-dynamic'
import DepartmentDashboard from '../[dept]/page'

export default function TransportPortal() {
  return <DepartmentDashboard departmentName="transport" />
}
