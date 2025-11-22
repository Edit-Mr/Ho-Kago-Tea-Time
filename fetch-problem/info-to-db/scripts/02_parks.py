"""
Scraper for Hsinchu City Parks Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=71
Formats: CSV, JSON, XML, XLSX
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_int, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=A029902BC58DE6FC&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977ADA6248667C54AF4567D74D50F5135B2F968446607DE57BD3E047E96787CC44125F7A645FE9510E93C3B3D8C3AC7AAE876E6DE1E0D8CE1BA8D26D6AD377C17F04"


def scrape_parks():
    """Scrape parks data and insert into database"""
    logger.info("Starting parks data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download parks data")
        return

    try:
        # Parse XLSX (not CSV!)
        df = read_excel_file(content)

        logger.info(f"Downloaded {len(df)} park records")
        logger.info(f"Columns: {df.columns.tolist()}")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Flexible column mapping
                park_id = None
                city = None
                postal_code = None
                park_name = None
                urban_planning_code = None
                location = None
                area_code = None
                district = None
                neighborhood = None
                population_served = None
                area_hectares = None
                remarks = None

                # Map columns flexibly
                for col in df.columns:
                    col_lower = str(col).lower()
                    if '編號' in str(col) and not '都計' in str(col) and not '區域' in str(col):
                        park_id = clean_text(row[col])
                    elif '新竹市' in str(col) or col == '市':
                        city = clean_text(row[col])
                    elif '郵遞區號' in str(col) or '郵政' in str(col):
                        postal_code = clean_text(row[col])
                    elif '公園名稱' in str(col) or (('公園' in str(col) or 'park' in col_lower) and '名' in str(col)):
                        park_name = clean_text(row[col])
                    elif '都計編號' in str(col):
                        urban_planning_code = clean_text(row[col])
                    elif '地點' in str(col) or '位置' in str(col) or 'location' in col_lower:
                        location = clean_text(row[col])
                    elif '區域代碼' in str(col) or 'area' in col_lower and 'code' in col_lower:
                        area_code = clean_text(row[col])
                    elif '區別' in str(col) or 'district' in col_lower:
                        district = clean_text(row[col])
                    elif '里別' in str(col) or '里名' in str(col):
                        neighborhood = clean_text(row[col])
                    elif '人數' in str(col) or 'population' in col_lower:
                        population_served = safe_int(row[col])
                    elif '面積' in str(col) or 'area' in col_lower:
                        area_hectares = safe_float(row[col])
                    elif '備註' in str(col) or 'remark' in col_lower or 'note' in col_lower:
                        remarks = clean_text(row[col])

                # Skip if no park name
                if not park_name:
                    continue

                # Insert into database
                cursor.execute("""
                    INSERT INTO parks (
                        park_id, city, postal_code, park_name, urban_planning_code,
                        location, area_code, district, neighborhood, population_served,
                        area_hectares, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    park_id, city, postal_code, park_name, urban_planning_code,
                    location, area_code, district, neighborhood, population_served,
                    area_hectares, remarks
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
        logger.error(f"Error parsing parks data: {e}")
        raise


if __name__ == "__main__":
    scrape_parks()
