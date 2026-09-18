# Agency operations

This is the single authoritative folder for agency data, selected logos, and collectors.

```text
agency_info/
  motac_umrah_agencies.json    Umrah office reference
  pjh_1448H_2027M.json          Hajj/PJH reference
  umrah_logo_assets.json       Selected local-logo mapping
  images/                     Selected PNG logos used by the app
  scripts/                    Both scrapers, requirements, tests, optional website CSV
```

The frontend reads these JSON references. The image handler serves only mapped PNGs
from `images/` at the existing `/images/agency-logos/<filename>` URLs. The scripts and
other files in this folder are not publicly served.

Run a collector without arguments from `agency_info/scripts`:

```powershell
python collect_agency_logos.py
python motac_umrah_extractor.py
```

Run only the tool you need. See [script instructions](scripts/README.md).
Generated candidates, review galleries, and caches go to the system temporary folder
under `r2h-agency-data`, not this repository. The scripts print the output location.
Copy only deliberately selected/approved data and images into the canonical files.

The MOTAC snapshot is not live licence validation and currently reports itself
incomplete. Logo collection does not approve images or connect booking inventory.
