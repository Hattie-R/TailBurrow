import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { PoolInfo } from "../types";

export const PoolCover = ({ pool }: { pool: PoolInfo }) => {
  const [error, setError] = useState(false);

  if (!pool.cover_url || error) {
    return (
      <div className="w-full aspect-[3/4] flex items-center justify-center bg-[#1d1b2d]">
        <BookOpen className="w-12 h-12 opacity-30" />
      </div>
    );
  }

  return (
    <img
      src={pool.cover_url}
      alt={pool.name}
      className="w-full h-auto object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
};
