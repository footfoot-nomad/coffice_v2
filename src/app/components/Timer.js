'use client'

import { useState, useEffect } from 'react'

const Timer = ({ selectedSubscription, officeInfo, selectedDate, memberStatus, selectedUserData }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerStatus, setTimerStatus] = useState('waiting');
  const [currentTime, setCurrentTime] = useState(new Date());

  // timerStatus 변경 추적을 위한 useEffect
  useEffect(() => {
    const currentDay = new Date().getDay();
    const operationHours = getOperationHours(currentDay, officeInfo);
    
    // attendTime 파싱 과정 디버깅
    console.log('Parsing attendTime:', {
      raw_time_attend: selectedSubscription?.time_attend,
      subscription_data: selectedSubscription
    });

    let attendTime = null;
    if (selectedSubscription?.time_attend) {
      try {
        const today = new Date();
        const koreaToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const baseDate = new Date(
          koreaToday.getFullYear(),
          koreaToday.getMonth(),
          koreaToday.getDate()
        );
        
        console.log('Parsing steps:', {
          step1_base_date: baseDate.toLocaleString('ko-KR'),
          time_parts: selectedSubscription.time_attend.split(':'),
        });

        const [hours, minutes, seconds] = selectedSubscription.time_attend.split(':').map(Number);
        
        console.log('Time components:', {
          hours,
          minutes,
          seconds,
          are_valid: !isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)
        });

        attendTime = new Date(baseDate);
        attendTime.setHours(hours, minutes, seconds);

        console.log('Final attendTime:', {
          result: attendTime.toLocaleString('ko-KR'),
          is_valid: !isNaN(attendTime.getTime())
        });
      } catch (error) {
        console.error('Error parsing attendTime:', error);
      }
    }

    console.log('Timer Status Changed:', {
      status: timerStatus,
      timeElapsed,
      currentTime: new Date().toLocaleString('ko-KR'),
      selectedDate,
      userStatus: memberStatus?.[selectedSubscription?.id_coffice]?.dates?.[selectedDate]?.members?.[selectedUserData?.id_user]?.status_user,
      openTime: operationHours?.openTime?.toLocaleString('ko-KR') || 'Not available',
      attendTime: attendTime?.toLocaleString('ko-KR') || 'Not available'
    });
  }, [timerStatus, timeElapsed, selectedDate, memberStatus, selectedSubscription, selectedUserData, officeInfo]);

  // 현재 시각을 1초마다 업데이트하는 useEffect
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const calculateStopwatch = (eventTimestamp) => {
    const now = new Date();
    const startTime = new Date(eventTimestamp);
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    return Math.max(0, elapsed);
  };

  const calculateTimer = (now, attendTime, openTime) => {
    // 디버깅을 위한 로그 추가
    console.log('Timer calculation:', {
      now: now.toLocaleString(),
      attendTime: attendTime.toLocaleString(),
      openTime: openTime.toLocaleString()
    });

    // 영업 시작 시간 이전인 경우
    if (now < openTime) {
      setTimeElapsed(0);
      setTimerStatus('waiting');
      return;
    }

    if (now < attendTime) {
      const remainingTime = Math.floor((attendTime - now) / 1000);
      setTimeElapsed(remainingTime);
      setTimerStatus('counting_down');
      return;
    }

    if (now >= attendTime) {
      setTimeElapsed(0);
      setTimerStatus('waiting');
      return;
    }
  };

  useEffect(() => {
    if (!selectedSubscription || !selectedDate || !memberStatus || !selectedUserData || !officeInfo) {
      return;
    }

    const currentStatus = memberStatus[selectedSubscription.id_coffice]
      ?.dates[selectedDate]
      ?.members[selectedUserData.id_user];

    // 타이머 로직
    const timer = setInterval(() => {
      const now = new Date();

      // 퇴근 상태일 때
      if (currentStatus?.status_user === '퇴근') {
        // 해당 날짜의 출근/일등/지각 이벤트 찾기
        const startEvent = memberStatus[selectedSubscription.id_coffice]
          ?.dates[selectedDate]
          ?.members[selectedUserData.id_user];

        if (startEvent?.timestamp_user) {
          const startTime = new Date(startEvent.timestamp_user);
          const endTime = new Date(currentStatus.timestamp_user);
          const elapsed = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          setTimeElapsed(elapsed);
          setTimerStatus('ended');
        }
        return;
      }

      // 출근/일등/지각 상태일 때 (스톱워치 모드)
      if (['출근', '일등', '지각'].includes(currentStatus?.status_user) && currentStatus?.timestamp_user) {
        const startTime = new Date(currentStatus.timestamp_user);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setTimeElapsed(elapsed);
        setTimerStatus('counting');
        return;
      }

      // 선택한 날짜가 오늘이 아닐 때
      const today = new Date().toISOString().split('T')[0];
      if (selectedDate !== today) {
        setTimeElapsed(0);
        setTimerStatus('waiting');
        return;
      }

      // 대기 상태일 때 (타이머 모드)
      const currentDay = new Date().getDay();
      const operationHours = getOperationHours(currentDay, officeInfo);
      
      if (!operationHours) {
        return;
      }

      const { openTime, closeTime } = operationHours;
      
      // attendTime 설정
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0); // 오늘 날짜의 00:00:00으로 설정
      
      const [hours, minutes, seconds] = selectedSubscription.attendtime_coffice.split(':').map(Number);
      const attendTime = new Date(baseDate);
      attendTime.setHours(hours, minutes, seconds);
      
      calculateTimer(now, attendTime, openTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedSubscription, selectedDate, memberStatus, selectedUserData, officeInfo]);

  // 요일별 운영 시간 가져오기
  const getOperationHours = (day, officeInfo) => {
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

    const selectedOfficeHours = officeInfo[selectedSubscription.id_office];

    if (!selectedOfficeHours) {
      return null;
    }

    const hours = selectedOfficeHours[operationKey];

    if (!hours || !Array.isArray(hours) || hours.length !== 2) {
      return null;
    }

    try {
      const today = new Date();
      const koreaToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
      const baseDate = new Date(
        koreaToday.getFullYear(),
        koreaToday.getMonth(),
        koreaToday.getDate()
      );

      const [openTime, closeTime] = hours.map(timeStr => {
        const [hour, minute, second] = timeStr.split(':').map(num => parseInt(num));
        const date = new Date(baseDate);
        date.setHours(hour, minute, second);
        return date;
      });

      return { openTime, closeTime };
    } catch (error) {
      return null;
    }
  };

  const formatTime = (totalSeconds) => {
    const today = new Date();
    const koreaToday = new Date(today.getTime() + (9 * 60 * 60 * 1000))
      .toISOString()
      .split('T')[0];

    if (selectedDate !== koreaToday) {
      return {
        hours: '--',
        minutes: '--',
        seconds: '--'
      };
    }

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

  const getTitle = () => {
    switch (timerStatus) {
      case 'waiting':
        return '출근 대기';
      case 'counting_down':
        return '출근 마감 타이머';
      case 'counting':
      case 'ended':
        return '근무 시간';
      default:
        return '근무 시간';
    }
  };

  return (
    <div className="flex flex-col items-start h-[22vh] mb-[3vh] mt-[7vh]">
      <div className="text-[20px] font-semibold text-gray-800 mt-[2vh] mb-3 px-4">
        {getTitle()}
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