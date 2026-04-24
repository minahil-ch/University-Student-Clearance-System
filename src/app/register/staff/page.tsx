import { redirect } from "next/navigation"

export default async function StaffRegisterRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) || {}
  const dept = typeof params.dept === "string" ? params.dept : undefined
  const switchMode = typeof params.switch === "string" ? params.switch : "1"

  const q = new URLSearchParams()
  q.set("type", "staff")
  q.set("switch", switchMode || "1")
  if (dept) q.set("dept", dept)
  redirect(`/register?${q.toString()}`)
}
