"""
Scraper for Hsinchu City Garbage Collection Schedule Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=165
Formats: CSV
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_int, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=93A072A385581A61&u=77DFE16E459DFCE35706097E32D8C3E03877F1B9A8A67FED6055194E672F3E9BCD3A102EAC0BCCA4E9B7A4DD686AD16D2293C11137CC7256A5AC01DCEF9EA5BA68A772D2431FF77BF15A58A5F8F61B825F366739CFFDD2284576C1FAC510D509"


def scrape_garbage_collection():
    """Scrape garbage collection routes data and insert into database"""
    logger.info("Starting garbage collection data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download garbage collection data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} garbage collection route records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 縣市別代碼, 班別, 清運路線名稱, 順序, 清潔公車停置地點,
                # 預估到達時間, 預估離開時間, 停留時間, 車號, 駕駛, 隨車人員, 回收日_星期幾

                county_code = clean_text(row.get('縣市別代碼'))
                shift = clean_text(row.get('班別'))
                route_name = clean_text(row.get('清運路線名稱'))
                sequence = safe_int(row.get('順序'))
                stop_location = clean_text(row.get('清潔公車停置地點'))
                estimated_arrival = clean_text(row.get('預估到達時間'))
                estimated_departure = clean_text(row.get('預估離開時間'))
                duration = clean_text(row.get('停留時間'))
                vehicle_number = clean_text(row.get('車號'))
                driver = clean_text(row.get('駕駛'))
                crew = clean_text(row.get('隨車人員'))
                collection_day = clean_text(row.get('回收日_星期幾'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO garbage_collection_routes (
                        county_code, shift, route_name, sequence, stop_location,
                        estimated_arrival, estimated_departure, duration, vehicle_number,
                        driver, crew, collection_day
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    county_code, shift, route_name, sequence, stop_location,
                    estimated_arrival, estimated_departure, duration, vehicle_number,
                    driver, crew, collection_day
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
        logger.error(f"Error parsing garbage collection data: {e}")
        raise


if __name__ == "__main__":
    scrape_garbage_collection()
