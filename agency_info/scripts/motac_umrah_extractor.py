# ============================================================
# MOTAC UMRAH TRAVEL AGENCY EXTRACTOR
# ============================================================
#
# Directly calls MOTAC's AJAX endpoint.
#
# No command-line arguments.
# No browser automation.
# No Selenium / Playwright.
#
# Works in:
# - Google Colab
# - Jupyter Notebook
# - Normal Python
#
# Output:
# System temporary directory: r2h-agency-data/extractions/<timestamp>.json
# Review the result before updating agency_info; this never overwrites app data.
# ============================================================


import sys
import subprocess
import json
import re
import math
import time
import hashlib
import tempfile

from pathlib import Path
from datetime import datetime, timezone


# ============================================================
# INSTALL DEPENDENCIES AUTOMATICALLY
# ============================================================

try:
    import requests
    from bs4 import BeautifulSoup

except ImportError:

    subprocess.check_call([
        sys.executable,
        "-m",
        "pip",
        "install",
        "-q",
        "requests",
        "beautifulsoup4"
    ])

    import requests
    from bs4 import BeautifulSoup


# ============================================================
# CONFIG
# EDIT HERE ONLY
# ============================================================

AJAX_URL = (
    "https://www.motac.gov.my/"
    "wp-admin/admin-ajax.php"
)

SOURCE_PAGE = (
    "https://www.motac.gov.my/"
    "kategori-semakan-new/"
    "agensi-pelancongan-umrah/"
)

SCRIPT_DIR = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
OUTPUT_FILE = (
    Path(tempfile.gettempdir()) / "r2h-agency-data" / "extractions" /
    f"motac_umrah_agencies-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')}.json"
)


# Number of agencies per request
PER_PAGE = 25


# None = scrape ALL pages
#
# Example:
#
# MAX_PAGES = 2
#
# will only scrape page 1 and 2
MAX_PAGES = None


# Delay between requests
REQUEST_DELAY_SECONDS = 0.7


# HTTP timeout
REQUEST_TIMEOUT = 30


# Search/filter settings
#
# Leave empty to retrieve everything.
SEARCH = ""
NEGERI = ""
KLASIFIKASI = ""
JENIS = ""


# ============================================================
# USER AGENT
# ============================================================

USER_AGENT = (
    "Mozilla/5.0 "
    "(Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 "
    "(KHTML, like Gecko) "
    "Chrome/152.0.0.0 "
    "Safari/537.36"
)


# ============================================================
# MALAYSIAN STATES
# ============================================================

MALAYSIAN_STATES = [

    "Wilayah Persekutuan Kuala Lumpur",

    "Wilayah Persekutuan Putrajaya",

    "Wilayah Persekutuan Labuan",

    "Negeri Sembilan",

    "Pulau Pinang",

    "Kuala Lumpur",

    "Putrajaya",

    "Labuan",

    "Johor",

    "Kedah",

    "Kelantan",

    "Melaka",

    "Pahang",

    "Perak",

    "Perlis",

    "Sabah",

    "Sarawak",

    "Selangor",

    "Terengganu",
]


# ============================================================
# BASIC HELPERS
# ============================================================

def clean_text(value):

    if value is None:

        return ""

    return re.sub(
        r"\s+",
        " ",
        str(value)
    ).strip()


# ============================================================
# HTTP SESSION
# ============================================================

def create_session():

    session = requests.Session()

    session.headers.update({

        "User-Agent":
            USER_AGENT,

        "Accept":
            "application/json, "
            "text/javascript, "
            "*/*; q=0.01",

        "Accept-Language":
            "en-US,en;q=0.9,"
            "ms;q=0.8",

        "Content-Type":
            "application/"
            "x-www-form-urlencoded; "
            "charset=UTF-8",

        "Origin":
            "https://www.motac.gov.my",

        "Referer":
            SOURCE_PAGE,

        "X-Requested-With":
            "XMLHttpRequest",
    })

    return session


# ============================================================
# BUILD MOTAC POST PAYLOAD
# ============================================================

