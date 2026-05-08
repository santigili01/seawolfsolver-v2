import { UserProfile } from '@clerk/nextjs'

export default function AccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{background: 'linear-gradient(135deg, #4ECDC4, #2BA8A0)'}}>
      <UserProfile />
    </div>
  )
}
