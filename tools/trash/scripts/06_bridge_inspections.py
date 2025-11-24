"""
Scraper for Hsinchu City Bridge Inspections Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=430
Formats: XLSX, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=2927F3E12124DA23&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A3B42FA7C66FB0A97F9346290A84E40A5198EF54E2F27CDB9F63CDB65C72C98019087210699932B1013B2A25912CE3D6BF7AD0022CAADCBB10D976867D7AA007AD1F0EB3564695F71"


def scrape_bridge_inspections():
    """Scrape bridge inspections data and insert into database"""
    logger.info("Starting bridge inspections data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download bridge inspections data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} bridge inspection records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 縣市別, 縣市名稱, 檢測日期, 檢測單位, 橋梁名稱
                county_code = clean_text(row.get('縣市別'))
                county_name = clean_text(row.get('縣市名稱'))
                inspection_date = clean_text(row.get('檢測日期'))
                inspection_unit = clean_text(row.get('檢測單位'))
                bridge_name = clean_text(row.get('橋梁名稱'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO bridge_inspections (
                        county_code, county_name, inspection_date, inspection_unit, bridge_name
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    county_code, county_name, inspection_date, inspection_unit, bridge_name
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
        logger.error(f"Error parsing bridge inspections data: {e}")
        raise


if __name__ == "__main__":
    scrape_bridge_inspections()
