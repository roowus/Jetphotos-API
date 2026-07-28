# JetPhotos API

Unofficial **free** self-hosted API for [JetPhotos.com](https://www.jetphotos.com) aircraft photo search.

Returns structured JSON for registration / aircraft / airline / photographer searches.

> **No paid scraper keys required.**  
> Run it on your computer or a VPS with `npm start`.

## Status

| Check | Result |
|-------|--------|
| Local self-host (`npm start`) | Works |
| Paid proxy required | No |
| Cloudflare Workers edge deploy (`npm run deploy`) | Often blocked by JetPhotos (`403`) |

Verified locally against a live JetPhotos search (`Boeing 747`) returning photo JSON with `meta.free: true` and `meta.mode: "workerd-direct"`.

## Free by design

JetPhotos is Cloudflare-protected. Direct scrapes from Cloudflare’s edge (and many plain `curl`/Node fetches) get `403 Forbidden`.

This project’s free path is:

```text
Client → this API on your PC/VPS (Wrangler/workerd) → JetPhotos HTML → JSON
```

| Where you run it | Free? | Usually works? | Notes |
|------------------|-------|----------------|-------|
| **Your computer (recommended)** | yes | yes | Best option. Uses your residential network. |
| **VPS** | VPS may cost money | maybe | Some datacenter IPs get Cloudflare `403`. Test first. |
| **Cloudflare Workers edge deploy** | yes | often **no** | JetPhotos blocks many Worker edge requests. |

### Why Wrangler instead of plain Node?

On the same home network:

- plain `curl` / Node `fetch` → often Cloudflare **403**
- this app via **Wrangler/workerd** → often **works**

So the free server runtime is **Wrangler** (`workerd`), not a raw Node HTTP scraper and not a paid proxy.

---

## Requirements

- Node.js 18+
- npm
- Network access to `www.jetphotos.com`

## Quick start (local, free)

```bash
git clone https://github.com/roowus/Jetphotos-API.git
cd Jetphotos-API
npm install
npm start
```

Leave that terminal running. In another terminal:

```bash
# health
curl -s http://127.0.0.1:8787/health | jq .

# sample search
curl -s "http://127.0.0.1:8787/?page=1&sort-order=0&keywords=Boeing%20747&keywords-type=aircraft&keywords-contain=3" \
  | jq '{count, free: .meta.free, mode: .meta.mode, first: .photos[0].registration}'

# automated smoke test
npm run test:api
```

### Pass criteria

```json
{
  "count": 52,
  "free": true,
  "mode": "workerd-direct",
  "first": "N452PA"
}
```

Local base URL:

```text
http://127.0.0.1:8787
```

If health works but search returns `403`, your current IP is blocked by JetPhotos/Cloudflare. Try another network or VPS IP.

---

## API reference

### `GET /health`

```json
{
  "ok": true,
  "free": true,
  "mode": "workerd-direct"
}
```

### `GET /` or `GET /search`

#### Query parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number | `1` |
| `sort-order` | `0`=Recent, `1`=Views, `2`=Likes | `1` |
| `keywords` | Search term | `Boeing 747` |
| `keywords-type` | `all`, `aircraft`, `registration`, `photographer` | `aircraft` |
| `keywords-contain` | `0`=exact, `1`=starts, `2`=ends, `3`=contains | `3` |
| `aircraft` | Aircraft model filter | `Airbus A320` |
| `airline` | Airline filter | `Delta Air Lines` |
| `country` | Location filter | `United States` |
| `year` | Photo year | `2024` |
| `photographer` | Photographer filter | `John Doe` |
| `width` | Min width (px) | `1920` |
| `height` | Min height (px) | `1080` |

#### Example response

```json
{
  "photos": [
    {
      "photoId": "12345678",
      "registration": "N787BK",
      "aircraftType": "Boeing 787-8 Dreamliner",
      "airline": "United Airlines",
      "photographer": "John Smith",
      "location": "Los Angeles International Airport",
      "imageUrl": "https://cdn.jetphotos.com/full/6/12345678.jpg",
      "likes": "142",
      "views": "5847"
    }
  ],
  "count": 1,
  "meta": {
    "free": true,
    "mode": "workerd-direct",
    "provider": "local-workerd",
    "cached": false
  }
}
```

CORS is open (`Access-Control-Allow-Origin: *`).

---

## Hosting

### A) Local / home machine (free, best success rate)

```bash
npm install
npm start
```

Keep it running with one of:

```bash
# foreground
npm start

# or pm2
npm install -g pm2
pm2 start npm --name jetphotos-api -- start
pm2 save
```

#### Optional public URL from home (free tunnel)

```bash
# terminal 1
npm start

# terminal 2
cloudflared tunnel --url http://127.0.0.1:8787
```

Use the `https://...trycloudflare.com` URL as your public API.

---

### B) VPS (Hetzner, DigitalOcean, Oracle Free Tier, etc.)

> Your only cost is the VPS itself (can be $0 on free tiers). No scraper SaaS needed.

```bash
# on the VPS
sudo apt update
sudo apt install -y git nodejs npm
git clone https://github.com/roowus/Jetphotos-API.git
cd Jetphotos-API
npm install

# bind on all interfaces, port 8787
npm start
```

Test from the VPS:

```bash
curl -s "http://127.0.0.1:8787/?page=1&keywords=N787BA&keywords-type=registration&keywords-contain=0" | jq '.count,.error'
```

If you get Cloudflare `403` on the VPS:
- that VPS IP is blocked
- try another region/provider, or run at home instead

#### Nginx reverse proxy + HTTPS

```nginx
server {
    listen 80;
    server_name jetphotos-api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo certbot --nginx -d jetphotos-api.example.com
```

#### pm2 on VPS

```bash
sudo npm i -g pm2
pm2 start npm --name jetphotos-api -- start
pm2 save
pm2 startup
```

---

### C) Cloudflare Workers edge deploy (optional, often blocked)

This deploys the same Worker to `*.workers.dev`.

```bash
npm run deploy
```

Then:

```bash
curl -s "https://jetphotos-api.<your-subdomain>.workers.dev/health"
curl -s "https://jetphotos-api.<your-subdomain>.workers.dev/?page=1&keywords=Boeing%20747&keywords-type=aircraft&keywords-contain=3"
```

**Expect possible `403`** — JetPhotos frequently blocks Cloudflare edge IPs.  
If that happens, use **local** or **VPS** hosting instead. The code is the same; only the network path changes.

There is no free reliable way to scrape JetPhotos from Workers edge alone.

#### Recommended production setup

1. Run this API on a home machine or VPS where `npm start` returns photos
2. Put a reverse proxy or tunnel in front for HTTPS
3. Point your app at that URL
4. Skip edge deploy unless you confirm it works for your account/region

---

## Environment

| Name | Default | Where | Meaning |
|------|---------|-------|---------|
| `CACHE_TTL_SECONDS` | `21600` | `wrangler.toml` `[vars]` | Cache successful JSON for 6h |

---

## Project layout

```text
worker.js         # API + JetPhotos parser (free workerd runtime)
wrangler.toml     # local + deploy config
package.json      # npm start / deploy scripts
scripts/smoke-test.mjs
```

---

## Troubleshooting

### `Failed to fetch source data: 403 Forbidden`
Cloudflare blocked the current host IP.
1. Run locally at home (`npm start`)
2. Or move VPS region/provider
3. Edge `workers.dev` deploy is the least likely to work

### Local `npm start` works, deploy does not
Expected. Keep using self-host (local/VPS/tunnel). Don’t rely on edge deploy for JetPhotos.

### `count: 0`
Search may be empty, or JetPhotos HTML markup changed. Check `meta.targetUrl` in a browser.

---

## Notes

- Unofficial and not affiliated with JetPhotos
- Be polite: caching is enabled; avoid tight request loops
- Review JetPhotos terms before heavy/production use

## License

MIT
