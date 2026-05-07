"use client"

import dynamic from "next/dynamic"

const RequestsContent = dynamic(() => import("./RequestsContent"), { ssr: false })

export default function PendingRequestsPage() {
  return <RequestsContent />
}
