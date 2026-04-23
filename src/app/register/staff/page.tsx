import { redirect } from "next/navigation"

export default function StaffRegisterRedirect() {
  redirect("/register?type=staff")
}
