'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProfileEditModal from './components/ProfileEditModal'
import ProfileCharacter from './components/ProfileCharacter'
import React from 'react'

// getDatesForMonth 함수를 handleSelectUser 함수 전에 정의
const getDatesForMonth = (yearMonth, dayOfWeek) => {
  const year = 2000 + parseInt(yearMonth.substring(0, 2));
  const month = parseInt(yearMonth.substring(2, 4)) - 1; // 0-based month
  
  // 요일 매핑 간소화
  const dayMapping = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
  const targetDay = dayMapping[dayOfWeek];
  
  // 해당 월의 첫째 날과 마지막 날 구하기
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);
  
  // 첫 번째 해당 요일 찾기
  let currentDate = new Date(firstDate);
  currentDate.setDate(1 + (targetDay - firstDate.getDay() + 7) % 7);
  
  const dates = [];
  // 월의 마지막 날까지 해당 요일의 날짜들 수집
  while (currentDate <= lastDate) {
    dates.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
    );
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return dates;
};

// Timer 컴포넌트 수정
const Timer = ({ selectedSubscription, officeInfo, selectedDate, memberStatus, selectedUserData }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerStatus, setTimerStatus] = useState('waiting');

  useEffect(() => {
    if (!selectedSubscription || !selectedDate || !memberStatus || !selectedUserData) return;

    const currentStatus = memberStatus[selectedSubscription.id_coffice]
      ?.dates[selectedDate]
      ?.members[selectedUserData.id_user];

    if (!currentStatus) return;

    // 퇴근 상태일 때
    if (currentStatus.status_user === '퇴근') {
      const totalSeconds = parseInt(currentStatus.message_user);
      setTimeElapsed(totalSeconds);
      setTimerStatus('ended');
      return;
    }

    // 출근, 일등, 지각 상태일 때
    if (currentStatus.status_user === '출근' || currentStatus.status_user === '일등' || currentStatus.status_user === '지각') {
      const startTime = new Date(currentStatus.timestamp_user);
      
      const timer = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
        setTimeElapsed(diff);
      }, 1000);

      setTimerStatus('counting');

      return () => clearInterval(timer);
    }

    // 그 외 상태일 때
    setTimeElapsed(0);
    setTimerStatus('waiting');
  }, [selectedSubscription, selectedDate, memberStatus, selectedUserData]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0')
    };
  };

  const time = formatTime(timeElapsed);

  return (
    <div className="flex flex-col items-start h-[22vh] mb-[3vh] mt-[7vh]">
      <div className="text-[20px] font-semibold text-gray-800 mt-[2vh] mb-3 px-4">
        근무 시간
      </div>
      <div className="border-2 border-black bg-gray-100 rounded-lg p-3 w-full max-w-[320px] mx-auto h-[12vh]">
        <div className="flex justify-center items-center h-full">
          <span className="font-mono text-[40px] text-black">
            {`${time.hours} : ${time.minutes} : ${time.seconds}`}
          </span>
        </div>
      </div>
      <div className="w-full h-[1px] bg-gray-200 mt-[3vh]"></div>
    </div>
  );
};

// ProfileCharacter를 메모이제이션
const MemoizedProfileCharacter = React.memo(ProfileCharacter);

