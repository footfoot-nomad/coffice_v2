'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import ProfileCharacter from './ProfileCharacter'

export default function ChatModal({ isOpen, onClose, selectedSubscription, selectedUserData, membersInfo }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
  }

  useEffect(() => {
    if (isOpen && selectedSubscription) {
      // 채팅 메시지 로드
      const loadMessages = async () => {
        try {
          const { data, error: loadError } = await supabase
            .from('chat')
            .select('*')
            .eq('id_coffice', selectedSubscription.id_coffice)
            .order('created_at', { ascending: true })

          if (loadError) throw loadError

          setMessages(data)
          // 초기 로딩 시에는 즉시 스크롤
          setTimeout(() => scrollToBottom(false), 100)
        } catch (err) {
          setError('메시지를 불러오는데 실패했습니다.')
        }
      }

      loadMessages()

      // 실시간 구독 설정
      const channel = supabase
        .channel('chat_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat',
            filter: `id_coffice=eq.${selectedSubscription.id_coffice}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setMessages(prev => [...prev, payload.new])
              // 새 메시지가 올 때는 스무스 스크롤
              setTimeout(() => scrollToBottom(true), 100)
            }
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [isOpen, selectedSubscription])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      const messageData = {
        id_coffice: selectedSubscription.id_coffice,
        id_user: selectedUserData.id_user,
        message_chat: messageContent,
        created_at: new Date().toISOString()
      }
      
      const { data, error: sendError } = await supabase
        .from('chat')
        .insert([messageData])
        .select()

      if (sendError) {
        console.log('메시지 전송 에러:', sendError)
        setNewMessage(messageContent)
        throw sendError
      }

      if (data) {
        console.log('메시지 전송 성공:', data)
        setMessages(prev => [...prev, data[0]])
        setError(null)
        // 메시지 전송 시에는 스무스 스크롤
        scrollToBottom(true)
      }
    } catch (err) {
      console.log('메시지 전송 실패:', err)
      setError('메시지 전송에 실패했습니다. 다시 시도해주세요.')
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-[100] pt-[2vh]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-[90%] max-w-[400px] h-[70vh] max-h-[550px] flex flex-col text-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-black">채팅</h3>
          <button 
            onClick={onClose} 
            className="btn btn-circle btn-ghost border-none text-xl text-black"
          >
            ✕
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative shrink-0" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* 채팅 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => {
            const isCurrentUser = message.id_user === selectedUserData.id_user
            const member = membersInfo[message.id_user]

            return (
              <div key={index} className={`chat ${isCurrentUser ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-image">
                  <div className="w-10 aspect-square rounded-lg overflow-hidden border-1 border-black">
                    <ProfileCharacter
                      profileStyle={member?.profilestyle_user}
                      size={38}
                    />
                  </div>
                </div>
                <div className="chat-header mb-1">
                  {member?.name_user}
                  <time className="text-xs opacity-50 ml-1">
                    {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </div>
                <div className={`chat-bubble ${isCurrentUser ? 'bg-[#FFFF00] text-black' : 'text-gray-800'}`}>
                  {message.message_chat}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 메시지 입력 영역 */}
        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2 shrink-0">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요"
            className="input input-bordered flex-1 text-base min-h-[40px] text-gray-800 placeholder:text-gray-400 focus:outline-none border-[1px] focus:border-[2px] border-gray-200 focus:border-gray-800"
            style={{ fontSize: '16px' }}
          />
          <button type="submit" className="btn bg-[#FFFF00] hover:bg-[#FFFF00] text-black border-1 border-black shrink-0">
            전송
          </button>
        </form>
      </div>
    </div>
  )
} 