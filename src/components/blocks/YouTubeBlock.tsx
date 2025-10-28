interface YouTubeConfig {
  url: string;
  title?: string;
  autoplay?: boolean;
  width?: string;
  height?: string;
}

interface YouTubeBlockProps {
  config: YouTubeConfig;
}

export function YouTubeBlock({ config }: YouTubeBlockProps) {
  const {
    url,
    title = "Product Video",
    autoplay = false,
    width = "100%",
    height = "450px"
  } = config;

  if (!url) {
    return (
      <div className="my-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          No YouTube URL provided. Please configure the YouTube video block.
        </p>
      </div>
    );
  }

  // Extract video ID from various YouTube URL formats
  const getVideoId = (videoUrl: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const videoId = getVideoId(url);

  if (!videoId) {
    return (
      <div className="my-6 rounded-lg border border-red-300 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Invalid YouTube URL. Please provide a valid YouTube video URL.
        </p>
      </div>
    );
  }

  // Build embed URL with autoplay parameter
  const embedUrl = `https://www.youtube.com/embed/${videoId}${autoplay ? "?autoplay=1" : ""}`;

  return (
    <div className="my-6 mx-auto" style={{ maxWidth: width }}>
      <div
        className="relative overflow-hidden rounded-lg shadow-lg"
        style={{ height }}
      >
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
