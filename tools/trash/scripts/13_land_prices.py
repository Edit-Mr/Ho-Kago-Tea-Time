"""
Scraper for Hsinchu City Land Prices Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=842
Formats: XLSX, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=53C98A0204232DDB&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977AF8E7ECFDC92F02B3A55B1A85414397DFE1D206AFFCD142100D39A0B4AD5646A84BCB05BEEECE2C88131B0FA49D04B3AE1F7412BFD57EC2C0E05A2C671DC6B2103B105D64FB4AD673"


def scrape_land_prices():
    """Scrape land prices data and insert into database"""
    logger.info("Starting land prices data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download land prices data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} land price records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 新竹市代碼, 段代碼, 地段, 地號, 公告現值台幣
                city_code = clean_text(row.get('新竹市代碼'))
                section_code = clean_text(row.get('段代碼'))
                land_section = clean_text(row.get('地段'))
                lot_number = clean_text(row.get('地號'))
                announced_value_twd = safe_float(row.get('公告現值台幣'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO land_prices (
                        city_code, section_code, land_section, lot_number, announced_value_twd
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    city_code, section_code, land_section, lot_number, announced_value_twd
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
        logger.error(f"Error parsing land prices data: {e}")
        raise


if __name__ == "__main__":
    scrape_land_prices()
