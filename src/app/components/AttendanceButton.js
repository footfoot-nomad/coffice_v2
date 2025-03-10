'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// 거리 계산 함수 추가
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

  return R * c; // 미터 단위로 반환
};

const AttendanceButton = ({
  selectedSubscription,
  officeInfo,
  selectedDate,
  memberStatus,
  selectedUserData,
  onAttendanceClick
}) => {
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [attendanceMessage, setAttendanceMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // timestamp 전처리 함수 추가
  const processTimestampEvent = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    date.setHours(date.getHours() - 9);
    return date.toISOString();
  };

  const handleLeaveWork = async () => {
    if (!selectedSubscription || !selectedDate) return;

    try {
      // 해당 날짜의 출근 이벤트 찾기
      const { data: attendanceEvents, error: fetchError } = await supabase
        .from('event_log')
        .select('*')
        .eq('id_coffice', selectedSubscription.id_coffice.toString())
        .eq('id_user', selectedUserData.id_user.toString())
        .eq('date_event', selectedDate)
        .filter('type_event', 'in', '("출근","일등","지각")')
        .order('timestamp_event', { ascending: true });

      if (fetchError) throw fetchError;

      // 출근 기록이 없는 경우
      if (!attendanceEvents || attendanceEvents.length === 0) {
        throw new Error('출근 기록을 찾을 수 없습니다.');
      }

      // 가장 최근 출근 기록 사용
      const attendanceEvent = attendanceEvents[0];

      // 시작 시간과 종료 시간 처리 (둘 다 UTC 기준)
      const startTime = new Date(attendanceEvent.timestamp_event);
      const endTime = new Date();
      
      // 근무 시간 계산 (밀리초를 초로 변환)
      const timeElapsed = Math.floor((endTime - startTime) / 1000);

      // 이미 퇴근 기록이 있는지 확인
      const { data: existingLeaveWork, error: checkError } = await supabase
        .from('event_log')
        .select('*')
        .eq('id_coffice', selectedSubscription.id_coffice.toString())
        .eq('id_user', selectedUserData.id_user.toString())
        .eq('date_event', selectedDate)
        .eq('type_event', '퇴근');

      if (checkError) throw checkError;

      if (existingLeaveWork && existingLeaveWork.length > 0) {
        throw new Error('이미 퇴근 처리가 되어있습니다.');
      }

      // 퇴근 이벤트 생성
      const { error } = await supabase
        .from('event_log')
        .insert([{
          id_coffice: selectedSubscription.id_coffice.toString(),
          id_user: selectedUserData.id_user.toString(),
          type_event: '퇴근',
          message_event: timeElapsed.toString(),
          date_event: selectedDate,
          timestamp_event: endTime.toISOString()  // UTC 시간으로 저장
        }]);

      if (error) throw error;

    } catch (error) {
      console.error('퇴근 처리 실패:', error);
      showWarningMessage(error.message || '퇴근 처리에 실패했습니다.');
      throw error;
    }
  };

  const createAttendanceEvent = async () => {
    if (!selectedSubscription || !selectedDate) return;

    setIsLoading(true);

    try {
      const getCurrentPosition = () => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
      };

      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const [position] = await Promise.all([
        getCurrentPosition(),
        wait(3000)
      ]);

      const currentLat = position.coords.latitude;
      const currentLon = position.coords.longitude;
      const [officeLat, officeLon] = officeInfo[selectedSubscription.id_office].gps_office;
      const distance = calculateDistance(currentLat, currentLon, officeLat, officeLon);

      if (distance > 100) {
        setIsLoading(false);
        showWarningMessage('코피스 근처로 이동해 주세요.');
        return;
      }

      const cofficeId = parseInt(selectedSubscription.id_coffice);
      const userId = parseInt(selectedUserData.id_user);

      if (isNaN(cofficeId) || isNaN(userId)) {
        throw new Error('유효하지 않은 ID 형식입니다.');
      }

      const { data: existingEvents, error: fetchError } = await supabase
        .from('event_log')
        .select('*')
        .eq('id_coffice', selectedSubscription.id_coffice.toString())
        .eq('date_event', selectedDate)
        .in('type_event', ['출근', '일등']);

      if (fetchError) throw fetchError;

      // 가져온 이벤트 데이터의 timestamp 처리
      const processedEvents = existingEvents;

      // 현재 시각과 attendtime_coffice 비교
      const now = new Date();
      const [attendHour, attendMinute] = selectedSubscription.attendtime_coffice.split(':').map(Number);
      const attendTime = new Date();
      attendTime.setHours(attendHour, attendMinute, 0);

      // 출근 타입 결정 (일등/출근/지각)
      let attendanceType;
      if (now > attendTime) {
        attendanceType = '지각';
      } else if (processedEvents?.length === 0) {
        attendanceType = '일등';
      } else {
        attendanceType = '출근';
      }

      const { data, error } = await supabase
        .from('event_log')
        .insert([{
          id_coffice: selectedSubscription.id_coffice.toString(),
          id_user: selectedUserData.id_user.toString(),
          type_event: attendanceType,
          message_event: null,
          date_event: selectedDate,
          timestamp_event: now.toISOString()  // UTC 시간으로 저장
        }]);

      if (error) throw error;
      console.log('출근 이벤트 생성 성공:', data);

    } catch (error) {
      console.error('출근 이벤트 생성 실패:', error);
      showWarningMessage('위치 정보를 확인할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 출근/퇴근 버튼 클릭 핸들러
  const handleAttendanceClick = async () => {
    if (isLoading) return; // 이미 처리 중이면 중복 클릭 방지
    
    setIsLoading(true);

    try {
      // 필수 데이터 확인
      if (!selectedSubscription?.id_coffice || !selectedDate || !selectedUserData?.id_user) {
        throw new Error('필수 데이터가 누락되었습니다.');
      }

      const currentStatus = memberStatus[selectedSubscription.id_coffice]
        ?.dates[selectedDate]
        ?.members[selectedUserData.id_user]
        ?.status_user;

      // 상태가 없는 경우 기본값을 '미출근'으로 설정
      if (!currentStatus) {
        await createAttendanceEvent();
        return;
      }

      // 출근/퇴근 상태에 따른 처리
      if (['출근', '일등', '지각'].includes(currentStatus)) {
        await handleLeaveWork();
      } else {
        await createAttendanceEvent();
      }

      // 상태 업데이트를 위해 콜백 호출
      if (onAttendanceClick) {
        await onAttendanceClick();
      }

    } catch (error) {
      console.error('출/퇴근 처리 중 오류 발생:', error);
      showWarningMessage(error.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const showWarningMessage = (message) => {
    const warningMessage = document.createElement('div');
    warningMessage.className = 'alert alert-warning w-[288px] fixed top-[calc(70vh+50px)] left-1/2 -translate-x-1/2 z-50';
    warningMessage.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(warningMessage);
    setTimeout(() => warningMessage.remove(), 3000);
  };

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
        ?.members[selectedUserData?.id_user]
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

      const [openTimeStr, closeTimeStr] = operationHours;
      const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);
      const closeTime = new Date();
      closeTime.setHours(closeHour, closeMinute, 0);

      // 이미 출근했거나 일등 또는 지각인 경우 퇴근하기 버튼 활성화 (영업종료 시간 전까지)
      if (currentStatus === '출근' || currentStatus === '일등' || currentStatus === '지각') {
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

  return (
    <div className="flex justify-center mb-[2vh]">
      <button
        onClick={handleAttendanceClick}
        disabled={isButtonDisabled || isLoading}
        className={`
          btn btn-circle w-[288px] h-[48px] mx-auto block
          border-1 border-black normal-case
          shadow-lg hover:shadow-md transition-shadow
          relative
          ${isButtonDisabled || isLoading
            ? 'bg-[#DEDEDE] text-black hover:bg-[#DEDEDE] border-1 border-black' 
            : memberStatus[selectedSubscription?.id_coffice]?.dates[selectedDate]?.members[selectedUserData?.id_user]?.status_user === '출근' || 
              memberStatus[selectedSubscription?.id_coffice]?.dates[selectedDate]?.members[selectedUserData?.id_user]?.status_user === '일등' || 
              memberStatus[selectedSubscription?.id_coffice]?.dates[selectedDate]?.members[selectedUserData?.id_user]?.status_user === '지각'
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
  )
}

export default AttendanceButton