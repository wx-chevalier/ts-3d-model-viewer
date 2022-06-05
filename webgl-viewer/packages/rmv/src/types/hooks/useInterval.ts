import { useEffect, useRef } from 'react';

export const useInterval = (
  callback: () => void,
  delay: number,
  runImmediate = true,
  label?: string,
) => {
  const savedCallback = useRef<(...args: any[]) => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (...args: any[]) => savedCallback.current(...args);

    if (runImmediate) {
      handler();
    }

    if (delay !== null) {
      const id = setInterval(() => {
        handler();
      }, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};
