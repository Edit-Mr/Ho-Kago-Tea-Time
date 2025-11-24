"""
Scraper for Hsinchu City Fire & Explosion Hazards Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=916
Formats: XLS, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=44DD05146CEC3FA8&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A23189159C64A6A66CFFE47576889F072B2A78C911D5906F33D71886238BE1A1199D9A77DC73F55A7E2225F457A9BB9CAACE9A6BF27E3A62831BFFFDA42008C40"


def scrape_fire_hazards():
    """Scrape fire hazard locations data and insert into database"""
    logger.info("Starting fire hazards data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download fire hazards data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} fire hazard location records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 縣市別代碼, 民國年月日, 場所名稱, 地址, 說明
                county_code = clean_text(row.get('縣市別代碼'))
                roc_date = clean_text(row.get('民國年月日'))
                facility_name = clean_text(row.get('場所名稱'))
                address = clean_text(row.get('地址'))
                description = clean_text(row.get('說明'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO fire_hazard_locations (
                        county_code, roc_date, facility_name, address, description
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    county_code, roc_date, facility_name, address, description
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
        logger.error(f"Error parsing fire hazards data: {e}")
        raise


if __name__ == "__main__":
    scrape_fire_hazards()
