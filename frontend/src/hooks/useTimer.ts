import { useState, useEffect, useRef } from 'react';

interface UseTimerReturn {
  elapsedSeconds: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  formattedTime: string;
}

/**
 * Hook pour gérer un chronomètre
 */
export const useTimer = (initialSeconds: number = 0): UseTimerReturn => {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - elapsedSeconds * 1000;
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(elapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, elapsedSeconds]);

  const start = () => {
    setIsRunning(true);
  };

  const stop = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    startTimeRef.current = null;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    elapsedSeconds,
    isRunning,
    start,
    stop,
    reset,
    formattedTime: formatTime(elapsedSeconds),
  };
};

