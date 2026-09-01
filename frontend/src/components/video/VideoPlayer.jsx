import React, { useRef, useEffect } from 'react';
import api from '../../api/axios';

const VideoPlayer = ({ videoId, mimeType, onEnded }) => {
  const videoRef = useRef(null);
  const streamUrl = `/api/videos/stream/${videoId}`;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let interval = null;

    const startTracking = () => {
      // Clear any existing timer to be safe
      if (interval) clearInterval(interval);
      
      interval = setInterval(() => {
        const currentTime = videoElement.currentTime;
        api.post('/analytics/track', {
          videoId,
          watchDuration: 10,
          device: window.innerWidth < 768 ? 'mobile' : (window.innerWidth < 1024 ? 'tablet' : 'desktop'),
          retentionTime: currentTime,
        }).catch(err => console.error('Analytics tracking failed', err));
      }, 10000);
    };

    const stopTracking = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleEnded = () => {
      stopTracking();
      if (onEnded) onEnded();
    };

    videoElement.addEventListener('play', startTracking);
    videoElement.addEventListener('pause', stopTracking);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('play', startTracking);
      videoElement.removeEventListener('pause', stopTracking);
      videoElement.removeEventListener('ended', handleEnded);
      stopTracking();
    };
  }, [videoId, onEnded]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl group">
      <video
        key={streamUrl}
        ref={videoRef}
        controls
        preload="auto"
        className="w-full h-full"
        controlsList="nodownload"
      >
        <source src={streamUrl} type={mimeType || 'video/mp4'} />
        Your browser does not support the video tag.
      </video>
      
      {/* Custom Overlays could go here */}
    </div>
  );
};

export default VideoPlayer;
