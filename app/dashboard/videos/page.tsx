"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, Search, Video } from "lucide-react";
import Link from "next/link";

import { ADMIN_API_URL } from "@/lib/config";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter videos by search query
  const filteredVideos = videos.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="ml-64 flex-1 overflow-y-auto">
      <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Link
              href="/dashboard/signals"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Signal vault
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-white font-medium">Tutorial videos</span>
          </div>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="USDT/GOLD"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-56 rounded-full bg-zinc-900 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
            />
          </div>

          <Link href="/dashboard/videos">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full bg-white text-black hover:bg-zinc-200 text-xs px-4 gap-1.5"
            >
              <Play className="h-3 w-3 fill-current" />
              Watch tutorials
            </Button>
          </Link>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Page Title */}
          <h1 className="text-xl font-bold text-white mb-6">Tutorial videos</h1>

          {/* Error State */}
          {error && (
            <div className="mb-6 flex items-center justify-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
              {error}
              <button
                onClick={fetchVideos}
                className="underline hover:text-red-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && videos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-6">
                <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-zinc-500 animate-spin" />
              </div>
              <p className="text-zinc-500 text-sm">Loading videos...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && videos.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-zinc-900 p-4 rounded-full mb-4">
                <Video className="h-8 w-8 text-zinc-600" />
              </div>
              <h3 className="font-semibold text-white mb-1">
                No videos available
              </h3>
              <p className="text-sm text-zinc-500 mb-4 max-w-sm">
                Trading videos will appear here once they&apos;re added by the
                admin.
              </p>
              <button
                onClick={fetchVideos}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          )}

          {/* Video Grid */}
          {filteredVideos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredVideos.map((video) => (
                <button
                  key={video._id}
                  onClick={() => setSelectedVideo(video)}
                  className="group text-left rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all duration-200"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-4/3 overflow-hidden rounded-lg m-2">
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                      }}
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 group-hover:scale-110 transition-all duration-200">
                        <Play className="h-4 w-4 text-white ml-0.5 fill-white" />
                      </div>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="px-3 pb-3 pt-1">
                    <h3 className="font-medium text-sm text-white line-clamp-1">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results for search */}
          {!loading &&
            videos.length > 0 &&
            filteredVideos.length === 0 &&
            searchQuery && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-8 w-8 text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-500">
                  No videos found for &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Fullscreen Video Modal */}
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
              className="absolute -top-10 right-0 text-zinc-400 hover:text-white transition-colors text-sm"
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
    </main>
  );
}
