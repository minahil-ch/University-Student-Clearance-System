import { redirect } from "next/navigation"

export default function StudentRegisterRedirect() {
  redirect("/register?type=student")
}
