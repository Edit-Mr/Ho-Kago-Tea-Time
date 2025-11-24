"""
Scraper for Hsinchu City Street Lights Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=159
Formats: CSV, JSON, XML, XLSX
Includes TWD97 and WGS84 coordinates
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_int, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=23C36D791C2A76B9&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A494A34B2A7CFF9CF2231379D20B1875919244C2E2F83C11B636EBF2869CF44296DA7B7F5598DD73DA3ED1E195822AC93494B560BE95F6445A305378F7DEA659774CB263EF80556C6"


def scrape_street_lights():
    """Scrape street lights data and insert into database"""
    logger.info("Starting street lights data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download street lights data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} street light records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Map CSV columns to database fields
                # Expected columns: 路燈編碼, 燈具種類, 燈具廠商, 燈桿類別, 燈桿種類, 燈桿高度, 瓦數,
                # 行政區代碼, 所屬鄉鎮, 所屬村里, 縣市別代碼, 地址,
                # TWD97座標X, TWD97座標Y, WGS84座標東經度, WGS84座標北緯度

                light_code = clean_text(row.get('路燈編碼'))
                fixture_type = clean_text(row.get('燈具種類'))
                fixture_manufacturer = clean_text(row.get('燈具廠商'))
                pole_category = clean_text(row.get('燈桿類別'))
                pole_type = clean_text(row.get('燈桿種類'))
                pole_height = safe_float(row.get('燈桿高度'))
                wattage = safe_int(row.get('瓦數'))
                district_code = clean_text(row.get('行政區代碼'))
                township = clean_text(row.get('所屬鄉鎮'))
                village = clean_text(row.get('所屬村里'))
                county_code = clean_text(row.get('縣市別代碼'))
                address = clean_text(row.get('地址'))
                twd97_x = safe_float(row.get('TWD97座標X'))
                twd97_y = safe_float(row.get('TWD97座標Y'))
                wgs84_longitude = safe_float(row.get('WGS84座標東經度'))
                wgs84_latitude = safe_float(row.get('WGS84座標北緯度'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO street_lights (
                        light_code, fixture_type, fixture_manufacturer, pole_category,
                        pole_type, pole_height, wattage, district_code, township,
                        village, county_code, address, twd97_x, twd97_y,
                        wgs84_longitude, wgs84_latitude
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    light_code, fixture_type, fixture_manufacturer, pole_category,
                    pole_type, pole_height, wattage, district_code, township,
                    village, county_code, address, twd97_x, twd97_y,
                    wgs84_longitude, wgs84_latitude
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
        logger.error(f"Error parsing street lights data: {e}")
        raise


if __name__ == "__main__":
    scrape_street_lights()
