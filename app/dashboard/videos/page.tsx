"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, RefreshCw, Video } from "lucide-react";
import Link from "next/link";

interface YoutubeVideo {
  _id: string;
  title: string;
  youtubeUrl: string;
  videoId: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideo | null>(null);

  // Admin server URL for YouTube videos (public endpoint)
  const ADMIN_API_URL =
    process.env.NEXT_PUBLIC_ADMIN_API_URL ||
    "https://fx-signal-server-mk93.onrender.com";

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${ADMIN_API_URL}/youtube`);

      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }

      const data = await response.json();
      if (data.success) {
        setVideos(data.videos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Trading Videos</h1>
            {videos.length > 0 && (
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {videos.length} video{videos.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={fetchVideos}>
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-center">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVideos}
              className="ml-4"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-t-2 border-b-2 border-primary animate-spin"></div>
            </div>
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-card p-4 rounded-full shadow-sm mb-4">
              <Video className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No videos available</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Trading videos will appear here once they're added by the admin.
            </p>
            <Button onClick={fetchVideos} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        )}

        {/* Video Grid */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video._id}
                className="group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Thumbnail / Embed */}
                <div className="aspect-video relative bg-black">
                  {selectedVideo?._id === video._id ? (
                    // Playing video
                    <iframe
                      src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
                      title={video.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    // Thumbnail with play button
                    <>
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                        alt={video.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to hqdefault if maxresdefault not available
                          e.currentTarget.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                      <button
                        onClick={() => setSelectedVideo(video)}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
                          <Play className="h-7 w-7 text-primary-foreground ml-1" />
                        </div>
                      </button>
                    </>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {video.description}
                    </p>
                  )}
                </div>

                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fullscreen Video Modal (optional enhancement) */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-5xl aspect-video relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              Press ESC or click outside to close
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
              title={selectedVideo.title}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
