import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-background p-4">
      <SignIn />
    </div>
  )
}
