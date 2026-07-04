export type Toast = {
  id: number;
  message: string;
  type: 'info' | 'error' | 'success';
};

export type AppConfig = { library_root?: string | null };

export type ItemDto = {
  item_id: number;
  source: string;
  source_id: string;
  remote_url?: string | null;
  file_abs: string;
  file_rel: string;
  ext?: string | null;
  sources: string[];
  rating?: string | null;
  fav_count?: number | null;
  score_total?: number | null;
  timestamp?: string | null;
  added_at: string;
  tags_general: string[];
  tags_artist: string[];
  tags_copyright: string[];
  tags_character: string[];
  tags_species: string[];
  tags_meta: string[];
  tags_lore: string[];
};

export type LibraryItem = {
  item_id: number;
  source: string;
  source_id: string;
  remote_url?: string | null;
  url: string;
  ext?: string | null;
  tags: string[];
  artist: string[];
  sources: string[];
  rating?: string | null;
  fav_count?: number | null;
  score: { total: number };
  timestamp?: string | null;
  file_rel: string;
  tags_general: string[];
  tags_artist: string[];
  tags_copyright: string[];
  tags_character: string[];
  tags_species: string[];
  tags_meta: string[];
  tags_lore: string[];
};

export type SyncStatus = {
  running: boolean; cancelled: boolean; max_new_downloads?: number | null;
  scanned_pages: number; scanned_posts: number; skipped_existing: number;
  new_attempted: number; downloaded_ok: number; failed_downloads: number;
  unavailable: number; last_error?: string | null; started_at?: string | null;
};

export type UnavailableDto = { source: string; source_id: string; seen_at: string; reason: string; sources: string[] };

export type Feed = { id: number; name: string; query: string };

export type FeedPagingState = { beforeId: number | null; done: boolean };

export type E621CredInfo = { username?: string | null; has_api_key: boolean };

export type FASyncStatus = {
  running: boolean; scanned: number; skipped_url: number; skipped_md5: number;
  imported: number; upgraded: number; errors: number; current_message: string;
  last_error?: string | null; started_at?: string | null;
};

export type FACreds = { a: string; b: string };

export type TwitterSyncStatus = {
  running: boolean; scanned: number; imported: number;
  skipped: number; errors: number; current_message: string;
  last_error?: string | null; started_at?: string | null;
};

export type PoolInfo = {
  pool_id: number;
  name: string;
  post_count: number;
  cover_url: string;
  cover_ext: string;
};

export type PoolPost = {
  item_id: number;
  source_id: string;
  file_abs: string;
  ext: string;
  position: number;
};

export type E621Post = {
  id: number;
  file: { url: string | null; ext: string; md5: string; width: number; height: number };
  preview: { url: string | null; width: number; height: number };
  sample: { url: string | null; width: number; height: number };
  score: { total: number };
  fav_count: number;
  rating: string;
  created_at: string;
  sources: string[];
  is_favorited: boolean;
  tags: {
    general: string[];
    species: string[];
    character: string[];
    artist: string[];
    copyright: string[];
    meta: string[];
    lore: string[];
  };
};


export type MaintenanceProgress = {
  running: boolean;
  current: number;
  total: number;
  message: string;
  started_at?: string | null;
};

export type DeletedPostInfo = {
  post_id: number;
  item_id: number;
  reason: string;
  tag_applied: string;
};
