# Miniapp AMap WebView

This folder is a minimal static project for deploying the miniapp's H5 map page to Vercel.

## What it contains

- `index.html`: the standalone AMap WebView page
- `vercel.json`: keeps the old `/static/amap-h5.html` URL working

## Deploy

1. Create a new Vercel project from the same GitHub repo.
2. Set `Root Directory` to `vercel-amap-webview`.
3. Use the `Other` framework preset.
4. Leave the build command empty, or use a no-op command if Vercel asks for one.
5. Deploy it as a static site.
6. After deployment, use the HTTPS URL in the miniapp:

```env
TARO_APP_MAP_WEBVIEW_URL=https://campus-helper-blush.vercel.app/static/amap-h5.html
```

## Notes

- This project is intentionally separate from the main web app.
- If you change `miniapp/src/static/amap-h5.html`, run `node scripts/sync_amap_webview.js` before redeploying.
- The page loads the AMap JS SDK from the external AMap CDN, so Vercel only hosts the HTML shell.
