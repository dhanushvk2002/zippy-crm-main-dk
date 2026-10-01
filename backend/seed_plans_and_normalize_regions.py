import sys
from datetime import datetime, date
import random

sys.path.insert(0, "backend")
from pets import SessionLocal, SalesExecutive, MonthlyPlan, PlanVisit, Doctor

db = SessionLocal()

try:
    print("Normalizing sales executive regions...")
    execs = db.query(SalesExecutive).all()
    for e in execs:
        reg = (e.region or "").strip().lower().replace(" ", "").replace("_", "")
        if "tamil" in reg:
            e.region = "Tamil Nadu"
        elif "karnat" in reg:
            e.region = "Karnataka"
        elif "assam" in reg:
            e.region = "Assam"
        else:
            e.region = "Karnataka"
    db.commit()
    print("Regions normalized successfully.")

    # Check doctors
    doctors = db.query(Doctor).all()
    print(f"Found {len(doctors)} doctors in database.")
    if not doctors:
        print("No doctors found!")
        sys.exit(0)

    doc_ids = [d.id for d in doctors]

    # Months to seed
    months = [
        ("2026-10", "October 2026", [date(2026, 10, d) for d in range(1, 28) if date(2026, 10, d).weekday() != 6]),
        ("2026-09", "September 2026", [date(2026, 9, d) for d in range(1, 29) if date(2026, 9, d).weekday() != 6])
    ]

    for month_key, month_label, working_dates in months:
        print(f"\nSeeding plans for {month_label} ({month_key})...")
        for e in execs:
            existing_plan = db.query(MonthlyPlan).filter(
                MonthlyPlan.executive_id == e.id,
                MonthlyPlan.month_key == month_key
            ).first()

            # Randomize performance per executive so data looks realistic and dynamic
            random.seed(e.id * 100 + (10 if "10" in month_key else 9))
            
            # Select 8 to 14 doctors for the plan
            sample_docs = random.sample(doc_ids, min(len(doc_ids), random.randint(10, 14)))
            num_docs = len(sample_docs)

            if not existing_plan:
                status = "Approved" if month_key == "2026-09" else random.choice(["Approved", "Approved", "In Progress", "Submitted"])
                plan = MonthlyPlan(
                    executive_id=e.id,
                    month_key=month_key,
                    month_label=month_label,
                    working_days=len(working_dates),
                    daily_target=max(1, round(num_docs / 20)),
                    total_doctors=num_docs,
                    planning_method="auto",
                    status=status,
                    submitted_at=datetime(2026, int(month_key.split("-")[1]), 1, 9, 30),
                    approved_at=datetime(2026, int(month_key.split("-")[1]), 1, 11, 0) if status in ("Approved", "In Progress") else None,
                    approved_by="Emily (Sales Manager)" if status in ("Approved", "In Progress") else None,
                )
                db.add(plan)
                db.flush()
            else:
                plan = existing_plan

            # Check visits
            existing_visits = db.query(PlanVisit).filter(PlanVisit.plan_id == plan.id).all()
            if not existing_visits:
                # Target completion
                if month_key == "2026-09":
                    target_completed = random.randint(int(num_docs * 0.75), num_docs)
                else:
                    # October 2026: progress so far
                    target_completed = random.randint(int(num_docs * 0.4), int(num_docs * 0.85))

                for idx, doc_id in enumerate(sample_docs):
                    v_date = working_dates[idx % len(working_dates)]
                    if idx < target_completed:
                        v_status = "Completed"
                    elif idx == target_completed and month_key == "2026-10":
                        v_status = "In Progress"
                    else:
                        v_status = "Planned"

                    visit = PlanVisit(
                        plan_id=plan.id,
                        executive_id=e.id,
                        doctor_id=doc_id,
                        scheduled_date=v_date,
                        visit_time=f"{random.randint(9, 16)}:00",
                        status=v_status
                    )
                    db.add(visit)

        db.commit()
        print(f"Plans & visits committed for {month_label}.")

    print("\nAll executive monthly plans seeded successfully!")

except Exception as err:
    db.rollback()
    print("Error seeding plans:", err)
    raise err
finally:
    db.close()
