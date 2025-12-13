interface YouTubeEmbedConfig {
  url: string;
  title?: string;
  autoplay?: boolean;
  width?: string;
  height?: string;
}

interface YouTubeEmbedBlockProps {
  config: YouTubeEmbedConfig;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Handle youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/embed\/([^?]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
}

export function YouTubeEmbedBlock({ config }: YouTubeEmbedBlockProps) {
  const {
    url,
    title,
    autoplay = false,
    width = '100%',
    height = '450px',
  } = config;

  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div className="my-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          Invalid YouTube URL. Please provide a valid YouTube video link.
        </p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?${autoplay ? 'autoplay=1&' : ''}rel=0`;

  return (
    <div className="my-6">
      {title && (
        <h3 className="mb-3 text-lg font-semibold text-gray-900">{title}</h3>
      )}
      <div
        className="relative overflow-hidden rounded-lg shadow-lg"
        style={{
          width,
          paddingBottom: height === 'responsive' ? '56.25%' : undefined,
          height: height === 'responsive' ? 0 : height,
        }}
      >
        <iframe
          src={embedUrl}
          title={title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={
            height === 'responsive'
              ? 'absolute left-0 top-0 h-full w-full'
              : 'h-full w-full'
          }
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
