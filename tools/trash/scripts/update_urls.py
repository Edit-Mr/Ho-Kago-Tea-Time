"""
Update all scraper scripts with correct DATA_URL values from data_urls.json
"""

import json
import re
from pathlib import Path

# Mapping of data source names to script files
SCRIPT_MAPPING = {
    "parks": "02_parks.py",
    "playgrounds": "03_playgrounds.py",
    "public_toilets": "04_public_toilets.py",
    "street_lights": "05_street_lights.py",
    "bridge_inspections": "06_bridge_inspections.py",
    "road_noise": "07_road_noise.py",
    "sidewalks": "08_sidewalks.py",
    "youbike": "09_youbike.py",
    "fire_hazards": "10_fire_hazards.py",
    "cctv": "11_cctv.py",
    "evacuation": "12_evacuation.py",
    "land_prices": "13_land_prices.py",
    "building_permits": "14_building_permits.py",
    "construction_projects": "15_construction_projects.py",
    "garbage_collection": "16_garbage_collection.py",
    "air_quality": "17_air_quality.py",
    "special_foods": "18_special_foods.py",
}


def update_script_url(script_path, new_url):
    """
    Update DATA_URL in a script file

    Args:
        script_path: Path to the script file
        new_url: New URL to set

    Returns:
        True if updated successfully, False otherwise
    """
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern to match DATA_URL = "..." line
        pattern = r'(DATA_URL\s*=\s*")[^"]*(")'
        replacement = r'\1' + new_url + r'\2'

        updated_content = re.sub(pattern, replacement, content)

        if content == updated_content:
            print(f"  ⚠️  No change made (pattern not found)")
            return False

        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)

        return True

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def main():
    """Update all scraper scripts with correct URLs"""
    # Load URLs from JSON file
    urls_file = Path(__file__).parent / "data_urls.json"

    if not urls_file.exists():
        print(f"❌ {urls_file} not found. Run fetch_urls.py first.")
        return

    with open(urls_file, 'r', encoding='utf-8') as f:
        urls = json.load(f)

    print("Updating scraper scripts with correct URLs...")
    print("=" * 80)

    updated = 0
    failed = 0

    for source_name, script_name in SCRIPT_MAPPING.items():
        script_path = Path(__file__).parent / script_name

        if not script_path.exists():
            print(f"❌ {script_name}: Script not found")
            failed += 1
            continue

        url = urls.get(source_name)
        if not url:
            print(f"❌ {script_name}: URL not found in data_urls.json")
            failed += 1
            continue

        print(f"Updating {script_name}...", end=" ")

        if update_script_url(script_path, url):
            print("✅")
            updated += 1
        else:
            failed += 1

    print("=" * 80)
    print(f"\n✅ Updated: {updated}/{len(SCRIPT_MAPPING)}")
    print(f"❌ Failed: {failed}/{len(SCRIPT_MAPPING)}\n")


if __name__ == "__main__":
    main()
