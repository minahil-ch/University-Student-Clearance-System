"use client"

import dynamic from "next/dynamic"

const FormManagementContent = dynamic(() => import("./FormManagementContent"), { ssr: false })

export default function FormManagementPage() {
  return <FormManagementContent />
}
