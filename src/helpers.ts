import { convertFileSrc } from "@tauri-apps/api/core";
import type { ItemDto, LibraryItem } from "./types";
import { ARTIST_DENY_LIST } from "./constants";

export function mapItemDto(r: ItemDto): LibraryItem {
  const tagsGeneral = r.tags_general || [];
  const tagsArtist = r.tags_artist || [];
  const tagsCopyright = r.tags_copyright || [];
  const tagsCharacter = r.tags_character || [];
  const tagsSpecies = r.tags_species || [];
  const tagsMeta = r.tags_meta || [];
  const tagsLore = r.tags_lore || [];

  return {
    item_id: r.item_id,
    source: r.source,
    source_id: r.source_id,
    remote_url: r.remote_url,
    url: convertFileSrc(r.file_abs),
    file_rel: r.file_rel,
    ext: r.ext,
    tags: [
      ...tagsGeneral,
      ...tagsArtist,
      ...tagsCopyright,
      ...tagsCharacter,
      ...tagsSpecies,
      ...tagsMeta,
      ...tagsLore,
    ],
    artist: tagsArtist,
    sources: r.sources || [],
    rating: r.rating,
    fav_count: r.fav_count,
    score: { total: r.score_total ?? 0 },
    timestamp: r.timestamp,
    tags_general: tagsGeneral,
    tags_artist: tagsArtist,
    tags_copyright: tagsCopyright,
    tags_character: tagsCharacter,
    tags_species: tagsSpecies,
    tags_meta: tagsMeta,
    tags_lore: tagsLore,
  };
}

export function getSocialMediaName(url: string): string {
  try {
    const u = url.toLowerCase();
    if (u.includes('twitter.com') || u.includes('x.com')) return 'Twitter';
    if (u.includes('pbs.twimg.com') || u.includes('video.twimg.com')) return 'Twitter (File)';
    if (u.includes('t.me') || u.includes('telegram.org')) return 'Telegram';
    if (u.includes('bsky.app') || u.includes('bluesky')) return 'Bluesky';
    if (u.includes('cdn.bsky.app') || u.includes('oyster.us-east.host.bsky')) return 'Bluesky (File)';
    if (u.includes('inkbunny.net')) return 'Inkbunny';
    if (u.includes('ib.metapix.net')) return 'Inkbunny (File)';
    if (u.includes('furaffinity.net')) return 'FurAffinity';
    if (u.includes('patreon.com')) return 'Patreon';
    if (u.includes('patreonusercontent.com')) return 'Patreon (File)';
    if (u.includes('discordapp.com') || u.includes('discord.com')) return 'Discord';
    if (u.includes('cdn.discordapp.com')) return 'Discord (File)';
    if (u.includes('tumblr.com')) return 'Tumblr';
    if (u.includes('media.tumblr.com')) return 'Tumblr (File)';
    if (u.includes('deviantart.com') || u.includes('deviantar.com')) return 'DeviantArt';
    if (u.includes('artstation.com')) return 'ArtStation';
    if (u.includes('pixiv.net') || u.includes('pximg.net')) return 'Pixiv';
    if (u.includes('reddit.com') || u.includes('redd.it')) return 'Reddit';
    if (u.includes('instagram.com') || u.includes('cdninstagram.com')) return 'Instagram';
    if (u.includes('weasyl.com')) return 'Weasyl';
    if (u.includes('sofurry.com')) return 'SoFurry';
    if (u.includes('newgrounds.com')) return 'Newgrounds';
    if (u.includes('mastodon')) return 'Mastodon';
    if (u.includes('cohost.org')) return 'Cohost';
    if (u.includes('itaku.ee')) return 'Itaku';
    const hostname = new URL(url).hostname.replace('www.', '');
    const domain = hostname.split('.')[0];
    if (domain.length <= 2) return hostname;
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return 'Source';
  }
}

export function getDisplayArtists(item: { artist?: string[]; tags_artist?: string[] }): string {
  const artists = (item.artist && item.artist.length > 0) ? item.artist : (item.tags_artist || []);
  const filtered = artists.filter(a => !ARTIST_DENY_LIST.includes(a));
  return filtered.length > 0 ? filtered.join(", ") : "Unknown";
}

export function parsePositiveInt(s: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = s.trim();
  if (trimmed === "") return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return { ok: false };
  return { ok: true, value: n };
}

export function formatETA(startedAt: string | undefined | null, current: number, total: number): string | null {
  if (!startedAt || current <= 0 || total <= 0 || current >= total) return null;
  try {
    const started = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsed = (now - started) / 1000; // seconds
    if (elapsed < 3) return null; // wait a few seconds before showing ETA
    const rate = current / elapsed;
    const remaining = (total - current) / rate;
    if (remaining < 60) return `~${Math.ceil(remaining)}s left`;
    if (remaining < 3600) return `~${Math.ceil(remaining / 60)}m left`;
    return `~${Math.floor(remaining / 3600)}h ${Math.ceil((remaining % 3600) / 60)}m left`;
  } catch { return null; }
}
