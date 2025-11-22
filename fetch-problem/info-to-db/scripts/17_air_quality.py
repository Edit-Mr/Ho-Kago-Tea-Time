"""
Scraper for Hsinchu City Air Quality Monitoring Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=157
Formats: XLSX, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=8ECF28CF69263490&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A663804D28AB4662848FA565F73EAC06EE24D50730C8CC14608AA8AD50A79727D6B65B4A5DDB057171A75CF4864EAE62CD0922991497B4B042A8428970B1EA0E7EC082A8499D743BD"


def scrape_air_quality():
    """Scrape air quality monitoring data and insert into database"""
    logger.info("Starting air quality data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download air quality data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} air quality monitoring records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns include monitoring station info and measurements
                station_name = clean_text(row.get('測站名稱'))
                station_id = clean_text(row.get('測站編號'))
                particle_start_date = clean_text(row.get('懸浮微粒開始檢測日期'))
                particle_end_date = clean_text(row.get('懸浮微粒結束檢測日期'))
                weather = clean_text(row.get('天候'))
                tsp_ug_m3 = safe_float(row.get('TSP.微克每立方公尺'))
                pm10_ug_m3 = safe_float(row.get('PM10.微克每立方公尺'))
                hexane_extract_ug_m3 = safe_float(row.get('正己烷抽出物.微克每立方公尺'))
                chloride_ug_m3 = safe_float(row.get('氯鹽.微克每立方公尺'))
                nitrate_ug_m3 = safe_float(row.get('硝酸鹽.微克每立方公尺'))
                sulfate_ug_m3 = safe_float(row.get('硫酸鹽.微克每立方公尺'))
                lead_ug_m3 = safe_float(row.get('鉛.微克每立方公尺'))
                dust_fall_start_date = clean_text(row.get('落塵量開始檢測日期'))
                dust_fall_end_date = clean_text(row.get('落塵量結束檢測日期'))
                dust_fall_ton_km2_month = safe_float(row.get('落塵量.噸每平方公里每月'))
                remarks = clean_text(row.get('備註'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO air_quality_monitoring (
                        station_name, station_id, particle_start_date, particle_end_date,
                        weather, tsp_ug_m3, pm10_ug_m3, hexane_extract_ug_m3,
                        chloride_ug_m3, nitrate_ug_m3, sulfate_ug_m3, lead_ug_m3,
                        dust_fall_start_date, dust_fall_end_date, dust_fall_ton_km2_month, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    station_name, station_id, particle_start_date, particle_end_date,
                    weather, tsp_ug_m3, pm10_ug_m3, hexane_extract_ug_m3,
                    chloride_ug_m3, nitrate_ug_m3, sulfate_ug_m3, lead_ug_m3,
                    dust_fall_start_date, dust_fall_end_date, dust_fall_ton_km2_month, remarks
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
        logger.error(f"Error parsing air quality data: {e}")
        raise


if __name__ == "__main__":
    scrape_air_quality()
