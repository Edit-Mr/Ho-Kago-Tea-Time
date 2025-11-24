# Hsinchu City Open Data ETL Pipeline

Automated data collection and storage system for Hsinchu City open data sources.

## Overview

This project fetches data from 18 Hsinchu City open data sources and stores them in a SQLite database for analysis and visualization.

## Project Structure

```
info-to-db/
├── hsinchu_data.db          # SQLite database (148KB, 18 tables)
├── links.md                 # Source URLs documentation
├── sources.md               # Data schema mapping
├── CLAUDE.md                # Technical architecture notes
├── README.md                # This file
└── scripts/
    ├── db_schema.py         # Database initialization
    ├── utils.py             # Shared utility functions
    ├── run_all.py           # Master script to run all scrapers
    ├── 01_population.py     # Population age data (ODS format - manual)
    ├── 02_parks.py          # Parks data
    ├── 03_playgrounds.py    # Children's playgrounds
    ├── 04_public_toilets.py # Public toilets
    ├── 05_street_lights.py  # Street lights with coordinates
    ├── 06_bridge_inspections.py  # Bridge inspections
    ├── 07_road_noise.py     # Road noise monitoring (24-hour data)
    ├── 08_sidewalks.py      # Sidewalk infrastructure
    ├── 09_youbike.py        # YouBike stations
    ├── 10_fire_hazards.py   # Fire hazard locations
    ├── 11_cctv.py           # CCTV cameras
    ├── 12_evacuation.py     # Evacuation guides
    ├── 13_land_prices.py    # Land prices
    ├── 14_building_permits.py    # Building permits
    ├── 15_construction_projects.py  # Construction projects
    ├── 16_garbage_collection.py  # Garbage collection routes
    ├── 17_air_quality.py    # Air quality monitoring
    └── 18_special_foods.py  # Special foods
```

## Quick Start

### 1. Install Dependencies

```bash
cd info-to-db
uv venv
uv pip install pandas requests odfpy openpyxl lxml
```

### 2. Initialize Database

```bash
uv run python scripts/db_schema.py
```

This creates `hsinchu_data.db` with 18 tables.

### 3. Run All Scrapers

```bash
# Run all scrapers (except population - requires manual download)
uv run python scripts/run_all.py

# Include population scraper (requires ODS files)
uv run python scripts/run_all.py --include-population
```

### 4. Run Individual Scrapers

```bash
# Example: Parks data
uv run python scripts/02_parks.py

# Example: YouBike stations
uv run python scripts/09_youbike.py

# Example: Street lights
uv run python scripts/05_street_lights.py
```

## Data Sources

### 1. Population (人口) - 1 table
- **01_population.py**: East District age data by neighborhood
- **Format**: ODS (requires manual download)
- **Note**: Download monthly reports from https://e-household.hccg.gov.tw/

### 2. Parks & Recreation (公園/綠地/休閒) - 4 tables
- **02_parks.py**: Park management locations (50 parks)
- **03_playgrounds.py**: Children's playgrounds with facilities
- **04_public_toilets.py**: Public toilet information

### 3. Infrastructure (道路安全/行人地獄/無障礙/照明) - 6 tables
- **05_street_lights.py**: Street lights with TWD97 & WGS84 coordinates
- **06_bridge_inspections.py**: Bridge inspection records
- **07_road_noise.py**: Road noise monitoring (24 hourly measurements)
- **08_sidewalks.py**: Sidewalk infrastructure (40+ fields)
- **09_youbike.py**: YouBike stations with photos

### 4. Public Safety (居住安全/犯罪) - 3 tables
- **10_fire_hazards.py**: Fire & explosion hazard locations (34 facilities)
- **11_cctv.py**: CCTV camera locations
- **12_evacuation.py**: Evacuation guide resources

### 5. Real Estate (建築/居住) - 3 tables
- **13_land_prices.py**: Land price announcements
- **14_building_permits.py**: Building permits (2012-2024)
- **15_construction_projects.py**: Construction project records

