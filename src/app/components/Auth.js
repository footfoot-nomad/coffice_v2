'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthForm = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { data: existingUsers, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('email_user', email)

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError

        if (existingUsers && existingUsers.length > 0) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              uuid_user: signUpData.user.id.toString(),
              name_user: name,
            })
            .eq('email_user', email)

          if (updateError) throw updateError
        } else {
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                uuid_user: signUpData.user.id.toString(),
                email_user: email,
                name_user: name,
                profilestyle_user: '{0,0,1,0,5}'
              }
            ])

          if (profileError) throw profileError
        }

        setMessage('가입 확인 이메일을 확인해주세요.')

      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        onAuthSuccess()
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        onAuthSuccess()
      }
    }
    checkAuth()
  }, [onAuthSuccess])

  return (
    <div className="fixed inset-0 bg-[#64c1ff] flex flex-col min-h-screen">
      <div className="h-[30vh] flex flex-col items-center justify-center gap-4 mt-[8vh]">
        <img src="/img/togetheroffice.png" alt="Together Office" className="w-[250px]" />
        <img src="/img/co-office.png" alt="Co Office" className="w-[250px] mt-2" />
      </div>

      <div className="h-[50vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-[320px]">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {isSignUp ? '회원가입' : '로그인'}
          </h2>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-gray-800 placeholder-gray-400"
                required
              />
            )}
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-gray-800 placeholder-gray-400"
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-gray-800 placeholder-gray-400"
              required
            />
            {message && (
              <p className="text-sm text-center text-red-500">{message}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn bg-[#FFFF00] hover:bg-[#FFFF00] text-gray-800 border-1 border-black"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                isSignUp ? '가입하기' : '로그인'
              )}
            </button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-sm text-gray-800 hover:underline"
          >
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </div>

      <div className="h-[20vh] flex items-center justify-center">
        <img src="/img/nomadrang.png" alt="Nomadrang" className="w-[120px]" />
      </div>
    </div>
  )
}

export default AuthForm; 