"""Offline tests: run python -m unittest discover from agency_info/scripts."""

import argparse
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock

from PIL import Image

import collect_agency_logos as logos


class LogoCollectorTests(unittest.TestCase):
    def test_main_prepares_checklist_and_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "motac.json"
            source.touch()
            output = root / "review"
            output.mkdir()
            calls = []
            with patch.multiple(logos, MOTAC_FILE=source, PJH_FILE=root / "pjh.json",
                                WEBSITES_FILE=root / "websites.csv", OUTPUT_DIR=output, AUTO_DISCOVER=False):
                with patch.object(logos, "collect", side_effect=lambda settings: calls.append(
                        (settings.prepare, settings.output))):
                    logos.main()
            self.assertEqual(calls, [(True, root / "review_2"), (False, root / "review_2")])

    def test_company_matching_preserves_brand(self):
        self.assertEqual(logos.normalized_name("Example & Tours Sdn. Bhd."),
                         logos.normalized_name("EXAMPLE AND TOURS SDN BHD"))
        self.assertNotEqual(logos.normalized_name("Example Travel"),
                            logos.normalized_name("Example Tours"))

    def test_branch_grouping_requires_same_licence_and_name(self):
        agency = {"license_no": "123", "company_name": "Example Travel"}
        self.assertEqual(logos.agency_key(agency), logos.agency_key(dict(agency, address="Branch")))
        self.assertNotEqual(logos.agency_key(agency), logos.agency_key(dict(agency, license_no="456")))

    def test_candidates_rank_and_resolve_urls(self):
        body = '''<script type="application/ld+json">{"@graph":[{"logo":{"url":"/logo.png"}}]}</script>
                  <script type="application/ld+json">invalid</script>
                  <header><img src="/logo.png" alt="logo"><img src="/banner.jpg"></header>
                  <img src="data:image/png;base64,test" alt="logo">'''
        self.assertEqual(logos.logo_candidates(body, "https://example.com/about"), [
            ("https://example.com/logo.png", "structured-data logo"),
            ("https://example.com/banner.jpg", "header/footer image; low confidence")])

    def test_robots_disallow_and_failure_are_not_bypassed(self):
        fetcher = logos.Fetcher()
        with patch.object(fetcher, "raw", return_value=(200, {}, b"User-agent: *\nDisallow: /")):
            with self.assertRaisesRegex(ValueError, "Disallowed"):
                fetcher.policy("https://example.com/logo.png")
        fetcher = logos.Fetcher()
        with patch.object(fetcher, "raw", return_value=(503, {}, b"")):
            with self.assertRaisesRegex(ValueError, "unavailable"):
                fetcher.policy("https://example.com/logo.png")

    def test_missing_websites_produce_review_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "motac.json"
            source.write_text(json.dumps({"agencies": [{"license_no": "123", "company_name": "Fictional Travel"}]}))
            args = argparse.Namespace(motac=str(source), pjh=str(root / "missing.json"),
                                      websites=str(root / "websites.csv"), output=str(root / "output"),
                                      prepare=True, limit=30)
            logos.collect(args)
            with self.assertRaises(FileExistsError):
                logos.collect(args)
            args.prepare = False
            with patch.object(logos.Fetcher, "get", side_effect=AssertionError("Unexpected network")):
                logos.collect(args)
            manifest = json.loads((root / "output/manifest.json").read_text())
            self.assertEqual(manifest[0]["status"], "needs_website")
            self.assertTrue((root / "output/review.html").exists())

    def test_website_filter_and_name_signal(self):
        self.assertFalse(logos.agency_site_candidate("https://www.facebook.com/agency"))
        self.assertFalse(logos.agency_site_candidate("javascript:alert(1)"))
        self.assertTrue(logos.agency_site_candidate("https://fictional.example/"))
        agency = {"company_name": "Fictional Travel Sdn. Bhd."}
        self.assertTrue(logos.page_matches_agency("<title>Fictional Travel</title>", agency))
        self.assertFalse(logos.page_matches_agency("<title>Other Travel</title>", agency))

    def test_search_caches_names_and_stops_after_error(self):
        with tempfile.TemporaryDirectory() as directory:
            search = logos.WebsiteSearch.__new__(logos.WebsiteSearch)
            search.directory = Path(directory)
            search.engine = Mock()
            search.last_search = 0
            search.stopped = ""
            search.memory = {}
            search.engine.text.return_value = [{"href": "https://fictional.example", "title": "Fictional"}]
            with patch.object(logos.time, "sleep"):
                first = search.find({"company_name": "Fictional Travel Sdn. Bhd."})
                self.assertEqual(first, search.find({"company_name": "FICTIONAL TRAVEL SDN BHD"}))
                self.assertEqual(search.engine.text.call_count, 1)
                search.memory = {}
                self.assertEqual(first, search.find({"company_name": "Fictional Travel Sdn Bhd"}))
                self.assertEqual(search.engine.text.call_count, 1)
                search.engine.text.side_effect = RuntimeError("No results found.")
                self.assertEqual(search.find({"company_name": "Missing Travel"})["status"], "search_no_results")
                self.assertEqual(search.stopped, "")
                search.engine.text.side_effect = RuntimeError("Rate limited")
                self.assertEqual(search.find({"company_name": "Other Travel"})["status"], "search_failed")
                self.assertEqual(search.find({"company_name": "Third Travel"})["status"], "search_paused")
                self.assertEqual(search.engine.text.call_count, 3)

    def test_http_cache_survives_new_fetcher(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            with patch.object(logos.Fetcher, "fetch_uncached", return_value=("https://example.com", {}, b"test")) as network:
                logos.Fetcher(cache).get("https://example.com")
                logos.Fetcher(cache).get("https://example.com")
                self.assertEqual(network.call_count, 1)

    def test_discovery_attempts_missing_sources_and_saves_unverified_logo(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "motac.json"
            source.write_text(json.dumps({"agencies": [
                {"license_no": "123", "company_name": "Fictional Travel"},
                {"license_no": "456", "company_name": "Unresolved Travel"}]}))
            args = argparse.Namespace(motac=source, pjh=root / "missing.json", websites=root / "missing.csv",
                                      output=root / "output", prepare=False, limit=0, discover=True)
            bitmap = io.BytesIO()
            Image.new("RGB", (50, 50)).save(bitmap, format="PNG")
            responses = [("https://fictional.example", {}, b'<title>Fictional Travel</title><img src="/logo.png" alt="logo">'),
                         ("https://fictional.example/logo.png", {}, bitmap.getvalue())]
            with patch.object(logos, "WebsiteSearch") as search, patch.object(logos.Fetcher, "get", side_effect=responses):
                search.return_value.find.side_effect = [
                    {"status": "search_results", "results": [{"url": "https://fictional.example"}]},
                    {"status": "search_no_results", "results": []}]
                logos.collect(args)
                self.assertEqual(search.return_value.find.call_count, 2)
            manifest = json.loads((root / "output/manifest.json").read_text())
            self.assertEqual([row["status"] for row in manifest], ["needs_review", "search_no_results"])
            self.assertFalse(manifest[0]["website_verified"])
            self.assertIn("unverified", manifest[0]["website_evidence"])
            self.assertTrue((root / "output" / manifest[0]["candidates"][0]["file"]).exists())


if __name__ == "__main__":
    unittest.main()