### 6. Environment (垃圾/回收/環境整潔/污染) - 1 table
- **16_garbage_collection.py**: Garbage collection routes & schedules

### 7. Air Quality (生活品質) - 1 table
- **17_air_quality.py**: Air quality monitoring (PM10, TSP, lead, etc.)

### 8. Special Data (奇怪的東西) - 1 table
- **18_special_foods.py**: Hsinchu special foods & restaurants

## Database Schema

18 tables with proper relationships:

- **Foreign Keys**: `playground_facilities` → `playgrounds`, `road_noise_measurements` → `road_noise_monitoring_stations`
- **Indexes**: District, station names, park names for fast queries
- **Timestamps**: All tables include `created_at` and `updated_at`

View full schema in `sources.md`.

## Usage Examples

### Query Examples

```python
import sqlite3

conn = sqlite3.connect('hsinchu_data.db')

# Get all parks in East District
parks = conn.execute("""
    SELECT park_name, area_hectares, location
    FROM parks
    WHERE district = '東區'
    ORDER BY area_hectares DESC
""").fetchall()

# Get YouBike stations with coordinates
stations = conn.execute("""
    SELECT station_name, latitude, longitude, photo_url
    FROM youbike_stations
    WHERE latitude IS NOT NULL
""").fetchall()

# Get street lights in a specific area
lights = conn.execute("""
    SELECT light_code, address, wgs84_latitude, wgs84_longitude
    FROM street_lights
    WHERE township = '新竹市'
""").fetchall()

conn.close()
```

### Special Cases

#### Population Data (ODS Format)

Requires manual download:

1. Visit https://e-household.hccg.gov.tw/ch/home.jsp?id=130&parentpath=0,14,126
2. Download monthly ODS reports to a directory
3. Run: `uv run python scripts/01_population.py /path/to/ods/files`

#### Road Noise Data (24-hour measurements)

Complex structure with 24 hourly columns. Data normalized into:
- `road_noise_monitoring_stations` (station info)
- `road_noise_measurements` (hourly readings)

## Technical Details

### Dependencies

- **pandas**: CSV/Excel/ODS parsing
- **requests**: HTTP downloads
- **odfpy**: ODS file support (for population data)
- **openpyxl**: XLSX file support
- **lxml**: XML parsing

### Error Handling

- Each scraper logs errors but continues processing
- Failed records are counted and reported
- Check `scraping.log` for detailed error information

### Data Validation

- Text fields: Stripped whitespace, None for empty values
- Numbers: Safe conversion with error handling
- Coordinates: TWD97 and WGS84 both stored (where available)

## Maintenance

### Reset Database

```bash
# Drop all tables and recreate
uv run python scripts/db_schema.py --drop
uv run python scripts/db_schema.py
```

### Update Single Dataset

```bash
# Truncate and reload specific table
uv run python scripts/02_parks.py
```

### Check Database

```bash
sqlite3 hsinchu_data.db "SELECT name FROM sqlite_master WHERE type='table';"
```

## Troubleshooting

### Common Issues

1. **Download fails**: Check internet connection, VPN may block Hsinchu gov sites
2. **ODS files**: Ensure `odfpy` is installed: `uv pip install odfpy`
3. **Encoding errors**: Files are UTF-8 with BOM, pandas handles automatically
4. **Foreign key errors**: Ensure parent records exist before inserting children

### Logs

- Console output: Real-time progress
- `scraping.log`: Detailed execution log with timestamps

## Contributing

To add a new data source:

1. Document source in `links.md` and `sources.md`
2. Add table to `db_schema.py`
3. Create scraper script: `19_new_source.py`
4. Add to `run_all.py`
5. Test independently before batch run

## License

This project collects public open data from Hsinchu City Government. Please respect data usage terms.

## Contact

For issues or questions, refer to the source documentation in `links.md`.
