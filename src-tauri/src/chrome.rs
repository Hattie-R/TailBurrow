use std::sync::Arc;
use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::cdp::browser_protocol::network::CookieParam;
use futures::StreamExt;

/// A headless Chrome instance managed via the Chrome DevTools Protocol.
/// Provides navigation, JS evaluation, and cookie management.
pub struct ChromeInstance {
    browser: Browser,
    // Handler task must live as long as this instance
    _handler: tokio::task::JoinHandle<()>,
}

impl ChromeInstance {
    /// Launch a headless Chrome instance.
    /// Finds Chrome/Chromium in standard install locations automatically.
    pub async fn launch() -> Result<Self, String> {
        let config = BrowserConfig::builder()
            .new_headless_mode()
            .build()
            .map_err(|e| format!("Failed to build Chrome config: {}", e))?;

        let (browser, handler) = Browser::launch(config)
            .await
            .map_err(|e| format!("Failed to launch Chrome: {}. Is Chrome/Chromium installed?", e))?;

        // Process CDP events in background — required for browser to function
        let handler_task = tokio::spawn(async move {
            handler.for_each(|event| async move {
                if event.is_err() {
                    return;
                }
            }).await;
        });

        Ok(Self {
            browser,
            _handler: handler_task,
        })
    }

    /// Create a new blank page/tab.
    pub async fn new_page(&self) -> Result<PageHandle, String> {
        let page = self
            .browser
            .new_page("about:blank")
            .await
            .map_err(|e| format!("Failed to create new page: {}", e))?;
        Ok(PageHandle { page: Arc::new(page) })
    }

    /// Set a cookie for the given domain before any navigation.
    pub async fn set_cookie(&self, domain: &str, name: &str, value: &str) -> Result<(), String> {
        let cookie = CookieParam::builder()
            .domain(domain)
            .name(name)
            .value(value)
            .path("/")
            .build()
            .map_err(|e| format!("Failed to build cookie param: {}", e))?;

        self.browser
            .set_cookies(vec![cookie])
            .await
            .map_err(|e| format!("Failed to set cookie: {}", e))?;

        Ok(())
    }

    /// Close the browser instance. Consumes self.
    pub async fn close(mut self) -> Result<(), String> {
        self.browser
            .close()
            .await
            .map_err(|e| format!("Failed to close Chrome: {}", e))?;
        Ok(())
    }
}

/// Handle to a single page/tab in the headless browser.
pub struct PageHandle {
    page: Arc<chromiumoxide::Page>,
}
#[allow(dead_code)]

impl PageHandle {
    /// Navigate to a URL and wait for the page to fully load.
    pub async fn goto(&self, url: &str) -> Result<(), String> {
        let url_owned = url.to_string();
        // Call goto in a spawned task to avoid lifetime issues with the page reference
        self.page
            .goto(&url_owned)
            .await
            .map_err(|e| format!("Navigation to {} failed: {}", url, e))?;

        // Wait for any async navigation to settle
        let _ = self.page.wait_for_navigation().await;

        Ok(())
    }

    /// Execute JavaScript in the page context and return the result as a JSON value.
    /// The JS expression MUST return a JSON-serializable value (or null/undefined).
    pub async fn evaluate(&self, js: &str) -> Result<serde_json::Value, String> {
        self.page
            .evaluate(js)
            .await
            .map_err(|e| format!("JS evaluation failed: {}", e))?
            .into_value::<serde_json::Value>()
            .map_err(|e| format!("Failed to parse JS evaluation result: {}", e))
    }

    /// Execute JavaScript that returns a string.
    pub async fn evaluate_str(&self, js: &str) -> Result<String, String> {
        self.page
            .evaluate(js)
            .await
            .map_err(|e| format!("JS evaluation failed: {}", e))?
            .into_value::<String>()
            .map_err(|e| format!("Failed to parse JS string result: {}", e))
    }

    /// Get the full HTML content of the current page.
    pub async fn content(&self) -> Result<String, String> {
        self.page
            .content()
            .await
            .map_err(|e| format!("Failed to get page content: {}", e))
    }

    /// Wait for any pending navigation to complete.
    pub async fn wait_for_navigation(&self) -> Result<(), String> {
        self.page
            .wait_for_navigation()
            .await
            .map_err(|e| format!("Navigation wait failed: {}", e))?;
        Ok(())
    }

    /// Wait for an element matching the CSS selector to appear in the DOM.
    /// Times out after `timeout_ms` milliseconds.
    pub async fn wait_for_element(&self, selector: &str, timeout_ms: u64) -> Result<(), String> {
        let js = format!(
            r#"new Promise((resolve, reject) => {{
                const el = document.querySelector({sel:?});
                if (el) {{ resolve(true); return; }}
                const observer = new MutationObserver(() => {{
                    if (document.querySelector({sel:?})) {{
                        observer.disconnect();
                        resolve(true);
                    }}
                }});
                observer.observe(document.body, {{ childList: true, subtree: true }});
                setTimeout(() => {{ observer.disconnect(); reject(new Error('Timeout waiting for {sel:?}')); }}, {timeout});
            }})"#,
            sel = selector,
            timeout = timeout_ms
        );

        self.evaluate(&js).await?;
        Ok(())
    }

    /// Wait for the document ready state to be 'complete' or 'interactive'.
    pub async fn wait_for_page_ready(&self) -> Result<(), String> {
        self.evaluate_str(
            r#"new Promise(resolve => {
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    resolve('ready');
                    return;
                }
                document.addEventListener('DOMContentLoaded', () => resolve('ready'), { once: true });
            })"#,
        )
        .await?;
        Ok(())
    }

    /// Scroll the page by a given number of pixels.
    pub async fn scroll_by(&self, x: i64, y: i64) -> Result<(), String> {
        self.evaluate(&format!("window.scrollBy({}, {})", x, y))
            .await?;
        Ok(())
    }

    /// Get the current page title.
    pub async fn title(&self) -> Result<String, String> {
        self.evaluate_str("document.title").await
    }

    /// Get the current URL of the page.
    pub async fn current_url(&self) -> Result<String, String> {
        self.evaluate_str("window.location.href").await
    }

    /// Type text into an element matching the CSS selector.
    /// Sets the value directly and dispatches input/change events.
    pub async fn type_into(&self, selector: &str, text: &str) -> Result<(), String> {
        let js = format!(
            r#"(() => {{
                const el = document.querySelector({sel:?});
                if (!el) throw new Error('Element not found: ' + {sel:?});
                el.value = {text:?};
                el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                return true;
            }})()"#,
            sel = selector,
            text = text
        );
        self.evaluate(&js).await?;
        Ok(())
    }

    /// Click an element matching the CSS selector.
    pub async fn click(&self, selector: &str) -> Result<(), String> {
        let js = format!(
            r#"(() => {{
                const el = document.querySelector({sel:?});
                if (!el) throw new Error('Element not found: ' + {sel:?});
                el.click();
                return true;
            }})()"#,
            sel = selector
        );
        self.evaluate(&js).await?;
        Ok(())
    }

    /// Get the currently visible scroll height of the document.
    pub async fn scroll_height(&self) -> Result<f64, String> {
        self.evaluate("document.documentElement.scrollHeight")
            .await?
            .as_f64()
            .ok_or_else(|| "scrollHeight was not a number".to_string())
    }
}