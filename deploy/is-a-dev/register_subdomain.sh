#!/bin/bash
set -e

echo "=== .is-a.dev Automated Subdomain Registration ==="

# Check gh authentication
if ! gh auth status >/dev/null 2>&1; then
    echo "[-] Error: GitHub CLI is not authenticated."
    echo "[*] Please run: gh auth login"
    exit 1
fi

GH_USER=$(gh api user -q .login)
GH_EMAIL=$(gh api user -q .email)
if [ "$GH_EMAIL" = "null" ] || [ -z "$GH_EMAIL" ]; then
    GH_EMAIL="${GH_USER}@users.noreply.github.com"
fi

SUBDOMAIN=${1:-"aegisosint"}
CNAME_TARGET=${2:-""}

if [ -z "$CNAME_TARGET" ]; then
    echo "Usage: $0 <subdomain> <firebase-project-id.web.app>"
    echo "Example: $0 aegis my-osint-app.web.app"
    exit 1
fi

echo "[+] Authenticated as GitHub user: $GH_USER ($GH_EMAIL)"
echo "[+] Target subdomain: ${SUBDOMAIN}.is-a.dev"
echo "[+] CNAME Destination: $CNAME_TARGET"

WORK_DIR="/tmp/is-a-dev-reg-$$"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo "[*] Forking and cloning is-a-dev/register..."
gh repo fork is-a-dev/register --clone --remote
cd register

BRANCH_NAME="add-${SUBDOMAIN}"
git checkout -b "$BRANCH_NAME"

cat <<EOF > "domains/${SUBDOMAIN}.json"
{
  "owner": {
    "username": "$GH_USER",
    "email": "$GH_EMAIL"
  },
  "records": {
    "CNAME": "$CNAME_TARGET"
  }
}
EOF

git add "domains/${SUBDOMAIN}.json"
git commit -m "feat(domain): register ${SUBDOMAIN}.is-a.dev"
git push origin "$BRANCH_NAME"

echo "[*] Creating Pull Request to is-a-dev/register..."
gh pr create \
    --repo is-a-dev/register \
    --title "Register ${SUBDOMAIN}.is-a.dev" \
    --body "Registration of ${SUBDOMAIN}.is-a.dev pointing to $CNAME_TARGET for AegisOSINT platform."

echo "[✓] Subdomain registration PR successfully submitted!"
echo "[*] Track your PR at: https://github.com/is-a-dev/register/pulls"
rm -rf "$WORK_DIR"

