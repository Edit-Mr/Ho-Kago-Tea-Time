"""
Scraper for Hsinchu City Sidewalks Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=280
Formats: CSV, XML, JSON
40+ fields including measurements
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=C2FEEFD5C5448ED6&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A1788172C1486D8C23DC9ADB71A57624CB3BB0B3B6F9212480CCA2D10D767DF4368B3AECC09FA4B30912F9DF8EF69D11EE0C9C27B7F7D54BD7F6599DAD0CE5351"


def scrape_sidewalks():
    """Scrape sidewalks data and insert into database"""
    logger.info("Starting sidewalks data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download sidewalks data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} sidewalk records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Key columns from 40+ available fields
                survey_serial = clean_text(row.get('人行道最小調查單元流水號'))
                road_name = clean_text(row.get('道路名稱'))
                road_start = clean_text(row.get('道路起點'))
                road_end = clean_text(row.get('道路迄點'))
                sidewalk_direction = clean_text(row.get('人行道方向'))
                road_centerline_length_m = safe_float(row.get('道路長度中心線長度公尺'))
                road_width_with_sidewalks_m = safe_float(row.get('道路寬度包含雙向人行道公尺'))
                lane_width_without_sidewalks_m = safe_float(row.get('車道寬度不含人行道公尺'))
                sidewalk_length_m = safe_float(row.get('人行道長度公尺'))
                sidewalk_total_width_m = safe_float(row.get('人行道總寬度公尺'))
                public_facility_belt_width_m = safe_float(row.get('人行道公共設施帶寬度公尺'))
                pedestrian_passage_width_m = safe_float(row.get('行人通行總寬度公尺'))
                sidewalk_net_width_m = safe_float(row.get('人行道淨寬公尺'))
                pavement_type = clean_text(row.get('鋪面類型'))
                sidewalk_area_sqm = safe_float(row.get('人行道面積平方公尺'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO sidewalks (
                        survey_serial, road_name, road_start, road_end, sidewalk_direction,
                        road_centerline_length_m, road_width_with_sidewalks_m, lane_width_without_sidewalks_m,
                        sidewalk_length_m, sidewalk_total_width_m, public_facility_belt_width_m,
                        pedestrian_passage_width_m, sidewalk_net_width_m, pavement_type, sidewalk_area_sqm
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    survey_serial, road_name, road_start, road_end, sidewalk_direction,
                    road_centerline_length_m, road_width_with_sidewalks_m, lane_width_without_sidewalks_m,
                    sidewalk_length_m, sidewalk_total_width_m, public_facility_belt_width_m,
                    pedestrian_passage_width_m, sidewalk_net_width_m, pavement_type, sidewalk_area_sqm
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
        logger.error(f"Error parsing sidewalks data: {e}")
        raise


if __name__ == "__main__":
    scrape_sidewalks()
