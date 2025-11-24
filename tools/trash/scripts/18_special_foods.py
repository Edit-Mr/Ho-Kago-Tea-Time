"""
Scraper for Hsinchu City Special Foods Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=1550
Formats: XLSX, CSV, XML, JSON
Includes long text descriptions
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=996E06C09B311C9A&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A0DDD1E4555BA014F85B3572ECEDB1DFAF25F721AE7CC96473FAA8BAB84DD66016CD21D90029158CF2FC06E99AD04F4F5E4D5DFD76A7DE1A69069DB527BD97EEA6A7F333336117A57"


def scrape_special_foods():
    """Scrape special foods data and insert into database"""
    logger.info("Starting special foods data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download special foods data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} special food records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 名稱, 網址, 電話, 行政區, AreaCode, 地址, 介紹
                name = clean_text(row.get('名稱'))
                website = clean_text(row.get('網址'))
                phone = clean_text(row.get('電話'))
                district = clean_text(row.get('行政區'))
                area_code = clean_text(row.get('AreaCode'))
                address = clean_text(row.get('地址'))
                introduction = clean_text(row.get('介紹'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO special_foods (
                        name, website, phone, district, area_code, address, introduction
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    name, website, phone, district, area_code, address, introduction
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
        logger.error(f"Error parsing special foods data: {e}")
        raise


if __name__ == "__main__":
    scrape_special_foods()
