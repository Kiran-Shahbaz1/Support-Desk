# Feature Module Convention

Each backend module should eventually own its controller, service, repository/query layer, validation schemas, policy checks, and route registration. Keep cross-module integrations in `server/src/services` and background processing in `server/src/jobs`.
