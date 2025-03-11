'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { defaultCharacterDrawing } from './character'
import ProfileCharacter from './ProfileCharacter'

export default function ProfileEditModal({ user, onClose, onUpdate }) {
  const [profileStyle, setProfileStyle] = useState(user?.profilestyle_user || '#f3f4f6')
  const [name, setName] = useState(user?.name_user || '')
  const [contact, setContact] = useState(user?.contact_user || '')
  
  // 캐릭터 정보를 저장하는 객체 상태 수정
  const [characterInfo, setCharacterInfo] = useState(() => {
    try {
      // profilestyle_user가 배열인지 확인
      const profileStyle = Array.isArray(user?.profilestyle_user) 
        ? user.profilestyle_user 
        : [0, 0, 0, 0, 0];
      
      return {
        hairNo: profileStyle[0] ?? 0,
        faceNo: profileStyle[1] ?? 0,
        hairColor: profileStyle[2] ?? 0,
        faceColor: profileStyle[3] ?? 0,
        backgroundColor: profileStyle[4] ?? 0
      }
    } catch (error) {
      console.error('프로필 스타일 파싱 오류:', error);
      return {
        hairNo: 0,
        faceNo: 0,
        hairColor: 0,
        faceColor: 0,
        backgroundColor: 0
      }
    }
  })

  // 색상 리스트 정의
  const colorList = [
    
        "#FFFF00",
        "#B2F632",
        "#62EC68",
        "#38F3FF",
        "#64C1FF",
        "#569AFF",
        "#5F6BFF",
        "#B68FFF",
        "#A126FF",
        "#F65AFF",
        "#FF8FCC",
        "#FFA51F",
        "#FF4A1F"
      
  
  ]

  const [subscriptionData, setSubscriptionData] = useState([])

  // 이름 수정 모달 상태 추가
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [newName, setNewName] = useState(name)

  // 이름 수정 확인 모달 상태 추가
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // 오피스 정보 모달 상태 추가
  const [selectedOffice, setSelectedOffice] = useState(null)
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false)

  // 캐릭터 편집 모달 상태 추가
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false)

  // convertCharacterInfoToProfileStyle 함수도 수정
  const convertCharacterInfoToProfileStyle = () => {
    return [
      characterInfo.hairNo,
      characterInfo.faceNo,
      characterInfo.hairColor,  // hairColor가 올바르게 포함되어 있는지 확인
      0,  // faceColor를 항상 0으로 고정
      characterInfo.backgroundColor
    ];
  }

  // 색상 선택 핸들러 수정
  const updateCharacterInfo = (key, value) => {
    setCharacterInfo(prev => ({
      ...prev,
      [key]: value
      
    }))
  }

  // drawCharacter 함수 제거

  // 구독 정보 조회 함수
  const fetchSubscriptions = async () => {
    const currentDate = new Date()
    const yearMonth = `${String(currentDate.getFullYear()).slice(-2)}${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    
    try {
      // 쿼리 수정
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id_user,
          activation,
          coffices (
            day_coffice,
            month_coffice,
            offices (
              name_office,
              address_office,
              tel_office,
              mon_operation_office,
              tue_operation_office,
              wed_operation_office,
              thu_operation_office,
              fri_operation_office,
              sat_operation_office,
              sun_operation_office
            )
          )
        `)
        .eq('id_user', user.id_user)
        .eq('activation', true)
        .eq('coffices.month_coffice', yearMonth)

      if (error) throw error
      
      console.log('원본 데이터:', data) // 디버깅용

      // 데이터가 없는 경우 빈 배열 반환
      if (!data || data.length === 0) {
        setSubscriptionData([])
        return
      }

      // 데이터 구조 변환
      const formattedData = data.reduce((acc, sub) => {
        const existingOffice = acc.find(item => item.name_office === sub.coffices.offices.name_office);
        
        if (existingOffice) {
          existingOffice.days.push(sub.coffices.day_coffice);
        } else {
          acc.push({
            name_office: sub.coffices.offices.name_office,
            address_office: sub.coffices.offices.address_office,
            tel_office: sub.coffices.offices.tel_office,
            days: [sub.coffices.day_coffice],
            operation_office: [
              sub.coffices.offices.mon_operation_office,
              sub.coffices.offices.tue_operation_office,
              sub.coffices.offices.wed_operation_office,
              sub.coffices.offices.thu_operation_office,
              sub.coffices.offices.fri_operation_office,
              sub.coffices.offices.sat_operation_office,
              sub.coffices.offices.sun_operation_office
            ]
          });
        }
        return acc;
      }, []);
      
      console.log('변환된 데이터:', formattedData)  // 변환된 데이터 출력
      
      setSubscriptionData(formattedData)
    } catch (error) {
      console.error('구독 정보 조회 실패:', error)
      setSubscriptionData([]) // 에러 발생 시 빈 배열로 설정
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  // 프로필 업데이트 함수 수정
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name_user: name,
          contact_user: contact,
          profilestyle_user: convertCharacterInfoToProfileStyle(),
          
        })
        .eq('id_user', user.id_user)
        .select()

      if (error) throw error
      onClose()
      if (onUpdate) {
        onUpdate(data[0])
      }
    } catch (error) {
      console.error('프로필 업데이트 실패:', error)
    }
  }

  // 랜덤 생성 함수 수정
  const randomGenerator = () => {
    setCharacterInfo({
      hairNo: Math.floor(Math.random() * 12),  // 0-11
      faceNo: Math.floor(Math.random() * 3),   // 0-2
      hairColor: Math.floor(Math.random() * colorList.length),
      faceColor: 0,  // faceColor를 항상 0으로 고정
      backgroundColor: Math.floor(Math.random() * colorList.length)
    })
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // 로그아웃 후 페이지 새로고침
      window.location.reload()
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  // 이름 업데이트 함수
  const updateName = async (newName) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ name_user: newName })
        .eq('id_user', user.id_user)
        .select()

      if (error) throw error

      setName(newName)
      onUpdate({ ...user, name_user: newName })
    } catch (error) {
      console.error('이름 업데이트 실패:', error)
    }
  }

  // 이름 클릭 핸들러 수정
  const handleNameClick = () => {
    setIsConfirmModalOpen(true)
  }

  // 이름 수정 시작
  const startNameEdit = () => {
    setIsConfirmModalOpen(false)
    setIsNameModalOpen(true)
  }

  // 이름 수정 제출 핸들러 추가
  const handleNameSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateName(newName)
      setIsNameModalOpen(false)
    } catch (error) {
      console.error('이름 수정 실패:', error)
    }
  }

  // 오피스 클릭 핸들러
  const handleOfficeClick = (office) => {
    setSelectedOffice(office)
    setIsOfficeModalOpen(true)
  }

  // 캐릭터 이미지 클릭 핸들러 추가
  const handleCharacterClick = () => {
    setIsCharacterModalOpen(true)
  }

