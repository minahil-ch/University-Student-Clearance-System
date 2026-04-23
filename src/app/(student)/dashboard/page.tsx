'use client'

import { useEffect, useState } from "react"
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, XCircle, Send, AlertCircle } from "lucide-react"

export default function StudentDashboard() {
  const [selectedDept, setSelectedDept] = useState<any>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('student_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clearance_requests' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_status' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: userProfile } = await supabase.from('users').select('*').eq('id', userData.user.id).single()
      setProfile(userProfile)

      const { data: studentData } = await supabase.from('students').select('*').eq('user_id', userData.user.id).single()
      if (!studentData) return

      if (userProfile) {
        setFormData(prev => ({
          ...prev,
          name: userProfile.name || '',
          registration_no: studentData.registration_no || '',
          department: studentData.department || '',
          cgpa: userProfile.cgpa || '',
          phone: userProfile.phone || ''
        }))
      }

      const { data: requestData } = await supabase.from('clearance_requests').select('*').eq('student_id', studentData.id).single()
      
      if (requestData) {
        setRequest(requestData)
        const { data: statuses } = await supabase.from('department_status').select('*').eq('request_id', requestData.id)
        setDepartmentStatuses(statuses || [])
      } else {
        setRequest(null)
        setDepartmentStatuses([])
      }
    } catch (err: any) {
      if (err.code !== 'PGRST116') { // Ignore row not found
         setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      // Update profile with form data
      const { error: profileError } = await supabase.from('users').update({
        name: formData.name,
        cgpa: formData.cgpa,
        phone: formData.phone
      }).eq('id', userData.user.id)

      if (profileError) throw profileError

      const { data: studentData } = await supabase.from('students').select('*').eq('user_id', userData.user.id).single()
      
      if (studentData) {
        // Update student record
        await supabase.from('students').update({
          registration_no: formData.registration_no,
          department: formData.department
        }).eq('id', studentData.id)

        const { data: newRequest, error } = await supabase.from('clearance_requests').insert({ student_id: studentData.id }).select().single()
        if (error) throw error
        
        // Log to Google Sheet via GAS
        const gasUrl = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL
        const gasToken = process.env.NEXT_PUBLIC_GAS_SECRET_TOKEN
        if (gasUrl) {
          await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: gasToken || "SECURE_KEY_123",
              type: "FORM_SUBMISSION",
              payload: {
                reg_no: formData.registration_no,
                name: formData.name,
                email: userData.user.email,
                phone: formData.phone,
                department: formData.department,
                cgpa: formData.cgpa
              }
            })
          })
        }

        setIsFormOpen(false)
        fetchData()
      }
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-6 h-6 text-green-500" />
    if (status === 'rejected') return <XCircle className="w-6 h-6 text-red-500" />
    return <Clock className="w-6 h-6 text-yellow-500" />
  }

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-800 border-green-200'
    if (status === 'rejected') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const deptContacts: any = {
    library: "+92 301 1111111",
    transport: "+92 302 2222222",
    finance: "+92 303 3333333",
    hostel: "+92 304 4444444",
    academic: "+92 305 5555555"
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Welcome, <span className="text-blue-600">{profile?.name}</span></h1>
          <p className="text-slate-500 mt-2 font-medium">Track your university clearance process in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.href = '/settings'}
            className="p-3 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Clock className="w-6 h-6 text-slate-600" />
          </button>
        </div>
      </header>

      {!request ? (
        <Card className="shadow-2xl border-none ring-1 ring-slate-200 bg-gradient-to-br from-white to-slate-50 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <CardContent className="p-12 text-center relative z-10">
            <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Send className="w-10 h-10 ml-1" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">You need to fill clearance form</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">Click the button below to provide your details and submit your request to all university departments.</p>
            <button 
              onClick={() => setIsFormOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg shadow-blue-500/30 transform hover:scale-105"
            >
              Fill Clearance Form
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Summary Card */}
          <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden rounded-[2rem]">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Your Identity Details</h3>
                  <p className="text-slate-500 font-medium">As submitted in your clearance application</p>
                </div>
                <div className={`px-6 py-2 rounded-2xl text-sm font-black uppercase tracking-widest border ${getStatusColor(request.status)}`}>
                  Final Status: {request.status}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Registration No</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{formData.registration_no}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Department</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{formData.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current CGPA</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{formData.cgpa}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone Number</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{formData.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={`shadow-xl border-none ring-2 ${request.status === 'approved' ? 'ring-green-400' : request.status === 'rejected' ? 'ring-red-400' : 'ring-yellow-400'} overflow-hidden rounded-[2rem]`}>
            <div className={`p-8 text-center ${request.status === 'approved' ? 'bg-green-50' : request.status === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <div className="flex justify-center mb-4">
                {request.status === 'approved' && <CheckCircle className="w-16 h-16 text-green-500" />}
                {request.status === 'rejected' && <XCircle className="w-16 h-16 text-red-500" />}
                {request.status === 'pending' && <Clock className="w-16 h-16 text-yellow-500 animate-pulse" />}
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">
                {request.status === 'approved' ? "You are approved from all departments" : `Current State: ${request.status}`}
              </h2>
              {request.status === 'approved' ? (
                <p className="text-green-700 font-medium">Congratulations! You have been fully cleared. You can now collect your final result card from the registrar's office.</p>
              ) : request.status === 'rejected' ? (
                <p className="text-red-700 font-medium">A department has flagged an issue with your request. Please resolve the issue as per the remarks below.</p>
              ) : (
                <p className="text-yellow-700 font-medium">Your request is currently being synchronized across all university networks.</p>
              )}
            </div>
          </Card>

          <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mt-12 mb-6">
            <AlertCircle className="text-blue-500" /> Department Authorization Grid
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['library', 'transport', 'finance', 'hostel', 'academic'].map((dept) => {
              const status = departmentStatuses.find(s => s.department_name === dept)
              const state = status?.status || 'pending'
              return (
                <div 
                  key={dept} 
                  onClick={() => setSelectedDept(status || { department_name: dept, status: 'pending' })}
                  className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      {getStatusIcon(state)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white capitalize text-lg">{dept} Portal</h4>
                      <p className="text-slate-500 text-xs font-medium">Click for details</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${getStatusColor(state)}`}>
                    {state}
                  </span>
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        isOpen={!!selectedDept}
        onClose={() => setSelectedDept(null)}
        title={`${selectedDept?.department_name} Portal Details`}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
            <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
              {getStatusIcon(selectedDept?.status || 'pending')}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Authorization State</p>
              <h4 className={`text-2xl font-black uppercase tracking-tight ${selectedDept?.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                {selectedDept?.status || 'pending'}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Department Contact</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{deptContacts[selectedDept?.department_name] || 'N/A'}</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Submission Time</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">
                {request?.submitted_at ? new Date(request.submitted_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl md:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Final Action Time</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">
                {selectedDept?.timestamp ? new Date(selectedDept.timestamp).toLocaleString() : 'Awaiting processing...'}
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setSelectedDept(null)}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest"
          >
            Close Details
          </Button>
        </div>
      </Dialog>

      {/* Clearance Form Dialog */}
      <Dialog 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title="Official Clearance Application"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: John Doe" 
                className="h-12 rounded-xl"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Registration No</label>
              <Input 
                value={formData.registration_no} 
                onChange={(e) => setFormData({...formData, registration_no: e.target.value})}
                placeholder="Ex: FA20-BSE-001" 
                className="h-12 rounded-xl"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Current CGPA</label>
              <Input 
                type="number" 
                step="0.01" 
                min="0" 
                max="4"
                value={formData.cgpa} 
                onChange={(e) => setFormData({...formData, cgpa: e.target.value})}
                placeholder="Ex: 3.85" 
                className="h-12 rounded-xl"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Department</label>
              <select 
                value={formData.department} 
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Department</option>
                <option value="CS">Computer Science</option>
                <option value="SE">Software Engineering</option>
                <option value="EE">Electrical Engineering</option>
                <option value="BA">Business Administration</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Ex: +92 300 1234567" 
                className="h-12 rounded-xl"
                required 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-8 flex justify-end gap-4">
            <button 
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Submit Application"}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

  )
}
