"""
Scraper for Hsinchu City Construction Project Signing Records
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=12&s=956
Formats: XLSX, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_float, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=9CA39EC3EE7C0F8D&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A3D5F536B72962F644F1F6F1B17C7A2B10BBD2C14913C0B8CB27A26BE154293AF6069F2B9A5BA5BF18FC76394293C7100428AA019F4A2BC8FA954B7CA7E00752F2B7C02945B3646A9"


def scrape_construction_projects():
    """Scrape construction projects data and insert into database"""
    logger.info("Starting construction projects data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download construction projects data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} construction project records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 序號, 工程名稱, 營造廠名稱, 簽證技師或建築師,
                # 工程地點, 工程性質, 工程金額, 簽證日期

                serial_number = clean_text(row.get('序號'))
                project_name = clean_text(row.get('工程名稱'))
                contractor_name = clean_text(row.get('營造廠名稱'))
                certifying_engineer = clean_text(row.get('簽證技師或建築師'))
                project_location = clean_text(row.get('工程地點'))
                project_type = clean_text(row.get('工程性質'))
                project_amount = safe_float(row.get('工程金額'))
                certification_date = clean_text(row.get('簽證日期'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO construction_projects (
                        serial_number, project_name, contractor_name, certifying_engineer,
                        project_location, project_type, project_amount, certification_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    serial_number, project_name, contractor_name, certifying_engineer,
                    project_location, project_type, project_amount, certification_date
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
        logger.error(f"Error parsing construction projects data: {e}")
        raise


if __name__ == "__main__":
    scrape_construction_projects()
