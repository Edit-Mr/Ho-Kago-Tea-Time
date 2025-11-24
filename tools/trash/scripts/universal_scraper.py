"""
Universal scraper template for Hsinchu Open Data (XLSX format)
Handles flexible column mapping and data insertion
"""

import pandas as pd
import logging
from io import BytesIO
from utils import get_connection, clean_text, safe_int, safe_float, log_progress

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def scrape_data(url, table_name, column_mapping, required_columns=None):
    """
    Universal scraper function

    Args:
        url: Data source URL (XLSX format)
        table_name: Target database table
        column_mapping: Dict mapping source columns to DB columns with type converters
            Example: {
                'source_col_name': ('db_col_name', converter_func),
                '公園名稱': ('park_name', clean_text),
                '面積公頃': ('area_hectares', safe_float)
            }
        required_columns: List of DB columns that must have values

    Returns:
        Tuple of (processed, inserted, errors)
    """
    from utils import download_file

    logger.info(f"Starting {table_name} data scraping...")

    # Download file
    content = download_file(url)
    if not content:
        logger.error(f"Failed to download {table_name} data")
        return (0, 0, 1)

    try:
        # Parse XLSX
        df = pd.read_excel(BytesIO(content), engine='openpyxl')

        logger.info(f"Downloaded {len(df)} {table_name} records")
        logger.info(f"Available columns: {df.columns.tolist()}")

        # Connect to database
        conn = get_connection()
        cursor = conn.cursor()

        records_processed = 0
        records_inserted = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                # Build data dict
                data = {}

                # Map columns
                for source_col, (db_col, converter) in column_mapping.items():
                    if source_col in df.columns:
                        raw_value = row[source_col]
                        data[db_col] = converter(raw_value) if converter else raw_value
                    else:
                        # Try flexible matching (contains, case-insensitive)
                        matched = False
                        for col in df.columns:
                            if source_col.lower() in str(col).lower():
                                raw_value = row[col]
                                data[db_col] = converter(raw_value) if converter else raw_value
                                matched = True
                                break
                        if not matched:
                            data[db_col] = None

                # Check required columns
                if required_columns:
                    skip = False
                    for req_col in required_columns:
                        if not data.get(req_col):
                            skip = True
                            break
                    if skip:
                        continue

                # Build INSERT statement
                columns = list(data.keys())
                placeholders = ', '.join(['?' for _ in columns])
                sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

                cursor.execute(sql, tuple(data.values()))
                records_inserted += 1

            except Exception as e:
                logger.error(f"Error processing row {idx}: {e}")
                errors += 1

            records_processed += 1

        conn.commit()
        conn.close()

        log_progress(table_name, records_processed, records_inserted, errors)
        return (records_processed, records_inserted, errors)

    except Exception as e:
        logger.error(f"Error parsing {table_name} data: {e}")
        raise


# Example usage for different data sources
if __name__ == "__main__":
    import json

    # Load URLs
    with open('data_urls.json', 'r') as f:
        urls = json.load(f)

    # Example 1: YouBike
    youbike_mapping = {
        '站點名稱': ('station_name', clean_text),
        '站點位置': ('station_location', clean_text),
        '緯度': ('latitude', safe_float),
        '經度': ('longitude', safe_float),
        '圖片': ('photo_url', clean_text),
    }

    scrape_data(
        urls['youbike'],
        'youbike_stations',
        youbike_mapping,
        required_columns=['station_name']
    )

    # Example 2: Special Foods
    foods_mapping = {
        '名稱': ('name', clean_text),
        '網址': ('website', clean_text),
        '電話': ('phone', clean_text),
        '行政區': ('district', clean_text),
        'AreaCode': ('area_code', clean_text),
        '地址': ('address', clean_text),
        '介紹': ('introduction', clean_text),
    }

    scrape_data(
        urls['special_foods'],
        'special_foods',
        foods_mapping,
        required_columns=['name']
    )
