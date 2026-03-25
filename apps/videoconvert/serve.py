#!/usr/bin/env python3
"""Local dev server. COOP/COEP headers are handled by the coi-serviceworker."""
import http.server, sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"Serving on http://localhost:{port}")
print("Note: On first load, the page will reload once to activate the service worker.")
http.server.HTTPServer(("", port), http.server.SimpleHTTPRequestHandler).serve_forever()
