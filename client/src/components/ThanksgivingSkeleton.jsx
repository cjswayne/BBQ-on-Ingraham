import { useLayoutEffect } from "react";

import "../pages/thanksgiving-theme.css";

/**
 * One shimmering placeholder shape.
 * @param {object} props - Component props.
 * @param {string} [props.className] - Size and shape utilities.
 * @returns {JSX.Element} Placeholder block.
 */
export const SkeletonBlock = ({ className = "" }) => <div aria-hidden="true" className={`skeleton-block ${className}`} />;

/**
 * Placeholder rows shaped like RSVP cards, shown while the guest list loads.
 * @param {object} props - Component props.
 * @param {number} [props.rows=3] - How many rows to show.
 * @returns {JSX.Element} Skeleton guest rows.
 */
export const RsvpListSkeleton = ({ rows = 3 }) => (
  <div aria-busy="true" aria-label="Loading guest list" role="status">
    {Array.from({ length: rows }, (_, index) => (
      <div className={`flex items-center gap-4 px-5 py-4 ${index > 0 ? "border-t border-pb-driftwood/10" : ""}`} key={index}>
        <SkeletonBlock className="h-11 w-11 shrink-0 !rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className={`h-4 ${index % 2 ? "w-28" : "w-36"}`} />
          <SkeletonBlock className={`h-3 ${index % 2 ? "w-44" : "w-32"}`} />
        </div>
      </div>
    ))}
  </div>
);

const InfoRowSkeleton = ({ titleWidth, detailWidth }) => (
  <div className="flex items-start gap-3">
    <SkeletonBlock className="h-5 w-5 shrink-0 !rounded-md" />
    <div className="flex-1 space-y-2">
      <SkeletonBlock className={`h-4 ${titleWidth}`} />
      <SkeletonBlock className={`h-3 ${detailWidth}`} />
    </div>
  </div>
);

/**
 * Whole-page placeholder for /thanksgiving while its code downloads. Mirrors the
 * real layout (hero, guest list, RSVP form) so nothing jumps when it swaps in.
 * @returns {JSX.Element} Thanksgiving page skeleton.
 */
export const ThanksgivingPageSkeleton = () => {
  // Fall colors from the first frame, so the page never flashes the BBQ palette.
  // The page itself removes the class when you leave /thanksgiving.
  useLayoutEffect(() => {
    document.body.classList.add("thanksgiving-theme");
    return () => {
      if (!window.location.pathname.toLowerCase().startsWith("/thanksgiving")) {
        document.body.classList.remove("thanksgiving-theme");
      }
    };
  }, []);

  return (
    <main
      aria-busy="true"
      aria-label="Loading Thanksgiving on Ingraham"
      className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6"
    >
      <section
        className="overflow-hidden rounded-[1.25rem] border shadow-xl"
        style={{
          background: "linear-gradient(135deg, #FBF3E4 0%, #F6E2C2 55%, #F0CFA0 100%)",
          borderColor: "#C2571A33"
        }}
      >
        <div className="flex flex-col items-center px-6 py-6 sm:px-10 sm:py-10">
          <SkeletonBlock className="h-3 w-44" />
          <SkeletonBlock className="mt-4 h-9 w-56 sm:w-80" />
          <SkeletonBlock className="mt-3 h-9 w-40 sm:hidden" />
          <SkeletonBlock className="mt-4 h-4 w-64 max-w-full sm:w-96" />

          <div
            className="mt-4 flex w-full max-w-sm flex-col items-center rounded-2xl border px-4 py-3"
            style={{ backgroundColor: "rgba(255, 250, 241, 0.75)", borderColor: "#C2571A33" }}
          >
            <SkeletonBlock className="h-2.5 w-24" />
            <div className="mt-3 flex items-center gap-5">
              <div className="flex w-20 flex-col items-center gap-2">
                <SkeletonBlock className="h-14 w-14 !rounded-full" />
                <SkeletonBlock className="h-3 w-12" />
              </div>
              <SkeletonBlock className="h-5 w-3" />
              <div className="flex w-20 flex-col items-center gap-2">
                <SkeletonBlock className="h-14 w-14 !rounded-full" />
                <SkeletonBlock className="h-3 w-12" />
              </div>
            </div>
            <SkeletonBlock className="mt-3 h-3 w-56 max-w-full" />
          </div>

          <div className="mt-5 flex w-full max-w-sm flex-col gap-3">
            <InfoRowSkeleton detailWidth="w-20" titleWidth="w-44" />
            <InfoRowSkeleton detailWidth="w-48" titleWidth="w-36" />
            <InfoRowSkeleton detailWidth="w-56" titleWidth="w-40" />
          </div>

          <SkeletonBlock className="mt-5 h-12 w-full max-w-sm !rounded-full" />
          <SkeletonBlock className="mt-3 h-3 w-40" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card min-w-0 overflow-hidden">
          <div className="border-b border-pb-driftwood/10 px-5 py-4">
            <SkeletonBlock className="h-6 w-40" />
          </div>
          <RsvpListSkeleton />
        </div>

        <div className="surface-card min-w-0 space-y-4 p-5">
          <SkeletonBlock className="h-5 w-16" />
          {[0, 1, 2].map((field) => (
            <div className="space-y-2" key={field}>
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-9 w-full !rounded-sm" />
            </div>
          ))}
          <SkeletonBlock className="h-11 w-full !rounded-full" />
        </div>
      </section>
    </main>
  );
};

export default ThanksgivingPageSkeleton;
