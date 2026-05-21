import { useEffect, useRef, useState } from "react";

export function usePaymentCountdown({
  expiresAt,
  defaultSeconds,
  urgentThreshold = 300,
  onExpire,
}) {
  const getInitialSeconds = () => {
    if (expiresAt) {
      const remaining = Math.floor((new Date(expiresAt) - Date.now()) / 1000);
      return Math.max(0, remaining);
    }
    return defaultSeconds;
  };

  const [secondsLeft, setSecondsLeft] = useState(getInitialSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const isUrgent = secondsLeft <= urgentThreshold;
  const totalMinutes = Math.floor(secondsLeft / 60);
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    secondsLeft,
    isUrgent,
    totalMinutes,
    hours,
    minutes,
    seconds,
    timeDisplay,
  };
}
