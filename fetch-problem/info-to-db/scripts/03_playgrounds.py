"""
Scraper for Hsinchu City Children's Playgrounds Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=13&s=571
Formats: CSV, JSON, XML, XLSX
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=50C98A734B0BEAB2&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977ACB55B9BDD072809E2C76D702854B23CDBD584A089A5E292D071B25CB692E4CA59FBF9D20F09051B5266EC5815DD090C419E56FED6734D895DCD4E3491303783240E1FA37697F82EA"


def scrape_playgrounds():
    """Scrape playgrounds data and insert into database"""
    logger.info("Starting playgrounds data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download playgrounds data")
        return

    try:
        # Parse XLSX (not CSV!)
        df = read_excel_file(content)

        logger.info(f"Downloaded {len(df)} playground records")
        logger.info(f"Columns: {df.columns.tolist()}")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        playground_records = 0
        facility_records = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Flexible column mapping
                serial_number = None
                park_name = None
                district = None
                area_code = None
                facility_content = None

                for col in df.columns:
                    col_lower = str(col).lower()
                    if '編號' in str(col):
                        serial_number = clean_text(row[col])
                    elif '公園' in str(col) or 'park' in col_lower:
                        park_name = clean_text(row[col])
                    elif '行政區' in str(col) or 'district' in col_lower or '區' in str(col):
                        district = clean_text(row[col])
                    elif 'areacode' in col_lower or '區域代碼' in str(col):
                        area_code = clean_text(row[col])
                    elif '設施' in str(col) or 'facility' in col_lower or 'equipment' in col_lower:
                        facility_content = clean_text(row[col])

                # Insert playground record
                cursor.execute("""
                    INSERT INTO playgrounds (serial_number, park_name, district, area_code)
                    VALUES (?, ?, ?, ?)
                """, (serial_number, park_name, district, area_code))

                playground_id = cursor.lastrowid
                playground_records += 1

                # Insert facility content if available
                if facility_content:
                    cursor.execute("""
                        INSERT INTO playground_facilities (playground_id, facility_content)
                        VALUES (?, ?)
                    """, (playground_id, facility_content))
                    facility_records += 1

                records_inserted += 1

            except Exception as e:
                logger.error(f"Error processing row {idx}: {e}")
                errors += 1

            records_processed += 1

        conn.commit()
        conn.close()

        logger.info(f"Inserted {playground_records} playgrounds, {facility_records} facilities")
        log_progress(__name__, records_processed, records_inserted, errors)

    except Exception as e:
        logger.error(f"Error parsing playgrounds data: {e}")
        raise


if __name__ == "__main__":
    scrape_playgrounds()
