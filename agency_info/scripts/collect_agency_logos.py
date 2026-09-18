"""Colab/offline enrichment tool; never changes application assets or source JSON.

Install: pip install requests beautifulsoup4 pillow ddgs
Run: python collect_agency_logos.py
Settings are below the imports. Missing website checklists are created automatically.
Repository inputs and selected images stay in agency_info. Generated results and
cache go to the system temporary directory, not the repository. For Colab, place
the input JSON files beside the uploaded script.

Missing websites are searched automatically. Discovered websites and PJH matches
remain unverified candidates. The CSV optionally overrides discovery with websites
you checked yourself (website_url and website_verified=yes).
Only crawl sources whose terms permit collection. robots.txt is also respected.
SVGs and JavaScript-only sites are left for manual review; no browser is launched.
"""

from types import SimpleNamespace
import csv
import hashlib
import html
import io
import ipaddress
import json
from pathlib import Path
import re
import socket
import time
import tempfile
import unicodedata
from urllib.parse import quote_plus, urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from PIL import Image

# Editable settings. Zero attempts every grouped agency, including missing sources.
AGENCY_LIMIT = 0
AUTO_DISCOVER = True
SEARCH_DELAY_SECONDS = 5
SEARCH_BACKEND = "duckduckgo"
SCRIPT_DIR = Path(__file__).resolve().parent


def find_data_dir(script_dir):
    """Find the repository's canonical snapshots regardless of working directory.

    Standalone/Colab uploads use JSON files beside the script. Never prefer a
    stray tool-local copy over the repository's canonical agency_info folder.
    """
    return next((parent / "agency_info" for parent in script_dir.parents
                 if (parent / "agency_info").is_dir()), script_dir)


DATA_DIR = find_data_dir(SCRIPT_DIR)
WORK_DIR = Path(tempfile.gettempdir()) / "r2h-agency-data"
MOTAC_FILE = DATA_DIR / "motac_umrah_agencies.json"
PJH_FILE = DATA_DIR / "pjh_1448H_2027M.json"
WEBSITES_FILE = SCRIPT_DIR / "agency_websites.csv"
OUTPUT_DIR = WORK_DIR / "agency_logo_review"
CACHE_DIR = WORK_DIR / "agency_logo_cache"

AGENT = "R2HLogoCollector/1.0"
MAX_BYTES = 5 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 16_000_000


def save_json(path, value):
    """Checkpoint tool-owned state atomically; never write to input datasets."""
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


class WebsiteSearch:
    """Search once per normalized name, caching results for seven days.

    A search error stops further search requests this run (no backend switching,
    proxies or CAPTCHA bypass). Cached results remain usable. Nothing is verified
    automatically and the user's website CSV is never rewritten.
    """

    def __init__(self, cache_dir):
        from ddgs import DDGS
        self.engine = DDGS(timeout=15)
        self.directory = cache_dir / "search"
        self.directory.mkdir(parents=True, exist_ok=True)
        self.last_search = 0
        self.stopped = ""
        self.memory = {}

    def find(self, agency):
        key = normalized_name(agency["company_name"])
        if key in self.memory:
            return self.memory[key]
        path = self.directory / (hashlib.sha256(key.encode()).hexdigest() + ".json")
        if path.exists() and time.time() - path.stat().st_mtime < 7 * 86400:
            try:
                result = json.loads(path.read_text(encoding="utf-8"))
                self.memory[key] = result
                return result
            except (ValueError, OSError):
                pass
        if self.stopped:
            return {"status": "search_paused", "error": self.stopped, "results": []}
        name = re.sub(r"\bsdn\.?\s*bhd\.?", "", agency["company_name"], flags=re.I).strip()
        query = f'{name} Malaysia'
        time.sleep(max(0, SEARCH_DELAY_SECONDS - (time.monotonic() - self.last_search)))
        self.last_search = time.monotonic()
        try:
            print("  Searching for website...", flush=True)
            hits = self.engine.text(query, max_results=5, backend=SEARCH_BACKEND)
            results = [{"url": hit.get("href", ""), "title": hit.get("title", ""),
                        "description": hit.get("body", "")} for hit in hits]
            result = {"status": "search_results" if results else "search_no_results",
                      "query": query, "results": results}
            save_json(path, result)
        except Exception as error:
            # DDGS uses an exception for an empty result set as well as failures.
            # An empty query result must not disable discovery for other agencies.
            if str(error).strip() == "No results found.":
                result = {"status": "search_no_results", "query": query, "results": []}
                save_json(path, result)
            else:
                self.stopped = f"Search unavailable ({type(error).__name__}); retry on a later run."
                print("  " + self.stopped, flush=True)
                result = {"status": "search_failed", "error": self.stopped, "results": []}
        self.memory[key] = result
        return result


