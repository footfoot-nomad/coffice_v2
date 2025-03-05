'use client'

import { useState, useEffect } from 'react'

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

export default Timer; 