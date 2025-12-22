# JetPhotos API

Unofficial API for JetPhotos.com aircraft photo data. Built on Cloudflare Workers.

## Documentation

Full documentation and interactive query builder: [jetphotos-api-docs.vercel.app](https://jetphotos-api-docs.vercel.app/)

## Getting Started

Deploy to Cloudflare Workers:

```bash
wrangler deploy worker.js
```

Your API will be available at `https://your-worker-name.yourusername.workers.dev/`

## Example

```bash
curl "https://your-worker.workers.dev/?page=1&sort-order=1&keywords=Boeing%20747&keywords-type=aircraft&keywords-contain=3"
```

## Features

- Search by registration, aircraft type, airline, location, photographer
- Structured JSON responses
- CORS enabled
- No authentication required

## Response Format

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
  "count": 1
}
```

## Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number (required) | `1` |
| `sort-order` | `0`=Recent, `1`=Views, `2`=Likes (required) | `1` |
| `keywords` | Search term | `Boeing 747` |
| `keywords-type` | `all`, `aircraft`, `registration`, `photographer` | `aircraft` |
| `keywords-contain` | `0`=exact, `1`=starts, `2`=ends, `3`=contains | `3` |
| `aircraft` | Filter by aircraft model | `Airbus A320` |
| `airline` | Filter by airline | `Delta Air Lines` |
| `country` | Filter by location | `United States` |
| `year` | Filter by photo year | `2024` |
| `photographer` | Filter by photographer | `John Doe` |
| `width` | Minimum image width (pixels) | `1920` |
| `height` | Minimum image height (pixels) | `1080` |

## License

MIT
