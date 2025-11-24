"""
Scraper for Hsinchu City YouBike Stations Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=59
Formats: CSV, JSON, XML, XLSX
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=A7B8147A99EDC4E8&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A4EF2D5AA4DEE76CC0AF6008E48ED1F089BEC5004D1985A4BCA289E92E4BD1DE813108814A4DCE4F218CEBF5AA37C6D4026E95EBAF56B1B213B39830C3D5EAAF7"


def scrape_youbike():
    """Scrape YouBike stations data and insert into database"""
    logger.info("Starting YouBike stations data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download YouBike data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} YouBike station records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Map CSV columns to database fields
                # Expected columns: 站點名稱, 站點位置, 緯度, 經度, 圖片
                station_name = clean_text(row.get('站點名稱'))
                station_location = clean_text(row.get('站點位置'))
                latitude = safe_float(row.get('緯度'))
                longitude = safe_float(row.get('經度'))
                photo_url = clean_text(row.get('圖片'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO youbike_stations (
                        station_name, station_location, latitude, longitude, photo_url
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    station_name, station_location, latitude, longitude, photo_url
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
        logger.error(f"Error parsing YouBike data: {e}")
        raise


if __name__ == "__main__":
    scrape_youbike()
