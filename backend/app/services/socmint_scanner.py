import asyncio
import time
from typing import List, Dict, Any, Optional
import httpx
from app.utils.user_agents import get_random_user_agent
from app.schemas.socmint import SocialProfileResult, UsernameScanResponse

PLATFORM_DEFINITIONS = [
    {
        "name": "GitHub",
        "category": "Development",
        "url": "https://github.com/{}",
        "check_type": "status_and_body",
        "error_string": "Not Found",
        "valid_status": [200]
    },
    {
        "name": "GitLab",
        "category": "Development",
        "url": "https://gitlab.com/{}",
        "check_type": "status_and_body",
        "error_string": "The page you're looking for could not be found",
        "valid_status": [200]
    },
    {
        "name": "Telegram",
        "category": "Messaging",
        "url": "https://t.me/{}",
        "check_type": "body_check",
        "error_string": "If you have <strong>Telegram</strong>, you can contact",
        "not_error_string": '<meta property="og:title" content="',
        "valid_status": [200]
    },
    {
        "name": "Reddit",
        "category": "Social",
        "url": "https://www.reddit.com/user/{}/about.json",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Keybase",
        "category": "Security",
        "url": "https://keybase.io/{}",
        "check_type": "status_and_body",
        "error_string": "404",
        "valid_status": [200]
    },
    {
        "name": "Medium",
        "category": "Blogging",
        "url": "https://medium.com/@{}",
        "check_type": "status_and_body",
        "error_string": "PAGE NOT FOUND",
        "valid_status": [200]
    },
    {
        "name": "HackerNews",
        "category": "Tech News",
        "url": "https://news.ycombinator.com/user?id={}",
        "check_type": "body_check",
        "error_string": "No such user",
        "valid_status": [200]
    },
    {
        "name": "Habr",
        "category": "Tech Community",
        "url": "https://habr.com/ru/users/{}/",
        "check_type": "status_and_body",
        "error_string": "Страница не найдена",
        "valid_status": [200]
    },
    {
        "name": "StackOverflow",
        "category": "Development",
        "url": "https://api.stackexchange.com/2.3/users?inname={}&site=stackoverflow",
        "check_type": "api_items",
        "valid_status": [200]
    },
    {
        "name": "DockerHub",
        "category": "DevOps",
        "url": "https://hub.docker.com/v2/users/{}/",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Dev.to",
        "category": "Development",
        "url": "https://dev.to/{}",
        "check_type": "status_and_body",
        "error_string": "404: Not Found",
        "valid_status": [200]
    },
    {
        "name": "ProductHunt",
        "category": "Startups",
        "url": "https://www.producthunt.com/@{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Behance",
        "category": "Design",
        "url": "https://www.behance.net/{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Dribbble",
        "category": "Design",
        "url": "https://dribbble.com/{}",
        "check_type": "status_and_body",
        "error_string": "Whoops, that page is gone",
        "valid_status": [200]
    },
    {
        "name": "Vimeo",
        "category": "Video",
        "url": "https://vimeo.com/{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "SoundCloud",
        "category": "Audio",
        "url": "https://soundcloud.com/{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Disqus",
        "category": "Discussion",
        "url": "https://disqus.com/by/{}/",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Replit",
        "category": "Development",
        "url": "https://replit.com/@{}",
        "check_type": "status_and_body",
        "error_string": "Not Found",
        "valid_status": [200]
    },
    {
        "name": "Codecademy",
        "category": "Education",
        "url": "https://www.codecademy.com/profiles/{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Pastebin",
        "category": "Code Sharing",
        "url": "https://pastebin.com/u/{}",
        "check_type": "status_and_body",
        "error_string": "Not Found",
        "valid_status": [200]
    },
    {
        "name": "Wikipedia",
        "category": "Encyclopedia",
        "url": "https://en.wikipedia.org/wiki/User:{}",
        "check_type": "body_check",
        "error_string": "user page does not exist",
        "valid_status": [200]
    },
    {
        "name": "Linktree",
        "category": "Bio Link",
        "url": "https://linktr.ee/{}",
        "check_type": "status_and_body",
        "error_string": "The page you’re looking for doesn’t exist",
        "valid_status": [200]
    },
    {
        "name": "BuyMeACoffee",
        "category": "Crowdfunding",
        "url": "https://www.buymeacoffee.com/{}",
        "check_type": "status_and_body",
        "error_string": "Page not found",
        "valid_status": [200]
    },
    {
        "name": "Patreon",
        "category": "Crowdfunding",
        "url": "https://www.patreon.com/{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Chess.com",
        "category": "Gaming",
        "url": "https://api.chess.com/pub/player/{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Substack",
        "category": "Blogging",
        "url": "https://{}.substack.com",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "itch.io",
        "category": "Gaming",
        "url": "https://{}.itch.io",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Pinterest",
        "category": "Social",
        "url": "https://www.pinterest.com/{}/",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Steam",
        "category": "Gaming",
        "url": "https://steamcommunity.com/id/{}/",
        "check_type": "body_check",
        "error_string": "The specified profile could not be found",
        "valid_status": [200]
    },
    {
        "name": "Spotify",
        "category": "Music",
        "url": "https://open.spotify.com/user/{}",
        "check_type": "status_code",
        "valid_status": [200]
    },
    {
        "name": "Kaggle",
        "category": "Data Science",
        "url": "https://www.kaggle.com/{}",
        "check_type": "status_code",
        "valid_status": [200]
    }
]

