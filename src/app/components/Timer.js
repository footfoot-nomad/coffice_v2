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
      raw_time_attend: selectedSubscription?.attendtime_coffice,
      subscription_data: selectedSubscription
    });

    let attendTime = null;
    if (selectedSubscription?.attendtime_coffice) {
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
          time_parts: selectedSubscription.attendtime_coffice.split(':'),
        });

        const [hours, minutes] = selectedSubscription.attendtime_coffice.split(':').map(Number);
        
        console.log('Time components:', {
          hours,
          minutes,
          are_valid: !isNaN(hours) && !isNaN(minutes)
        });

        attendTime = new Date(baseDate);
        attendTime.setHours(hours, minutes, 0);

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
    // 디버깅을 위한 상세 로그 추가
    console.log('Timer calculation details:', {
      now: {
        full: now.toLocaleString(),
        time: now.getTime(),
        hours: now.getHours(),
        minutes: now.getMinutes()
      },
      attendTime: {
        full: attendTime.toLocaleString(),
        time: attendTime.getTime(),
        hours: attendTime.getHours(),
        minutes: attendTime.getMinutes()
      },
      openTime: {
        full: openTime.toLocaleString(),
        time: openTime.getTime(),
        hours: openTime.getHours(),
        minutes: openTime.getMinutes()
      },
      comparisons: {
        nowVsOpen: now.getTime() - openTime.getTime(),
        nowVsAttend: now.getTime() - attendTime.getTime(),
        isAfterOpen: now >= openTime,
        isBeforeAttend: now < attendTime
      }
    });

    // 영업 시작 시간 이전인 경우
    if (now.getTime() < openTime.getTime()) {
      console.log('상태: 영업 시작 전 대기');
      setTimeElapsed(0);
      setTimerStatus('waiting');
      return;
    }

    // 영업 시작 시간과 출근 마감 시간 사이인 경우
    if (now.getTime() >= openTime.getTime() && now.getTime() < attendTime.getTime()) {
      console.log('상태: 카운트다운 중');
      const remainingTime = Math.floor((attendTime.getTime() - now.getTime()) / 1000);
      console.log('남은 시간(초):', remainingTime);
      setTimeElapsed(remainingTime);
      setTimerStatus('counting_down');
      return;
    }

    // 출근 마감 시간 이후인 경우
    if (now.getTime() >= attendTime.getTime()) {
      console.log('상태: 출근 마감 후 대기');
      setTimeElapsed(0);
      setTimerStatus('waiting');
      return;
    }
  };

  useEffect(() => {
    if (!selectedSubscription || !selectedDate || !memberStatus || !selectedUserData || !officeInfo) {
      console.log('Timer initialization skipped:', {
        hasSubscription: !!selectedSubscription,
        hasDate: !!selectedDate,
        hasMemberStatus: !!memberStatus,
        hasUserData: !!selectedUserData,
        hasOfficeInfo: !!officeInfo
      });
      return;
    }

    console.log('Timer initialization:', {
      selectedDate,
      subscriptionId: selectedSubscription.id_coffice
    });

    // 타이머 로직
    const timer = setInterval(() => {
      const now = new Date();
      
      // 현재 상태를 interval 내부에서 가져오기
      const currentStatus = memberStatus[selectedSubscription.id_coffice]
        ?.dates[selectedDate]
        ?.members[selectedUserData.id_user];

      console.log('Current status check:', {
        status: currentStatus?.status_user,
        timestamp: currentStatus?.timestamp_user
      });

      // 퇴근 상태일 때
      if (currentStatus?.status_user === '퇴근') {
        console.log('퇴근 상태 상세 정보:', {
          currentStatus,
          selectedDate,
          subscriptionId: selectedSubscription.id_coffice,
          memberStatusStructure: JSON.stringify(memberStatus[selectedSubscription.id_coffice]?.dates[selectedDate], null, 2)
        });

        // message_user에서 근무시간 가져오기
        if (currentStatus?.message_user) {
          const workingSeconds = parseInt(currentStatus.message_user);
          setTimeElapsed(workingSeconds);
          setTimerStatus('ended');
          console.log('근무시간 설정 완료:', {
            workingSeconds,
            message_user: currentStatus.message_user
          });
        } else {
          console.log('근무시간 데이터를 찾을 수 없음');
          setTimeElapsed(0);
          setTimerStatus('waiting');
        }
        return;
      }

      // 출근/일등/지각 상태일 때 (스톱워치 모드)
      if (['출근', '일등', '지각'].includes(currentStatus?.status_user) && currentStatus?.timestamp_user) {
        console.log('출근/일등/지각 상태 감지');
        const startTime = new Date(currentStatus.timestamp_user);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setTimeElapsed(elapsed);
        setTimerStatus('counting');
        return;
      }

      // status_user가 null이거나 정의되지 않은 경우에만 타이머 모드 실행
      if (!currentStatus?.status_user) {
        // 선택한 날짜가 오늘이 아닐 때 (한국 시간 기준)
        const now = new Date();
        const koreaToday = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        const today = koreaToday.toISOString().split('T')[0];
        
        console.log('날짜 비교:', {
          selectedDate,
          today,
          isToday: selectedDate === today
        });

        if (selectedDate !== today) {
          console.log('오늘이 아닌 날짜 감지');
          setTimeElapsed(0);
          setTimerStatus('waiting');
          return;
        }

        // 대기 상태일 때 (타이머 모드)
        const currentDay = koreaToday.getDay(); // 한국 시간 기준 요일
        const operationHours = getOperationHours(currentDay, officeInfo);
        
        if (!operationHours) {
          console.log('운영 시간 정보 없음');
          return;
        }

        console.log('타이머 모드 진입:', {
          currentDay,
          operationHours
        });

        const { openTime, closeTime } = operationHours;
        
        // attendTime 설정
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0); // 오늘 날짜의 00:00:00으로 설정
        
        const [hours, minutes] = selectedSubscription.attendtime_coffice.split(':').map(Number);
        const attendTime = new Date(baseDate);
        attendTime.setHours(hours, minutes, 0);
        
        calculateTimer(now, attendTime, openTime);
      }
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