def agency_site_candidate(url):
    """Exclude obvious directories/social sites; this is not identity verification."""
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").lower()
        excluded = ("facebook.com", "instagram.com", "tiktok.com", "youtube.com", "linkedin.com",
                    "google.com", "duckduckgo.com", "bing.com", "tripadvisor.com", "wikipedia.org",
                    "motac.gov.my", "matta.org.my", "yellowpages.my", "businesslist.my",
                    "findglocal.com", "wukuf.my", "yelp.com")
        return (parsed.scheme in ("http", "https") and bool(host)
                and not parsed.username and not parsed.password
                and not any(host == domain or host.endswith("." + domain) for domain in excluded)
                and not parsed.path.lower().endswith((".pdf", ".jpg", ".png", ".zip")))
    except ValueError:
        return False


def page_matches_agency(body, agency):
    """Conservative name signal, not proof of ownership or licence validity."""
    soup = BeautifulSoup(body, "html.parser")
    words = re.findall(r"[a-z0-9]+", agency["company_name"].lower())
    generic = {"sdn", "bhd", "sendirian", "berhad", "travel", "travels", "tour", "tours",
               "and", "services", "service", "holidays", "holiday", "malaysia", "m"}
    brand = [word for word in words if word not in generic]
    if not brand:
        return False
    heading = " ".join(tag.get_text(" ", strip=True) for tag in soup.select("title, h1"))
    heading_words = set(re.findall(r"[a-z0-9]+", heading.lower()))
    if set(brand).issubset(heading_words):
        return True
    for tag in soup.select("script, style"):
        tag.decompose()
    return normalized_name(agency["company_name"]) in normalized_name(soup.get_text(" "))


def normalized_name(value):
    """Conservative matching only: do not remove meaningful brand words."""
    value = unicodedata.normalize("NFKC", value).lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]", "", value)


def agency_key(agency):
    """Group only matching licence AND name; do not merge merely similar brands."""
    identity = f"{agency['license_no']}:{normalized_name(agency['company_name'])}"
    return hashlib.sha256(identity.encode()).hexdigest()[:20]


def public_url(url):
    """Reject credentials and non-public destinations, including redirect targets."""
    parsed = urlsplit(url)
    if (parsed.scheme not in ("http", "https") or not parsed.hostname
            or parsed.username or parsed.password or parsed.port not in (None, 80, 443)):
        raise ValueError("Not a public HTTP(S) URL")
    addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443)
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("Non-public destination")
    return url