class SocmintScannerService:
    def __init__(self, concurrency: int = 15):
        self.semaphore = asyncio.Semaphore(concurrency)

    async def _check_platform(self, client: httpx.AsyncClient, p: dict, username: str) -> SocialProfileResult:
        target_url = p["url"].format(username)
        start_time = time.time()
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

        async with self.semaphore:
            try:
                resp = await client.get(target_url, headers=headers, follow_redirects=True, timeout=7.0)
                elapsed_ms = int((time.time() - start_time) * 1000)

                exists = False
                confidence = "HIGH"

                if p["check_type"] == "status_code":
                    if resp.status_code in p["valid_status"]:
                        exists = True
                elif p["check_type"] == "status_and_body":
                    if resp.status_code in p["valid_status"]:
                        err_str = p.get("error_string", "")
                        if err_str and err_str.lower() in resp.text.lower():
                            exists = False
                        else:
                            exists = True
                elif p["check_type"] == "body_check":
                    if resp.status_code == 200:
                        err_str = p.get("error_string", "")
                        not_err_str = p.get("not_error_string", "")
                        if err_str and err_str.lower() in resp.text.lower():
                            exists = False
                        elif not_err_str:
                            exists = not_err_str.lower() in resp.text.lower()
                        else:
                            exists = True
                elif p["check_type"] == "api_items":
                    if resp.status_code == 200:
                        data = resp.json()
                        items = data.get("items", [])
                        exists = len(items) > 0
                        confidence = "MEDIUM"

                return SocialProfileResult(
                    platform=p["name"],
                    category=p["category"],
                    url=target_url,
                    exists=exists,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    confidence=confidence
                )
            except Exception:
                elapsed_ms = int((time.time() - start_time) * 1000)
                return SocialProfileResult(
                    platform=p["name"],
                    category=p["category"],
                    url=target_url,
                    exists=False,
                    status_code=None,
                    response_time_ms=elapsed_ms,
                    confidence="LOW"
                )

    async def enrich_github(self, username: str) -> Optional[Dict[str, Any]]:
        url = f"https://api.github.com/users/{username}"
        headers = {
            "User-Agent": get_random_user_agent(),
            "Accept": "application/vnd.github.v3+json"
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "name": data.get("name"),
                        "company": data.get("company"),
                        "blog": data.get("blog"),
                        "location": data.get("location"),
                        "bio": data.get("bio"),
                        "twitter_username": data.get("twitter_username"),
                        "public_repos": data.get("public_repos"),
                        "public_gists": data.get("public_gists"),
                        "followers": data.get("followers"),
                        "created_at": data.get("created_at"),
                        "avatar_url": data.get("avatar_url")
                    }
        except Exception:
            pass
        return None

    async def scan_username(self, username: str, enrich_gh: bool = True) -> UsernameScanResponse:
        username = username.strip().lstrip("@")
        
        async with httpx.AsyncClient(verify=False) as client:
            tasks = [self._check_platform(client, p, username) for p in PLATFORM_DEFINITIONS]
            results = await asyncio.gather(*tasks)

        found = [r for r in results if r.exists]
        
        gh_data = None
        if enrich_gh:
            # If GitHub profile found or requested, perform public enrichment
            gh_data = await self.enrich_github(username)

        return UsernameScanResponse(
            username=username,
            total_checked=len(results),
            found_count=len(found),
            profiles=results,
            github_enrichment=gh_data
        )

