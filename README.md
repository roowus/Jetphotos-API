# ✈️ JetPhotos API

> Unofficial API for accessing aircraft photography data from JetPhotos.com

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/roowus/Jetphotos-API)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)

**📚 [View Full Documentation](https://jetphotos-api-docs.vercel.app/)** | **🚀 [Demo Endpoint](https://jp.rewis.workers.dev/)**

---

## Overview

The JetPhotos API is an unofficial API wrapper for JetPhotos.com that provides programmatic access to aircraft photography data. Built on Cloudflare Workers, it transforms publicly available HTML data into clean, structured JSON responses.

### Features

- 🚀 **Fast & Reliable** - Powered by Cloudflare's global edge network
- 📊 **Structured Data** - Clean JSON responses with photo URLs, metadata, and statistics
- 🔍 **Flexible Search** - Query by registration, aircraft type, airline, location, photographer, and more
- 🌐 **CORS Enabled** - Ready for browser-based applications
- 💰 **Free & Open Source** - No authentication required

---

## 📖 Documentation

For complete API documentation with interactive examples, visit:

### **[https://jetphotos-api-docs.vercel.app/](https://jetphotos-api-docs.vercel.app/)**

The documentation includes:
- Quick start guide
- Complete parameter reference
- Code examples in multiple languages (curl, JavaScript, Python)
- Response format documentation
- Error handling guide

---

## 🚀 Quick Start

### Using the Public Demo

The fastest way to get started is using the demo endpoint:

```bash
curl "https://jp.rewis.workers.dev/?page=1&sort-order=1&keywords=Boeing%20747&keywords-type=aircraft&keywords-contain=3"
```

**⚠️ Note:** The demo endpoint is unstable and may have rate limits. For production use, deploy your own instance.

### JavaScript Example

```javascript
fetch('https://jp.rewis.workers.dev/?page=1&sort-order=1&keywords=N787BK&keywords-type=registration&keywords-contain=0')
  .then(response => response.json())
  .then(data => {
    console.log(`Found ${data.count} photos`);
    data.photos.forEach(photo => {
      console.log(`${photo.registration} - ${photo.aircraftType}`);
    });
  })
  .catch(error => console.error('Error:', error));
```

### Python Example

```python
import requests

url = "https://jp.rewis.workers.dev/"
params = {
    "page": 1,
    "sort-order": 1,
    "keywords": "Boeing 747",
    "keywords-type": "aircraft",
    "keywords-contain": 3
}

response = requests.get(url, params=params)
data = response.json()

print(f"Found {data['count']} photos")
for photo in data['photos']:
    print(f"{photo['registration']} - {photo['aircraftType']}")
```

---

## 📦 Source Code & Releases

### Downloading the Source Code

The complete source code for this API is available in this repository:

- **Main Worker Code:** [`worker.js`](worker.js) - The core Cloudflare Worker implementation
- **Latest Release:** Check the [Releases](https://github.com/roowus/Jetphotos-API/releases) page for stable versions with release notes
- **Clone Repository:**
  ```bash
  git clone https://github.com/roowus/Jetphotos-API.git
  cd Jetphotos-API
  ```

### What's Included

- `worker.js` - Complete API implementation with HTML parsing
- `wrangler.toml` - Cloudflare Workers configuration
- Full documentation and examples
- MIT License - free to use and modify

---

## 🛠️ Deploy Your Own Instance

For better performance and reliability, deploy your own Cloudflare Worker:

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Node.js](https://nodejs.org/) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1. **Download the source code**

   Choose one of these methods:
   - Download from [Latest Release](https://github.com/roowus/Jetphotos-API/releases/latest)
   - Or clone the repository:
     ```bash
     git clone https://github.com/roowus/Jetphotos-API.git
     cd Jetphotos-API
     ```

2. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

3. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

4. **Deploy the worker**
   ```bash
   wrangler deploy
   ```

Your worker will be available at `https://your-worker-name.yourusername.workers.dev/`

---

## 📋 API Reference

### Base URLs

- **Demo (Unstable):** `https://jp.rewis.workers.dev/`
- **Self-Deployed:** `https://your-worker-name.yourusername.workers.dev/`

### Endpoint

**GET /** - Main search endpoint

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | integer | ✅ Yes | Page number for pagination | `1`, `2`, `10` |
| `sort-order` | string | ✅ Yes | Sort order (`0`=Recent, `1`=Views, `2`=Likes) | `1` |
| `keywords` | string | No | Search keywords | `Boeing 747`, `N123AA` |
| `keywords-type` | string | No | Search field (`all`, `aircraft`, `registration`, `photographer`) | `aircraft` |
| `keywords-contain` | string | No | Match type (`0`=exact, `1`=starts, `2`=ends, `3`=contains) | `3` |
| `aircraft` | string | No | Aircraft model filter | `Airbus A320` |
| `airline` | string | No | Airline filter | `Delta Air Lines` |
| `country` | string | No | Country/location filter | `United States` |
| `year` | string | No | Photo year filter | `2024` |
| `photographer` | string | No | Photographer filter | `John Doe` |
| `width` | integer | No | Minimum image width (pixels) | `1920` |
| `height` | integer | No | Minimum image height (pixels) | `1080` |

### Response Format

```json
{
  "photos": [
    {
      "photoId": "12345678",
      "thumbnailUrl": "https://cdn.jetphotos.com/400/6/12345678.jpg",
      "imageUrl": "https://cdn.jetphotos.com/full/6/12345678.jpg",
      "photoPageUrl": "https://www.jetphotos.com/photo/12345678",
      "registration": "N787BK",
      "registrationUrl": "https://www.jetphotos.com/registration/N787BK",
      "aircraftType": "Boeing 787-8 Dreamliner",
      "airline": "United Airlines",
      "airlineUrl": "https://www.jetphotos.com/airline/United-Airlines",
      "photographer": "John Smith",
      "photographerUrl": "https://www.jetphotos.com/photographer/12345",
      "location": "Los Angeles International Airport",
      "locationUrl": "https://www.jetphotos.com/airport/KLAX",
      "photoDate": "2024-03-15",
      "uploadedDate": "2024-03-16",
      "likes": "142",
      "comments": "23",
      "views": "5847"
    }
  ],
  "count": 1
}
```


## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---


<div align="center">

**Made with ❤️ by aviation enthusiasts**

[⭐ Star this repo](https://github.com/roowus/Jetphotos-API) if you find it useful!

</div>
