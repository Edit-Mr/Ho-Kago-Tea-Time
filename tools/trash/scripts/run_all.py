"""
Master script to run all data scrapers
Executes all 18 data collection scripts in sequence
"""

import logging
import sys
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent.parent / 'scraping.log')
    ]
)
logger = logging.getLogger(__name__)

# Import all scrapers
try:
    # Note: 01_population requires manual ODS file download
    # from 01_population import scrape_population_manual
    from scripts import (
        parks, playgrounds, public_toilets, street_lights,
        bridge_inspections, road_noise, sidewalks, youbike,
        fire_hazards, cctv, evacuation, land_prices,
        building_permits, construction_projects,
        garbage_collection, air_quality, special_foods
    )
except ImportError:
    # If running from within scripts directory
    import sys
    sys.path.insert(0, str(Path(__file__).parent))


def run_all_scrapers(skip_population=True):
    """
    Run all data scrapers in sequence

    Args:
        skip_population: Skip population scraper (requires manual ODS download)
    """
    logger.info("=" * 80)
    logger.info("Starting Hsinchu City Open Data ETL Pipeline")
    logger.info("=" * 80)

    scrapers = [
        # (name, module, function)
        ("Parks", "02_parks", "scrape_parks"),
        ("Playgrounds", "03_playgrounds", "scrape_playgrounds"),
        ("Public Toilets", "04_public_toilets", "scrape_public_toilets"),
        ("Street Lights", "05_street_lights", "scrape_street_lights"),
        ("Bridge Inspections", "06_bridge_inspections", "scrape_bridge_inspections"),
        ("Road Noise", "07_road_noise", "scrape_road_noise"),
        ("Sidewalks", "08_sidewalks", "scrape_sidewalks"),
        ("YouBike Stations", "09_youbike", "scrape_youbike"),
        ("Fire Hazards", "10_fire_hazards", "scrape_fire_hazards"),
        ("CCTV Cameras", "11_cctv", "scrape_cctv"),
        ("Evacuation Guides", "12_evacuation", "scrape_evacuation"),
        ("Land Prices", "13_land_prices", "scrape_land_prices"),
        ("Building Permits", "14_building_permits", "scrape_building_permits"),
        ("Construction Projects", "15_construction_projects", "scrape_construction_projects"),
        ("Garbage Collection", "16_garbage_collection", "scrape_garbage_collection"),
        ("Air Quality", "17_air_quality", "scrape_air_quality"),
        ("Special Foods", "18_special_foods", "scrape_special_foods"),
    ]

    total_success = 0
    total_failed = 0

    for name, module_name, func_name in scrapers:
        logger.info(f"\n{'=' * 60}")
        logger.info(f"📥 Scraping: {name}")
        logger.info(f"{'=' * 60}")

        try:
            # Dynamically import and execute
            module = __import__(module_name)
            scraper_func = getattr(module, func_name)
            scraper_func()
            total_success += 1
            logger.info(f"✅ {name}: SUCCESS")

        except Exception as e:
            total_failed += 1
            logger.error(f"❌ {name}: FAILED - {e}")

    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("ETL Pipeline Summary")
    logger.info("=" * 80)
    logger.info(f"✅ Successful: {total_success}/{len(scrapers)}")
    logger.info(f"❌ Failed: {total_failed}/{len(scrapers)}")

    if not skip_population:
        logger.info("\n⚠️  Note: Population data (01_population.py) requires manual ODS file download")
        logger.info("   See script documentation for instructions")

    logger.info("=" * 80)

    return total_success, total_failed


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Run Hsinchu City data scrapers')
    parser.add_argument(
        '--include-population',
        action='store_true',
        help='Include population scraper (requires manual ODS files)'
    )

    args = parser.parse_args()

    success, failed = run_all_scrapers(skip_population=not args.include_population)

    # Exit with error code if any scrapers failed
    sys.exit(0 if failed == 0 else 1)