class Fetcher:
    """Bounded requests, conservative robots handling, and per-origin pacing.

    Robots failures and blocked pages are skipped, never bypassed. This is a
    local research tool, not a public URL-fetching service. Discovered sites are
    candidates only, and private destinations are rejected before requests.
    """

    def __init__(self, cache_dir=None):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = AGENT
        self.robots = {}
        self.last_request = {}
        self.cache_dir = cache_dir
        self.failures = {}
        self.blocked_origins = set()
        if cache_dir:
            cache_dir.mkdir(parents=True, exist_ok=True)

    def raw(self, url, delay=1.5):
        public_url(url)
        parsed = urlsplit(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin in self.blocked_origins:
            raise ValueError("Origin blocked earlier this run; no further requests")
        time.sleep(max(0, delay - (time.monotonic() - self.last_request.get(origin, 0))))
        self.last_request[origin] = time.monotonic()
        with self.session.get(url, timeout=(10, 20), allow_redirects=False, stream=True) as response:
            if response.status_code in (403, 429):
                self.blocked_origins.add(origin)
            chunks = bytearray()
            started = time.monotonic()
            for chunk in response.iter_content(16384):
                chunks.extend(chunk)
                if len(chunks) > MAX_BYTES or time.monotonic() - started > 40:
                    raise ValueError("Response exceeds size/time limit")
            return response.status_code, dict(response.headers), bytes(chunks)

    def policy(self, url):
        parsed = urlsplit(url)
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in self.robots:
            # Redirected robots files are conservatively skipped for manual review.
            status, _, body = self.raw(origin + "/robots.txt")
            parser = RobotFileParser()
            if status in (404, 410):
                parser.parse([])
            elif status == 200:
                parser.parse(body.decode("utf-8", errors="replace").splitlines())
            else:
                raise ValueError(f"robots.txt unavailable ({status}); manual review needed")
            self.robots[origin] = parser
        parser = self.robots[origin]
        if not parser.can_fetch(AGENT, url):
            raise ValueError("Disallowed by robots.txt")
        delay = max(1.5, parser.crawl_delay(AGENT) or 0)
        rate = parser.request_rate(AGENT)
        if rate and rate.requests:
            delay = max(delay, rate.seconds / rate.requests)
        if delay > 60:
            raise ValueError("Site requests long crawl delay; manual review needed")
        return delay

    def get(self, url):
        """Reuse successful responses for seven days, and failures for this run."""
        if url in self.failures:
            raise ValueError(self.failures[url])
        cache = None
        if self.cache_dir:
            cache = self.cache_dir / (hashlib.sha256(url.encode()).hexdigest() + ".json")
            payload = cache.with_suffix(".bin")
            if cache.exists() and payload.exists() and time.time() - cache.stat().st_mtime < 7 * 86400:
                try:
                    metadata = json.loads(cache.read_text(encoding="utf-8"))
                    return metadata["url"], metadata["headers"], payload.read_bytes()
                except (ValueError, OSError, KeyError):
                    pass
        try:
            result = self.fetch_uncached(url)
            if cache:
                payload.write_bytes(result[2])
                save_json(cache, {"url": result[0], "headers": result[1]})
            return result
        except Exception as error:
            self.failures[url] = str(error)
            raise

    def fetch_uncached(self, url):
        for _ in range(6):
            public_url(url)
            status, headers, body = self.raw(url, self.policy(url))
            if status in (301, 302, 303, 307, 308):
                url = urljoin(url, headers.get("Location", ""))
                continue
            if status != 200:
                raise ValueError(f"HTTP {status}")
            return url, headers, body
        raise ValueError("Too many redirects")


def logo_candidates(body, page_url):
    """Rank HTML hints, not identity confidence. Every result requires review."""
    soup = BeautifulSoup(body, "html.parser")
    found = []

    def add(value, reason):
        if isinstance(value, dict):
            value = value.get("url") or value.get("contentUrl")
        if isinstance(value, str) and value.strip():
            url = urljoin(page_url, value.strip())
            if urlsplit(url).scheme in ("http", "https"):
                found.append((url, reason))

    def walk(value):
        if isinstance(value, dict):
            if "logo" in value:
                logos = value["logo"]
                for logo in logos if isinstance(logos, list) else [logos]:
                    add(logo, "structured-data logo")
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    for script in soup.select('script[type="application/ld+json"]'):
        try:
            walk(json.loads(script.get_text()))
        except (ValueError, RecursionError):
            continue
    for img in soup.find_all("img"):
        label = " ".join(str(img.get(attr, "")) for attr in ("src", "alt", "class", "id"))
        if "logo" in label.lower():
            add(img.get("data-src") or img.get("src"), "image tagged logo")
    for img in soup.select("header img, footer img"):
        add(img.get("data-src") or img.get("src"), "header/footer image; low confidence")
    # Social preview images often contain banners rather than logos.
    for meta in soup.select('meta[property="og:image"]'):
        add(meta.get("content"), "social preview; low confidence")
    unique = {}
    for url, reason in found:
        unique.setdefault(url, reason)
    return list(unique.items())[:8]


def collect(args):
    """Produce separate, unapproved candidates and provenance; preserve inputs."""
    source = json.loads(Path(args.motac).read_text(encoding="utf-8-sig"))
    agencies = {}
    for agency in source["agencies"]:
        agencies.setdefault(agency_key(agency), agency)
    if args.prepare:
        target = Path(args.websites)
        target.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive creation prevents overwriting manually verified website work.
        with target.open("x", newline="", encoding="utf-8-sig") as stream:
            writer = csv.DictWriter(stream, fieldnames=["agency_key", "license_no", "company_name",
                                                        "website_url", "website_verified", "search_url"])
            writer.writeheader()
            for key, agency in agencies.items():
                query = quote_plus(f'"{agency["company_name"]}" official website Malaysia')
                writer.writerow({"agency_key": key, "license_no": agency["license_no"],
                                 "company_name": agency["company_name"], "website_url": "",
                                 "website_verified": "no", "search_url": "https://www.google.com/search?q=" + query})
        print(f"Created {target}: {len(agencies)} grouped agencies. Manual website overrides are optional.")
        return

    websites = {}
    if Path(args.websites).exists():
        with Path(args.websites).open(encoding="utf-8-sig", newline="") as stream:
            websites = {row["agency_key"]: row for row in csv.DictReader(stream)}
    pjh = {}
    if Path(args.pjh).exists():
        for agency in json.loads(Path(args.pjh).read_text(encoding="utf-8-sig"))["pjh"]:
            pjh.setdefault(normalized_name(agency["company_name"]), []).append(agency["logo_url"])
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=False)
    (output / "images").mkdir()
    cache_dir = Path(getattr(args, "cache_dir", output.parent / "agency_logo_cache"))
    fetcher = Fetcher(cache_dir / "http")
    discovery = WebsiteSearch(cache_dir) if getattr(args, "discover", False) else None
    records = []
    processed = 0
    for key, agency in agencies.items():
        row = {"agency_key": key, "license_no": agency["license_no"],
               "company_name": agency["company_name"], "status": "needs_website",
               "website_url": "", "candidates": [], "errors": []}
        records.append(row)
        urls = [(url, "PJH normalized-name match; verify identity")
                for url in pjh.get(normalized_name(agency["company_name"]), [])]
        website = websites.get(key, {})
        verified = website.get("website_verified", "").strip().lower() == "yes"
        page_url = website.get("website_url", "").strip() if verified else ""
        if args.limit and processed >= args.limit:
            row["status"] = "not_processed_limit"
            continue
        processed += 1
        print(f"[{processed}/{len(agencies)}] {agency['company_name']}", flush=True)
        row["status"] = "no_downloadable_candidates"
        row["website_verified"] = verified
        if not urls and not page_url:
            row["status"] = "needs_website"
            if discovery:
                search = discovery.find(agency)
                row["discovery"] = search
                row["status"] = search["status"]
                if search.get("error"):
                    row["errors"].append(search["error"])
                for hit in [hit for hit in search["results"] if agency_site_candidate(hit["url"])][:3]:
                    try:
                        final_url, _, body = fetcher.get(hit["url"])
                        if not agency_site_candidate(final_url) or not page_matches_agency(body, agency):
                            row["errors"].append(f"Name signal absent on candidate: {hit['url']}")
                            continue
                        discovered = logo_candidates(body, final_url)
                        if not discovered:
                            row["errors"].append(f"No logo references on candidate: {final_url}")
                            continue
                        row["website_url"] = final_url
                        row["website_evidence"] = "Automatic name match only; ownership unverified"
                        row["status"] = "no_downloadable_candidates"
                        urls.extend((url, "Discovered site (unverified): " + reason) for url, reason in discovered)
                        break
                    except Exception as error:
                        row["errors"].append(f"Candidate website: {type(error).__name__}: {error}")
                if row["status"] == "search_results":
                    row["status"] = "no_matching_website"
        if page_url:
            row["website_url"] = page_url
            try:
                final_url, _, body = fetcher.get(page_url)
                row["website_url"] = final_url
                urls.extend(logo_candidates(body, final_url))
            except Exception as error:
                row["errors"].append(f"Website: {type(error).__name__}: {error}")
        for index, (url, reason) in enumerate(dict(urls).items()):
            candidate = {"source_url": url, "reason": reason, "status": "download_failed"}
            row["candidates"].append(candidate)
            try:
                final_url, _, body = fetcher.get(url)
                # Re-encode raster images: do not render downloaded HTML or active SVG.
                with Image.open(io.BytesIO(body)) as original:
                    if original.width * original.height > Image.MAX_IMAGE_PIXELS:
                        raise ValueError("Image too large")
                    if min(original.size) < 24:
                        raise ValueError("Image too small")
                    original.load()
                    converted = original.convert("RGBA")
                    converted.thumbnail((800, 800))
                    filename = f"images/{key}-{index}.png"
                    converted.save(output / filename)
                candidate.update(status="needs_review", file=filename, source_url=final_url)
                row["status"] = "needs_review"
            except Exception as error:
                candidate["error"] = f"{type(error).__name__}: {error}"
        # Checkpoint after each processed agency for interruptible Colab runs.
        print(f"  {row['status']} ({sum(c['status'] == 'needs_review' for c in row['candidates'])} images)", flush=True)
        save_json(output / "manifest.json", records)
    (output / "manifest.json").write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
    with (output / "discovered_websites.csv").open("w", newline="", encoding="utf-8-sig") as stream:
        fields = ["agency_key", "license_no", "company_name", "website_url", "website_verified", "status"]
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in records:
            writer.writerow({**row, "website_verified": "yes" if row.get("website_verified") else "no"})
    cards = []
    for row in records:
        items = []
        if row["website_url"]:
            items.append(f'<p>Website (review identity): {html.escape(row["website_url"])}</p>')
        if row["errors"]:
            items.append('<details><summary>Collection details / errors</summary><ul>'
                         + "".join(f'<li>{html.escape(error)}</li>' for error in row["errors"]) + '</ul></details>')
        for candidate in row["candidates"]:
            if candidate["status"] == "needs_review":
                items.append(f'<figure><img src="{html.escape(candidate["file"])}" alt="Candidate logo">'
                             f'<figcaption>{html.escape(candidate["reason"])}<br>'
                             f'<a href="{html.escape(candidate["source_url"], quote=True)}">Source</a>'
                             f'<br>{html.escape(candidate["file"])}</figcaption></figure>')
        cards.append(f'<section><h2>{html.escape(row["company_name"])}</h2>'
                     f'<p>Licence: {html.escape(str(row["license_no"]))} — {row["status"]}</p>'
                     + "".join(items) + '</section>')
    (output / "review.html").write_text('<!doctype html><meta charset="utf-8"><title>Logo review</title>'
        '<style>body{font:16px system-ui;margin:24px}section{border-bottom:1px solid #ccc;padding:16px}'
        'figure{display:inline-block;vertical-align:top;width:240px;margin:12px}img{width:220px;height:120px;'
        'object-fit:contain;background:#eee}figcaption{overflow-wrap:anywhere}</style>'
        '<h1>Agency logo candidates — none approved</h1><p>Verify agency identity, image and reuse permission. '
        'Record approved filenames separately; this gallery does not save selections.</p>' + "".join(cards), encoding="utf-8")
    print(f"Finished: {output}/review.html and manifest.json. No application files changed.")
    for status in sorted({row["status"] for row in records}):
        print(f"  {status}: {sum(row['status'] == status for row in records)}")


