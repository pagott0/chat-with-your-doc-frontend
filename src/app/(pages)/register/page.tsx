'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [name, setName] = useState('')

  const handleRegister = async () => {
    const res  = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data: {
      success: boolean,
      message: string,
      data: {
        email: string,
        name: string,
      }
    } = await res.json()
    if (res.ok && data?.success) {
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/',
      })
      if (signInRes?.error) {
        setError('Erro ao registrar usuário')
      }
    } else {
      setError('Erro ao registrar usuário')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="p-6 rounded shadow-md w-full max-w-md space-y-2 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Registrar</h2>
        <Input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-600">{error}</p>}
        <Button onClick={handleRegister}>Registrar</Button>
      </div>
    </div>
  )
}
