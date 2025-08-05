// src/components/SplashScreen.jsx
import React, { useRef, useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handleEnd = () => onFinish();
    v.addEventListener('ended', handleEnd);
    return () => v.removeEventListener('ended', handleEnd);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center z-50">
      <video
        ref={videoRef}
        src="/SPP.mp4"
        autoPlay
        muted
        playsInline
        className="max-w-full max-h-full"
      />
    </div>
  );
}
