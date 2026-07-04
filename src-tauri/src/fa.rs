use crate::{db, library, chrome};
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use tauri::Manager;

// --- Data Structures ---

#[derive(Serialize, Clone, Default)]
pub struct FASyncStatus {
    pub running: bool,
    pub scanned: u32,
    pub skipped_url: u32,
    pub skipped_md5: u32,
    pub imported: u32,
    pub upgraded: u32,
    pub errors: u32,
    pub current_message: String,
    pub last_error: Option<String>,
    pub started_at: Option<String>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct E621File {
    url: Option<String>,
    ext: Option<String>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct E621Tags {
    general: Vec<String>,
    artist: Vec<String>,
    copyright: Vec<String>,
    character: Vec<String>,
    species: Vec<String>,
    meta: Vec<String>,
    lore: Vec<String>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct E621Post {
    id: i64,
    tags: E621Tags,
    file: E621File,
    rating: Option<String>,
    fav_count: Option<i64>,
    created_at: Option<String>,
}

#[derive(Deserialize)]
struct E621Response {
    posts: Vec<E621Post>,
}

pub struct FAState {
    pub status: Arc<Mutex<FASyncStatus>>,
    pub should_cancel: Arc<Mutex<bool>>,
}

impl FAState {
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(FASyncStatus::default())),
            should_cancel: Arc::new(Mutex::new(false)),
        }
    }
}

// --- Helper Functions ---

