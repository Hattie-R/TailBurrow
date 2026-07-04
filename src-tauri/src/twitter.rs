use crate::{db, library, commands, chrome};
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
pub struct TwitterSyncStatus {
    pub running: bool,
    pub scanned: u32,
    pub imported: u32,
    pub skipped: u32,
    pub errors: u32,
    pub current_message: String,
    pub last_error: Option<String>,
    pub started_at: Option<String>,
}

pub struct TwitterState {
    pub status: Arc<Mutex<TwitterSyncStatus>>,
    pub should_cancel: Arc<Mutex<bool>>,
}

impl TwitterState {
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(TwitterSyncStatus::default())),
            should_cancel: Arc::new(Mutex::new(false)),
        }
    }
}

// --- JS Snippets ---

/// JS that extracts tweet data from ALL article[data-testid="tweet"] elements on the page.
/// Returns a JSON array of { tweetId, username, images[], videos[], text }.
const EXTRACT_TWEETS_JS: &str = r#"
JSON.stringify(
    Array.from(document.querySelectorAll('article[data-testid="tweet"]')).map(article => {
        // Tweet ID from permalink
        const permalink = article.querySelector('a[href*="/status/"]');
        const href = permalink ? (permalink.getAttribute('href') || '') : '';
        const tweetIdMatch = href.match(/\/status\/(\d+)/);
        const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';

        // Username from the author link
        const allLinks = Array.from(article.querySelectorAll('a[role="link"]'));
        let username = '';
        for (const link of allLinks) {
            const h = link.getAttribute('href') || '';
            if (h.startsWith('/') && !h.includes('/status/') && !h.includes('/search')) {
                username = h.replace(/^\//, '').split('/')[0];
                if (username) break;
            }
        }

        // Images — filter out profile/avatar images
        const images = Array.from(article.querySelectorAll('img[src*="twimg.com"]'))
            .map(img => img.getAttribute('src') || '')
            .filter(src => src && !src.includes('profile_images') && !src.includes('profile_banners') && src.endsWith('.jpg') || src.endsWith('.png') || src.includes('format=jpg') || src.includes('format=png'))
            .filter((v, i, a) => a.indexOf(v) === i); // dedup

        // Videos — get video source URLs
        const videos = Array.from(article.querySelectorAll('video source'))
            .map(s => s.getAttribute('src') || '')
            .filter(s => s.length > 0)
            .filter((v, i, a) => a.indexOf(v) === i);

        // Full text
        const tweetTextEl = article.querySelector('div[data-testid="tweetText"]');
        const tweetText = tweetTextEl ? tweetTextEl.textContent || '' : '';

        return { tweetId, username, images, videos, text: tweetText };
    })
    .filter(t => t.tweetId.length > 0)
)
"#;

/// JS to check if there are more tweets loading or if we've reached the bottom.


fn set_status(state: &TwitterState, msg: &str) {
    let mut s = state.status.lock();
    s.current_message = msg.to_string();
}

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

/// Determine file extension from a media URL
fn ext_from_url(url: &str) -> &str {
    if url.contains("blob:") || url.contains(".mp4") {
        "mp4"
    } else if let Some(ext) = url.rsplit('.').next() {
        let ext = ext.split('?').next().unwrap_or(ext);
        if ext.len() <= 5 { ext } else { "jpg" }
    } else {
        "jpg"
    }
}

// --- Main Logic ---

pub async fn run_sync(app: AppHandle, username: String, password: String, stop_after: u32) {
    let state = app.state::<TwitterState>();

    {
        let mut s = state.status.lock();
        *s = TwitterSyncStatus {
            running: true,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
            ..Default::default()
        };
        *state.should_cancel.lock() = false;
    }

    let result = sync_bookmarks_inner(&app, &state, &username, &password, stop_after).await;

    let mut s = state.status.lock();
    s.running = false;
    match result {
        Ok(_) => s.current_message = "Done.".to_string(),
        Err(e) => {
            s.last_error = Some(e.clone());
            s.current_message = format!("Error: {}", e);
        }
    }
}

async fn sync_bookmarks_inner(
    app: &AppHandle,
    state: &TwitterState,
    username: &str,
    password: &str,
    stop_after: u32,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let root = commands::get_root(app)?;
    let db_path = library::db_path(&root);

    let media_dir = root.join("media");
    if !media_dir.exists() {
        fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;
    }

    // ── Step 1: Launch Headless Chrome ──
    set_status(state, "Launching Chrome...");
    let browser = chrome::ChromeInstance::launch().await?;
    let page = browser.new_page().await?;

    // ── Step 2: Log in to Twitter ──
    set_status(state, "Navigating to Twitter login...");
    page.goto("https://x.com/login").await?;
    tokio::time::sleep(Duration::from_secs(2)).await;

    // Wait for the login page to fully render
    set_status(state, "Logging in to Twitter...");

    // Try to find and fill the username input
    let username_sel = find_login_input(&page, "username").await?;
    page.type_into(&username_sel, username).await?;
    tokio::time::sleep(Duration::from_millis(500)).await;

    // Click "Next" button — try various selectors
    let next_clicked = click_next_button(&page).await?;
    if !next_clicked {
        // Try pressing Enter instead
        page.evaluate(
            r#"document.querySelector('input[autocomplete="username"]')?.closest('form')?.requestSubmit()"#,
        )
        .await?;
        tokio::time::sleep(Duration::from_millis(1500)).await;
    } else {
        tokio::time::sleep(Duration::from_millis(1500)).await;
    }

    // Wait for password field to appear
    let password_sel = find_login_input(&page, "password").await?;
    page.type_into(&password_sel, password).await?;
    tokio::time::sleep(Duration::from_millis(500)).await;

    // Click "Log in" button
    let login_clicked = click_login_button(&page).await?;
    if !login_clicked {
        page.evaluate(
            r#"document.querySelector('input[type="password"]')?.closest('form')?.requestSubmit()"#,
        )
        .await?;
        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    // Wait for login to complete — URL should change to home
    tokio::time::sleep(Duration::from_secs(3)).await;

    // Check if we're still on the login page (login failed)
    let current_url = page.current_url().await?;
    if current_url.contains("login") || current_url.contains("i/flow") {
        // Check for 2FA
        let page_text = page.evaluate_str("document.body.innerText").await?;
        if page_text.to_lowercase().contains("two-factor")
            || page_text.to_lowercase().contains("authentication code")
        {
            return Err("Twitter login requires two-factor authentication, which is not supported.".to_string());
        }
        return Err(format!(
            "Twitter login failed. Current URL: {}. The login page may have changed.",
            current_url
        ));
    }

    // ── Step 3: Navigate to Bookmarks ──
    set_status(state, "Navigating to bookmarks...");
    page.goto("https://x.com/i/bookmarks").await?;
    tokio::time::sleep(Duration::from_secs(3)).await;

    // Wait for tweets to appear
    set_status(state, "Waiting for bookmarks to load...");
    let tweets_appeared = wait_for_tweets(&page, 15).await;

    if !tweets_appeared {
        return Err("No tweets found on the bookmarks page. The page may not have loaded correctly.".to_string());
    }

    // ── Step 4: Extract tweets ──
    set_status(state, "Fetching bookmarks...");

    let mut known_tweet_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut no_new_tweets_count = 0;
    let max_no_new = 5;

    loop {
        if *state.should_cancel.lock() {
            break;
        }

        // Extract current tweets from DOM
        let tweets_json = page.evaluate_str(EXTRACT_TWEETS_JS).await?;

        #[derive(Deserialize, Debug)]
#[allow(dead_code)]
        struct TweetData {
            #[serde(default)]
            tweet_id: String,
            #[serde(default)]
            username: String,
            #[serde(default)]
            images: Vec<String>,
            #[serde(default)]
            videos: Vec<String>,
            #[serde(default)]
            text: String,
        }

        let current_tweets: Vec<TweetData> =
            serde_json::from_str(&tweets_json).unwrap_or_default();

        let new_tweets: Vec<TweetData> = current_tweets
            .into_iter()
            .filter(|t| known_tweet_ids.insert(t.tweet_id.clone()))
            .collect();

        if new_tweets.is_empty() {
            no_new_tweets_count += 1;
            if no_new_tweets_count >= max_no_new {
                break;
            }
        } else {
            no_new_tweets_count = 0;
        }

        for tweet in &new_tweets {
            if *state.should_cancel.lock() {
                break;
            }

            {
                let mut s = state.status.lock();
                s.scanned += 1;
                s.current_message = format!("Processing tweet #{}...", tweet.tweet_id);
            }

            let conn = db::open(&db_path).map_err(|e| e.to_string())?;

            // Check if already in DB
            if check_db_exists(&conn, "twitter", &tweet.tweet_id) {
                let mut s = state.status.lock();
                s.skipped += 1;
                continue;
            }

            // Collect all media URLs (images + videos)
            let mut media_urls: Vec<(String, u32)> = Vec::new();
            for (i, img_url) in tweet.images.iter().enumerate() {
                media_urls.push((img_url.clone(), i as u32));
            }
            for (i, vid_url) in tweet.videos.iter().enumerate() {
                let offset = tweet.images.len();
                media_urls.push((vid_url.clone(), (offset + i) as u32));
            }

            if media_urls.is_empty() {
                let mut s = state.status.lock();
                s.skipped += 1;
                continue;
            }

            for (media_url, media_index) in &media_urls {
                if *state.should_cancel.lock() {
                    break;
                }

                // Download media via reqwest
                let bytes = match client.get(media_url).send().await {
                    Ok(r) => match r.bytes().await {
                        Ok(b) => b,
                        Err(_) => continue,
                    },
                    Err(_) => continue,
                };

                let digest = md5::compute(&bytes);
                let hash_str = format!("{:x}", digest);

                // Check local MD5
                let conn = db::open(&db_path).map_err(|e| e.to_string())?;
                if check_local_md5(&conn, &hash_str) {
                    let mut s = state.status.lock();
                    s.skipped += 1;
                    continue;
                }

                // Save file
                let ext = ext_from_url(media_url);
                let filename = format!("twitter_{}_{}.{}", tweet.tweet_id, media_index, ext);
                let target_path = media_dir.join(&filename);

                let mut file = fs::File::create(&target_path).map_err(|e| e.to_string())?;
                file.write_all(&bytes).map_err(|e| e.to_string())?;

                let file_rel = format!("media/{}", filename);
                commands::generate_and_save_thumb(&root, &file_rel);

                let now = chrono::Local::now().to_rfc3339();
                let artist = tweet.username.clone();
                let tweet_url = format!("https://x.com/{}/status/{}", artist, tweet.tweet_id);

                let mut conn_mut = db::open(&db_path).map_err(|e| e.to_string())?;
                let tx = conn_mut.transaction().map_err(|e| e.to_string())?;

                let insert_res = tx.execute(
                    "INSERT INTO items (source, source_id, file_rel, md5, ext, rating, created_at, added_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params!["twitter", tweet.tweet_id, file_rel, hash_str, ext, "s", now, now],
                );

                if insert_res.is_err() {
                    continue;
                }

                let item_id = tx.last_insert_rowid();

                // Add artist tag
                if !artist.is_empty() && artist != "unknown" {
                    insert_typed_tags(&tx, item_id, &[format!("twitter:{}", artist)], "artist")?;
                }

                insert_source_link(&tx, item_id, &tweet_url)?;

                tx.commit().map_err(|e| e.to_string())?;

                let mut s = state.status.lock();
                s.imported += 1;

                if stop_after > 0 && s.imported >= stop_after {
                    break;
                }
            }

            if stop_after > 0 {
                let s = state.status.lock();
                if s.imported >= stop_after {
                    break;
                }
            }

            tokio::time::sleep(Duration::from_millis(300)).await;
        }

        if stop_after > 0 {
            let s = state.status.lock();
            if s.imported >= stop_after {
                break;
            }
        }

        // Scroll down to load more tweets
        page.scroll_by(0, 800).await?;
        tokio::time::sleep(Duration::from_millis(1500)).await;
    }

    browser.close().await?;
    Ok(())
}

// ── Login Helpers ──

/// Find the username or password input field on the login page.
/// Returns a CSS selector that matches the field.
async fn find_login_input(page: &chrome::PageHandle, kind: &str) -> Result<String, String> {
    let attr = if kind == "password" { "password" } else { "username" };

    // Try common selectors in order
    let selectors = if kind == "password" {
        vec![
            r#"input[type="password"]"#,
            r#"input[name="password"]"#,
            r#"input[autocomplete="current-password"]"#,
        ]
    } else {
        vec![
            r#"input[autocomplete="username"]"#,
            r#"input[name="text"]"#,
            r#"input[type="text"]"#,
        ]
    };

    for sel in &selectors {
        let js = format!(
            r#"document.querySelector({sel:?}) !== null"#,
            sel = sel
        );
        let found: bool = page
            .evaluate(&js)
            .await?
            .as_bool()
            .unwrap_or(false);
        if found {
            return Ok(sel.to_string());
        }
    }

    Err(format!(
        "Could not find {} input field on the Twitter login page.",
        attr
    ))
}

/// Click the "Next" button on the login page.
async fn click_next_button(page: &chrome::PageHandle) -> Result<bool, String> {
    let js = r#"
(() => {
    // Try various button selectors
    const buttons = document.querySelectorAll('div[role="button"], button, span');
    for (const btn of buttons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (text === 'next' || text === 'sign in' || text === 'weiter' || text === 'suivant') {
            if (btn.offsetParent !== null) { // visible
                btn.click();
                return true;
            }
        }
    }
    return false;
})()
"#;
    let result: bool = page.evaluate(js).await?.as_bool().unwrap_or(false);
    Ok(result)
}

/// Click the "Log in" button on the password page.
async fn click_login_button(page: &chrome::PageHandle) -> Result<bool, String> {
    let js = r#"
(() => {
    const buttons = document.querySelectorAll('div[role="button"], button, span');
    for (const btn of buttons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (text === 'log in' || text === 'sign in' || text === 'anmelden' || text === 'connexion') {
            if (btn.offsetParent !== null) { // visible
                btn.click();
                return true;
            }
        }
    }
    return false;
})()
"#;
    let result: bool = page.evaluate(js).await?.as_bool().unwrap_or(false);
    Ok(result)
}

/// Wait for tweet articles to appear on the bookmarks page.
async fn wait_for_tweets(page: &chrome::PageHandle, max_seconds: u64) -> bool {
    let start = std::time::Instant::now();
    while start.elapsed().as_secs() < max_seconds {
        match page
            .evaluate(
                r#"document.querySelectorAll('article[data-testid="tweet"]').length > 0"#,
            )
            .await
        {
            Ok(val) => {
                if val.as_bool().unwrap_or(false) {
                    return true;
                }
            }
            Err(_) => {}
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    false
}