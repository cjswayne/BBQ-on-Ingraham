import { useEffect, useState } from "react";

import { apiClient } from "../api/client.js";
import { GalleryModal } from "../components/GalleryModal.jsx";

/**
 * Maps backend media records into gallery-friendly objects.
 * @param {Array<object>} media - Raw media array from the API.
 * @returns {Array<object>} Normalized media objects used by the gallery.
 */
const normalizeMedia = (media) => {
  return media.map((item) => {
    const user = item.user || item.userId || {};

    return {
      id: item._id,
      cloudinaryUrl: item.cloudinaryUrl,
      mediaType: item.mediaType,
      thumbnailUrl: item.thumbnailUrl || "",
      user: {
        name: user.name || "Guest",
        profilePhotoUrl: user.profilePhotoUrl || ""
      }
    };
  });
};

/**
 * Derives a fallback thumbnail URL for Cloudinary-hosted videos.
 * @param {string} cloudinaryUrl - Original video URL.
 * @returns {string} Thumbnail URL generated from the first frame.
 */
const getFallbackVideoThumbnail = (cloudinaryUrl) => {
  const transformedUrl = cloudinaryUrl.replace(
    "/video/upload/",
    "/video/upload/so_0,w_400,h_300,c_fill/"
  );

  return transformedUrl.replace(/\.[^./?]+(?=$|\?)/, ".jpg");
};

/**
 * Displays the shared media gallery with modal previews.
 * @returns {JSX.Element} Gallery page.
 */
const Gallery = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Fetches a gallery page and either replaces or appends media state.
   * @param {number} nextPage - The page number to fetch.
   * @param {boolean} append - Whether to append to existing items.
   * @returns {Promise<void>} Completes once request and state updates finish.
   */
  const loadPage = async (nextPage, append) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await apiClient.getMedia(nextPage);
      const normalizedItems = normalizeMedia(response?.media || []);

      if (append) {
        setMediaItems((previousItems) => [...previousItems, ...normalizedItems]);
      } else {
        setMediaItems(normalizedItems);
      }

      setPage(response?.page || nextPage);
      setTotalPages(response?.totalPages || 1);
    } catch (error) {
      console.error("Failed to load gallery media", error);
      setErrorMessage("Could not load the gallery right now. Please retry.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    document.title = "BBQ Gallery | BBQ On Ingraham";
    loadPage(1, false);
  }, []);

  /**
   * Loads the next gallery page when available.
   * @returns {Promise<void>} Completes after load attempt.
   */
  const handleLoadMore = async () => {
    if (isLoadingMore || page >= totalPages) {
      return;
    }

    await loadPage(page + 1, true);
  };

  const hasMorePages = page < totalPages;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="surface-card rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-pb-ocean">BBQ Gallery</h1>

        {errorMessage ? (
          <p className="mt-4 text-sm text-pb-error">{errorMessage}</p>
        ) : null}

        {isLoading ? (
          <p className="mt-4 text-sm text-pb-driftwood">Loading gallery...</p>
        ) : null}

        {!isLoading && mediaItems.length === 0 && !errorMessage ? (
          <p className="mt-4 text-sm text-pb-driftwood">
            No photos or videos yet. Be the first to share!
          </p>
        ) : null}

        {mediaItems.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {mediaItems.map((media) => {
              const tileThumbnail =
                media.mediaType === "video"
                  ? media.thumbnailUrl ||
                    getFallbackVideoThumbnail(media.cloudinaryUrl)
                  : media.cloudinaryUrl;

              return (
                <button
                  className="group relative aspect-square overflow-hidden rounded-lg"
                  key={media.id}
                  onClick={() => setSelectedMedia(media)}
                  type="button"
                >
                  <img
                    alt={`${media.mediaType} by ${media.user.name}`}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    src={tileThumbnail}
                  />
                  {media.mediaType === "video" ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5 translate-x-[1px]"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7-11-7z" />
                        </svg>
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {hasMorePages ? (
          <div className="mt-5">
            <button
              className="rounded-full bg-pb-ocean px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingMore}
              onClick={handleLoadMore}
              type="button"
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        ) : null}
      </section>

      <GalleryModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
    </main>
  );
};

export default Gallery;
