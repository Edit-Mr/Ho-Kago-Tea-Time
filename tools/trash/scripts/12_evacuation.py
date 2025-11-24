"""
Scraper for Hsinchu City Evacuation Guides Data
Source: https://opendata.hccg.gov.tw/OpenDataDetail.aspx?n=1&s=909
Formats: XLSX, CSV, XML, JSON
"""

import pandas as pd
import logging
from utils import get_connection, download_file, clean_text, safe_int, log_progress, read_excel_file

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data URL (XLSX format)
DATA_URL = "https://opendata.hccg.gov.tw/OpenDataFileHit.ashx?ID=E2EAAEAF592F70E9&u=77DFE16E459DFCE30371C36CCE30AFF2620C9FA93F99248767110C1E4071F137C5FBEE507EBE009F2A6AFAF641DA977A64F17022051451A2CBF7A1A3C8C8BC3A0C5F0EC7FC2A5BD7966B8C57716D1B9C78297503254B772FA81E3548CD96444559902E35EBD16F3AF911E34E04141FF21C48DAB1BB7AB4DE"


def scrape_evacuation():
    """Scrape evacuation guides data and insert into database"""
    logger.info("Starting evacuation guides data scraping...")

    # Download file
    content = download_file(DATA_URL)
    if not content:
        logger.error("Failed to download evacuation guides data")
        return

    try:
        # Parse CSV
                # Parse XLSX (not CSV!)
        df = read_excel_file(content)
        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Columns: {df.columns.tolist()}")

        logger.info(f"Downloaded {len(df)} evacuation guide records")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Expected columns: 縣市別代碼, 地址-行政區域代碼, 民國年, 區別說明, 網址
                county_code = clean_text(row.get('縣市別代碼'))
                district_code = clean_text(row.get('地址-行政區域代碼'))
                roc_year = safe_int(row.get('民國年'))
                district_description = clean_text(row.get('區別說明'))
                url = clean_text(row.get('網址'))

                # Insert into database
                cursor.execute("""
                    INSERT INTO evacuation_guides (
                        county_code, district_code, roc_year, district_description, url
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    county_code, district_code, roc_year, district_description, url
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
        logger.error(f"Error parsing evacuation guides data: {e}")
        raise


if __name__ == "__main__":
    scrape_evacuation()