def build_payload(page):

    return {

        "action":
            "motac_semakan_filter",

        "kategori":
            "agensi-pelancongan-umrah",

        "search":
            SEARCH,

        "negeri":
            NEGERI,

        "klasifikasi":
            KLASIFIKASI,

        "jenis":
            JENIS,

        "page":
            str(page),

        "per_page":
            str(PER_PAGE),
    }


# ============================================================
# REQUEST MOTAC PAGE
# ============================================================

def request_page(
    session,
    page
):

    payload = build_payload(
        page
    )


    response = session.post(

        AJAX_URL,

        data=payload,

        timeout=REQUEST_TIMEOUT,
    )


    response.raise_for_status()


    try:

        result = response.json()

    except Exception:

        print(
            "ERROR:"
        )

        print(
            "MOTAC response "
            "was not valid JSON."
        )

        print()

        print(
            response.text[:1000]
        )

        raise


    # Validate outer JSON response

    if not result.get(
        "success"
    ):

        raise RuntimeError(
            "MOTAC API returned "
            "success=false"
        )


    data = result.get(
        "data"
    )


    if not isinstance(
        data,
        dict
    ):

        raise RuntimeError(
            "MOTAC API returned "
            "an invalid data structure."
        )


    return data


# ============================================================
# DATE PARSER
# ============================================================

def parse_date(
    value
):

    value = clean_text(
        value
    )


    try:

        day, month, year = [

            int(item)

            for item
            in value.split("/")

        ]


        # MOTAC uses two digit years
        #
        # 23 -> 2023
        # 31 -> 2031

        if year < 100:

            year += 2000


        date = datetime(
            year,
            month,
            day
        ).date()


        return date.isoformat()


    except Exception:

        return None


# ============================================================
# LICENCE PERIOD PARSER
# ============================================================

def parse_license_period(
    value
):

    value = clean_text(
        value
    )


    # Example:
    #
    # 01/01/20 ~ 11/01/29

    match = re.search(

        r"(\d{1,2}/"
        r"\d{1,2}/"
        r"\d{2,4})"

        r"\s*~\s*"

        r"(\d{1,2}/"
        r"\d{1,2}/"
        r"\d{2,4})",

        value
    )


    if not match:

        return (
            None,
            None
        )


    start_date = parse_date(
        match.group(1)
    )


    end_date = parse_date(
        match.group(2)
    )


    return (
        start_date,
        end_date
    )


# ============================================================
# PHONE PARSER
# ============================================================

def parse_phone_numbers(
    value
):

    value = clean_text(
        value
    )


    if not value:

        return []


    # MOTAC examples:
    #
    # 03-40421205 / 03-40416612
    #
    # 03-4131 3803 / 019-313 3838
    #
    # 03-4144 4487/010-365 4489

    pieces = re.split(

        r"\s*/\s*"
        r"|\s*;\s*",

        value
    )


    phones = []


    for piece in pieces:

        phone = clean_text(
            piece
        )


        if phone:

            phones.append(
                phone
            )


    # Remove duplicates

    return list(
        dict.fromkeys(
            phones
        )
    )


# ============================================================
# POSTCODE
# ============================================================

def extract_postcode(
    address
):

    matches = re.findall(

        r"\b\d{5}\b",

        address
    )


    if matches:

        return matches[-1]


    return None


# ============================================================
# STATE
# ============================================================

def extract_state(
    address
):

    address_lower = (
        address.casefold()
    )


    # Long names first

    sorted_states = sorted(

        MALAYSIAN_STATES,

        key=len,

        reverse=True
    )


    for state in sorted_states:

        if (
            state.casefold()
            in address_lower
        ):

            return state


    return None


# ============================================================
# RECORD HASH
# ============================================================

def generate_hash(
    company_name,
    licence_no,
    address,
    office_type,
    end_date
):

    value = "|".join([

        clean_text(
            company_name
        ).casefold(),

        clean_text(
            licence_no
        ).casefold(),

        clean_text(
            address
        ).casefold(),

        clean_text(
            office_type
        ).casefold(),

        end_date or "",

    ])


    return hashlib.sha256(

        value.encode(
            "utf-8"
        )

    ).hexdigest()


