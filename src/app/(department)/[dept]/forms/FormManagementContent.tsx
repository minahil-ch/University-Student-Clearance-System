"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/layout/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { FileText, Plus, Trash2, Link2, ExternalLink, GraduationCap, Edit2, X } from "lucide-react"
import { canonicalClearanceDepartmentKey } from "@/lib/departmentKeys"

export default function FormManagementContent() {
  const params = useParams()
  const rawDept = Array.isArray(params?.dept) ? params.dept[0] : params?.dept
  const deptString = typeof rawDept === 'string' ? rawDept : ''

  const [departmentForms, setDepartmentForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newForm, setNewForm] = useState({ name: "", link: "" })
  const [editingFormId, setEditingFormId] = useState<string | null>(null)
  const supabase = createClient()

  const departmentKey = deptString ? canonicalClearanceDepartmentKey(deptString) : ''

  useEffect(() => {
    if (departmentKey) fetchForms()
  }, [departmentKey])

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('department_forms')
        .select('*')
        .eq('department_key', departmentKey)
        .order('created_at', { ascending: true })

      if (error) throw error
      setDepartmentForms(data || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newForm.name || !newForm.link) {
      toast.error("Form name and link are required.")
      return
    }

    try {
      if (editingFormId) {
        const { error } = await supabase
          .from('department_forms')
          .update({
            form_name: newForm.name,
            form_link: newForm.link,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFormId)

        if (error) throw error
        toast.success("Requirement updated successfully!")
        setEditingFormId(null)
      } else {
        const { error } = await supabase
          .from('department_forms')
          .insert({
            department_key: departmentKey,
            form_name: newForm.name,
            form_link: newForm.link
          })

        if (error) throw error
        toast.success("Academic form generated and published!")
      }

      setNewForm({ name: "", link: "" })
      fetchForms()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteForm = async (id: string) => {
    try {
      const { error } = await supabase.from('department_forms').delete().eq('id', id)
      if (error) throw error
      toast.success("Form retracted successfully")
      fetchForms()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (!departmentKey) return null

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <Sidebar role="department" departmentName={deptString} />
      
      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        <header className="mb-12">
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-primary">CUI <span className="text-primary">Clearance System</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Publish Requirements to Departmental Students</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1 space-y-8">
            <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden">
               <CardHeader className="bg-slate-900 p-8 text-white">
                 <div className="flex items-center gap-3">
                   {editingFormId ? <Edit2 className="w-6 h-6 text-amber-400" /> : <Plus className="w-6 h-6 text-primary" />}
                   <CardTitle className="text-xl font-black uppercase tracking-tight">
                     {editingFormId ? "Edit Requirement" : "Create New Form"}
                   </CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleCreateForm} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Requirement Name</label>
                    <Input 
                      value={newForm.name} 
                      onChange={e => setNewForm({...newForm, name: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-sm" 
                      placeholder="e.g. Thesis Submission Form"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">External Link</label>
                    <Input 
                      value={newForm.link} 
                      onChange={e => setNewForm({...newForm, link: e.target.value})}
                      className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-sm" 
                      placeholder="https://forms.google.com/..."
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" className={`flex-1 h-14 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl ${editingFormId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}>
                      {editingFormId ? "Update Form" : "Publish to Students"}
                    </Button>
                    {editingFormId && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => { setEditingFormId(null); setNewForm({ name: "", link: "" }) }}
                        className="h-14 w-14 rounded-2xl border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-0"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl group-hover:scale-150 transition-transform duration-700" />
               <GraduationCap className="w-12 h-12 mb-4 opacity-50" />
               <h4 className="text-xl font-black uppercase tracking-tighter italic">Automatic Distribution</h4>
               <p className="text-indigo-100 text-xs mt-2 font-medium leading-relaxed">
                 Forms published here will immediately appear on the dashboards of all students currently registered to your department.
               </p>
            </Card>
          </div>

          <div className="xl:col-span-2">
            <Card className="glass-card border-none rounded-[2.5rem] shadow-2xl overflow-hidden h-full">
              <CardHeader className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Active Requirements</CardTitle>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Live forms visible to students</p>
                </div>
                <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-400">
                  {departmentForms.length} Forms
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {departmentForms.map((form) => (
                    <div key={form.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 uppercase text-sm tracking-tight">{form.form_name}</h5>
                          <a href={form.form_link} target="_blank" className="text-[10px] font-bold text-slate-400 flex items-center gap-1 hover:text-primary transition-colors">
                            <Link2 className="w-3 h-3" /> {form.form_link ? form.form_link.substring(0, 40) : ""}...
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => window.open(form.form_link, '_blank')} className="rounded-xl h-10 w-10 p-0 text-slate-400 hover:text-primary transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingFormId(form.id)
                            setNewForm({ name: form.form_name, link: form.form_link })
                          }} 
                          className="rounded-xl h-10 w-10 p-0 text-slate-400 hover:text-amber-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteForm(form.id)} className="rounded-xl h-10 w-10 p-0 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {departmentForms.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                       <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                         <FileText className="w-8 h-8 text-slate-100" />
                       </div>
                       <p className="text-xs font-black uppercase tracking-widest text-slate-300">No active forms published</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
