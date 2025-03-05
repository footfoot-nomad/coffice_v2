'use client'

import { useState, useEffect } from 'react'

const Timer = ({ selectedSubscription, officeInfo, selectedDate, memberStatus, selectedUserData }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerStatus, setTimerStatus] = useState('waiting');
  const [currentTime, setCurrentTime] = useState(new Date());

  // 현재 시각을 1초마다 업데이트하는 useEffect
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    if (!selectedSubscription || !selectedDate || !memberStatus || !selectedUserData || !officeInfo) {
      return;
    }

    // 선택한 날짜가 오늘인지 확인
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    const currentStatus = memberStatus[selectedSubscription.id_office]
      ?.dates[selectedDate]
      ?.members[selectedUserData.id_user];

    if (!currentStatus) {
      return;
    }

    // 현재 요일 구하기 (0: 일요일, 1: 월요일, ...)
    const currentDay = new Date().getDay();
    const operationHours = getOperationHours(currentDay, officeInfo);
    
    if (!operationHours) {
      return;
    }

    const { openTime, closeTime } = operationHours;
    const attendTime = new Date(selectedSubscription.time_attend);

    // 타이머 로직
    const timer = setInterval(() => {
      const now = new Date();
      const isMidnightPassed = now.getDate() !== currentTime.getDate();

      // 자정이 지난 경우 타이머 리셋
      if (isMidnightPassed) {
        setTimeElapsed(0);
        setTimerStatus('waiting');
        return;
      }

      // 퇴근 상태일 때
      if (currentStatus.status_user === '퇴근') {
        const attendanceEvent = memberStatus[selectedSubscription.id_office]
          ?.event_log?.find(event => 
            (event.type_event === '출근' || event.type_event === '일등' || event.type_event === '지각') &&
            event.id_office === selectedSubscription.id_office &&
            event.id_user === selectedUserData.id_user
          );

        const leaveEvent = memberStatus[selectedSubscription.id_office]
          ?.event_log?.find(event => 
            event.type_event === '퇴근' &&
            event.id_office === selectedSubscription.id_office &&
            event.id_user === selectedUserData.id_user
          );

        if (attendanceEvent && leaveEvent) {
          const workDuration = Math.floor(
            (new Date(leaveEvent.timestamp_event) - new Date(attendanceEvent.timestamp_event)) / 1000
          );
          setTimeElapsed(workDuration);
          setTimerStatus('ended');
        }
        return;
      }

      // 출근/일등/지각 상태일 때
      if (['출근', '일등', '지각'].includes(currentStatus.status_user)) {
        const attendanceEvent = memberStatus[selectedSubscription.id_office]
          ?.event_log?.find(event => 
            (event.type_event === currentStatus.status_user) &&
            event.id_office === selectedSubscription.id_office &&
            event.id_user === selectedUserData.id_user
          );

        if (attendanceEvent) {
          const startTime = new Date(attendanceEvent.timestamp_event);
          const elapsed = Math.floor((now - startTime) / 1000);
          setTimeElapsed(elapsed);
          setTimerStatus('counting');
        }
        return;
      }

      // 대기 상태일 때
      if (!isToday) {
        setTimeElapsed(0);
        setTimerStatus('waiting');
        return;
      }

      // 오피스 오픈 전
      if (now < openTime) {
        const waitTime = Math.floor((attendTime - openTime) / 1000);
        setTimeElapsed(Math.abs(waitTime));
        setTimerStatus('waiting');
        return;
      }

      // 오피스 오픈 후, 출근 시간 전
      if (now >= openTime && now < attendTime) {
        const remainingTime = Math.floor((attendTime - now) / 1000);
        setTimeElapsed(remainingTime);
        setTimerStatus('counting_down');
        return;
      }

      // 출근 시간 이후
      if (now >= attendTime) {
        setTimeElapsed(0);
        setTimerStatus('waiting');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedSubscription, selectedDate, memberStatus, selectedUserData, officeInfo, currentTime]);

  // 요일별 운영 시간 가져오기
  const getOperationHours = (day, officeInfo) => {
    console.log('==== getOperationHours 시작 ====');
    console.log('입력값:', { 
      day, 
      officeInfo,
      selectedOfficeId: selectedSubscription.id_office
    });

    const dayMap = {
      0: 'sun',
      1: 'mon',
      2: 'tue',
      3: 'wed',
      4: 'thu',
      5: 'fri',
      6: 'sat'
    };

    const dayString = dayMap[day];
    const operationKey = `${dayString}_operation_office`;
    
    console.log('운영시간 조회:', {
      dayString,
      operationKey,
      availableKeys: Object.keys(officeInfo)
    });

    // 선택된 오피스의 운영 시간 찾기
    const selectedOfficeHours = Object.values(officeInfo).find(office => 
      office.id_office === selectedSubscription.id_office
    );

    if (!selectedOfficeHours) {
      console.log('선택된 오피스의 운영 시간을 찾을 수 없음:', {
        searchedId: selectedSubscription.id_office,
        availableOffices: Object.values(officeInfo).map(o => o.id_office)
      });
      return null;
    }

    const hours = selectedOfficeHours[operationKey];
    console.log('운영시간 원본 데이터:', hours);

    if (!hours || !Array.isArray(hours) || hours.length !== 2) {
      console.log('운영시간 데이터 유효성 검사 실패:', {
        exists: !!hours,
        isArray: Array.isArray(hours),
        length: hours?.length
      });
      return null;
    }

    try {
      const today = new Date();
      const [openTime, closeTime] = hours.map(timeStr => {
        console.log('시간 문자열 파싱:', timeStr);
        const [hour, minute, second] = timeStr.split(':').map(num => parseInt(num));
        console.log('파싱된 시간 컴포넌트:', { hour, minute, second });
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, second);
        console.log('생성된 Date 객체:', date.toLocaleString());
        return date;
      });

      console.log('최종 운영시간:', {
        officeId: selectedSubscription.id_office,
        openTime: openTime.toLocaleString(),
        closeTime: closeTime.toLocaleString()
      });

      return { openTime, closeTime };
    } catch (error) {
      console.error('운영시간 파싱 중 오류 발생:', error);
      return null;
    }
  };

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

export default Timer; 