# ============================================================
# PARSE ONE AGENCY CARD
# ============================================================

def parse_agency_card(
    card,
    page
):

    # --------------------------------------------------------
    # RECORD NUMBER
    # --------------------------------------------------------

    number_element = card.select_one(
        ".col-num"
    )


    record_no = None


    if number_element:

        number_text = clean_text(
            number_element.get_text(
                " ",
                strip=True
            )
        )


        try:

            record_no = int(
                number_text
            )

        except Exception:

            pass


    # --------------------------------------------------------
    # COMPANY NAME
    # --------------------------------------------------------

    company_element = (
        card.select_one(
            ".company-name"
        )
    )


    company_name = ""


    if company_element:

        company_name = clean_text(

            company_element.get_text(
                " ",
                strip=True
            )

        )


    # --------------------------------------------------------
    # ADDRESS
    # --------------------------------------------------------

    address_element = (
        card.select_one(
            ".company-address"
        )
    )


    address = ""


    if address_element:

        address = clean_text(

            address_element.get_text(
                " ",
                strip=True
            )

        )


    # --------------------------------------------------------
    # PHONE
    # --------------------------------------------------------

    phone_element = (
        card.select_one(
            ".company-phone"
        )
    )


    phone_raw = ""


    if phone_element:

        phone_raw = clean_text(

            phone_element.get_text(
                " ",
                strip=True
            )

        )


    phones = parse_phone_numbers(
        phone_raw
    )


    # --------------------------------------------------------
    # LICENCE NUMBER
    # --------------------------------------------------------

    licence_element = (
        card.select_one(
            ".col-lesen"
        )
    )


    licence_no = ""


    if licence_element:

        licence_no = clean_text(

            licence_element.get_text(
                " ",
                strip=True
            )

        )


    # IMPORTANT:
    #
    # Keep licence number as STRING.
    #
    # Examples:
    #
    # 0980
    # 0399
    # 4398/1
    #
    # Do NOT convert to integer.


    # --------------------------------------------------------
    # BUSINESS SCOPE
    # --------------------------------------------------------

    scope_element = (
        card.select_one(
            ".badge-bidang"
        )
    )


    scope_raw = ""


    if scope_element:

        scope_raw = clean_text(

            scope_element.get_text(
                " ",
                strip=True
            )

        )


    business_scope = [

        clean_text(
            item
        )

        for item
        in scope_raw.split(",")

        if clean_text(
            item
        )

    ]


    # --------------------------------------------------------
    # OFFICE TYPE
    # --------------------------------------------------------

    type_element = (
        card.select_one(
            ".col-jenis"
        )
    )


    office_type = ""


    if type_element:

        office_type = clean_text(

            type_element.get_text(
                " ",
                strip=True
            )

        )


    # --------------------------------------------------------
    # LICENCE PERIOD
    # --------------------------------------------------------

    period_element = (
        card.select_one(
            ".col-tempoh"
        )
    )


    period_raw = ""


    if period_element:

        period_raw = clean_text(

            period_element.get_text(
                " ",
                strip=True
            )

        )


    (
        license_start_date,
        license_end_date

    ) = parse_license_period(
        period_raw
    )


    # --------------------------------------------------------
    # EXTRA FIELDS
    # --------------------------------------------------------

    postcode = (
        extract_postcode(
            address
        )
    )


    state = (
        extract_state(
            address
        )
    )


    # --------------------------------------------------------
    # HASH
    # --------------------------------------------------------

    record_hash = (
        generate_hash(

            company_name,

            licence_no,

            address,

            office_type,

            license_end_date

        )
    )


    # --------------------------------------------------------
    # FINAL RECORD
    # --------------------------------------------------------

    return {

        "record_no":
            record_no,

        "company_name":
            company_name,

        "address":
            address,

        "phones":
            phones,

        "license_no":
            licence_no,

        "business_scope":
            business_scope,

        "office_type":
            office_type,

        "license_start_date":
            license_start_date,

        "license_end_date":
            license_end_date,

        "postcode":
            postcode,

        "state":
            state,

        "source_page":
            page,

        "record_hash":
            record_hash,
    }


