"""
Scraper for Hsinchu City Building Permits Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=948
Formats: XLSX, CSV, XML, JSON
Coverage: 2012-2024
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_int, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=BF42E334BE5C388E&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977AC766D3105BFAE4FCF2CE628E896558F4560389012747957C60EDA0619FEFC9F786A128BE03295F1AFB6ED49BAC6DA4727052DE83562696E0FA19E41F61FC5E567DEB37AF5927B951"


def scrape_building_permits():
    """Scrape building permits data and insert into database"""
    logger.info("Starting building permits data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download building permits data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} building permit records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 序號, 執照字號, 建築地點, 門牌地址, 地上層數, 地下層數,
                # 戶數, 總樓地板面積, 建築物用途, 監造人, 承造人, 供公眾,
                # 土地使用分區, 棟數, 核准日期, 領照日期, 構造種類

                serial_number = clean_text(row.get('序號'))
                permit_number = clean_text(row.get('執照字號'))
                building_location = clean_text(row.get('建築地點'))
                address = clean_text(row.get('門牌地址'))
                above_ground_floors = safe_int(row.get('地上層數'))
                below_ground_floors = safe_int(row.get('地下層數'))
                unit_count = safe_int(row.get('戶數'))
                total_floor_area = safe_float(row.get('總樓地板面積'))
                building_use = clean_text(row.get('建築物用途'))
                supervisor = clean_text(row.get('監造人'))
                contractor = clean_text(row.get('承造人'))
                public_access = clean_text(row.get('供公眾'))
                land_use_zone = clean_text(row.get('土地使用分區'))
                building_count = safe_int(row.get('棟數'))
                approval_date = clean_text(row.get('核准日期'))
                permit_date = clean_text(row.get('領照日期'))
                construction_type = clean_text(row.get('構造種類'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO building_permits (
                        serial_number, permit_number, building_location, address,
                        above_ground_floors, below_ground_floors, unit_count, total_floor_area,
                        building_use, supervisor, contractor, public_access, land_use_zone,
                        building_count, approval_date, permit_date, construction_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    serial_number, permit_number, building_location, address,
                    above_ground_floors, below_ground_floors, unit_count, total_floor_area,
                    building_use, supervisor, contractor, public_access, land_use_zone,
                    building_count, approval_date, permit_date, construction_type
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
        logger.error(f"Error parsing building permits data: {e}")
        raise


if __name__ == "__main__":
    scrape_building_permits()
