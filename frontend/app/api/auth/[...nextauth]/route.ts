import NextAuth from 'next-auth'
import { getAuthOptions } from '@/auth'
import { NextRequest } from 'next/server'

async function auth(req: NextRequest, ctx: any) {
  return await NextAuth(req, ctx, getAuthOptions(req))
}

export { auth as GET, auth as POST }
