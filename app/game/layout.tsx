import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { userHasAccess } from '@/lib/access'

type GameLayoutProps = {
  children: ReactNode
}

export default async function GameLayout({ children }: GameLayoutProps) {
  // const { userId } = await auth()
  // if (!userId) redirect('/sign-in')

  // const hasAccess = await userHasAccess(userId)
  // if (!hasAccess) redirect('/pricing')

  return <>{children}</>
}
