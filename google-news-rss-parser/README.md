# Remix Cloudflare Template

## Local Development

```sh
npm i

npm run dev
```

## Deploy to Cloudflare

```sh
npm run deploy
```

## Note

### Use "@remix-run/cloudflare" instead of "@remix-run/node"

This is an example error I faced.

```sh
    node_modules/cookie-signature/index.js:5:21:
      5 │ var crypto = require('crypto');

  The package "stream" wasn't found on the file system but is built into node. Are you trying to bundle for node? You can use "platform: 'node'" to do that, which will remove this error.
```

Using the wrangler requires using "@remix-run/cloudflare".