# ============================================================
# PARSE HTML FROM AJAX RESPONSE
# ============================================================

def parse_ajax_html(
    html,
    page
):

    soup = BeautifulSoup(

        html,

        "html.parser"
    )


    cards = soup.select(
        ".motac-card"
    )


    agencies = []


    for card in cards:

        agency = parse_agency_card(
            card,
            page
        )


        # Minimal validation

        if (
            agency[
                "company_name"
            ]

            and

            agency[
                "license_no"
            ]
        ):

            agencies.append(
                agency
            )


    return agencies


# ============================================================
# DEDUPLICATION KEY
# ============================================================

def create_unique_key(
    agency
):

    # Licence number should normally
    # be unique for individual entries.
    #
    # Include office type + address
    # for additional protection.

    return "|".join([

        agency[
            "license_no"
        ].casefold(),

        agency[
            "office_type"
        ].casefold(),

        agency[
            "address"
        ].casefold(),

    ])


# ============================================================
# SCRAPE EVERYTHING
# ============================================================

def scrape_all():

    session = create_session()


    all_agencies = {}


    # --------------------------------------------------------
    # FIRST REQUEST
    # --------------------------------------------------------

    print()

    print(
        "=" * 70
    )

    print(
        "REQUESTING MOTAC PAGE 1"
    )

    print(
        "=" * 70
    )


    first_data = request_page(
        session,
        1
    )


    total = int(
        first_data.get(
            "total",
            0
        )
        or 0
    )


    showing = int(
        first_data.get(
            "showing",
            PER_PAGE
        )
        or PER_PAGE
    )


    jenis_counts = (
        first_data.get(
            "jenis_counts",
            {}
        )
        or {}
    )


    # --------------------------------------------------------
    # CALCULATE TOTAL PAGES
    # --------------------------------------------------------

    if total > 0:

        total_pages = math.ceil(
            total / PER_PAGE
        )

    else:

        # fallback if MOTAC doesn't
        # return total
        total_pages = 1


    if (
        MAX_PAGES
        is not None
    ):

        total_pages = min(
            total_pages,
            MAX_PAGES
        )


    print()

    print(
        f"Total records : "
        f"{total}"
    )


    print(
        f"Per page      : "
        f"{PER_PAGE}"
    )


    print(
        f"Total pages   : "
        f"{total_pages}"
    )


    print(
        f"HQ            : "
        f"{jenis_counts.get('hq')}"
    )


    print(
        f"Branches      : "
        f"{jenis_counts.get('branch')}"
    )


    # --------------------------------------------------------
    # PARSE PAGE 1
    # --------------------------------------------------------

    first_html = (
        first_data.get(
            "html",
            ""
        )
    )


    page_one_agencies = (
        parse_ajax_html(
            first_html,
            1
        )
    )


    for agency in (
        page_one_agencies
    ):

        key = create_unique_key(
            agency
        )

        all_agencies[
            key
        ] = agency


    print()

    print(
        f"Page 1: "
        f"{len(page_one_agencies)} "
        f"records"
    )


    # --------------------------------------------------------
    # REMAINING PAGES
    # --------------------------------------------------------

    for page in range(
        2,
        total_pages + 1
    ):

        time.sleep(
            REQUEST_DELAY_SECONDS
        )


        print(

            f"Page {page}/"
            f"{total_pages} ...",

            end=" "
        )


        try:

            data = request_page(
                session,
                page
            )


            html = data.get(
                "html",
                ""
            )


            agencies = (
                parse_ajax_html(
                    html,
                    page
                )
            )


            added = 0


            for agency in agencies:

                key = (
                    create_unique_key(
                        agency
                    )
                )


                if (
                    key
                    not in all_agencies
                ):

                    all_agencies[
                        key
                    ] = agency

                    added += 1


            print(

                f"{len(agencies)} "
                f"received, "

                f"{added} new, "

                f"{len(all_agencies)} "
                f"total"

            )


        except Exception as error:

            print(
                "FAILED"
            )

            print(
                f"Error on page "
                f"{page}: "
                f"{error}"
            )

            raise


    # --------------------------------------------------------
    # FINAL LIST
    # --------------------------------------------------------

    agencies = list(
        all_agencies.values()
    )


    # Sort by MOTAC record number

    agencies.sort(

        key=lambda item:

            (
                item[
                    "record_no"
                ]
                if item[
                    "record_no"
                ]
                is not None
                else 999999
            )

    )


    # --------------------------------------------------------
    # METADATA
    # --------------------------------------------------------

    metadata = {

        "source":
            (
                "Ministry of Tourism, "
                "Arts and Culture "
                "Malaysia (MOTAC)"
            ),

        "directory":
            "Agensi Pelancongan (Umrah)",

        "source_page":
            SOURCE_PAGE,

        "source_endpoint":
            AJAX_URL,

        "category":
            "agensi-pelancongan-umrah",

        "extracted_at":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "reported_total":
            total,

        "records_scraped":
            len(agencies),

        "per_page":
            PER_PAGE,

        "pages_scraped":
            total_pages,

        "hq_count":
            jenis_counts.get(
                "hq"
            ),

        "branch_count":
            jenis_counts.get(
                "branch"
            ),

        "complete":
            (
                len(agencies)
                == total
                if total > 0
                and MAX_PAGES is None
                else None
            ),
    }


    return (
        agencies,
        metadata
    )


