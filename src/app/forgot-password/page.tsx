"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Mail } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    })
    if (error) toast.error(error.message)
    else toast.success("OTP/Reset instructions sent to your email")
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Enter your email to receive OTP/reset instructions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendReset} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send OTP/Reset"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