//   // characterInfo 객체에서 실제 색상 값을 사용할 때
//   const getCharacterStyle = () => {
//     return {
//       backgroundColor: colorList[characterInfo.backgroundColor],
//       // 다른 스타일 속성들...
//     }
//   }

  // 시간 포맷 함수 추가
  const formatTime = (time) => {
    return time ? time.substring(0, 5) : time; // "HH:MM:SS" -> "HH:MM"
  }

  return (
    <div className="fixed inset-0 z-50 animate-slide-down overflow-y-auto" style={{ backgroundColor: '#FFFFC9' }}>
      {/* 메인 닫기 버튼 */}
      <button 
        type="button"
        onClick={() => {
          console.log('닫기 버튼 클릭됨');
          if (typeof onClose === 'function') {
            onClose();
          } else {
            console.error('onClose is not a function:', onClose);
          }
        }}
        className="btn btn-circle btn-ghost border-none absolute right-4 top-4 text-2xl z-100 text-black"
      >
        ✕
      </button>
      
      <div className="max-w-[430px] mx-auto pb-8 flex flex-col min-h-screen">
        <div className="flex flex-col items-center pt-8 mt-[-180px]">
          {/* 목걸이 SVG로 교체 */}
          <svg width="538" height="778" viewBox="0 0 538 778" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-50 h-64 z-10">
            <g filter="url(#filter0_d_1401_3593)">
              <path fillRule="evenodd" clipRule="evenodd" d="M369.684 544.66C414.222 425.409 442.968 256.686 442.968 67.4973C389 48.1651 422 48.165 374 33.4972C330 38.9972 350.427 75.2622 326.5 48.1651C312 40.9973 283.928 50.1655 279.5 48.1651C275.072 50.1655 242.774 41.9339 228 58.6651C204.073 85.7622 187.44 -26.585 165 33.4972C110 58.665 118.5 33.4973 95.032 67.4973C95.032 256.686 123.778 425.409 168.316 544.66C190.756 604.742 215.801 648.414 239.728 675.511C254.502 692.242 264.572 698.164 269 700.165C273.428 698.164 283.498 692.242 298.272 675.511C322.199 648.414 347.244 604.742 369.684 544.66ZM269 768.997C413.699 768.997 531 454.925 531 67.4973C374 21.9963 424.199 21.9962 279.5 21.9962C134.801 21.9962 168.316 -36.5 7 67.4973C7 454.925 124.301 768.997 269 768.997Z" fill="#7EBFFB"/>
            </g>
            <defs>
              <filter id="filter0_d_1401_3593" x="0" y="0.601562" width="538" height="777.395" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="2"/>
                <feGaussianBlur stdDeviation="3.5"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1401_3593"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1401_3593" result="shape"/>
              </filter>
            </defs>
          </svg>
          {/* 명찰이미지 */}
          <div className="w-[310px] bg-white rounded-2xl 
            border-2 border-black 
            shadow-[0_2px_8px_rgba(0,0,0,0.1)]
            z-20 mt-[-50px] py-10 min-h-[450px]"
          >
            {/* 캐릭터 이미지를 ProfileCharacter 컴포넌트로 교체 */}
            <div className="flex justify-center items-center">
              <div className="rounded-2xl overflow-hidden border-2 border-black w-[160px] aspect-square relative">
                <div 
                  className="absolute top-2 right-2 z-30 bg-white/80 rounded-full p-1.5 cursor-pointer hover:bg-white text-gray-500 hover:text-gray-700"
                  onClick={handleCharacterClick}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" 
                    />
                  </svg>
                </div>
                <ProfileCharacter
                  profileStyle={user?.profilestyle_user}
                  size={156}
                  className="profile-modal"
                />
              </div>
            </div>

            {/* 구독 정보 표시 */}
            <div className="mt-8 px-4">
              <div className="space-y-3">
                {/* 사용자 이름 표시 */}
                <div className="text-center mt-[-30px] mb-[12px] relative">
                  <div className="inline-block relative">
                    <span className="text-3xl font-bold tracking-wide py-4 text-black block">
                      {name}
                    </span>
                    
                    <button
                      onClick={handleNameClick}
                      className="absolute top-1/2 -translate-y-1/2 left-full ml-1 text-gray-500 hover:text-gray-700 p-1"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        strokeWidth={1.5} 
                        stroke="currentColor" 
                        className="w-5 h-5"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {subscriptionData.map((sub, index) => (
                  <div key={index} className="text-center bg-gray-100 rounded-lg p-3 hover:bg-gray-200 transition-colors">
                    <div 
                      className="cursor-pointer space-y-1.5"
                      onClick={() => handleOfficeClick(sub)}
                    >
                      <span className="text-lg font-bold text-black flex items-center justify-center mb-0.5">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          strokeWidth={1.5} 
                          stroke="currentColor" 
                          className="w-5 h-5 mr-1"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" 
                          />
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" 
                          />
                        </svg>
                        {sub.name_office}
                      </span>
                      <span className="text-sm text-black flex items-center justify-center">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          strokeWidth={1.5} 
                          stroke="currentColor" 
                          className="w-4 h-4 mr-1"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" 
                          />
                        </svg>
                        {sub.days.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
                {subscriptionData.length === 0 && (
                  <p className="text-sm text-black text-center">구독 중인 상품이 없습니다.</p>
                )}
                
              </div>
            </div>
          </div>
        </div>

        {/* 로그아웃 버튼 스타일 수정 */}
        <div className="px-4 mt-8 flex-shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-primary w-[288px] h-[48px] mx-auto block bg-[gray] hover:bg-[gray] text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
          >
            <span className="text-[16px] font-semibold">로그아웃</span>
          </button>
        </div>
      </div>

      {/* 이름 수정 확인 모달 추가 */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl p-6 w-[300px] border border-black">
            <h3 className="text-lg font-bold mb-4 text-black">이름을 수정하시겠습니까?</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="btn flex-1 btn-default shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={startNameEdit}
                className="btn flex-1 btn-primary shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 이름 수정 모달 */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl p-6 w-[300px] border border-black">
            <h3 className="text-lg font-bold mb-4 text-black">이름 수정</h3>
            <form onSubmit={handleNameSubmit}>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-black rounded-xl px-4 py-3 text-base text-black"
                  maxLength={6}
                  required
                />
                <p className="text-sm text-black">
                  최대 6자까지 입력 가능합니다. ({newName.length}/6)
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="btn flex-1 btn-default shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn flex-1 btn-primary shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 오피스 정보 모달 수정 */}
      {isOfficeModalOpen && selectedOffice && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOfficeModalOpen(false);
            }
          }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 w-[320px] max-w-[90%] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">{selectedOffice.name_office}</h3>
              <button 
                onClick={() => setIsOfficeModalOpen(false)}
                className="btn btn-circle btn-ghost border-none text-xl text-black"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-black block mb-1 font-bold">주소</label>
                <p className="text-base text-black">{selectedOffice.address_office}</p>
              </div>
              
              <div>
                <label className="text-sm text-black block mb-1 font-bold">운영시간</label>
                <div className="space-y-1 text-sm text-black">
                  <p>월요일&nbsp; {selectedOffice.operation_office[0] ? 
                    `${formatTime(selectedOffice.operation_office[0][0])} ~ ${formatTime(selectedOffice.operation_office[0][1])}` : 
                    '휴무'}</p>
                  <p>화요일&nbsp; {selectedOffice.operation_office[1] ? 
                    `${formatTime(selectedOffice.operation_office[1][0])} ~ ${formatTime(selectedOffice.operation_office[1][1])}` : 
                    '휴무'}</p>
                  <p>수요일&nbsp; {selectedOffice.operation_office[2] ? 
                    `${formatTime(selectedOffice.operation_office[2][0])} ~ ${formatTime(selectedOffice.operation_office[2][1])}` : 
                    '휴무'}</p>
                  <p>목요일&nbsp;   {selectedOffice.operation_office[3] ? 
                    `${formatTime(selectedOffice.operation_office[3][0])} ~ ${formatTime(selectedOffice.operation_office[3][1])}` : 
                    '휴무'}</p>
                  <p>금요일&nbsp;   {selectedOffice.operation_office[4] ? 
                    `${formatTime(selectedOffice.operation_office[4][0])} ~ ${formatTime(selectedOffice.operation_office[4][1])}` : 
                    '휴무'}</p>
                  <p>토요일&nbsp;   {selectedOffice.operation_office[5] ? 
                    `${formatTime(selectedOffice.operation_office[5][0])} ~ ${formatTime(selectedOffice.operation_office[5][1])}` : 
                    '휴무'}</p>
                  <p>일요일&nbsp;   {selectedOffice.operation_office[6] ? 
                    `${formatTime(selectedOffice.operation_office[6][0])} ~ ${formatTime(selectedOffice.operation_office[6][1])}` : 
                    '휴무'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 편집 모달 수정 */}
      {isCharacterModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-[430px] max-h-[90vh] overflow-hidden border-2 border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-black">캐릭터 편집</h3>
              <button 
                onClick={() => setIsCharacterModalOpen(false)}
                className="btn btn-circle btn-ghost border-none text-xl text-black"

              >
                ✕
              </button>
            </div>

            {/* 캐릭터 미리보기 - 고정 */}
            <div className="flex justify-center mb-6">
              <div className="inline-block rounded-2xl overflow-hidden border-2 border-black">
                <ProfileCharacter 
                  profileStyle={[
                    characterInfo.hairNo,
                    characterInfo.faceNo,
                    characterInfo.hairColor,
                    characterInfo.faceColor,
                    characterInfo.backgroundColor
                  ]}
                  size={160}
                  className="character-edit"
                />
              </div>
            </div>

            {/* 스크롤 가능한 선택 항목들 */}
            <div className="overflow-y-auto max-h-[calc(90vh-400px)] pr-2">
              <div className="space-y-6">
                {/* 헤어스타일 선택 */}
                <div>
                  <h3 className="text-sm text-black mb-4">헤어스타일</h3>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({length: 13}, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => updateCharacterInfo('hairNo', i)}
                        className={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm text-black shadow-[0_2px_8px_rgba(0,0,0,0.15)]
                          ${characterInfo.hairNo === i ? 'border-black bg-[#63C1FF]' : 'border-black'}`}
                      >
                        {i+1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 얼굴 선택 */}
                <div>
                  <h3 className="text-sm text-black mb-4">얼굴</h3>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({length: 4}, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => updateCharacterInfo('faceNo', i)}
                        className={`w-10 h-10 flex items-center justify-center border rounded-lg text-sm text-black shadow-[0_2px_8px_rgba(0,0,0,0.15)]
                          ${characterInfo.faceNo === i ? 'border-black bg-[#63C1FF]' : 'border-black'}`}
                      >
                        {i+1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 색상 선택 */}
                <div>
                  <h3 className="text-sm text-black mb-4">색상 선택</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-black mb-2">헤어 색상</label>
                      <div className="grid grid-cols-7 gap-2">
                        {colorList.map((color, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => updateCharacterInfo('hairColor', index)}
                            className={`w-8 h-8 rounded-full border-2 shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${
                              characterInfo.hairColor === index ? 'border-blue-500' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: colorList[index] }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-black mb-2">배경 색상</label>
                      <div className="grid grid-cols-7 gap-2">
                        {colorList.map((color, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => updateCharacterInfo('backgroundColor', index)}
                            className={`w-8 h-8 rounded-full border-2 shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${
                              characterInfo.backgroundColor === index ? 'border-blue-500' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: colorList[index] }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={randomGenerator}
                  className="w-full rounded-xl py-3 font-medium mb-4 text-white relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                >
                  <div className="absolute inset-0">
                    {colorList.map((color, index) => (
                      <div
                        key={index}
                        className="absolute h-full"
                        style={{
                          backgroundColor: color,
                          width: `${100 / colorList.length}%`,
                          left: `${(index * 100) / colorList.length}%`
                        }}
                      />
                    ))}
                  </div>
                  <span className="relative z-10">랜덤 생성</span>
                </button>
              </div>
            </div>

            {/* 하단 버튼 - 고정 */}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCharacterModalOpen(false)}
                className="btn flex-1 btn-default shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    // 업데이트할 데이터 객체 생성
                    const newProfileStyle = convertCharacterInfoToProfileStyle();
                    
                    const { data, error } = await supabase
                      .from('users')
                      .update({
                        profilestyle_user: newProfileStyle
                      })
                      .eq('id_user', user.id_user)
                      .select();

                    if (error) {
                      console.error('Supabase 에러:', error);
                      throw error;
                    }

                    // 모달 닫기
                    setIsCharacterModalOpen(false);
                    
                    // 부모 컴포넌트의 memberInfo 업데이트
                    if (onUpdate) {
                      onUpdate({
                        ...user,
                        profilestyle_user: newProfileStyle
                      });
                    }
                  } catch (error) {
                    console.error('프로필 스타일 업데이트 실패:', error);
                    alert('프로필 업데이트에 실패했습니다. 다시 시도해주세요.');
                  }
                }}
                className="btn flex-1 btn-primary shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 