// MemberCard 컴포넌트 최적화 (memo 제거)
const MemberCard = ({ 
  member, 
  date, 
  officeId, 
  memberInfo,
  status,
  selectedUserData,
  memberStatus
}) => {
  console.log('memberInfo:', memberInfo);  // memberInfo 데이터 확인
  console.log('member:', member);          // member 데이터도 함께 확인
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [longPressTimer, setLongPressTimer] = useState(null);
  const cardRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipTimerRef = useRef(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonMessage, setReasonMessage] = useState('');
  
  // 현재 사용자 여부 확인
  const isCurrentUser = member.id_user === selectedUserData?.id_user;

  // 상태 스타일 가져오기
  const getStatusStyle = () => {
    if (!status?.status_user) return { borderColor: '#E0E0E0' };
    
    switch (status.status_user) {
      case '일등':
      case '출근':
        return { borderColor: '#2196F3' }; // 파란색
      case '지각':
        return { borderColor: '#FF9800' }; // 오렌지색
      case '결석':
        return { borderColor: '#F44336' }; // 빨간색
      default:
        return { borderColor: '#E0E0E0' }; // 기본 회색
    }
  };

  // 타임스탬프 포맷팅
  const formatTimestamp = (timestamp) => {
    const timeStr = timestamp.split('T')[1];
    const [hours, minutes] = timeStr.split(':');
    return `${parseInt(hours)}시 ${parseInt(minutes)}분 출근`;
  };

  // 상태에 따른 색상을 반환하는 함수 추가
  const getStatusColor = (status) => {
    switch (status) {
      case '일등':
      case '출근':
        return '#2196F3'; // 파란색
      case '지각':
        return '#FF9800'; // 오렌지색
      case '결석':
        return '#F44336'; // 빨간색
      case '퇴근':
        return '#000000'; // 검은색
      default:
        return '#E0E0E0'; // 기본 회색
    }
  };

  // MemberCard 컴포넌트 내부에서 사용할 getAttendanceOrder 함수 추가
  const getAttendanceOrder = (memberStatus, selectedDate, officeId, userId) => {
    if (!memberStatus[officeId]?.dates[selectedDate]) return '';

    const allMembers = Object.values(memberStatus[officeId].dates[selectedDate].members);
    const attendedMembers = allMembers
      .filter(m => m.status_user === '출근' || m.status_user === '일등' || m.status_user === '지각' || m.status_user === '퇴근')
      .sort((a, b) => new Date(a.timestamp_user) - new Date(b.timestamp_user));

    const order = attendedMembers.findIndex(m => m.id_user === userId) + 1;
    return order > 0 ? order.toString() : '';
  };

  // 카드 클릭 핸들러 수정
  const handleCardClick = async () => {
    const memberMessage = memberStatus[officeId]?.dates[date]?.members[member.id_user]?.message_user;
    const isCurrentUser = member.id_user === selectedUserData?.id_user;
    const userStatus = status?.status_user;

    // 현재 사용자이고 지각/결석인 경우
    if (isCurrentUser && (userStatus === '지각' || userStatus === '결석')) {
      if (memberMessage) {
        // 이미 사유서가 있는 경우 메시지 모달 표시
        setShowMessageModal(true);
      } else {
        // 사유서가 없는 경우 사유서 작성 모달 표시
        setShowReasonModal(true);
      }
      return;
    }

    // 다른 사용자의 메시지 표시
    if (memberMessage) {
      setShowMessageModal(true);
    }
  };

  // 사유서 제출 핸들러
  const handleReasonSubmit = async () => {
    try {
      // 기존 이벤트 업데이트
      const { data, error } = await supabase
        .from('event_log')
        .update({ message_event: reasonMessage })
        .eq('id_coffice', officeId.toString())
        .eq('id_user', member.id_user.toString())
        .eq('date_event', date)
        .eq('type_event', status.status_user);

      if (error) throw error;

      // 성공 메시지 표시
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      successMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>사유서가 제출되었습니다.</span>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

      setShowReasonModal(false);
      setReasonMessage('');
    } catch (error) {
      console.error('사유서 제출 실패:', error);
      
      // 에러 메시지 표시
      const errorMessage = document.createElement('div');
      errorMessage.className = 'alert alert-error w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      errorMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>사유서 제출에 실패했습니다.</span>
      `;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 3000);
    }
  };

  // 근무 시간 포맷팅 함수 수정
  const formatWorkingTime = (seconds) => {
    if (!seconds) return { time: '', label: '' };
    const totalSeconds = parseInt(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return {
      time: `${hours}시간 ${minutes}분`,
      label: '근무'
    };
  };

  return (
    <>
      {/* 메시지 모달 - 수정 버튼 추가 */}
      {showMessageModal && memberStatus[officeId]?.dates[date]?.members[member.id_user]?.message_user && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
          onClick={() => setShowMessageModal(false)}
        >
          <div 
            className="bg-white rounded-2xl pt-11 pb-11 p-8 w-[320px] max-w-[90vw] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 버튼 추가 */}
            <button
              onClick={() => setShowMessageModal(false)}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 제목 영역 */}
            <div className="text-center mb-8"> {/* mb-6에서 mb-8로 변경 */}
              <h2 className="text-2xl font-bold text-gray-800">
                {status?.status_user === '지각' ? '지각 사유서' : '결석 사유서'}
              </h2>
              <p className="text-sm text-gray-500 mt-2"> {/* mt-1에서 mt-2로 변경 */}
                {date}
              </p>
            </div>

            {/* 내용 영역 - 공책 스타일 */}
            <div className="bg-[#fff9e5] rounded-lg p-4 min-h-[120px] relative border border-gray-300 shadow-inner">
              {/* 공책 라인 효과 */}
              <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-[#ff9b9b] ml-[20px]"></div>
              <p className="text-gray-700 text-base whitespace-pre-line pl-[30px] leading-[28px]" 
                 style={{
                   backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #ddd 28px)',
                   paddingTop: '4px'
                 }}>
                {memberStatus[officeId]?.dates[date]?.members[member.id_user]?.message_user}
              </p>
            </div>

            {/* 작성자 영역 */}
            <div className="mt-6 flex justify-end items-center gap-3 pr-2"> {/* mt-4에서 mt-6으로 변경, 우측 안쪽 여백 추가 */}
            <span className="text-gray-800 font-medium">
                {memberInfo?.name_user || '사용자'}
              </span>
              <div className="w-[32px] h-[32px] rounded-lg overflow-hidden border-1 border-gray-400">
                <ProfileCharacter
                  profileStyle={memberInfo?.profilestyle_user}
                  size={30}
                />
              </div>
              
            </div>

            {/* 수정 버튼 */}
            {member.id_user === selectedUserData?.id_user && 
             (status?.status_user === '지각' || status?.status_user === '결석') && (
              <div className="mt-8 flex justify-center"> {/* mt-6에서 mt-8로 변경 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMessageModal(false);
                    setReasonMessage(memberStatus[officeId]?.dates[date]?.members[member.id_user]?.message_user || '');
                    setShowReasonModal(true);
                  }}
                  className="px-4 py-2 bg-[#FFFF00] text-black border border-black rounded-lg font-medium hover:bg-[#FFFF00]/90"
                >
                  수정하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 툴크 */}
      {showTooltip && ((status?.message_user && !isEditing) || isEditing) && (
        <div 
          ref={tooltipRef}
          className="fixed z-9999 transition-opacity duration-200"
          style={{
            left: cardRef.current ? `${cardRef.current.getBoundingClientRect().left + (cardRef.current.offsetWidth / 2)}px` : '0',
            top: cardRef.current ? `${cardRef.current.getBoundingClientRect().top - 10}px` : '0',
            transform: 'translate(-50%, -100%)',
            opacity: showTooltip ? 1 : 0
          }}
        >
          <div className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm w-[120px]">
            {isEditing ? (
              <input
                type="text"
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    updateMessage();
                  }
                }}
                className="w-full px-2 py-1 text-black rounded-sm"
                maxLength={20}
                placeholder="새 메시지"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="text-center">
                {status.message_user}
              </div>
            )}
            <div className="absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800 bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[6px]" />
          </div>
        </div>
      )}
      
      {/* 사유서 작성 모달 */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
          <div 
            className="bg-white rounded-2xl pt-11 pb-11 p-8 w-[320px] max-w-[90vw] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 버튼 추가 */}
            <button
              onClick={() => {
                setShowReasonModal(false);
                setReasonMessage('');
              }}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 제목 영역 */}
            <div className="text-center mb-8"> {/* mb-6에서 mb-8로 변경 */}
              <h2 className="text-2xl font-bold text-gray-800">
                {status.status_user === '지각' ? '지각 사유서' : '결석 사유서'}
              </h2>
              <p className="text-sm text-gray-500 mt-2"> {/* mt-1에서 mt-2로 변경 */}
                {date}
              </p>
            </div>

            {/* 입력 영역 - 공책 스타일 */}
            <div className="bg-[#fff9e5] rounded-lg p-4 relative border border-gray-300 shadow-inner">
              {/* 공책 라인 효과 */}
              <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-[#ff9b9b] ml-[20px]"></div>
              <textarea
                value={reasonMessage}
                onChange={(e) => setReasonMessage(e.target.value)}
                placeholder={`${status.status_user === '지각' ? '지각' : '결석'} 사유를 입력해주세요.`}
                className="w-full bg-transparent border-none focus:outline-none text-gray-700 text-base pl-[30px] leading-[28px] min-h-[120px] resize-none"
                style={{
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #ddd 28px)',
                  paddingTop: '4px'
                }}
                rows={4}
                maxLength={100}
              />
            </div>

            {/* 작성자 영역 */}
            <div className="mt-6 flex justify-end items-center gap-3"> {/* mt-4에서 mt-6으로 변경 */}
              <div className="w-[50px] h-[50px] rounded-lg overflow-hidden border-1 border-gray-400">
                <ProfileCharacter
                  profileStyle={memberInfo?.profilestyle_user}
                  size={48}
                />
              </div>
              <span className="text-gray-800 font-medium">
                {memberInfo?.name_user || '사용자'}
              </span>
            </div>

            {/* 글자수 카운트 */}
            <p className="text-sm text-gray-500 mt-6 text-right"> {/* mt-4에서 mt-6으로 변경 */}
              {reasonMessage.length}/100
            </p>

            {/* 버튼 영역 */}
            <div className="flex gap-3 mt-8"> {/* mt-6에서 mt-8로 변경 */}
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setReasonMessage('');
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleReasonSubmit}
                disabled={!reasonMessage.trim()}
                className="flex-1 py-2 bg-[#FFFF00] text-black border border-black rounded-lg font-medium hover:bg-[#FFFF00]/90 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 카드 본체 */}
      <div className="flex flex-col items-center">
        <div ref={cardRef} className="shrink-0 flex flex-col items-center w-[25vw] min-w-[90px] max-w-[120px] border-2 border-gray-600 rounded-lg shadow-md bg-white overflow-hidden relative">
          {/* 출근 뱃지 */}
          {status?.status_user && (
            <div className="absolute right-1 top-1 z-10">
              <div className="badge bg-white shadow-md w-[36px] h-[20px] flex items-center justify-center p-0">
                <span className="text-[11px] font-medium" style={{ color: getStatusColor(status.status_user) }}>
                  {status.status_user}
                </span>
              </div>
            </div>
          )}

          <div className="w-full">
            <div className={`relative -ml-0 -mt-0 ${
              (!status?.status_user || status?.status_user === '결석') ? 'grayscale' : ''
            } ${status?.status_user === '퇴근' ? 'scale-x-[-1]' : ''}`}>
              <MemoizedProfileCharacter
                profileStyle={memberInfo?.profilestyle_user}
                size="100%"
                className={`profile-member-${member.id_user}`}
              />
            </div>
          </div>


          <div className="w-full px-2 pt-[5px] pb-[13px] flex flex-col gap-0">
            <span className="text-[15px] font-semibold text-center text-gray-800 truncate w-full block">
              {memberInfo?.name_user || '사용자'}
            </span>
            {/* 퇴근 상태일 때 근무 시간 표시 */}
            {status?.status_user === '퇴근' && status?.message_user ? (
              <div className="flex items-center justify-center">
                <span className="text-[11px] font-medium text-gray-600 leading-tight">
                  {formatWorkingTime(status.message_user).time} {formatWorkingTime(status.message_user).label}
                </span>
              </div>
            ) : (
              <span 
                className={`text-[11px] font-medium flex items-center justify-center leading-tight ${
                  status?.status_user === '지각' ? 'text-orange-500' : 
                  (status?.status_user === '출근' || status?.status_user === '일등') ? 'text-blue-500' : 
                  'text-gray-500'
                }`}
              >
                {(status?.status_user === '출근' || status?.status_user === '일등' || status?.status_user === '지각') && 
                 status.timestamp_user ? 
                  formatTimestamp(status.timestamp_user) : 
                  '\u00A0'
                }
              </span>
            )}
          </div>
        </div>
        
        {/* 출근 순서 뱃지 */}
        {(status?.status_user === '출근' || status?.status_user === '일등' || status?.status_user === '지각') && (
          <div className="mt-[-13px] z-10">
            <div className="w-[24px] h-[24px] rounded-full bg-[#FFFF00] border border-black flex items-center justify-center shadow-md">
              <span className="text-[14px] font-bold text-black">
                {getAttendanceOrder(memberStatus, date, officeId, member.id_user)}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Haversine 거리 계산 함수 추가 (상단에 추가)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // 지구의 반지름 (미터)
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 미터 단위 거리
};

// AuthForm 컴포넌트 추가
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
        // 먼저 동일한 이메일을 가진 사용자가 있는지 확인
        const { data: existingUsers, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('email_user', email)

        // 회원가입 진행
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError

        if (existingUsers && existingUsers.length > 0) {
          // 기존 사용자가 있는 경우 정보 업데이트
          const { error: updateError } = await supabase
            .from('users')
            .update({
              uuid_user: signUpData.user.id.toString(),
              name_user: name,
            })
            .eq('email_user', email)

          if (updateError) throw updateError
        } else {
          // 새로운 사용자 생성
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
        // 로그인 로직은 그대로 유지
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

  return (
    <div className="fixed inset-0 bg-[#64c1ff] flex flex-col min-h-screen">
      {/* 상단 로고 영역 - 전체 높이의 30% */}
      <div className="h-[30vh] flex flex-col items-center justify-center gap-4 mt-[8vh]">  {/* mt-[30px]를 mt-[60px]로 변경 */}
        <img src="/img/togetheroffice.png" alt="Together Office" className="w-[250px]" />
        <img src="/img/co-office.png" alt="Co Office" className="w-[250px] mt-2" />
      </div>

      {/* 중앙 로그인/회원가입 폼 - 전체 높이의 50% */}
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

      {/* 하단 로고 영역 - 전체 높이의 20% */}
      <div className="h-[20vh] flex items-center justify-center">
        <img src="/img/nomadrang.png" alt="Nomadrang" className="w-[120px]" />
      </div>
    </div>
  )
}

export default function Home() {
  // showPopup을 showAuth로 변경
  const [showAuth, setShowAuth] = useState(true)
  const [selectedUserData, setSelectedUserData] = useState(null)
  const [userData, setUserData] = useState(null)
  const [subscriptionDetails, setSubscriptionDetails] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  const dropdownRef = useRef(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [officeInfo, setOfficeInfo] = useState(null)
  const [membersInfo, setMembersInfo] = useState({})
  const [eventLog, setEventLog] = useState(null)
  const [memberStatus, setMemberStatus] = useState({})
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [timerStatus, setTimerStatus] = useState('waiting'); // 'waiting', 'counting', 'ended'
  const [attendanceMessage, setAttendanceMessage] = useState('');
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [cofficeMessage, setCofficeMessage] = useState('오늘도 함께 코피스~');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isMessageSelected, setIsMessageSelected] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [memberInfo, setMemberInfo] = useState([])
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false); // 퇴근 컨펌 모달 상태 추가

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 요일을 숫자로 변환하는 함수 (일요일: 0 ~ 토요일: 6)
  const getDayNumber = (day) => {
    const days = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 }
    return days[day]
  }

  // 현재 요일부터 목표 요일까지의 차이를 계산하는 함수
  const getDayDifference = (currentDay, targetDay) => {
    const current = getDayNumber(currentDay)
    const target = getDayNumber(targetDay)
    return (target - current + 7) % 7
  }

  // 날짜 비교를 위한 유틸리티 함수 수정
  const compareDates = (date1, date2) => {
    const d1 = new Date(date1)
    const d2 = new Date() // 현재 시간 사용
    d1.setHours(0, 0, 0, 0)
    d2.setHours(0, 0, 0, 0)
    return d1.getTime() - d2.getTime()
  }

  // 가장 가까운 미래 날짜 찾기 (offdate_coffice 제외)
  useEffect(() => {
    if (selectedSubscription && userData) {
      const today = new Date(userData.timestamp);
      
      // offdate_coffice 배열 생성
      let offDates = [];
      if (selectedSubscription.offdate_coffice) {
        if (Array.isArray(selectedSubscription.offdate_coffice)) {
          offDates = selectedSubscription.offdate_coffice;
        } else if (typeof selectedSubscription.offdate_coffice === 'string') {
          offDates = selectedSubscription.offdate_coffice.split(',').map(d => d.trim());
        }
      }

      // offdate_coffice가 아닌 날짜들만 필터링
      const availableDates = selectedSubscription.dates
        .filter(date => !offDates.includes(date.date))
        .sort((a, b) => compareDates(a.date, b.date));

      // 오늘 날짜와 같거나 가장 가까운 미래 날짜 찾기
      const todayDate = today.toISOString().split('T')[0];
      const exactTodayDate = availableDates.find(date => date.date === todayDate);
      
      if (exactTodayDate) {
        // 오늘 날짜가 있으면 선택
        setSelectedDate(exactTodayDate.date);
      } else {
        // 오늘 이후의 가장 가까운 날짜 찾기
        const futureDates = availableDates.filter(date => compareDates(date.date, today) >= 0);
        
        if (futureDates.length > 0) {
          // 미래 날짜가 있으면 가장 가까운 날짜 선택
          setSelectedDate(futureDates[0].date);
        } else if (availableDates.length > 0) {
          // 미래 날짜가 없으면 마지막 날짜 선택
          setSelectedDate(availableDates[availableDates.length - 1].date);
        }
      }
    }
  }, [selectedSubscription, userData]);

  // 초기 event_log 데이터 로드 및 memberStatus 설정
  useEffect(() => {
    if (!subscriptionInfo) return;

    const cofficeIds = subscriptionInfo.map(sub => sub.id_coffice);

    const initializeMemberStatus = async () => {
      try {
        // event_log 데이터 조회
        const { data: eventLogData, error } = await supabase
          .from('event_log')
          .select('*')
          .in('id_coffice', cofficeIds);

        if (error) {
          console.error('이벤트 로그 조회 실패:', error);
          return;
        }

        console.log('🔄 event_log 데이터 로드:', eventLogData);

        // memberStatus 객체 초기화
        const newMemberStatus = {};

        // 기본 구조 생성
        subscriptionInfo.forEach(subscription => {
          const officeId = subscription.id_coffice;
          newMemberStatus[officeId] = {
            dates: {}
          };

          subscription.dates.forEach(dateInfo => {
            newMemberStatus[officeId].dates[dateInfo.date] = {
              members: {}
            };

            // 각 멤버의 기본 상태 설정
            dateInfo.members.forEach(member => {
              newMemberStatus[officeId].dates[dateInfo.date].members[member.id_user] = {
                id_user: member.id_user,
                message_user: null,
                status_user: null
              };
            });
          });
        });

        // eventLog로 상태 업데이트
        eventLogData.forEach(event => {
          const officeId = event.id_coffice;
          const eventDate = event.date_event;
          const userId = event.id_user;

          // 해당 날짜의 이전 이벤트가 있는지 확인
          const currentStatus = newMemberStatus[officeId]?.dates[eventDate]?.members[userId];
          
          if (currentStatus) {
            // 타임스탬프를 비교하여 최신 이벤트만 적용
            const currentTimestamp = currentStatus.timestamp_user ? new Date(currentStatus.timestamp_user) : new Date(0);
            const newTimestamp = new Date(event.timestamp_event);

            if (newTimestamp > currentTimestamp) {
              newMemberStatus[officeId].dates[eventDate].members[userId] = {
                id_user: userId,
                status_user: event.type_event,
                message_user: event.message_event,
                timestamp_user: event.timestamp_event
              };
            }
          }
        });

        // memberStatus 업데이트
        setMemberStatus(newMemberStatus);


        // eventLog state 업데이트
        setEventLog(eventLogData);

      } catch (error) {
        console.error('멤버 상태 초기화 실패:', error);
      }
    };

    initializeMemberStatus();
  }, [subscriptionInfo]);

  // eventLog 변경 시 memberStatus 업데이트를 위한 useEffect
  useEffect(() => {
    console.log('🔄 event_log 상태 업데이트:', eventLog);
  }, [eventLog]);

  // Supabase 실시간 구독 설정 수정
  useEffect(() => {
    if (!subscriptionInfo) return;

    const cofficeIds = subscriptionInfo.map(sub => sub.id_coffice);
    
    const channel = supabase
      .channel('realtime_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_log',
          filter: `id_coffice=in.(${cofficeIds.join(',')})`,
        },
        async (payload) => {
          console.log('실시간 이벤트 수신:', payload);

          // 새로운 이벤트 데이터 가져오기
          const { data: latestData, error } = await supabase
            .from('event_log')
            .select('*')
            .in('id_coffice', cofficeIds);

          if (error) {
            console.error('데이터 업데이트 실패:', error);
            return;
          }

          // memberStatus 업데이트
          setMemberStatus(prevStatus => {
            const newStatus = { ...prevStatus };
            
            latestData.forEach(event => {
              const { id_coffice, date_event, id_user, type_event, message_event, timestamp_event } = event;
              
              if (!newStatus[id_coffice]) {
                newStatus[id_coffice] = { dates: {} };
              }
              if (!newStatus[id_coffice].dates[date_event]) {
                newStatus[id_coffice].dates[date_event] = { members: {} };
              }
              
              newStatus[id_coffice].dates[date_event].members[id_user] = {
                id_user,
                status_user: type_event,
                message_user: message_event,
                timestamp_user: timestamp_event
              };
            });

            return newStatus;
          });

          // eventLog 업데이트
          setEventLog(latestData);
        }
      )
      .subscribe((status) => {
        console.log('구독 상태:', status);
      });

    // 구독 해제
    return () => {
      console.log('실시간 구독 해제');
      channel.unsubscribe();
    };
  }, [subscriptionInfo]);

  // coffices 테이블 실시간 업데이트 구독 추가
  useEffect(() => {
    if (!selectedSubscription) return;

    const channel = supabase
      .channel('coffice_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coffices',
          filter: `id_coffice=eq.${selectedSubscription.id_coffice}`
        },
        (payload) => {
          console.log('코피스 업데이트:', payload);
          if (payload.new?.message_coffice) {
            setCofficeMessage(payload.new.message_coffice);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedSubscription]);

  // 디버깅을 위한 memberStatus 모니터링
  useEffect(() => {
    console.log('memberStatus 변경됨:', memberStatus);
  }, [memberStatus]);

  // 출근 버튼 상태 관리
  useEffect(() => {
    if (!selectedSubscription || !officeInfo || !selectedDate) return;

    const checkAttendanceStatus = () => {
      const now = new Date();
      const selectedDateObj = new Date(selectedDate);
      
      // 날짜 비교를 위해 시간을 00:00:00으로 설정
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);

      // 현재 사용자의 출근 상태 확인
      const currentStatus = memberStatus[selectedSubscription.id_coffice]
        ?.dates[selectedDate]
        ?.members[selectedUserData.id_user]
        ?.status_user;

      // 영업 시간 정보 가져오기
      const dayMapping = {
        '월': 'mon_operation_office',
        '화': 'tue_operation_office',
        '수': 'wed_operation_office',
        '목': 'thu_operation_office',
        '금': 'fri_operation_office',
        '토': 'sat_operation_office',
        '일': 'sun_operation_office'
      };

      const officeId = selectedSubscription?.coffices?.offices?.id_office;
      const operationHours = officeId ? officeInfo[officeId]?.[dayMapping[selectedSubscription.day_coffice]] : null;
      
      if (!operationHours) return;

      // operationHours가 배열 형태로 들어오는 경우 처리
      const [openTimeStr, closeTimeStr] = operationHours;
      
      // 영업 종료 시간 설정
      const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);
      const closeTime = new Date();
      closeTime.setHours(closeHour, closeMinute, 0);

      // 이미 출근했거나 일등 또는 지각인 경우 퇴근하기 버튼 활성화 (영업종료 시간 전까지)
      if ((currentStatus === '출근' || currentStatus === '일등' || currentStatus === '지각') && now < closeTime) {
        setAttendanceMessage('퇴근하기');
        setIsButtonDisabled(false);
        return;
      }

      // 이미 퇴근한 경우
      if (currentStatus === '퇴근') {
        setAttendanceMessage('퇴근 완료');
        setIsButtonDisabled(true);
        return;
      }

      // 기존 로직 유지
      if (selectedDateObj > today) {
        setAttendanceMessage('출근하기');
        setIsButtonDisabled(true);
      } else if (selectedDateObj < today) {
        setAttendanceMessage('지난 날짜예요.');
        setIsButtonDisabled(true);
      } else {
        const [openHour, openMinute] = openTimeStr.split(':').map(Number);
        const openTime = new Date();
        openTime.setHours(openHour, openMinute, 0);

        if (now < openTime) {
          setAttendanceMessage('출근하기');
          setIsButtonDisabled(true);
        } else {
          setAttendanceMessage('출근하기');
          setIsButtonDisabled(false);
        }
      }
    };

    const interval = setInterval(checkAttendanceStatus, 1000);
    checkAttendanceStatus();

    return () => clearInterval(interval);
  }, [selectedSubscription, officeInfo, selectedDate, memberStatus, selectedUserData]);

  // handleSelectUser 대신 handleAuthSuccess 사용
  const handleAuthSuccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('사용자 정보를 찾을 수 없습니다.')

      // 사용자 정보 조회 및 설정
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('uuid_user', user.id)
        .single()

      let currentUser;
      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{
            uuid_user: user.id,
            email_user: user.email,
            name_user: user.email.split('@')[0],
            profilestyle_user: '{0,0,1,0,5}'
          }])
          .select()
          .single()

        if (insertError) throw insertError
        currentUser = newUser;
        setSelectedUserData(newUser)
        setUserData({ ...newUser, timestamp: new Date().toISOString() })
      } else {
        if (fetchError) throw fetchError
        currentUser = existingUser;
        setSelectedUserData(existingUser)
        setUserData({ ...existingUser, timestamp: new Date().toISOString() })
      }

      // 구독 정보 가져오기
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          id_subscription,
          id_user,
          id_coffice,
          activation,
          coffices!inner (
            id_coffice,
            id_office,
            month_coffice,
            day_coffice,
            groupname_coffice,
            offdate_coffice,
            attendtime_coffice,
            message_coffice,
            offices!inner (
              id_office,
              name_office,
              mon_operation_office,
              tue_operation_office,
              wed_operation_office,
              thu_operation_office,
              fri_operation_office,
              sat_operation_office,
              sun_operation_office,
              gps_office
            )
          )
        `)
        .eq('id_user', currentUser.id_user)
        .eq('activation', true)

      if (subscriptionError) throw subscriptionError

      // 각 구독에 대한 모든 멤버 정보 가져오기
      const processedSubscriptions = await Promise.all(subscriptions.map(async sub => {
        const { data: allMembers, error: membersError } = await supabase
          .from('subscriptions')
          .select(`
            users (
              id_user
            )
          `)
          .eq('id_coffice', sub.id_coffice)
          .eq('activation', true);

        if (membersError) throw membersError;

        const dates = getDatesForMonth(sub.coffices.month_coffice, sub.coffices.day_coffice)
          .map(date => ({
            date,
            members: allMembers.map(member => ({
              id_user: member.users.id_user
            }))
          }));

        return {
          ...sub,
          month_coffice: sub.coffices.month_coffice,
          day_coffice: sub.coffices.day_coffice,
          groupname_coffice: sub.coffices.groupname_coffice,
          offdate_coffice: sub.coffices.offdate_coffice,
          attendtime_coffice: sub.coffices.attendtime_coffice,
          name_office: sub.coffices.offices.name_office,
          id_office: sub.coffices.offices.id_office,
          dates
        };
      }));

      setSubscriptionDetails(processedSubscriptions)
      if (processedSubscriptions.length > 0) {
        // 오늘 요일과 같은 구독 상품 찾기
        const today = new Date();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const todayDay = dayNames[today.getDay()];
        
        const sameWeekdaySubscription = processedSubscriptions.find(sub => sub.day_coffice === todayDay);
        setSelectedSubscription(sameWeekdaySubscription || processedSubscriptions[0]);
      }

      // 오피스 정보 설정
      const officesInfo = {}
      processedSubscriptions.forEach(sub => {
        officesInfo[sub.coffices.offices.id_office] = {
          mon_operation_office: sub.coffices.offices.mon_operation_office,
          tue_operation_office: sub.coffices.offices.tue_operation_office,
          wed_operation_office: sub.coffices.offices.wed_operation_office,
          thu_operation_office: sub.coffices.offices.thu_operation_office,
          fri_operation_office: sub.coffices.offices.fri_operation_office,
          sat_operation_office: sub.coffices.offices.sat_operation_office,
          sun_operation_office: sub.coffices.offices.sun_operation_office,
          gps_office: sub.coffices.offices.gps_office
        }
      })
      setOfficeInfo(officesInfo)

      // event_log 데이터 초기 로드 추가
      if (processedSubscriptions.length > 0) {
        const cofficeIds = processedSubscriptions.map(sub => sub.id_coffice);
        const { data: eventLogData, error: eventLogError } = await supabase
          .from('event_log')
          .select('*')
          .in('id_coffice', cofficeIds);

        if (eventLogError) {
          console.error('이벤트 로그 초기 로드 실패:', eventLogError);
        } else {
          console.log('🔄 event_log 초기 데이터 로드:', eventLogData);
          setEventLog(eventLogData);

          // memberStatus 객체 초기화
          const newMemberStatus = {};

          // 기본 구조 생성
          processedSubscriptions.forEach(subscription => {
            const officeId = subscription.id_coffice;
            newMemberStatus[officeId] = {
              dates: {}
            };

            subscription.dates.forEach(dateInfo => {
              newMemberStatus[officeId].dates[dateInfo.date] = {
                members: {}
              };

              // 각 멤버의 기본 상태 설정
              dateInfo.members.forEach(member => {
                newMemberStatus[officeId].dates[dateInfo.date].members[member.id_user] = {
                  id_user: member.id_user,
                  message_user: null,
                  status_user: null
                };
              });
            });
          });

          // eventLog로 상태 업데이트
          eventLogData.forEach(event => {
            const officeId = event.id_coffice;
            const eventDate = event.date_event;
            const userId = event.id_user;

            // 해당 날짜의 이전 이벤트가 있는지 확인
            const currentStatus = newMemberStatus[officeId]?.dates[eventDate]?.members[userId];
            
            if (currentStatus) {
              // 타임스탬프를 비교하여 최신 이벤트만 적용
              const currentTimestamp = currentStatus.timestamp_user ? new Date(currentStatus.timestamp_user) : new Date(0);
              const newTimestamp = new Date(event.timestamp_event);

              if (newTimestamp > currentTimestamp) {
                newMemberStatus[officeId].dates[eventDate].members[userId] = {
                  id_user: userId,
                  status_user: event.type_event,
                  message_user: event.message_event,
                  timestamp_user: event.timestamp_event
                };
              }
            }
          });

          console.log('🔄 memberStatus 초기화:', newMemberStatus);
          setMemberStatus(newMemberStatus);
        }
      }

      // 멤버 정보 가져오기
      if (processedSubscriptions.length > 0) {
        const cofficeIds = processedSubscriptions.map(sub => sub.id_coffice);
        const { data: memberData, error: memberError } = await supabase
          .from('subscriptions')
          .select(`
            id_coffice,
            users (
              id_user,
              name_user,
              email_user,
              contact_user,
              profilestyle_user
            )
          `)
          .in('id_coffice', cofficeIds)
          .eq('activation', true)

        if (memberError) throw memberError

        const membersInfo = memberData.reduce((acc, item) => {
          acc[item.users.id_user] = item.users
          return acc
        }, {})

        setMembersInfo(membersInfo)
      }

      setShowAuth(false)

    } catch (error) {
      console.error('사용자 정보 로드 실패:', error)
    }
  }

  // 자동 로그인 체크
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        handleAuthSuccess()
      }
    }
    checkAuth()
  }, [])

  // createAttendanceEvent 함수 수정
  const createAttendanceEvent = async () => {
    if (!selectedSubscription || !selectedDate) return;

    setIsLoading(true); // 로딩 시작

    try {
      // 현재 GPS 위치 가져오기
      const getCurrentPosition = () => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
      };

      // 3초 대기를 위한 Promise
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // GPS 위치 가져오기와 3초 대기를 동시에 실행
      const [position] = await Promise.all([
        getCurrentPosition(),
        wait(3000)
      ]);

      const currentLat = position.coords.latitude;
      const currentLon = position.coords.longitude;

      // 오피스 GPS 정보 (이미 배열 형태)
      const [officeLat, officeLon] = officeInfo[selectedSubscription.id_office].gps_office;

      // 거리 계산
      const distance = calculateDistance(currentLat, currentLon, officeLat, officeLon);

      if (distance > 100) {
        setIsLoading(false);
        const warningMessage = document.createElement('div');
        warningMessage.className = 'alert alert-warning w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
        warningMessage.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>코피스 근처로 이동해 주세요.</span>
        `;
        
        document.body.appendChild(warningMessage);

        setTimeout(() => {
          warningMessage.remove();
        }, 3000);

        return;
      }

      // ID를 정수로 변환
      const cofficeId = parseInt(selectedSubscription.id_coffice);
      const userId = parseInt(selectedUserData.id_user);

      if (isNaN(cofficeId) || isNaN(userId)) {
        throw new Error('유효하지 않은 ID 형식입니다.');
      }

      // 기존 출근 로직
      const { data: existingEvents, error: fetchError } = await supabase
        .from('event_log')
        .select('*')
        .eq('id_coffice', selectedSubscription.id_coffice.toString()) // toString() 추가
        .eq('date_event', selectedDate)
        .in('type_event', ['출근', '일등']);

      if (fetchError) throw fetchError;

      // 첫 번째 출근자는 '일등', 이후는 '출근'으로 설정
      const attendanceType = existingEvents?.length === 0 ? '일등' : '출근';

      const { data, error } = await supabase
        .from('event_log')
        .insert([
          {
            id_coffice: selectedSubscription.id_coffice.toString(), // toString() 추가
            id_user: selectedUserData.id_user.toString(), // toString() 추가
            type_event: attendanceType,
            message_event: null,
            date_event: selectedDate,
            timestamp_event: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      console.log('출근 이벤트 생성 성공:', data);

    } catch (error) {
      console.error('출근 이벤트 생성 실패:', error);
      const warningMessage = document.createElement('div');
      warningMessage.className = 'alert alert-warning w-[288px] fixed top-[calc(70vh+100px)] left-1/2 -translate-x-1/2 z-50';
      warningMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>위치 정보를 확인할 수 없습니다.</span>
      `;
      
      document.body.appendChild(warningMessage);

      setTimeout(() => {
        warningMessage.remove();
      }, 3000);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  // 메시지 업데이트 함수 수정
  const updateCofficeMessage = async () => {
    if (!selectedSubscription) return;

    try {
      // 로딩 상태 추가 (필요한 경우)
      setIsLoading(true);

      const { data, error } = await supabase
        .from('coffices')
        .update({ message_coffice: newMessage })
        .eq('id_coffice', selectedSubscription.id_coffice)
        .select();

      if (error) throw error;

      // 성공적으로 업데이트된 경우
      setCofficeMessage(newMessage);
      setShowMessageModal(false);
      setNewMessage('');
      
      // 성공 메시지 표시 (선택사항)
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      successMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>메시지가 업데이트되었습니다.</span>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

    } catch (error) {
      console.error('메시지 업데이트 실패:', error);
      
      // 에러 메시지 표시
      const errorMessage = document.createElement('div');
      errorMessage.className = 'alert alert-error w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      errorMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>메시지 업데이트에 실패했습니다.</span>
      `;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 3000);

    } finally {
      setIsLoading(false);
    }
  };

  // useEffect 수정
  useEffect(() => {
    if (!selectedSubscription) return;

    // 초기 메시지 로드
    const loadCofficeMessage = async () => {
      const { data, error } = await supabase
        .from('coffices')
        .select('message_coffice')
        .eq('id_coffice', selectedSubscription.id_coffice)
        .single();

      if (error) {
        console.error('메시지 로드 실패:', error);
        return;
      }

      setCofficeMessage(data.message_coffice || '오늘도 함께 코피스~');
    };

    loadCofficeMessage();

    // 실시간 구독 설정
    const channel = supabase
      .channel('coffice_message_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coffices',
          filter: `id_coffice=eq.${selectedSubscription.id_coffice}`
        },
        (payload) => {
          setCofficeMessage(payload.new.message_coffice || '오늘도 함께 코피스~');
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedSubscription]);

  // useEffect 추가 - 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.message-container')) {
        setIsMessageSelected(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // 프로필 업데이트 핸들러 추가
  const handleProfileUpdate = (updatedUser) => {
    setSelectedUserData(updatedUser)
  }

  // ProfileEditModal 관련 코드 수정
  const handleCloseProfileModal = () => {
    console.log('프로필 모달 닫기');
    setShowProfileModal(false);
  };

  // users 테이블 변경 감지 및 memberInfo 업데이트를 위한 useEffect 추가
  useEffect(() => {
    if (!selectedSubscription) return;

    const channel = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        async (payload) => {
          try {
            const cofficeIds = subscriptionDetails.map(sub => sub.id_coffice);
            const { data: memberData, error: memberError } = await supabase
              .from('subscriptions')
              .select(`
                id_coffice,
                users (
                  id_user,
                  name_user,
                  email_user,
                  contact_user,
                  profilestyle_user
                )
              `)
              .in('id_coffice', cofficeIds)
              .eq('activation', true);

            if (memberError) throw memberError;

            const updatedMembersInfo = memberData.reduce((acc, item) => {
              acc[item.users.id_user] = item.users;
              return acc;
            }, {});

            setMembersInfo(updatedMembersInfo);
          } catch (error) {
            console.error('멤버 정보 업데이트 실패:', error);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedSubscription, subscriptionDetails]);

  useEffect(() => {
    if (!selectedSubscription) return;

    const channel = supabase
      .channel('event_log_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_log',
          filter: `id_coffice=eq.${selectedSubscription.id_coffice}`
        },
        async (payload) => {
          console.log('이벤트 로그 변경 감지:', payload);

          // 상태 업데이트를 함수형 업데이트로 변경
          setMemberStatus(prevStatus => {
            const newStatus = { ...prevStatus };
            const { new: newEvent } = payload;
            
            if (!newEvent) return prevStatus;

            const { id_coffice, date_event, id_user, type_event, message_event, timestamp_event } = newEvent;

            if (!newStatus[id_coffice]) {
              newStatus[id_coffice] = { dates: {} };
            }
            if (!newStatus[id_coffice].dates[date_event]) {
              newStatus[id_coffice].dates[date_event] = { members: {} };
            }

            newStatus[id_coffice].dates[date_event].members[id_user] = {
              id_user,
              status_user: type_event,
              message_user: message_event,
              timestamp_user: timestamp_event
            };

            return newStatus;
          });
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [selectedSubscription]);

  const createLeaveEvent = async () => {
    if (!selectedSubscription || !selectedDate) return;

    setIsLoading(true);

    try {
      // 현재 사용자의 출근 이벤트 찾기
      const { data: attendanceEvents, error: fetchError } = await supabase
        .from('event_log')
        .select('*')
        .eq('id_coffice', selectedSubscription.id_coffice.toString())
        .eq('id_user', selectedUserData.id_user.toString())
        .eq('date_event', selectedDate)
        .in('type_event', ['출근', '일등', '지각']); // 지각도 포함

      if (fetchError) throw fetchError;

      // 출근 기록이 없는 경우
      if (!attendanceEvents || attendanceEvents.length === 0) {
        throw new Error('출근 기록을 찾을 수 없습니다.');
      }

      // 가장 최근의 출근 기록 사용
      const attendanceEvent = attendanceEvents[0];

      // 근무 시간 계산 (초 단위)
      const attendanceTime = new Date(attendanceEvent.timestamp_event);
      const leaveTime = new Date();
      const workingSeconds = Math.floor((leaveTime - attendanceTime) / 1000);

      // 퇴근 이벤트 생성
      const { data, error } = await supabase
        .from('event_log')
        .insert([
          {
            id_coffice: selectedSubscription.id_coffice.toString(),
            id_user: selectedUserData.id_user.toString(),
            type_event: '퇴근',
            message_event: workingSeconds.toString(),
            date_event: selectedDate,
            timestamp_event: leaveTime.toISOString()
          }
        ]);

      if (error) throw error;

      // memberStatus 업데이트
      setMemberStatus(prevStatus => {
        const newStatus = { ...prevStatus };
        if (!newStatus[selectedSubscription.id_coffice]) {
          newStatus[selectedSubscription.id_coffice] = { dates: {} };
        }
        if (!newStatus[selectedSubscription.id_coffice].dates[selectedDate]) {
          newStatus[selectedSubscription.id_coffice].dates[selectedDate] = { members: {} };
        }

        newStatus[selectedSubscription.id_coffice].dates[selectedDate].members[selectedUserData.id_user] = {
          id_user: selectedUserData.id_user,
          status_user: '퇴근',
          message_user: workingSeconds.toString(), // 초 단위로 저장
          timestamp_user: leaveTime.toISOString()
        };

        return newStatus;
      });

      console.log('퇴근 처리 완료:', workingSeconds);

      // 성공 메시지 표시
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      successMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>퇴근 처리되었습니다.</span>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

    } catch (error) {
      console.error('퇴근 처리 실패:', error);
      const errorMessage = document.createElement('div');
      errorMessage.className = 'alert alert-error w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      errorMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>퇴근 처리에 실패했습니다.</span>
      `;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative"> {/* 기존 최상위 div */}
      <div className="flex justify-center min-h-screen bg-gray-50">
        <main className="w-full max-w-[430px] h-[100vh] overflow-hidden bg-white p-4 mx-auto font-pretendard">
          {showAuth ? (
            <AuthForm onAuthSuccess={handleAuthSuccess} />
          ) : (
            <>
              {subscriptionDetails.length === 0 ? (
                // 구독 정보가 없을 때 표시할 화면
                <div className="fixed inset-0 bg-[#64c1ff] flex flex-col items-center justify-center">
                  <div className="text-center mb-8">
                    <div className="text-2xl font-bold text-white">
                      구독 정보가 없습니다.<br /> 구독 정보가 등록될 때까지<br />잠시만 기다려 주세요.
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setShowAuth(true);
                    }}
                    className="w-full max-w-[240px] btn bg-[#FFFF00] hover:bg-[#FFFF00] text-black border-1 border-black"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                // 기존 컨텐츠
                <>
                  {subscriptionDetails.length > 0 && userData && (
                    <div className="flex justify-between items-start w-full max-w-[1200px] mx-auto h-[8vh]">
                      <div className="relative" ref={dropdownRef}>
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className={`flex items-center min-w-[250px] w-auto h-[50px] px-5 py-3 border-1 border-black rounded-lg shadow-md ${isDropdownOpen ? 'bg-gray-100' : 'bg-gray-100'}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-black whitespace-nowrap">
                              <span className="text-[17px] font-bold leading-none flex items-center">
                                {selectedSubscription?.name_office || subscriptionDetails[0].name_office}
                              </span>
                              <span className="text-gray-500 leading-none flex items-center">
                                {parseInt((selectedSubscription?.month_coffice || subscriptionDetails[0].month_coffice).substring(2, 4))}월
                              </span>
                              <span className="text-gray-500 leading-none flex items-center">
                                {selectedSubscription?.groupname_coffice || subscriptionDetails[0].groupname_coffice}
                              </span>
                            </div>
                          </div>
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border">
                            {subscriptionDetails
                              .filter(subscription => 
                                selectedSubscription ? 
                                  subscription.id_coffice !== selectedSubscription.id_coffice : 
                                  subscription.id_coffice !== subscriptionDetails[0].id_coffice
                              )
                              .map((subscription) => (
                                <button
                                  key={subscription.id_coffice}
                                  onClick={() => {
                                    setSelectedSubscription(subscription)
                                    setIsDropdownOpen(false)
                                  }}
                                  className="flex items-center min-w-[260px] w-auto h-[50px] px-5 py-3 hover:bg-gray-50"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-black whitespace-nowrap">
                                      <span className="text-[17px] font-bold leading-none">
                                        {subscription.name_office}
                                      </span>
                                      <span className="text-gray-500 leading-none">
                                        {parseInt(subscription.month_coffice.substring(2, 4))}월
                                      </span>
                                      <span className="text-gray-500 leading-none">
                                        {subscription.groupname_coffice}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      <div 
                        className="flex flex-col items-center cursor-pointer"
                        onClick={() => setShowProfileModal(true)}
                      >
                        <div className="rounded-lg overflow-hidden border-1 border-black w-[50px] aspect-square shadow-md">
                          <ProfileCharacter
                            profileStyle={selectedUserData?.profilestyle_user}
                            size={48}
                            className="profile-main"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {showProfileModal && (
                    <ProfileEditModal
                      user={selectedUserData}
                      onClose={handleCloseProfileModal}
                      onUpdate={handleProfileUpdate}
                      className="text-black"
                    />
                  )}

                  {selectedSubscription && (
                    <>
                      <div className="h-[6vh] flex items-center mt-[max(10px,1vh)]">
                        <div className="flex gap-[3vw] overflow-x-auto scrollbar-hide px-4 py-2 justify-center w-full">
                          {selectedSubscription.dates.map((dateInfo) => {
                            const isPast = compareDates(dateInfo.date, userData.timestamp) < 0;
                            const isSelected = dateInfo.date === selectedDate;
                            const date = new Date(dateInfo.date);
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            
                            let offDates = [];
                            if (selectedSubscription.offdate_coffice) {
                              if (Array.isArray(selectedSubscription.offdate_coffice)) {
                                offDates = selectedSubscription.offdate_coffice;
                              } else if (typeof selectedSubscription.offdate_coffice === 'string') {
                                offDates = selectedSubscription.offdate_coffice.split(',').map(d => d.trim());
                              }
                            }
                            
                            const isOffDay = offDates.includes(dateInfo.date);

                            return (
                              <button
                                key={dateInfo.date}
                                onClick={() => !isOffDay && setSelectedDate(dateInfo.date)}
                                disabled={isOffDay}
                                className={`
                                  btn btn-circle shrink grow min-w-[45px] max-w-[60px] h-[5vh] 
                                  flex items-center justify-center 
                                  border-2 border-black normal-case shadow-md
                                  ${isOffDay
                                    ? 'bg-red-100 text-red-500 cursor-not-allowed border-red-300'
                                    : isSelected
                                      ? 'bg-[#FFFF00] text-black'
                                      : isPast
                                        ? 'bg-gray-100 text-gray-500 border-gray-200'
                                        : 'bg-white text-black hover:bg-gray-50'
                                    }
                                `}
                              >
                                <span className="font-medium text-[13px] whitespace-nowrap">
                                  {`${month}/${day}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="h-[18vh] flex flex-col justify-center">
                        <Timer 
                          selectedSubscription={selectedSubscription} 
                          officeInfo={officeInfo}
                          selectedDate={selectedDate}
                          memberStatus={memberStatus}
                          selectedUserData={selectedUserData}
                        />
                      </div>

                      <div className="flex flex-col h-[10vh] justify-center px-4 mt-[7vh] pb-[3vh]">
                        <div className="flex items-center gap-0 mt-[max(10px,2vh)] mb-2">
                          <div className="text-[19px] font-semibold text-gray-800 ">1등의 메시지</div>
                          <div className="relative">
                            <div 
                              className="w- h-5 flex items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const tooltip = e.currentTarget.nextElementSibling;
                                const allTooltips = document.querySelectorAll('.message-tooltip');
                                
                                allTooltips.forEach(t => {
                                  if (t !== tooltip) t.classList.add('hidden');
                                });
                                
                                tooltip.classList.toggle('hidden');
                                
                                setTimeout(() => {
                                  tooltip.classList.add('hidden');
                                }, 5000);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="message-tooltip hidden absolute left-[-14px] bottom-full mb-2 w-[180px] bg-gray-800/80 text-white text-sm rounded-lg p-3 z-50">
                              <div className="text-gray-200">일등으로 출근한 사람이</div>
                              <div className="text-gray-200">메시지를 수정할 수 있어요.</div>

                              <div className="absolute left-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-800/80"></div>
                            </div>
                          </div>
                          {/* IIFE를 제거하고 일반 JSX로 변경 */}
                          {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const selectedDateObj = new Date(selectedDate);
                            selectedDateObj.setHours(0, 0, 0, 0);
                            const isToday = today.getTime() === selectedDateObj.getTime();

                            const userStatus = memberStatus[selectedSubscription?.id_coffice]
                              ?.dates[selectedDate]
                              ?.members[selectedUserData?.id_user]
                              ?.status_user;

                            if (isToday && userStatus === '일등') {
                              return (
                                <button 
                                  onClick={() => {
                                    console.log('버튼 클릭됨'); // 디버깅용
                                    setShowMessageModal(true);
                                  }}
                                  className="ml-2 px-2 py-0.5 text-black text-xs rounded-lg bg-[#FFFF00] border-1 border-black"
                                >
                                  작성
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="w-full ">
                          <div className="text-gray-600 text-lg font-medium break-words whitespace-pre-line mb-[3vh]" 
                               style={{ maxHeight: '2.5em', lineHeight: '1.25em', overflow: 'hidden' }}>
                            {cofficeMessage}
                          </div>
                        </div>
                      </div>

{/* 출근 현황 영역 */}
                      <div className="h-[35vh] flex flex-col mt-[2vh]">
                        <div className="text-[20px] font-semibold text-gray-800 ml-4 mb-3">
                          출근 현황
                        </div>
                        {/* 멤버 카드 영역 */}
                        <div className="flex-1 overflow-y-auto min-h-[180px]">
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
                            {selectedSubscription.dates
                              .find(date => date.date === selectedDate)
                              ?.members
                              .sort((a, b) => {
                                const statusOrder = {
                                  '일등': 0,
                                  '출근': 1,
                                  '지각': 2,
                                  '결석': 3,
                                  '퇴근': 5,
                                  null: 4 // 대기 상태
                                };
                                
                                const statusA = memberStatus[selectedSubscription.id_coffice]
                                  ?.dates[selectedDate]
                                  ?.members[a.id_user]
                                  ?.status_user;
                                
                                const statusB = memberStatus[selectedSubscription.id_coffice]
                                  ?.dates[selectedDate]
                                  ?.members[b.id_user]
                                  ?.status_user;

                                const timestampA = memberStatus[selectedSubscription.id_coffice]
                                  ?.dates[selectedDate]
                                  ?.members[a.id_user]
                                  ?.timestamp_user;

                                const timestampB = memberStatus[selectedSubscription.id_coffice]
                                  ?.dates[selectedDate]
                                  ?.members[b.id_user]
                                  ?.timestamp_user;
                                
                                // 먼저 상태로 정렬
                                const statusCompare = statusOrder[statusA] - statusOrder[statusB];
                                
                                // 상태가 같은 경우 timestamp로 정렬
                                if (statusCompare === 0 && timestampA && timestampB) {
                                  return new Date(timestampA) - new Date(timestampB);
                                }
                                
                                return statusCompare;
                              })
                              .map(member => {
                                const status = memberStatus[selectedSubscription.id_coffice]
                                  ?.dates[selectedDate]
                                  ?.members[member.id_user];
                                const memberInfo = membersInfo[member.id_user];
                                const isCurrentUser = member.id_user === selectedUserData?.id_user;

                                return (
                                  <MemberCard 
                                    key={`${member.id_user}-${selectedDate}`}
                                    member={member}
                                    date={selectedDate}
                                    officeId={selectedSubscription.id_coffice}
                                    memberInfo={memberInfo}
                                    status={status}
                                    selectedUserData={selectedUserData}
                                    memberStatus={memberStatus}
                                  />
                                );
                              })}
                          </div>
                        </div>
                        
                        {/* 출근 버튼 영역 */}
                        {(() => {
                          const today = new Date();
                          const selectedDateObj = new Date(selectedDate);
                          
                          // 날짜 비교를 위해 시간을 00:00:00으로 설정
                          today.setHours(0, 0, 0, 0);
                          selectedDateObj.setHours(0, 0, 0, 0);
                          
                          const isToday = today.getTime() === selectedDateObj.getTime();
                          
                          // 현재 사용자의 상태 확인
                          const currentStatus = memberStatus[selectedSubscription?.id_coffice]
                            ?.dates[selectedDate]
                            ?.members[selectedUserData?.id_user]
                            ?.status_user;
                          
                          return isToday ? (
                            <div className="flex justify-center mb-[2vh]">
                              <button
                                onClick={() => {
                                  if (currentStatus === '출근' || currentStatus === '일등' || currentStatus === '지각') {
                                    setShowLeaveConfirmModal(true);
                                  } else {
                                    createAttendanceEvent();
                                  }
                                }}
                                disabled={isButtonDisabled || isLoading}
                                className={`
                                  btn btn-circle w-[288px] h-[48px] mx-auto block
                                  border-1 border-black normal-case
                                  shadow-lg hover:shadow-md transition-shadow
                                  relative
                                  ${isButtonDisabled || isLoading
                                    ? 'bg-[#DEDEDE] text-black hover:bg-[#DEDEDE] border-1 border-black' 
                                    : currentStatus === '출근' || currentStatus === '일등' || currentStatus === '지각'
                                      ? 'bg-[#64C1FF] text-black hover:bg-[#64C1FF] border-1 border-black'
                                      : 'bg-[#FFFF00] text-black hover:bg-[#FFFF00] border-1 border-black'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  {isLoading ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                  ) : (
                                    <span className="text-[16px] font-semibold text-black">{attendanceMessage}</span>
                                  )}
                                </div>
                              </button>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <style jsx global>{`
            .scrollbar-hide {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;     /* Firefox */
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;  /* Chrome, Safari, Opera */
            }
            * {
              font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
            }
            main {
              touch-action: none;
              -webkit-overflow-scrolling: none;
              overscroll-behavior: none;
              user-select: none;
            }
          `}</style>
        </main>
      </div>
      
      {/* 모달을 최상위로 이동하고 z-index 높게 설정 */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl p-6 w-[300px]">
            <h3 className="text-lg font-bold mb-4">1등의 메시지</h3>
            <div className="space-y-2">
              <textarea 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 text-base resize-none"
                rows={4}
                maxLength={100}
                placeholder="메시지를 입력하세요"
              />
              <p className="text-sm text-gray-500">
                최대 100자까지 입력 가능합니다. ({newMessage.length}/100)
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => setShowMessageModal(false)}
                className="flex-1 btn btn-outline"
              >
                취소
              </button>
              <button 
                onClick={async () => {
                  await updateCofficeMessage();
                  setShowMessageModal(false);
                }}
                className="flex-1 btn bg-[#FFFF00] hover:bg-[#FFFF00] text-black border-1 border-black"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirmModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
          onClick={() => setShowLeaveConfirmModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-8 w-[320px] max-w-[90vw]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-center mb-6 text-black">퇴근 확인</h2>
            <p className="text-center mb-8 whitespace-pre-line text-black">
              퇴근하면 오늘은 다시 출근할 수 없어요!{'\n'}
              정말 퇴근하나요?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLeaveConfirmModal(false)}
                className="btn btn-neutral flex-1"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirmModal(false);
                  createLeaveEvent();
                }}
                className="btn btn-primary flex-1"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

