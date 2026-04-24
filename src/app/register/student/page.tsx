import { redirect } from "next/navigation"

export default async function StudentRegisterRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = (await searchParams) || {}
  const switchMode = typeof params.switch === "string" ? params.switch : "1"

  const q = new URLSearchParams()
  q.set("type", "student")
  q.set("switch", switchMode || "1")
  redirect(`/register?${q.toString()}`)
}
