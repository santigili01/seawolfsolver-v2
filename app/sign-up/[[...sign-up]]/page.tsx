import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-background p-4">
      <SignUp />
    </div>
  )
}
