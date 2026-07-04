import React from "react";
import { skeletonAspects } from "../constants";

export const Skeleton = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse bg-gray-700 rounded ${className}`} style={style} />
);

export const SkeletonGridItem = ({ index = 0, dark }: { index?: number; dark?: boolean }) => (
  <div className={`${dark ? 'bg-[#161621] border-[#1d1b2d]' : 'bg-gray-800 border-gray-700'} rounded-lg overflow-hidden border`}>
    <Skeleton className={`w-full ${skeletonAspects[index % skeletonAspects.length]}`} style={dark ? { backgroundColor: '#1d1b2d' } : undefined} />
  </div>
);

export const SkeletonFeedPost = ({ index = 0, dark }: { index?: number; dark?: boolean }) => (
  <div className={`${dark ? 'bg-[#161621]' : 'bg-gray-700'} rounded overflow-hidden`}>
    <Skeleton className={`w-full ${skeletonAspects[index % skeletonAspects.length]}`} style={dark ? { backgroundColor: '#1d1b2d' } : undefined} />
  </div>
);
