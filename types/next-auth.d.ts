//eslint-disable-next-line
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      accessToken: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    accessToken: string
  }
}
