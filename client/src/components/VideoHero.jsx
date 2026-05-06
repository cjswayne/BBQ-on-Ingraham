import { useEffect, useRef, useState } from "react";
import hero1 from "../assets/hero-1.mp4";
import hero2 from "../assets/hero-2.mp4";

const VIDEO_SRCS = [hero1, hero2];
const MOBILE_BREAKPOINT = 768;
const FADE_DURATION_MS = 2000;
const CROSSFADE_LEAD_S = 2.5;

const lerpColor = (from, to, t) => {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const COLOR_WHITE = [255, 255, 255];
const COLOR_INK = [80, 73, 64];

export const VideoHero = ({ children }) => {
  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const activeKeyRef = useRef("A");
  const nextVideoIndexRef = useRef(2 % VIDEO_SRCS.length);
  const rafRef = useRef(null);
  const crossfadingRef = useRef(false);
  const pollIntervalRef = useRef(null);

  const [activePlayer, setActivePlayer] = useState("A");
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const startCrossfade = () => {
    if (crossfadingRef.current) return;
    const currentKey = activeKeyRef.current;
    const nextKey = currentKey === "A" ? "B" : "A";
    const nextVideo = nextKey === "A" ? videoARef.current : videoBRef.current;

    if (!nextVideo) return;

    crossfadingRef.current = true;

    try {
      nextVideo.currentTime = 0;
      const playPromise = nextVideo.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch {
      // ignore
    }

    activeKeyRef.current = nextKey;
    setActivePlayer(nextKey);

    setTimeout(() => {
      const oldVideo = currentKey === "A" ? videoARef.current : videoBRef.current;
      if (oldVideo) {
        const idx = nextVideoIndexRef.current;
        nextVideoIndexRef.current = (idx + 1) % VIDEO_SRCS.length;
        try {
          oldVideo.pause();
          oldVideo.src = VIDEO_SRCS[idx];
          oldVideo.load();
        } catch {
          // ignore
        }
      }
      crossfadingRef.current = false;
    }, FADE_DURATION_MS);
  };

  // Kick off playback on mount (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    const a = videoARef.current;
    const b = videoBRef.current;

    const startPlayback = (el) => {
      if (!el) return;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    startPlayback(a);
    startPlayback(b);

    if (a) {
      if (a.readyState >= 2) {
        setIsReady(true);
      } else {
        const onCanPlay = () => {
          setIsReady(true);
          a.removeEventListener("canplay", onCanPlay);
        };
        a.addEventListener("canplay", onCanPlay);
        return () => a.removeEventListener("canplay", onCanPlay);
      }
    }
  }, [isMobile]);

  // Poll the active video and start crossfade before it ends
  useEffect(() => {
    if (!isMobile || !isReady) return;

    pollIntervalRef.current = setInterval(() => {
      if (crossfadingRef.current) return;
      const active = activeKeyRef.current === "A" ? videoARef.current : videoBRef.current;
      if (!active) return;

      const duration = active.duration;
      const current = active.currentTime;
      if (
        Number.isFinite(duration) &&
        duration > 0 &&
        duration - current <= CROSSFADE_LEAD_S
      ) {
        startCrossfade();
      }
    }, 250);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isMobile, isReady]);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const scrollY = window.scrollY || window.pageYOffset;
        const fadeDistance = window.innerHeight * 0.4;
        const progress = Math.min(1, scrollY / fadeDistance);
        setVideoOpacity(Math.max(0, 1 - progress));
        setScrollProgress(progress);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const videoElementStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "177.78vh",
    height: "100vh",
    minWidth: "100%",
    minHeight: "100%",
    transform: "translate(-50%, -50%)",
    objectFit: "cover",
    pointerEvents: "none"
  };

  return (
    <>
      {/* Fixed fullscreen overlay — fades on scroll to reveal content beneath */}
      <div
        className="fixed inset-0 z-20"
        style={{
          opacity: Math.max(0, 1 - scrollProgress),
          pointerEvents: scrollProgress >= 0.5 ? "none" : "auto",
          visibility: scrollProgress >= 1 ? "hidden" : "visible",
          willChange: "opacity",
        }}
      >
        {isMobile && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ opacity: videoOpacity, willChange: "opacity" }}
          >
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                opacity: activePlayer === "A" ? 1 : 0,
                transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
                willChange: "opacity"
              }}
            >
              <video
                ref={videoARef}
                src={VIDEO_SRCS[0]}
                autoPlay
                muted
                loop={false}
                playsInline
                preload="auto"
                style={videoElementStyle}
              />
            </div>
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                opacity: activePlayer === "B" ? 1 : 0,
                transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
                willChange: "opacity"
              }}
            >
              <video
                ref={videoBRef}
                src={VIDEO_SRCS[1 % VIDEO_SRCS.length]}
                autoPlay
                muted
                loop={false}
                playsInline
                preload="auto"
                style={videoElementStyle}
              />
            </div>
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}

        {(!isMobile || !isReady) && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-pb-ocean to-pb-palm"
            style={{ opacity: isMobile ? (isReady ? 0 : 1) : 1 }}
          />
        )}

        {/* Centered hero text on the overlay */}
        <div className="relative z-10 flex h-full items-center justify-center px-2 text-center text-white">
          <div className="flex flex-col items-center px-6 py-8 sm:px-10 sm:py-10">
            {children}
          </div>
        </div>
      </div>

      {/* Spacer — matches fade distance so content lands below the header when overlay finishes fading */}
      <div className="-mt-16 h-[calc(40vh+4rem)] w-full" aria-hidden="true" />
    </>
  );
};
