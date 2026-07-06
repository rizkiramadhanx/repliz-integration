import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import store from "store2";
import type { typeBatchProgressPayload, typeDataScrapedPost } from "../type";

export default function useScrapeProgressSocket(batchJobId: string | null) {
  const [posts, setPosts] = useState<typeDataScrapedPost[]>([]);
  const [progress, setProgress] = useState<typeBatchProgressPayload | null>(null);

  useEffect(() => {
    if (!batchJobId) return;

    setPosts([]);
    setProgress(null);

    const token = store.get("token");
    const baseUrl = import.meta.env.VITE_PUBLIC_BACKEND_AUTH_URL as string;

    const socket: Socket = io(`${baseUrl}/scrape-progress`, {
      query: { token, batchJobId },
      transports: ["websocket"],
    });

    socket.on("scraped-post", (payload: { batchJobId: string; post: typeDataScrapedPost }) => {
      if (payload.batchJobId !== batchJobId) return;
      setPosts((prev) => [...prev, payload.post]);
    });

    socket.on("batch-progress", (payload: typeBatchProgressPayload) => {
      if (payload.batchJobId !== batchJobId) return;
      setProgress(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [batchJobId]);

  return { posts, progress };
}
