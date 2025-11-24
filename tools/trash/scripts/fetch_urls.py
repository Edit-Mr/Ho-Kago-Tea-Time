"""
Helper script to fetch actual CSV download URLs from Hsinchu Open Data platform
URLs are dynamic with encrypted tokens, so they need to be fetched from the web pages
"""

import re
import requests
from bs4 import BeautifulSoup
import json

BASE_URL = "https://opendata.hccg.gov.tw"

# Map of data source names to their page URLs
DATA_SOURCES = {
    "parks": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=71",
    "playgrounds": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=13&s=571",
    "public_toilets": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=904",
    "street_lights": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=159",
    "bridge_inspections": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=430",
    "road_noise": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=302",
    "sidewalks": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=280",
    "youbike": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=59",
    "fire_hazards": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=916",
    "cctv": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=155",
    "evacuation": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=909",
    "land_prices": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=842",
    "building_permits": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=948",
    "construction_projects": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=12&s=956",
    "garbage_collection": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=165",
    "air_quality": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=157",
    "special_foods": "https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=1550",
}


def fetch_csv_url(page_url):
    """
    Fetch CSV download URL from a data source page

    Args:
        page_url: URL of the OpenData detail page

    Returns:
        Full CSV download URL or None if not found
    """
    try:
        response = requests.get(page_url, timeout=10)
        response.raise_for_status()

        html = response.text

        # Look for CSV download link pattern: OpenDataFileHit.ashx?ID=...&u=...
        # The link typically has ID and u parameters with encrypted values
        pattern = r'OpenDataFileHit\.ashx\?ID=[A-F0-9]+&u=[A-F0-9]+'
        matches = re.findall(pattern, html)

        if matches:
            # Usually the first match is the CSV link
            # Some pages have multiple formats, CSV is often first
            csv_link = matches[0] if len(matches) > 0 else None

            if csv_link:
                full_url = BASE_URL + "/" + csv_link
                return full_url

        return None

    except Exception as e:
        print(f"Error fetching {page_url}: {e}")
        return None


def fetch_all_urls():
    """Fetch all CSV download URLs"""
    print("Fetching CSV download URLs from Hsinchu Open Data platform...")
    print("=" * 80)

    urls = {}

    for name, page_url in DATA_SOURCES.items():
        print(f"Fetching {name}...", end=" ")
        csv_url = fetch_csv_url(page_url)

        if csv_url:
            urls[name] = csv_url
            print("✅")
        else:
            urls[name] = None
            print("❌ Not found")

    print("=" * 80)
    print(f"\nFetched {len([u for u in urls.values() if u])} / {len(DATA_SOURCES)} URLs\n")

    return urls


def save_urls_to_file(urls, filename="data_urls.json"):
    """Save URLs to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(urls, f, indent=2, ensure_ascii=False)
    print(f"Saved URLs to {filename}")


def print_urls(urls):
    """Print URLs in a readable format"""
    print("\nData Source URLs:")
    print("=" * 80)

    for name, url in urls.items():
        print(f"\n{name}:")
        if url:
            print(f"  {url}")
        else:
            print(f"  ❌ URL not found")


if __name__ == "__main__":
    urls = fetch_all_urls()
    print_urls(urls)
    save_urls_to_file(urls)
