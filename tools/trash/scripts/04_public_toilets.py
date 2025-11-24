"""
Scraper for Hsinchu City Public Toilets Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=904
Formats: XLS, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=99D21F15AC28F66D&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A2C256E6DB00D22844E3952ADBB813DCA8A4410E3324B166D4BD021039566679F4551AD3E23CF1212E7895404D6164DC67F8836BFF7E6FAF866EA68180D9087FC"


def scrape_public_toilets():
    """Scrape public toilets data and insert into database"""
    logger.info("Starting public toilets data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download public toilets data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} public toilet records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 公廁編號, 公廁名稱, 地址或地點描述, 管理單位名稱,
                # 最新公廁級別, 公廁類型, 縣市別代碼, 行政區域代碼, 村里名稱

                toilet_id = clean_text(row.get('公廁編號'))
                toilet_name = clean_text(row.get('公廁名稱'))
                address_or_location = clean_text(row.get('地址或地點描述'))
                managing_organization = clean_text(row.get('管理單位名稱'))
                facility_grade = clean_text(row.get('最新公廁級別'))
                toilet_type = clean_text(row.get('公廁類型'))
                county_code = clean_text(row.get('縣市別代碼'))
                district_code = clean_text(row.get('行政區域代碼'))
                village_name = clean_text(row.get('村里名稱'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO public_toilets (
                        toilet_id, toilet_name, address_or_location, managing_organization,
                        facility_grade, toilet_type, county_code, district_code, village_name
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    toilet_id, toilet_name, address_or_location, managing_organization,
                    facility_grade, toilet_type, county_code, district_code, village_name
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
        logger.error(f"Error parsing public toilets data: {e}")
        raise


if __name__ == "__main__":
    scrape_public_toilets()
