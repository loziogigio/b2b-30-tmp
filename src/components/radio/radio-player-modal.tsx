'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalAction } from '@components/common/modal/modal.context';
import { IoCloseOutline, IoPlayCircle, IoPauseCircle, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import { HiOutlineMinusSm } from 'react-icons/hi';

interface RadioPlayerModalProps {
  lang: string;
}

const RADIO_STATIONS = [
  {
    name: 'Radio Italia',
    streamUrl: 'https://streamcdnm10-4764f6c0c16c3e1f.msvdn.net/webradio/radioitaliawebradio.aac',
    logo: '🇮🇹'
  },
  {
    name: 'RTL 102.5',
    streamUrl: 'https://streamingv2.shoutcast.com/rtl-102-5',
    logo: '📻'
  },
  {
    name: 'RDS',
    streamUrl: 'https://icstream.rds.radio/rds',
    logo: '🎵'
  }
];

const RadioPlayerModal: React.FC<RadioPlayerModalProps> = ({ lang }) => {
  const { closeModal } = useModalAction();
  const audioRef = useRef<HTMLAudioElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentStation, setCurrentStation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Center the window on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setPosition({
        x: Math.max(0, (window.innerWidth - 400) / 2),
        y: Math.max(0, (window.innerHeight - 400) / 2)
      });
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (windowRef.current) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 400));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 100));
      setPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch(() => {
            setIsLoading(false);
          });
      }
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleStationChange = (index: number) => {
    setCurrentStation(index);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  if (!mounted) return null;

  const floatingWindow = (
    <div
      ref={windowRef}
      className="fixed z-[9999] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 280 : 400,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      {/* Draggable Header */}
      <div
        className="flex items-center justify-between p-3 border-b border-slate-200 bg-gradient-to-r from-brand to-indigo-600 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          🎧 {RADIO_STATIONS[currentStation].name}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label={isMinimized ? 'Espandi' : 'Riduci'}
          >
            <HiOutlineMinusSm className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={closeModal}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Chiudi"
          >
            <IoCloseOutline className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Audio Element (always present) */}
      <audio
        ref={audioRef}
        src={RADIO_STATIONS[currentStation].streamUrl}
        preload="none"
      />

      {isMinimized ? (
        /* Minimized Controls */
        <div className="flex items-center justify-between p-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-lg">{RADIO_STATIONS[currentStation].logo}</span>
            <span className="text-xs text-slate-600">
              {isPlaying ? 'In riproduzione' : 'In pausa'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              className="p-1.5 rounded-full hover:bg-slate-200 transition-colors text-slate-600"
            >
              {isMuted ? <IoVolumeMute className="w-5 h-5" /> : <IoVolumeHigh className="w-5 h-5" />}
            </button>
            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="text-brand disabled:opacity-50"
            >
              {isPlaying ? <IoPauseCircle className="w-10 h-10" /> : <IoPlayCircle className="w-10 h-10" />}
            </button>
          </div>
        </div>
      ) : (
        /* Full Player */
        <div className="p-4">
          {/* Station Selector */}
          <div className="flex gap-2 mb-4">
            {RADIO_STATIONS.map((station, index) => (
              <button
                key={station.name}
                onClick={() => handleStationChange(index)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  currentStation === index
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {station.logo} {station.name}
              </button>
            ))}
          </div>

          {/* Now Playing */}
          <div className="text-center mb-4">
            <div className="text-3xl mb-1">{RADIO_STATIONS[currentStation].logo}</div>
            <h4 className="text-lg font-semibold text-slate-800">
              {RADIO_STATIONS[currentStation].name}
            </h4>
            <p className="text-xs text-slate-500">
              {isPlaying ? 'In riproduzione...' : 'Clicca play per ascoltare'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleMuteToggle}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
              aria-label={isMuted ? 'Attiva audio' : 'Disattiva audio'}
            >
              {isMuted ? <IoVolumeMute className="w-6 h-6" /> : <IoVolumeHigh className="w-6 h-6" />}
            </button>

            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="p-1 rounded-full hover:scale-105 transition-transform text-brand disabled:opacity-50"
              aria-label={isPlaying ? 'Pausa' : 'Play'}
            >
              {isPlaying ? <IoPauseCircle className="w-14 h-14" /> : <IoPlayCircle className="w-14 h-14" />}
            </button>

            <div className="w-10" />
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-3">
            Streaming radio italiana in diretta
          </p>
        </div>
      )}
    </div>
  );

  return createPortal(floatingWindow, document.body);
};

export default RadioPlayerModal;
