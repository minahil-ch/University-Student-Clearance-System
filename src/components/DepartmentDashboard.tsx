'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function DepartmentDashboard({ departmentName }: { departmentName: string }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchRequests = async () => {
    try {
      setLoading(true)
      
      const query = supabase
        .from('department_status')
        .select(`
          id,
          status,
          timestamp,
          clearance_requests!inner(
            id,
            status,
            students!inner(
              registration_no,
              department,
              users!inner(name, email)
            )
          )
        `)
        .eq('department_name', departmentName)

      const { data, error } = await query

      if (error) throw error

      let filteredData = data
      
      // Academic Logic: ONLY show if library, transport, finance, hostel are approved
      if (departmentName === 'academic') {
        const { data: allStatuses } = await supabase.from('department_status').select('request_id, department_name, status')
        if (allStatuses) {
           filteredData = data?.filter((req: any) => {
              const cr = req.clearance_requests as any
              const crId = Array.isArray(cr) ? cr[0]?.id : cr?.id
              const reqStatuses = allStatuses.filter(s => s.request_id === crId)
              const deps = ['library', 'transport', 'finance', 'hostel']
              const allDepsApproved = deps.every(dep => {
                 const depStatus = reqStatuses.find(s => s.department_name === dep)
                 return depStatus?.status === 'approved'
              })
              return allDepsApproved
           }) || []
        }
      }

      setRequests(filteredData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()

    const channel = supabase
      .channel('department_status_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'department_status', filter: `department_name=eq.${departmentName}` },
        () => {
          fetchRequests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentName])

  const handleStatusUpdate = async (statusId: string, requestId: string, newStatus: string, studentEmail: string, studentName: string, regNo: string, studentDept: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      
      // 1. Update department status
      const { error: deptError } = await supabase
        .from('department_status')
        .update({ status: newStatus, approved_by: userData.user.id, timestamp: new Date().toISOString() })
        .eq('id', statusId)

      if (deptError) throw deptError

      // 2. If rejected, mark the entire request as rejected
      if (newStatus === 'rejected') {
         await supabase.from('clearance_requests').update({ status: 'rejected' }).eq('id', requestId)
         
         // Notify student via Google Apps Script (Optional rejection notification)
         sendEmailNotification(studentName, studentEmail, regNo, studentDept, 'REJECTED by ' + departmentName)
      }

      // 3. If academic and approved -> final approval
      if (departmentName === 'academic' && newStatus === 'approved') {
         await supabase.from('clearance_requests').update({ status: 'approved' }).eq('id', requestId)
         
         // Required final email
         sendEmailNotification(studentName, studentEmail, regNo, studentDept, 'CLEARED')
      }

      fetchRequests()
    } catch (err: any) {
      alert("Error updating status: " + err.message)
    }
  }

  const sendEmailNotification = async (name: string, email: string, regNo: string, dept: string, status: string) => {
     // Replace with actual GAS URL
     const gasUrl = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL
     const gasToken = process.env.NEXT_PUBLIC_GAS_SECRET_TOKEN
     if (!gasUrl) return

     try {
       await fetch(gasUrl, {
         method: 'POST',
         mode: 'no-cors',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           token: gasToken || "SECURE_KEY_123",
           type: "STATUS_UPDATE",
           payload: {
             name: name,
             email: email,
             registrationNo: regNo,
             department: dept,
             status: status,
             remarks: ""
           }
         })
       })
     } catch (error) {
       console.error("Failed to send email", error)
     }
  }

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (error) return <div className="text-red-500 p-4 text-center">{error}</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold capitalize text-slate-800">{departmentName} Portal</h1>
         <div className="bg-slate-100 px-4 py-2 rounded-full text-sm font-medium text-slate-600 shadow-sm border border-slate-200">
           Live Updates Active <span className="inline-block w-2 h-2 bg-green-500 rounded-full ml-2 animate-pulse"></span>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requests.map((req) => {
          const student = req.clearance_requests.students
          const user = student.users
          
          return (
            <Card key={req.id} className="shadow-lg hover:shadow-xl transition-shadow border-t-4 border-t-blue-500">
              <CardHeader className="bg-slate-50/50 pb-4">
                <CardTitle className="text-xl text-slate-800">{user.name}</CardTitle>
                <p className="text-sm text-slate-500 font-mono mt-1">{student.registration_no}</p>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                  {student.department}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 font-medium">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${req.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                        req.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 
                        'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                      {req.status}
                    </span>
                  </div>
                  
                  {req.status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => handleStatusUpdate(req.id, req.clearance_requests.id, 'approved', user.email, user.name, student.registration_no, student.department)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-medium transition-colors shadow-sm focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(req.id, req.clearance_requests.id, 'rejected', user.email, user.name, student.registration_no, student.department)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-medium transition-colors shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {requests.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            No clearance requests found for this department.
          </div>
        )}
      </div>
    </div>
  )
}
