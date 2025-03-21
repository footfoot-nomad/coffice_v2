'use client'

import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import ProfileCharacter from './ProfileCharacter'

const MemberCard = ({ 
  member, 
  date, 
  officeId, 
  memberInfo,
  status,
  selectedUserData,
  memberStatus,
  eventLog
}) => {
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
  const [showAbsentConfirmModal, setShowAbsentConfirmModal] = useState(false);
  
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
      case '결근':
        return { borderColor: '#F44336' }; // 빨간색
      default:
        return { borderColor: '#E0E0E0' }; // 기본 회색
    }
  };

  // 타임스탬프 포맷팅
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);  // 이미 processTimestampEvent에서 조정된 시간
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}시 ${minutes}분 출근`;
  };

  // 상태에 따른 색상을 반환하는 함수 추가
  const getStatusColor = (status) => {
    switch (status) {
      case '일등':
      case '출근':
        return '#2196F3'; // 파란색
      case '지각':
        return '#FF9800'; // 오렌지색
      case '결근':
        return '#F44336'; // 빨간색
      case '퇴근':
        return '#000000'; // 검은색
      default:
        return '#E0E0E0'; // 기본 회색
    }
  };

  // 출석 순서 가져오기
  const getAttendanceOrder = (memberStatus, selectedDate, officeId, userId) => {
    if (!memberStatus[officeId]?.dates[selectedDate]) return '';

    const allMembers = Object.values(memberStatus[officeId].dates[selectedDate].members);
    const attendedMembers = allMembers
      .filter(m => m.status_user === '출근' || m.status_user === '일등' || m.status_user === '지각' || m.status_user === '퇴근')
      .sort((a, b) => new Date(a.timestamp_user) - new Date(b.timestamp_user));

    const order = attendedMembers.findIndex(m => m.id_user === userId) + 1;
    return order > 0 ? order.toString() : '';
  };

  // 카드 클릭 핸들러
  const handleCardClick = async () => {
    const memberMessage = memberStatus[officeId]?.dates[date]?.members[member.id_user]?.message_user;
    const isCurrentUser = member.id_user === selectedUserData?.id_user;
    const userStatus = status?.status_user;

    // 현재 사용자이고 대기 상태인 경우
    if (isCurrentUser && !userStatus) {
      setShowAbsentConfirmModal(true);
      return;
    }

    // 결근 상태일 때만 메시지 모달 표시
    if (userStatus === '결근' && memberMessage) {
      setShowMessageModal(true);
      return;
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
        .eq('type_event', '결근');

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

  // 결근 사유서 제출 핸들러
  const handleAbsentSubmit = async () => {
    try {
      const { data, error } = await supabase
        .from('event_log')
        .insert([{
          id_coffice: officeId.toString(),
          id_user: member.id_user.toString(),
          date_event: date,
          type_event: '결근',
          message_event: reasonMessage,
          timestamp_event: new Date().toISOString()
        }]);

      if (error) throw error;

      // 성공 메시지 표시
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      successMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>결근 사유서가 제출되었습니다.</span>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

      setShowReasonModal(false);
      setReasonMessage('');
    } catch (error) {
      console.error('결근 사유서 제출 실패:', error);
      
      // 에러 메시지 표시
      const errorMessage = document.createElement('div');
      errorMessage.className = 'alert alert-error w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
      errorMessage.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>결근 사유서 제출에 실패했습니다.</span>
      `;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 3000);
    }
  };

  // 근무 시간 포맷팅
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
      {/* 결근 확인 모달 */}
      {showAbsentConfirmModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
          onClick={() => setShowAbsentConfirmModal(false)}
        >
          <div 
            className="bg-white rounded-2xl pt-11 pb-11 p-8 w-[320px] max-w-[90vw] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowAbsentConfirmModal(false)}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 제목 영역 */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">결근 확인</h2>
              <p className="text-sm text-gray-500 mt-2">{date}</p>
            </div>

            <p className="text-center mb-8 text-gray-700">
              결근 사유서를 작성하시겠습니까?
            </p>

            {/* 버튼 영역 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAbsentConfirmModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowAbsentConfirmModal(false);
                  setShowReasonModal(true);
                }}
                className="flex-1 py-2 bg-[#FFFF00] text-black border border-black rounded-lg font-medium hover:bg-[#FFFF00]/90"
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메시지 모달 */}
      {showMessageModal && status?.status_user === '결근' && memberStatus[officeId]?.dates[date]?.members[member.id_user]?.message_user && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
          onClick={() => setShowMessageModal(false)}
        >
          <div 
            className="bg-white rounded-2xl pt-11 pb-11 p-8 w-[320px] max-w-[90vw] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowMessageModal(false)}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 제목 영역 */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">결근 사유서</h2>
              <p className="text-sm text-gray-500 mt-2">
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
            <div className="mt-6 flex justify-end items-center gap-3 pr-2">
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
             status?.status_user === '결근' && (
              <div className="mt-8 flex justify-center">
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
      
      {/* 사유서 작성 모달 */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
          <div 
            className="bg-white rounded-2xl pt-11 pb-11 p-8 w-[320px] max-w-[90vw] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
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
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">결근 사유서</h2>
              <p className="text-sm text-gray-500 mt-2">
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
                placeholder="결근 사유를 입력해주세요."
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
            <div className="mt-6 flex justify-end items-center gap-3 pr-2">
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

            {/* 글자수 카운트 */}
            <p className="text-sm text-gray-500 mt-6 text-right">
              {reasonMessage.length}/100
            </p>

            {/* 버튼 영역 */}
            <div className="flex gap-3 mt-8">
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
                onClick={handleAbsentSubmit}
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
        <div ref={cardRef} 
             className="shrink-0 flex flex-col items-center w-[25vw] min-w-[90px] max-w-[120px] border-2 border-gray-600 rounded-lg bg-white overflow-hidden relative"
             onClick={handleCardClick}
        >
          {/* 출근 뱃지 */}
          {status?.status_user && (
            <div className="absolute right-1 top-1 z-10">
              <div className="badge bg-white shadow-md w-[36px] h-[20px] flex items-center justify-center p-0">
                <span className="text-[11px] font-medium" style={{ color: getStatusColor(status.status_user) }}>
                  {status.status_user === '일등' ? '출근' : status.status_user}
                </span>
              </div>
            </div>
          )}

          <div className="w-full">
            <div className={`relative -ml-0 -mt-0 ${
              (!status?.status_user || status?.status_user === '결근') ? 'grayscale' : ''
            } ${status?.status_user === '퇴근' ? 'scale-x-[-1]' : ''}`}>
              <ProfileCharacter
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
        
        {/* 일등 왕관 아이콘 */}
        {(() => {
          // 해당 멤버의 모든 이벤트 중 '일등' 이벤트가 있었는지 확인
          const wasFirst = eventLog?.some(event => 
            event.id_coffice.toString() === officeId.toString() &&
            event.date_event === date &&
            event.id_user.toString() === member.id_user.toString() &&
            event.type_event === '일등'
          );

          // 현재 상태가 '일등'이거나 (퇴근 상태이면서 일등 이벤트가 있었던 경우) 왕관 표시
          const shouldShowCrown = status?.status_user === '일등' || wasFirst;

          return shouldShowCrown && (
            <div className="mt-[-13px] z-10">
              <div className="w-[24px] h-[24px] rounded-full bg-[#FFFF00] border border-black flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" className="w-4 h-4">
                  <path d="M5 17h14l1-9-4 3-4-5-4 5-4-3 1 9z"/>
                </svg>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
};

export default MemberCard; 