# Agency collectors

Run from this folder with no script arguments:

```powershell
python collect_agency_logos.py
```

Or, to collect a fresh MOTAC snapshot:

```powershell
python motac_umrah_extractor.py
```

Install dependencies once with `python -m pip install -r requirements.txt`.
Settings are at the top of each script. The tools are never run by the app.

## Inputs and outputs

- Canonical references are in the parent `agency_info` folder.
- Selected app images are in `agency_info/images`.
- `agency_websites.csv` here preserves optional manually verified website overrides.
- Generated results, caches, and extraction snapshots go to the system temporary
  directory under `r2h-agency-data`. The tools print the exact location.
- Tools never automatically replace canonical JSON or publish scraped logos.
- Temporary results may be removed by the operating system. Keep only reviewed assets
  you actually need; temporary collection output is not a backup.

## Logo collector

Existing PJH matches and verified CSV websites are used first. Missing sources are
searched through DDGS's DuckDuckGo backend. A company-name signal is only a candidate
match, not ownership verification. Every image needs review and reuse permission.

`AGENCY_LIMIT = 0` attempts every record. `AUTO_DISCOVER = False` disables searching.
`SEARCH_DELAY_SECONDS = 5` spaces queries. Names and successful downloads are cached
for seven days. Search errors pause new searches for that run; empty results continue.
Blocked sites are skipped without bypassing protections. SVGs and JavaScript-only
logos require manual handling. Collection does not guarantee a logo for every agency.

Each temporary review folder contains `review.html`, `manifest.json`, and images.
Interrupted runs restart traversal on rerun while reusing the cache. Website discoveries
do not overwrite the manual CSV; they are exported separately with verification false.

## MOTAC extractor

New snapshots use timestamped filenames under the temporary `extractions` folder.
Existing files cannot be overwritten. Review completeness and changes before
deliberately replacing `agency_info/motac_umrah_agencies.json`.

## Colab

Upload the collector and input JSON files beside it. Standalone uploads use those
local inputs; outputs go to the Colab system temporary folder. Save needed results
before the runtime ends. The original single-script workflow is retained.

```python
%pip install requests beautifulsoup4 pillow ddgs
!python collect_agency_logos.py
```

## Offline checks

From this folder: `python -m unittest discover`.

From the repository root: `python -m unittest discover -s agency_info/scripts`.

Tests do not crawl websites or change canonical data.

## Legacy output

Old generated review/cache folders still remain in `tools/agency-data/workspace`
because deletion was blocked by the execution environment. Neither tool nor app uses
them now. They can be removed manually; the selected app images have been moved here.
