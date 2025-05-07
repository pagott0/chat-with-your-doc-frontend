'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/',
      })
  
      if (res?.error) {
        setError('Login inválido')
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      setError('Erro ao fazer login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="p-6 rounded shadow-md w-full max-w-md space-y-2 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <Input
          type="email"
          placeholder="Email"
          className="w-full p-2 border"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Senha"
          className="w-full p-2 border"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <Button
          onClick={handleLogin}
          className="w-full p-2 rounded"
        >
          Entrar
        </Button>
      </Card>
    </div>
  )
}
