# Star-Wars

A simple Star Wars image search app that uses HTML, CSS, and JavaScript.

## Features

- Clean static frontend with a prompt form
- Server proxy for DuckDuckGo image search
- Searches the web for Star Wars images matching your text description

## Setup

1. Install dependencies

```bash
npm install
```

2. Start the app

```bash
npm start
```

3. Open `http://localhost:8080` in your browser.

## Custom port

If you want to use a different port, set the `PORT` environment variable before starting the server:

```bash
PORT=5000 npm start
```

## Notes

This app searches DuckDuckGo for Star Wars images and does not require an API key. Do not commit any secret configuration to source control.

## Files

- `public/index.html` — app UI
- `public/styles.css` — styling
- `public/script.js` — frontend logic
- `server.js` — Express backend proxy to DuckDuckGo image search
- `package.json` — project metadata
