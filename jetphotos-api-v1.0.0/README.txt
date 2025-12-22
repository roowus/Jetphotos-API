JetPhotos API v1.0.0
====================

Quick Start
-----------

1. Deploy this worker to Cloudflare Workers:

   wrangler deploy worker.js

2. Your API will be available at:
   https://your-worker-name.yourusername.workers.dev/

3. Test it:

   curl "https://your-worker-name.yourusername.workers.dev/?page=1&sort-order=1&keywords=Boeing%20747&keywords-type=aircraft&keywords-contain=3"


Documentation
-------------

Full documentation: https://jetphotos-api-docs.vercel.app/
GitHub repository: https://github.com/roowus/JetPhotos-API


Configuration
-------------

No configuration needed! Just deploy worker.js with Wrangler.

Optional: Edit wrangler.toml to customize:
- Worker name
- Environment settings
- Routes


License
-------

MIT License - Free to use and modify
