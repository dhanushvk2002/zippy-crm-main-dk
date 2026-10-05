import os
from sqlalchemy import text
from pets import engine

def migrate():
    cols = [
    ('login_village', 'VARCHAR(150)'),
    ('login_area', 'VARCHAR(150)'),
    ('login_street', 'VARCHAR(200)'),
    ('login_taluk', 'VARCHAR(150)'),
    ('login_city', 'VARCHAR(150)'),
    ('login_district', 'VARCHAR(150)'),
    ('login_state', 'VARCHAR(150)'),
    ('login_pincode', 'VARCHAR(20)'),
    ('login_country', "VARCHAR(100) DEFAULT 'India'"),
    ('login_location_source', "VARCHAR(50) DEFAULT 'BROWSER_GPS'"),
    ('login_formatted_address', 'TEXT'),
]
    with engine.connect() as conn:
        existing = [r[0] for r in conn.execute(text('DESCRIBE attendance')).fetchall()]
        for col_name, col_type in cols:
            if col_name not in existing:
                conn.execute(text(f'ALTER TABLE attendance ADD COLUMN {col_name} {col_type}'))
                print(f'Added column {col_name}')
        conn.commit()
    print('Migration complete!')

if __name__ == '__main__':
    migrate()