# ============================================================
# SAVE JSON
# ============================================================

def save_json(
    agencies,
    metadata
):
    """Save an unreviewed extraction separately; never overwrite an existing snapshot."""

    output = {

        "metadata":
            metadata,

        "agencies":
            agencies,
    }


    target = Path(OUTPUT_FILE)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("x", encoding="utf-8") as stream:
        json.dump(output, stream, ensure_ascii=False, indent=2)


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print(
        "=" * 70
    )

    print(
        "MOTAC UMRAH "
        "TRAVEL AGENCY EXTRACTOR"
    )

    print(
        "=" * 70
    )

    print()

    print(
        "Endpoint:"
    )

    print(
        AJAX_URL
    )

    print()

    print(
        "Category:"
    )

    print(
        "agensi-pelancongan-umrah"
    )

    print()

    print(
        "Output:"
    )

    print(
        OUTPUT_FILE
    )


    # --------------------------------------------------------
    # SCRAPE
    # --------------------------------------------------------

    agencies, metadata = (
        scrape_all()
    )


    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    save_json(
        agencies,
        metadata
    )


    # --------------------------------------------------------
    # RESULT
    # --------------------------------------------------------

    print()

    print(
        "=" * 70
    )

    print(
        "EXTRACTION COMPLETE"
    )

    print(
        "=" * 70
    )

    print()


    print(
        "MOTAC reported:"
    )

    print(
        metadata[
            "reported_total"
        ]
    )


    print()


    print(
        "Records extracted:"
    )

    print(
        metadata[
            "records_scraped"
        ]
    )


    print()


    print(
        "Pages scraped:"
    )

    print(
        metadata[
            "pages_scraped"
        ]
    )


    print()


    print(
        "Headquarters:"
    )

    print(
        metadata[
            "hq_count"
        ]
    )


    print()


    print(
        "Branches:"
    )

    print(
        metadata[
            "branch_count"
        ]
    )


    print()


    print(
        "Complete:"
    )

    print(
        metadata[
            "complete"
        ]
    )


    print()


    print(
        "JSON file:"
    )

    print(
        OUTPUT_FILE
    )


    # --------------------------------------------------------
    # SHOW FIRST 3 AGENCIES
    # --------------------------------------------------------

    print()

    print(
        "=" * 70
    )

    print(
        "FIRST 3 RECORDS"
    )

    print(
        "=" * 70
    )


    for agency in agencies[:3]:

        print()

        print(
            f"#{agency['record_no']} "
            f"{agency['company_name']}"
        )

        print(
            "Licence:",
            agency[
                "license_no"
            ]
        )

        print(
            "Type:",
            agency[
                "office_type"
            ]
        )

        print(
            "Phone:",
            agency[
                "phones"
            ]
        )


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()
