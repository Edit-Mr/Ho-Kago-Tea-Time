"""
Scraper for Hsinchu City CCTV Cameras Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=155
Formats: XLSX, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=E25E4A8527D50444&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A0DDD1E4555BA014F3B231699AB146CE3D3FE9E330B917EE6B7759C8646693C13D24E277E9651F2AEE5C931BCD2A5112F7FBB93E190686B33E1EA3C014F9B87247FC01481FA7FE7E3"


def scrape_cctv():
    """Scrape CCTV cameras data and insert into database"""
    logger.info("Starting CCTV cameras data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download CCTV data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} CCTV camera records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 機關代碼, 縣市別代碼, 分局, 攝影機名稱, 資料更新日期
                agency_code = clean_text(row.get('機關代碼'))
                county_code = clean_text(row.get('縣市別代碼'))
                precinct = clean_text(row.get('分局'))
                camera_name = clean_text(row.get('攝影機名稱'))
                update_date = clean_text(row.get('資料更新日期'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO cctv_cameras (
                        agency_code, county_code, precinct, camera_name, update_date
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    agency_code, county_code, precinct, camera_name, update_date
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
        logger.error(f"Error parsing CCTV data: {e}")
        raise


if __name__ == "__main__":
    scrape_cctv()
