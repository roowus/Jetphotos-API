# Creating the GitHub Release

Since the `gh` CLI isn't installed, please create the release manually:

## Steps

1. Go to https://github.com/roowus/JetPhotos-API/releases/new
2. Fill in the form:
   - **Tag version:** `v1.0.0`
   - **Release title:** `v1.0.0 - Initial Release`
   - **Description:** Copy the content below

## Release Description

```markdown
## 🎉 Initial Release

This is the first official release of the JetPhotos API!

### What's Included

- **worker.js** - Complete Cloudflare Worker implementation
- **wrangler.toml** - Cloudflare Workers configuration
- Full documentation and deployment instructions

### Features

- ✈️ Search aircraft photos by registration, type, airline, location, and more
- 🚀 Fast & reliable on Cloudflare's edge network
- 📊 Structured JSON responses
- 🌐 CORS enabled for browser applications
- 💰 Free & open source (MIT License)

### Getting Started

1. Download the source code from this release
2. Follow the [deployment instructions](https://github.com/roowus/Jetphotos-API#-deploy-your-own-instance) in the README
3. Deploy to your own Cloudflare Workers account

### Documentation

- 📚 [Full API Documentation](https://jetphotos-api-docs.vercel.app/)
- 📖 [README](https://github.com/roowus/Jetphotos-API/blob/main/README.md)

---

**Note:** This is an unofficial API. For production use, please deploy your own instance.
```

3. Click "Publish release"

After creating the release, you can delete this file.
