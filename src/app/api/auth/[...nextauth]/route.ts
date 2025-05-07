import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions, User } from "next-auth"


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(`http://localhost:4000/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        })

        if (!res.ok) return null

        const data = await res.json()

        // Esperado: { access_token, user: { id, email } }
       
        return {
          id: data.user.id,
          email: data.user.email,
          accessToken: data.access_token,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as User & { accessToken: string }
        token.accessToken = u.accessToken
        token.id = u.id
        token.email = u.email
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.sub,
        email: token.email,
        accessToken: token.accessToken,
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
