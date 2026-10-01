import sys
from datetime import datetime, date, timedelta, time
import random

sys.path.insert(0, 'backend')
from pets import SessionLocal, Attendance, SalesExecutive

db = SessionLocal()

try:
    executives = db.query(SalesExecutive).all()
    print(f"Found {len(executives)} sales executives in database.")
    
    current_count = db.query(Attendance).count()
    print(f"Current attendance count: {current_count}")
    
    # Get existing (executive_id, attendance_date) to prevent duplicates
    existing = {
        (exec_id, att_date) 
        for exec_id, att_date in db.query(Attendance.executive_id, Attendance.attendance_date).all()
    }
    
    needed = 1000 - current_count
    print(f"Need to add approx {needed} records to reach 1000 records.")
    
    if needed > 0:
        added = 0
        curr_date = date(2026, 9, 30)
        
        areas_by_reg = {
            "Karnataka": [
                "Jayanagar, Bengaluru",
                "Indiranagar, Bengaluru",
                "Koramangala, Bengaluru",
                "Whitefield, Bengaluru",
                "Malleshwaram, Bengaluru",
                "HSR Layout, Bengaluru"
            ],
            "Tamil Nadu": [
                "T. Nagar, Chennai",
                "Anna Nagar, Chennai",
                "Adyar, Chennai",
                "Velachery, Chennai",
                "Guindy, Chennai",
                "Coimbatore Central, Coimbatore"
            ]
        }
        
        while current_count + added < 1000 and curr_date > date(2026, 1, 1):
            # Skip Sundays
            if curr_date.weekday() != 6:
                for exec_obj in executives:
                    if current_count + added >= 1000:
                        break
                    if (exec_obj.id, curr_date) in existing:
                        continue
                    
                    reg = exec_obj.region or "Karnataka"
                    area_list = areas_by_reg.get(reg, areas_by_reg["Karnataka"])
                    chosen_area = random.choice(area_list)
                    
                    in_hour = 9
                    in_min = random.randint(5, 45)
                    in_sec = random.randint(0, 59)
                    login_dt = datetime.combine(curr_date, time(in_hour, in_min, in_sec))
                    
                    out_hour = random.choice([17, 18, 19])
                    out_min = random.randint(10, 55)
                    out_sec = random.randint(0, 59)
                    logout_dt = datetime.combine(curr_date, time(out_hour, out_min, out_sec))
                    
                    lunch_out_dt = datetime.combine(curr_date, time(13, random.randint(0, 15), 0))
                    lunch_in_dt = datetime.combine(curr_date, time(13, random.randint(45, 59), 0))
                    
                    diff_mins = int((logout_dt - login_dt).total_seconds() / 60) - 45
                    
                    att = Attendance(
                        executive_id=exec_obj.id,
                        executive_name=exec_obj.name,
                        executive_code=exec_obj.code or f"SE-00{exec_obj.id}",
                        attendance_date=curr_date,
                        login_time=login_dt,
                        logout_time=logout_dt,
                        lunch_out_time=lunch_out_dt,
                        lunch_in_time=lunch_in_dt,
                        login_area=chosen_area,
                        logout_area=chosen_area,
                        login_latitude=12.9266 if "Bengaluru" in chosen_area else 13.0827,
                        login_longitude=77.5897 if "Bengaluru" in chosen_area else 80.2707,
                        logout_latitude=12.9266 if "Bengaluru" in chosen_area else 13.0827,
                        logout_longitude=77.5897 if "Bengaluru" in chosen_area else 80.2707,
                        total_working_minutes=max(420, diff_mins),
                        status="Completed"
                    )
                    db.add(att)
                    existing.add((exec_obj.id, curr_date))
                    added += 1
            curr_date -= timedelta(days=1)
        
        db.commit()
        print(f"Successfully committed {added} new attendance records.")
    
    total = db.query(Attendance).count()
    print(f"Final attendance count in database: {total}")

finally:
    db.close()
