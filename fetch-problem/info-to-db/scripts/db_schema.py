"""
Database schema initialization for Hsinchu City Open Data
Creates all necessary tables in SQLite database
"""

import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "hsinchu_data.db"


def get_connection():
    """Get database connection"""
    return sqlite3.connect(DB_PATH)


def create_tables():
    """Create all tables in the database"""
    conn = get_connection()
    cursor = conn.cursor()

    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON")

    print("Creating tables...")

    # 1. Population Data
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS population_age_by_neighborhood (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT,
        neighborhood TEXT,
        age_group TEXT,
        male_count INTEGER,
        female_count INTEGER,
        total_count INTEGER,
        report_year_month TEXT,
        data_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created population_age_by_neighborhood")

    # 2. Parks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        park_id TEXT UNIQUE,
        city TEXT,
        postal_code TEXT,
        park_name TEXT NOT NULL,
        urban_planning_code TEXT,
        location TEXT,
        area_code TEXT,
        district TEXT,
        neighborhood TEXT,
        population_served INTEGER,
        area_hectares REAL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created parks")

    # 3. Playgrounds
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS playgrounds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serial_number TEXT,
        park_name TEXT NOT NULL,
        district TEXT,
        area_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created playgrounds")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS playground_facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playground_id INTEGER,
        facility_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(playground_id) REFERENCES playgrounds(id) ON DELETE CASCADE
    )
    """)
    print("✓ Created playground_facilities")

    # 4. Public Toilets
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS public_toilets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        toilet_id TEXT UNIQUE,
        toilet_name TEXT,
        address_or_location TEXT,
        managing_organization TEXT,
        facility_grade TEXT,
        toilet_type TEXT,
        county_code TEXT,
        district_code TEXT,
        village_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created public_toilets")

    # 5. Street Lights
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS street_lights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        light_code TEXT UNIQUE,
        fixture_type TEXT,
        fixture_manufacturer TEXT,
        pole_category TEXT,
        pole_type TEXT,
        pole_height REAL,
        wattage INTEGER,
        district_code TEXT,
        township TEXT,
        village TEXT,
        county_code TEXT,
        address TEXT,
        twd97_x REAL,
        twd97_y REAL,
        wgs84_longitude REAL,
        wgs84_latitude REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created street_lights")

    # 6. Bridge Inspections
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bridge_inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        county_code TEXT,
        county_name TEXT,
        inspection_date DATE,
        inspection_unit TEXT,
        bridge_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created bridge_inspections")

    # 7. Road Noise Monitoring
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS road_noise_monitoring_stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT UNIQUE,
        station_name TEXT NOT NULL,
        road_width REAL,
        control_zone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created road_noise_monitoring_stations")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS road_noise_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT,
        measurement_year INTEGER,
        measurement_month INTEGER,
        measurement_day INTEGER,
        hour_00_01 REAL,
        hour_01_02 REAL,
        hour_02_03 REAL,
        hour_03_04 REAL,
        hour_04_05 REAL,
        hour_05_06 REAL,
        hour_06_07 REAL,
        hour_07_08 REAL,
        hour_08_09 REAL,
        hour_09_10 REAL,
        hour_10_11 REAL,
        hour_11_12 REAL,
        hour_12_13 REAL,
        hour_13_14 REAL,
        hour_14_15 REAL,
        hour_15_16 REAL,
        hour_16_17 REAL,
        hour_17_18 REAL,
        hour_18_19 REAL,
        hour_19_20 REAL,
        hour_20_21 REAL,
        hour_21_22 REAL,
        hour_22_23 REAL,
        hour_23_24 REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(station_id) REFERENCES road_noise_monitoring_stations(station_id) ON DELETE CASCADE
    )
    """)
    print("✓ Created road_noise_measurements")

    # 8. Sidewalks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sidewalks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_serial TEXT UNIQUE,
        road_name TEXT,
        road_start TEXT,
        road_end TEXT,
        sidewalk_direction TEXT,
        road_centerline_length_m REAL,
        road_width_with_sidewalks_m REAL,
        lane_width_without_sidewalks_m REAL,
        sidewalk_length_m REAL,
        sidewalk_total_width_m REAL,
        public_facility_belt_width_m REAL,
        pedestrian_passage_width_m REAL,
        sidewalk_net_width_m REAL,
        pavement_type TEXT,
        sidewalk_area_sqm REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created sidewalks")

    # 9. YouBike Stations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS youbike_stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_name TEXT NOT NULL,
        station_location TEXT,
        latitude REAL,
        longitude REAL,
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created youbike_stations")

    # 10. Fire Hazard Locations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fire_hazard_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        county_code TEXT,
        roc_date TEXT,
        facility_name TEXT NOT NULL,
        address TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created fire_hazard_locations")

    # 11. CCTV Cameras
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cctv_cameras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agency_code TEXT,
        county_code TEXT,
        precinct TEXT,
        camera_name TEXT NOT NULL,
        update_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created cctv_cameras")

    # 12. Evacuation Guides
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evacuation_guides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        county_code TEXT,
        district_code TEXT,
        roc_year INTEGER,
        district_description TEXT,
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created evacuation_guides")

    # 13. Land Prices
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS land_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        city_code TEXT,
        section_code TEXT,
        land_section TEXT,
        lot_number TEXT,
        announced_value_twd REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created land_prices")

    # 14. Building Permits
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS building_permits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serial_number TEXT,
        permit_number TEXT UNIQUE,
        building_location TEXT,
        address TEXT,
        above_ground_floors INTEGER,
        below_ground_floors INTEGER,
        unit_count INTEGER,
        total_floor_area REAL,
        building_use TEXT,
        supervisor TEXT,
        contractor TEXT,
        public_access TEXT,
        land_use_zone TEXT,
        building_count INTEGER,
        approval_date DATE,
        permit_date DATE,
        construction_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created building_permits")

    # 15. Construction Projects
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS construction_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serial_number TEXT,
        project_name TEXT NOT NULL,
        contractor_name TEXT,
        certifying_engineer TEXT,
        project_location TEXT,
        project_type TEXT,
        project_amount REAL,
        certification_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created construction_projects")

    # 16. Garbage Collection Routes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS garbage_collection_routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        county_code TEXT,
        shift TEXT,
        route_name TEXT,
        sequence INTEGER,
        stop_location TEXT,
        estimated_arrival TEXT,
        estimated_departure TEXT,
        duration TEXT,
        vehicle_number TEXT,
        driver TEXT,
        crew TEXT,
        collection_day TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created garbage_collection_routes")

    # 17. Air Quality Monitoring
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS air_quality_monitoring (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_name TEXT,
        station_id TEXT,
        particle_start_date DATE,
        particle_end_date DATE,
        weather TEXT,
        tsp_ug_m3 REAL,
        pm10_ug_m3 REAL,
        hexane_extract_ug_m3 REAL,
        chloride_ug_m3 REAL,
        nitrate_ug_m3 REAL,
        sulfate_ug_m3 REAL,
        lead_ug_m3 REAL,
        dust_fall_start_date DATE,
        dust_fall_end_date DATE,
        dust_fall_ton_km2_month REAL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created air_quality_monitoring")

    # 18. Special Foods
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS special_foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        website TEXT,
        phone TEXT,
        district TEXT,
        area_code TEXT,
        address TEXT,
        introduction TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    print("✓ Created special_foods")

    # Create indexes for better query performance
    print("\nCreating indexes...")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_parks_district ON parks(district)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_playgrounds_district ON playgrounds(district)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_street_lights_district ON street_lights(district_code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_youbike_station_name ON youbike_stations(station_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_building_permits_district ON building_permits(building_location)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_special_foods_district ON special_foods(district)")

    print("✓ Created indexes")

    conn.commit()
    conn.close()

    print(f"\n✅ Database initialized successfully at: {DB_PATH}")
    print(f"📊 Total tables created: 18")


def drop_all_tables():
    """Drop all tables (use with caution!)"""
    conn = get_connection()
    cursor = conn.cursor()

    tables = [
        'population_age_by_neighborhood',
        'parks',
        'playgrounds',
        'playground_facilities',
        'public_toilets',
        'street_lights',
        'bridge_inspections',
        'road_noise_monitoring_stations',
        'road_noise_measurements',
        'sidewalks',
        'youbike_stations',
        'fire_hazard_locations',
        'cctv_cameras',
        'evacuation_guides',
        'land_prices',
        'building_permits',
        'construction_projects',
        'garbage_collection_routes',
        'air_quality_monitoring',
        'special_foods'
    ]

    for table in tables:
        cursor.execute(f"DROP TABLE IF EXISTS {table}")
        print(f"Dropped table: {table}")

    conn.commit()
    conn.close()
    print("All tables dropped")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        confirm = input("⚠️  Are you sure you want to drop all tables? (yes/no): ")
        if confirm.lower() == "yes":
            drop_all_tables()
        else:
            print("Aborted")
    else:
        create_tables()
