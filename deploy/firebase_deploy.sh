#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== AegisOSINT Firebase Hosting Deployment ==="

# Check firebase auth
if ! firebase projects:list >/dev/null 2>&1; then
    echo "[-] Error: Firebase CLI is not authenticated."
    echo "[*] Please run: firebase login (or firebase login --no-localhost)"
    exit 1
fi

PROJECT_ID=${1:-""}
if [ -z "$PROJECT_ID" ]; then
    echo "[*] Fetching available Firebase projects..."
    firebase projects:list
    echo ""
    echo "Usage: $0 <project-id>"
    echo "Example: $0 my-osint-project"
    exit 1
fi

echo "[*] Setting Firebase project to: $PROJECT_ID"
firebase use "$PROJECT_ID" 2>/dev/null || firebase use --add "$PROJECT_ID"

echo "[*] Ensuring latest frontend build..."
cd "$PROJECT_ROOT/frontend"
npm run build
cd "$PROJECT_ROOT"

echo "[*] Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo ""
echo "[✓] Deployment complete!"
echo "[*] Live Application URL: https://${PROJECT_ID}.web.app"