def main():
    """Run without CLI arguments; preserve checklists and previous result folders."""
    if not MOTAC_FILE.is_file():
        raise SystemExit(f"Missing input: {MOTAC_FILE}. Put the JSON beside the script in Colab.")
    if AUTO_DISCOVER:
        try:
            import ddgs  # noqa: F401 - fail before output creation if dependency is missing
        except ImportError:
            raise SystemExit("Automatic search needs ddgs. Install once: python -m pip install ddgs") from None
    output = OUTPUT_DIR
    suffix = 2
    while output.exists():
        output = OUTPUT_DIR.with_name(f"{OUTPUT_DIR.name}_{suffix}")
        suffix += 1
    settings = SimpleNamespace(motac=MOTAC_FILE, pjh=PJH_FILE, websites=WEBSITES_FILE,
                               output=output, limit=AGENCY_LIMIT, prepare=False,
                               discover=AUTO_DISCOVER, cache_dir=CACHE_DIR)
    print(f"Using agency data: {MOTAC_FILE}")
    print(f"Temporary results and cache: {WORK_DIR}")
    if not WEBSITES_FILE.exists():
        settings.prepare = True
        collect(settings)
        settings.prepare = False
    print(f"Website checklist: {WEBSITES_FILE}")
    print(f"Automatic website discovery: {'ON' if AUTO_DISCOVER else 'OFF'}. Limit: {AGENCY_LIMIT or 'ALL'}")
    print("Every discovered website/logo needs review. Search failures are reported, not bypassed.")
    collect(settings)


if __name__ == "__main__":
    main()
