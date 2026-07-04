export const APP_VERSION = "0.3.2";
export const TOAST_DURATION_MS = 4000;

// Video extensions
export const VIDEO_EXTENSIONS = ['mp4', 'webm'];
export const ANIMATED_EXTENSIONS = ['mp4', 'webm', 'gif'];

export const HUD_TIMEOUT_MS = 2000;
export const FADE_DURATION_MS = 300;
export const TOOLTIP_GRACE_MS = 200;
export const INFINITE_SCROLL_MARGIN = "2000px 0px";
export const FEED_PAGE_LIMIT = 200;

export const ARTIST_DENY_LIST = ['conditional_dnp', 'sound_warning', 'unknown_artist', 'epilepsy_warning'];

export const tagCategoryStyles: Record<string, { bg: string; heading: string }> = {
  'text-yellow-400': { bg: 'bg-yellow-400/30 hover:bg-yellow-400/45', heading: 'text-yellow-400' },
  'text-pink-400': { bg: 'bg-pink-400/30 hover:bg-pink-400/45', heading: 'text-pink-400' },
  'text-green-400': { bg: 'bg-green-400/30 hover:bg-green-400/45', heading: 'text-green-400' },
  'text-red-400': { bg: 'bg-red-400/30 hover:bg-red-400/45', heading: 'text-red-400' },
  'text-blue-300': { bg: 'bg-blue-400/30 hover:bg-blue-400/45', heading: 'text-blue-300' },
  'text-gray-400': { bg: 'bg-gray-400/30 hover:bg-gray-400/45', heading: 'text-gray-400' },
  'text-purple-300': { bg: 'bg-purple-400/30 hover:bg-purple-400/45', heading: 'text-purple-300' },
};

export const skeletonAspects = [
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-[2/3]",
  "aspect-[5/6]",
  "aspect-[3/4]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[3/5]",
  "aspect-[4/5]",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[2/3]",
  "aspect-[5/4]",
  "aspect-[3/4]",
];
