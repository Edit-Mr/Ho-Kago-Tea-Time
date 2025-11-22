"""
Scraper for Hsinchu City Population Age Data by Neighborhood
Source: https://e-household.hccg.gov.tw/ch/home.jsp?id=130&parentpath=0,14,126
Format: ODS (OpenDocument Spreadsheet) - requires special handling
Complex: Manual download required, multiple monthly reports
"""

import pandas as pd
import logging
from io import StringIO
from pathlib import Path
from utils import get_connection, clean_text, safe_int, log_progress, try_decode_csv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Note: Population data is in ODS format and requires manual download or web scraping
# The website provides monthly reports that need to be downloaded individually
# URL pattern: https://e-household.hccg.gov.tw/downloadfile/[YEAR][MONTH]-新竹市東區-區域年齡層月報表.ods


def parse_ods_file(ods_path: str):
    """Parse ODS file and insert data into database"""
    logger.info(f"Parsing ODS file: {ods_path}")

    try:
        # Read ODS file using pandas (requires odfpy library)
        df = pd.read_excel(ods_path, engine='odf')

        logger.info(f"Loaded {len(df)} rows from ODS file")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        # Extract year-month from filename
        filename = Path(ods_path).name
        report_year_month = filename.split('-')[0] if '-' in filename else None

        for idx, row in df.iterrows():
            try:
                # Parse columns (adjust based on actual ODS structure)
                # Expected structure: District, Neighborhood, Age Group, Male Count, Female Count, Total Count

                district = clean_text(row.get('行政區') or row.get('區別'))
                neighborhood = clean_text(row.get('里別') or row.get('里名'))
                age_group = clean_text(row.get('年齡層') or row.get('年齡組別'))
                male_count = safe_int(row.get('男性人數') or row.get('男'))
                female_count = safe_int(row.get('女性人數') or row.get('女'))
                total_count = safe_int(row.get('總人數') or row.get('合計'))

                # Skip header rows or empty rows
                if not neighborhood or neighborhood in ['里別', '里名', '合計']:
                    continue

                # Insert into database
                cursor.execute("""
                    INSERT INTO population_age_by_neighborhood (
                        district, neighborhood, age_group, male_count, female_count,
                        total_count, report_year_month
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    district, neighborhood, age_group, male_count, female_count,
                    total_count, report_year_month
                ))

                records_inserted += 1

            except Exception as e:
                logger.error(f"Error processing row {idx}: {e}")
                errors += 1

            records_processed += 1

        conn.commit()
        conn.close()

        log_progress(__name__, records_processed, records_inserted, errors)

    except Exception as e:
        logger.error(f"Error parsing ODS file: {e}")
        raise


def scrape_population_manual(ods_directory: str = None):
    """
    Process all ODS files in a directory

    Usage:
        1. Manually download ODS files from the website to a directory
        2. Run this script with the directory path

    Args:
        ods_directory: Path to directory containing downloaded ODS files
    """
    if not ods_directory:
        logger.warning("""
        ⚠️  Population data requires manual download:

        1. Visit: https://e-household.hccg.gov.tw/ch/home.jsp?id=130&parentpath=0,14,126
        2. Download monthly ODS reports to a directory
        3. Run this script: python 01_population.py /path/to/ods/files

        Example ODS files to download:
        - 114年01月-新竹市東區-區域年齡層月報表.ods
        - 114年02月-新竹市東區-區域年齡層月報表.ods
        - etc.
        """)
        return

    ods_dir = Path(ods_directory)
    if not ods_dir.exists():
        logger.error(f"Directory not found: {ods_directory}")
        return

    # Find all ODS files
    ods_files = list(ods_dir.glob('*.ods'))

    if not ods_files:
        logger.warning(f"No ODS files found in {ods_directory}")
        return

    logger.info(f"Found {len(ods_files)} ODS files to process")

    # Process each file
    for ods_file in ods_files:
        logger.info(f"Processing: {ods_file.name}")
        try:
            parse_ods_file(str(ods_file))
        except Exception as e:
            logger.error(f"Failed to process {ods_file.name}: {e}")

    logger.info("✅ All ODS files processed")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        # Directory path provided
        scrape_population_manual(sys.argv[1])
    else:
        # Show usage instructions
        scrape_population_manual()