fn check_db_exists(conn: &Connection, source: &str, id: &str) -> bool {
    let count: u32 = conn
        .query_row(
            "SELECT COUNT(*) FROM items WHERE source = ? AND source_id = ?",
            [source, id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    count > 0
}

fn check_local_md5(conn: &Connection, hash: &str) -> bool {
    let count: u32 = conn
        .query_row(
            "SELECT COUNT(*) FROM items WHERE md5 = ?",
            [hash],
            |row| row.get(0),
        )
        .unwrap_or(0);
    count > 0
}

async fn check_e621_md5(client: &reqwest::Client, hash: &str) -> Option<E621Post> {
    let url = format!("https://e621.net/posts.json?tags=md5:{}", hash);
    let resp = client
        .get(&url)
        .header("User-Agent", "TailBurrow/0.3.2")
        .send()
        .await
        .ok()?;
    let text = resp.text().await.ok()?;
    let parsed: E621Response = serde_json::from_str(&text).ok()?;
    parsed.posts.into_iter().next()
}

fn insert_typed_tags(
    tx: &rusqlite::Transaction,
    item_id: i64,
    tags: &[String],
    tag_type: &str,
) -> Result<(), String> {
    for tag in tags {
        let clean = tag.trim().to_lowercase();
        if clean.is_empty() {
            continue;
        }
        tx.execute(
            "INSERT OR IGNORE INTO tags (name, type) VALUES (?, ?)",
            params![&clean, tag_type],
        )
        .map_err(|e| e.to_string())?;

        let tag_id: i64 = tx
            .query_row(
                "SELECT tag_id FROM tags WHERE name = ?",
                [&clean],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)",
            [item_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn insert_source_link(
    tx: &rusqlite::Transaction,
    item_id: i64,
    url: &str,
) -> Result<(), String> {
    tx.execute(
        "INSERT OR IGNORE INTO sources (url) VALUES (?)",
        [url],
    )
    .map_err(|e| e.to_string())?;

    let source_row_id: i64 = tx
        .query_row(
            "SELECT source_row_id FROM sources WHERE url = ?",
            [url],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT OR IGNORE INTO item_sources (item_id, source_row_id) VALUES (?, ?)",
        [item_id, source_row_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// JS snippet to extract submission IDs from an FA favorites page
const EXTRACT_FA_IDS_JS: &str = r#"
JSON.stringify(
    Array.from(document.querySelectorAll('figure.t-image'))
        .map(f => (f.id || '').replace('sid-', ''))
        .filter(id => id.length > 0)
)
"#;

/// JS snippet to extract submission data from an FA view page.
/// Returns JSON object with downloadUrl, tags[], artist, rating.
const EXTRACT_FA_VIEW_JS: &str = r#"
JSON.stringify((() => {
    // Download URL
    const dlEl = document.querySelector('div.download > a');
    let downloadUrl = '';
    if (dlEl) {
        let href = dlEl.getAttribute('href') || '';
        if (href.startsWith('//')) href = 'https:' + href;
        else if (href.startsWith('/')) href = 'https://www.furaffinity.net' + href;
        downloadUrl = href;
    }

    // Tags
    const tags = Array.from(document.querySelectorAll('section.tags-row span.tags a'))
        .map(a => a.textContent.trim())
        .filter(t => t.length > 0);

    // Artist — try multiple selectors
    let artist = 'unknown';
    const selectors = [
        'div.submission-id-sub-container a strong',
        'div.submission-id-sub-container a[href*="/user/"]',
        '.submission-sidebar .user-name'
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
            artist = el.textContent.trim();
            break;
        }
    }
    if (artist === 'unknown' && downloadUrl.includes('/art/')) {
        const match = downloadUrl.match(/\/art\/([^\/]+)/);
        if (match) artist = match[1];
    }
    artist = artist.replace(/ /g, '_').toLowerCase();

    // Rating
    const ratingEl = document.querySelector('div.rating span');
    let ratingText = (ratingEl ? ratingEl.textContent.trim().toLowerCase() : 'general');
    let rating = 's';
    if (ratingText === 'adult') rating = 'e';
    else if (ratingText === 'mature') rating = 'q';

    return { downloadUrl, tags, artist, rating };
})())
"#;

// --- Main Logic ---

pub async fn run_sync(app: AppHandle, cookie_a: String, cookie_b: String, stop_after: u32) {
    let state = app.state::<FAState>();

    {
        let mut s = state.status.lock();
        *s = FASyncStatus {
            running: true,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            ..Default::default()
        };
        *state.should_cancel.lock() = false;
    }

    let result = run_sync_inner(&app, &state, cookie_a, cookie_b, stop_after).await;

    let mut s = state.status.lock();
    s.running = false;
    if let Err(e) = result {
        s.last_error = Some(e.clone());
        s.current_message = format!("Error: {}", e);
    } else {
        s.current_message = "Done.".to_string();
    }
}

async fn run_sync_inner(
    app: &AppHandle,
    state: &FAState,
    cookie_a: String,
    cookie_b: String,
    stop_after: u32,
) -> Result<(), String> {
    let e621_client = reqwest::Client::new();
    let root = crate::commands::get_root(app)?;
    let db_path = library::db_path(&root);
    let media_dir = root.join("media");

    if !media_dir.exists() {
        fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;
    }

    // ── Launch Headless Chrome ──
    {
        let mut s = state.status.lock();
        s.current_message = "Launching Chrome...".to_string();
    }

    let browser = chrome::ChromeInstance::launch().await?;
    let page = browser.new_page().await?;

    // Set cookies for furaffinity.net
    browser.set_cookie("www.furaffinity.net", "a", &cookie_a).await?;
    browser.set_cookie("www.furaffinity.net", "b", &cookie_b).await?;

    let mut page_num = 1;

    loop {
        if *state.should_cancel.lock() {
            break;
        }

        {
            let mut s = state.status.lock();
            s.current_message = format!("Scanning page {}...", page_num);
        }

        let url = if page_num == 1 {
            "https://www.furaffinity.net/controls/favorites/".to_string()
        } else {
            format!("https://www.furaffinity.net/controls/favorites/{}/", page_num)
        };

        page.goto(&url).await?;
        page.wait_for_element("figure.t-image", 15000).await?;

        // Extract submission IDs via JS
        let ids_json = page.evaluate_str(EXTRACT_FA_IDS_JS).await?;
        let ids: Vec<String> = serde_json::from_str(&ids_json)
            .map_err(|e| format!("Failed to parse submission IDs: {}", e))?;

        if ids.is_empty() {
            // Try waiting a bit more and retry
            tokio::time::sleep(Duration::from_millis(3000)).await;
            let ids_json = page.evaluate_str(EXTRACT_FA_IDS_JS).await?;
            let ids_retry: Vec<String> = serde_json::from_str(&ids_json).unwrap_or_default();
            if ids_retry.is_empty() {
                println!("No favorites found on page {}. Ending.", page_num);
                break;
            }
        }

        let ids: Vec<String> = if ids.is_empty() {
            // After retry, try again from the fresh ids
            let ids_json = page.evaluate_str(EXTRACT_FA_IDS_JS).await?;
            serde_json::from_str(&ids_json).unwrap_or_default()
        } else {
            ids
        };

        if ids.is_empty() {
            println!("No favorites found on page {}. Ending.", page_num);
            break;
        }

        for id_str in &ids {
            if *state.should_cancel.lock() {
                break;
            }
            if id_str.is_empty() {
                continue;
            }

            {
                let mut s = state.status.lock();
                s.scanned += 1;
                s.current_message = format!("Processing #{}...", id_str);
            }

            let conn = db::open(&db_path).map_err(|e| e.to_string())?;

            // 1. FAST LOCAL CHECK
            if check_db_exists(&conn, "furaffinity", id_str) {
                let mut s = state.status.lock();
                s.skipped_url += 1;
                continue;
            }

            // 2. Fetch Submission Page via Chrome
            let view_url = format!("https://www.furaffinity.net/view/{}/", id_str);
            tokio::time::sleep(Duration::from_millis(800)).await;

            page.goto(&view_url).await?;
            tokio::time::sleep(Duration::from_millis(1000)).await;

            // Extract data via JS
            let view_json = page.evaluate_str(EXTRACT_FA_VIEW_JS).await?;

            #[derive(Deserialize)]
            struct FaViewData {
                #[serde(default)]
                download_url: String,
                #[serde(default)]
                tags: Vec<String>,
                #[serde(default)]
                artist: String,
                #[serde(default)]
                rating: String,
            }

            let data: FaViewData = serde_json::from_str(&view_json)
                .map_err(|e| format!("Failed to parse view data for {}: {}", id_str, e))?;

            let download_url = data.download_url;
            let fa_tags = data.tags;
            let artist_name = data.artist;
            let rating_char = data.rating;

            if download_url.is_empty() {
                state.status.lock().errors += 1;
                continue;
            }

            // 3. Download FA File via reqwest
            let fa_client = reqwest::Client::builder()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .build()
                .map_err(|e| e.to_string())?;

            let cookie_header = format!("a={}; b={}", cookie_a, cookie_b);

            let fa_bytes = match fa_client
                .get(&download_url)
                .header("Cookie", &cookie_header)
                .send()
                .await
            {
                Ok(r) => match r.bytes().await {
                    Ok(b) => b,
                    Err(e) => {
                        eprintln!("Failed to read FA file bytes {}: {}", id_str, e);
                        state.status.lock().errors += 1;
                        continue;
                    }
                },
                Err(e) => {
                    eprintln!("Failed to download FA file {}: {}", id_str, e);
                    state.status.lock().errors += 1;
                    continue;
                }
            };

            let digest = md5::compute(&fa_bytes);
            let hash_str = format!("{:x}", digest);

            // 4. CHECK LOCAL MD5
            if check_local_md5(&conn, &hash_str) {
                let mut s = state.status.lock();
                s.skipped_md5 += 1;
                continue;
            }

            // 5. CHECK E621
            tokio::time::sleep(Duration::from_millis(500)).await;

            if let Some(e621_post) = check_e621_md5(&e621_client, &hash_str).await {
                // --- FOUND ON E621 (UPGRADE PATH) ---
                if check_db_exists(&conn, "e621", &e621_post.id.to_string()) {
                    let mut s = state.status.lock();
                    s.skipped_md5 += 1;
                    continue;
                }

                if let Some(file_url) = e621_post.file.url {
                    let e621_bytes = match e621_client
                        .get(&file_url)
                        .header("User-Agent", "TailBurrow/0.3.2")
                        .send()
                        .await
                    {
                        Ok(r) => match r.bytes().await {
                            Ok(b) => b,
                            Err(e) => {
                                eprintln!("Failed to read e621 bytes {}: {}", e621_post.id, e);
                                state.status.lock().errors += 1;
                                continue;
                            }
                        },
                        Err(e) => {
                            eprintln!("Failed to download e621 file {}: {}", e621_post.id, e);
                            state.status.lock().errors += 1;
                            continue;
                        }
                    };

                    let ext = e621_post.file.ext.unwrap_or("jpg".to_string());
                    let filename = format!("e621_{}.{}", e621_post.id, ext);
                    let target_path = media_dir.join(&filename);

                    let mut file = fs::File::create(&target_path).map_err(|e| e.to_string())?;
                    file.write_all(&e621_bytes).map_err(|e| e.to_string())?;

                    let file_rel_for_thumb = format!("media/{}", filename);
                    crate::commands::generate_and_save_thumb(&root, &file_rel_for_thumb);

                    let now = chrono::Local::now().to_rfc3339();
                    let file_rel = format!("media/{}", filename);

                    let mut conn_mut = db::open(&db_path).map_err(|e| e.to_string())?;
                    let tx = conn_mut.transaction().map_err(|e| e.to_string())?;

                    let insert_res = tx.execute(
                        "INSERT INTO items (source, source_id, file_rel, md5, ext, rating, fav_count, score_total, created_at, added_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                        params![
                            "e621",
                            e621_post.id.to_string(),
                            file_rel,
                            hash_str,
                            ext,
                            e621_post.rating,
                            e621_post.fav_count,
                            0,
                            e621_post.created_at,
                            now
                        ],
                    );

                    if insert_res.is_err() {
                        println!("Skipping duplicate e621 insert: {}", e621_post.id);
                        continue;
                    }

                    let item_id = tx.last_insert_rowid();

                    insert_typed_tags(&tx, item_id, &e621_post.tags.artist, "artist")?;
                    insert_typed_tags(&tx, item_id, &e621_post.tags.copyright, "copyright")?;
                    insert_typed_tags(&tx, item_id, &e621_post.tags.character, "character")?;
                    insert_typed_tags(&tx, item_id, &e621_post.tags.species, "species")?;
                    insert_typed_tags(&tx, item_id, &e621_post.tags.general, "general")?;
                    insert_typed_tags(&tx, item_id, &e621_post.tags.meta, "meta")?;
                    insert_typed_tags(&tx, item_id, &e621_post.tags.lore, "lore")?;

                    insert_source_link(&tx, item_id, &format!("https://e621.net/posts/{}", e621_post.id))?;
                    insert_source_link(&tx, item_id, &view_url)?;

                    tx.commit().map_err(|e| e.to_string())?;

                    let mut s = state.status.lock();
                    s.upgraded += 1;

                    if stop_after > 0 && (s.imported + s.upgraded) >= stop_after {
                        break;
                    }
                    continue;
                }
            }

            // --- NOT ON E621 (EXCLUSIVE PATH) ---
            let ext = download_url.split('.').last().unwrap_or("jpg");
            let filename = format!("{}_fa_{}.{}", artist_name, id_str, ext);
            let target_path = media_dir.join(&filename);

            let mut file = fs::File::create(&target_path).map_err(|e| e.to_string())?;
            file.write_all(&fa_bytes).map_err(|e| e.to_string())?;

            let now = chrono::Local::now().to_rfc3339();
            let file_rel = format!("media/{}", filename);
            crate::commands::generate_and_save_thumb(&root, &file_rel);

            let mut conn_mut = db::open(&db_path).map_err(|e| e.to_string())?;
            let tx = conn_mut.transaction().map_err(|e| e.to_string())?;

            let insert_res = tx.execute(
                "INSERT INTO items (source, source_id, file_rel, md5, ext, rating, created_at, added_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params!["furaffinity", id_str, file_rel, hash_str, ext, rating_char, now, now],
            );

            if insert_res.is_err() {
                println!("Skipping duplicate FA insert: {}", id_str);
                continue;
            }

            let item_id = tx.last_insert_rowid();
            insert_source_link(&tx, item_id, &view_url)?;
            insert_typed_tags(&tx, item_id, &[artist_name.clone()], "artist")?;
            insert_typed_tags(&tx, item_id, &fa_tags, "general")?;

            tx.commit().map_err(|e| e.to_string())?;

            let mut s = state.status.lock();
            s.imported += 1;

            if stop_after > 0 && (s.imported + s.upgraded) >= stop_after {
                break;
            }
        }

        if stop_after > 0 {
            let s = state.status.lock();
            if (s.imported + s.upgraded) >= stop_after {
                break;
            }
        }

        page_num += 1;
        if page_num > 500 {
            let mut s = state.status.lock();
            s.current_message = "Reached page limit (500). If you have more favorites, run sync again.".to_string();
            break;
        }
    }

    browser.close().await?;
    Ok(())
}
