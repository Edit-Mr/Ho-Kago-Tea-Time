"""
Scraper for Hsinchu City Road Noise Monitoring Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=302
Formats: XLSX, CSV, XML, JSON
Complex: 24 hourly noise measurement columns
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_int, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=E739987206DDFCFD&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977AE8AC30B810A9A58282DDD8971AE0EF8F3729E0F3B63E4744DE091B937320E401E73CCC9EB9D84DEA8C5921CE0AEC7D3C9F7F4702E6A118B1E1F59A575AC01FF8CB65C4CCCCCC09B7"


def scrape_road_noise():
    """Scrape road noise monitoring data with 24 hourly columns and insert into database"""
    logger.info("Starting road noise monitoring data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download road noise data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} road noise monitoring records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        # Track unique stations
        stations_added = set()
        records_processed = 0
        measurement_records = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Station info
                station_name = clean_text(row.get('監測站名'))
                station_id = clean_text(row.get('監測站編號'))
                road_width = safe_float(row.get('道路寬度'))
                control_zone = clean_text(row.get('管制區類別'))

                # Date info
                measurement_year = safe_int(row.get('年'))
                measurement_month = safe_int(row.get('月'))
                measurement_day = safe_int(row.get('日'))

                # Insert station if not already added
                if station_id and station_id not in stations_added:
                    cursor.execute("""
                        INSERT OR IGNORE INTO road_noise_monitoring_stations (
                            station_id, station_name, road_width, control_zone
                        ) VALUES (?, ?, ?, ?)
                    """, (station_id, station_name, road_width, control_zone))
                    stations_added.add(station_id)

                # Extract 24 hourly measurements
                hour_00_01 = safe_float(row.get('0-1時'))
                hour_01_02 = safe_float(row.get('1-2時'))
                hour_02_03 = safe_float(row.get('2-3時'))
                hour_03_04 = safe_float(row.get('3-4時'))
                hour_04_05 = safe_float(row.get('4-5時'))
                hour_05_06 = safe_float(row.get('5-6時'))
                hour_06_07 = safe_float(row.get('6-7時'))
                hour_07_08 = safe_float(row.get('7-8時'))
                hour_08_09 = safe_float(row.get('8-9時'))
                hour_09_10 = safe_float(row.get('9-10時'))
                hour_10_11 = safe_float(row.get('10-11時'))
                hour_11_12 = safe_float(row.get('11-12時'))
                hour_12_13 = safe_float(row.get('12-13時'))
                hour_13_14 = safe_float(row.get('13-14時'))
                hour_14_15 = safe_float(row.get('14-15時'))
                hour_15_16 = safe_float(row.get('15-16時'))
                hour_16_17 = safe_float(row.get('16-17時'))
                hour_17_18 = safe_float(row.get('17-18時'))
                hour_18_19 = safe_float(row.get('18-19時'))
                hour_19_20 = safe_float(row.get('19-20時'))
                hour_20_21 = safe_float(row.get('20-21時'))
                hour_21_22 = safe_float(row.get('21-22時'))
                hour_22_23 = safe_float(row.get('22-23時'))
                hour_23_24 = safe_float(row.get('23-24時'))

                # Insert measurement record
                cursor.execute("""
                    INSERT INTO road_noise_measurements (
                        station_id, measurement_year, measurement_month, measurement_day,
                        hour_00_01, hour_01_02, hour_02_03, hour_03_04, hour_04_05, hour_05_06,
                        hour_06_07, hour_07_08, hour_08_09, hour_09_10, hour_10_11, hour_11_12,
                        hour_12_13, hour_13_14, hour_14_15, hour_15_16, hour_16_17, hour_17_18,
                        hour_18_19, hour_19_20, hour_20_21, hour_21_22, hour_22_23, hour_23_24
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    station_id, measurement_year, measurement_month, measurement_day,
                    hour_00_01, hour_01_02, hour_02_03, hour_03_04, hour_04_05, hour_05_06,
                    hour_06_07, hour_07_08, hour_08_09, hour_09_10, hour_10_11, hour_11_12,
                    hour_12_13, hour_13_14, hour_14_15, hour_15_16, hour_16_17, hour_17_18,
                    hour_18_19, hour_19_20, hour_20_21, hour_21_22, hour_22_23, hour_23_24
                ))

                measurement_records += 1

            except Exception as e:
                logger.error(f"Error processing row {idx}: {e}")
                errors += 1

            records_processed += 1

        conn.commit()
        conn.close()

        logger.info(f"Inserted {len(stations_added)} stations, {measurement_records} measurements")
        log_progress(__name__, records_processed, measurement_records, errors)

    except Exception as e:
        logger.error(f"Error parsing road noise data: {e}")
        raise


if __name__ == "__main__":
    scrape_road_noise()
