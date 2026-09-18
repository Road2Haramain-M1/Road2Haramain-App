"""Offline checks for relocated collectors; no extraction or logo search is run."""

import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import collect_agency_logos as logos
import motac_umrah_extractor as extractor


class ToolPathTests(unittest.TestCase):
    def test_nested_collector_uses_repository_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "agency_info").mkdir()
            tool = root / "agency_info" / "scripts"
            tool.mkdir(parents=True)
            self.assertEqual(logos.find_data_dir(tool), root / "agency_info")

    def test_standalone_upload_uses_script_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            tool = Path(directory) / "colab-upload"
            tool.mkdir()
            self.assertEqual(logos.find_data_dir(tool), tool)

    def test_working_files_are_separate_from_app_data(self):
        self.assertEqual(logos.DATA_DIR.name, "agency_info")
        self.assertEqual(logos.WEBSITES_FILE.parent, logos.SCRIPT_DIR)
        for path in [logos.OUTPUT_DIR, logos.CACHE_DIR]:
            self.assertEqual(path.parent, Path(tempfile.gettempdir()) / "r2h-agency-data")
        self.assertEqual(extractor.OUTPUT_FILE.parent, logos.WORK_DIR / "extractions")

    def test_extractor_creates_new_snapshot_without_overwriting(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "extractions" / "snapshot.json"
            with patch.object(extractor, "OUTPUT_FILE", target):
                extractor.save_json([], {"complete": False})
                self.assertEqual(json.loads(target.read_text()), {"agencies": [], "metadata": {"complete": False}})
                with self.assertRaises(FileExistsError):
                    extractor.save_json([], {"complete": True})
                self.assertFalse(json.loads(target.read_text())["metadata"]["complete"])


if __name__ == "__main__":
    unittest.main()
