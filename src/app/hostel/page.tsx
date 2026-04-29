"use client"
export const dynamic = 'force-dynamic'
import DepartmentDashboard from '../(department)/[dept]/page'

export default function HostelPortal() {
  return <DepartmentDashboard departmentName="hostel" />
}
