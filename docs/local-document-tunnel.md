# Local document tunnel (testing the per-owner document broker)

The document broker (`src/app/api/profile/document/[model]/[id]/route.ts`) streams
invoice/DDT PDFs from the **internal overlay** `http://vinc-tunnelgw:28000`, which
lives on the prod `prod_traefik_public` docker network. That host is **not
reachable from a laptop** — `vinc-tunnelgw` only resolves inside that network, and
the public `https://<host>/documenti-clienti/…` route is closed (403).

So `pnpm dev` on your machine can validate auth/ownership but cannot fetch the
file (you'll see the friendly **502 "Documento non disponibile"** page). To stream
real PDFs locally, bridge into the overlay and point the broker at it via the
optional `DOCUMENTI_CLIENTI_BASE` override.

## Setup

The default (prod) value is baked into the route
(`DEFAULT_DOCUMENTI_CLIENTI_BASE = 'http://vinc-tunnelgw:28000'`). Locally you
override it with an env var pointing at a tunnel.

1. **On the prod host (`vinc-2`)** — run a socat bridge that joins the overlay
   network and exposes the overlay on a host-local port:

   ```bash
   ssh vinc-2 'sudo docker run -d --restart=unless-stopped \
     --name dbg-docfwd --network prod_traefik_public \
     -p 127.0.0.1:28001:28000 \
     alpine/socat tcp-listen:28000,fork,reuseaddr tcp:vinc-tunnelgw:28000'
   ```

   (`--network prod_traefik_public` is what lets socat resolve `vinc-tunnelgw`.)

2. **From your laptop** — forward your local `28000` to that host port over SSH:

   ```bash
   ssh -N -L 28000:127.0.0.1:28001 vinc-2
   ```

   Leave this running (or add `-f` to background it).

3. **In `vinc-b2b/.env`** (gitignored) set the override and restart `pnpm dev`:

   ```bash
   DOCUMENTI_CLIENTI_BASE=http://localhost:28000
   ```

4. **Verify** the chain:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' http://localhost:28000/__vinc_health   # → 200
   ```

   Then open a document link in the app (`/it/account/documents`) — the PDF should
   stream inline instead of the 502 page.

## Teardown

```bash
# stop the SSH forward (Ctrl-C the ssh -N, or kill the backgrounded job)
ssh vinc-2 'sudo docker rm -f dbg-docfwd'
# remove the override from .env so dev falls back to the in-code default
```

## Notes

- Prod needs **no** config — the default base is in code; do **not** wire
  `DOCUMENTI_CLIENTI_BASE` through `build-docker.sh` / Dockerfile / `.env.deploy.*`.
- The broker only ever uses the **path** of the record's file URL (after
  `/documenti-clienti`); the record's host is never fetched. So the tunnel just
  needs to reach the overlay file root.
- See `memory/document-ownership-broker.md` for the full ownership/overlay contract.
