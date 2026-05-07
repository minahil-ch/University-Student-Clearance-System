"use client"

import dynamic from "next/dynamic"

const AnalyticsContent = dynamic(() => import("./AnalyticsContent"), { ssr: false })

export default function ReportsPortal() {
  return <AnalyticsContent />
}
