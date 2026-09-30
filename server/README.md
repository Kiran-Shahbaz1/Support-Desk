# Server Boundary

Reserved for the future Node.js + Express backend. Keep HTTP composition in `src/app.js` and `src/server.js`; put business logic in feature modules under `src/modules` and integrations under `src/services`.

The server should expose versioned `/api/v1` routes and never be required by the current frontend until the adapter migration phase is ready.
