"""
Fitness OS Module - Physical optimization tracking.

Manages workout logging, exercise tracking, body metrics, and
meal/nutrition planning. Designed for tracking physical health
as part of the broader LifeOS wellness layer.
"""

from datetime import date, timedelta


class FitnessModule:
    """Manages workouts, body metrics, and nutrition."""

    def __init__(self, db):
        self.db = db

    # ========================================================================
    # Workout Management
    # ========================================================================

    def log_workout(self, type, workout_date=None, name=None,
                    duration_minutes=None, calories_burned=None,
                    intensity=None, notes=None, rating=None):
        """Log a workout session."""
        if workout_date is None:
            workout_date = date.today().isoformat()
        return self.db.execute(
            """INSERT INTO workouts (workout_date, type, name, duration_minutes,
                calories_burned, intensity, notes, rating)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (workout_date, type, name, duration_minutes, calories_burned,
             intensity, notes, rating)
        )

    def add_exercise(self, workout_id, exercise_name, sets=None, reps=None,
                     weight=None, weight_unit='lbs', duration_seconds=None,
                     distance=None, distance_unit='miles', notes=None,
                     sort_order=0):
        """Add an exercise to a workout."""
        return self.db.execute(
            """INSERT INTO workout_exercises (workout_id, exercise_name, sets, reps,
                weight, weight_unit, duration_seconds, distance, distance_unit,
                notes, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (workout_id, exercise_name, sets, reps, weight, weight_unit,
             duration_seconds, distance, distance_unit, notes, sort_order)
        )

    def get_workout(self, workout_id):
        """Get a workout with all its exercises."""
        workout = self.db.execute(
            "SELECT * FROM workouts WHERE id = ?", (workout_id,)
        )
        if not workout:
            return None

        exercises = self.db.execute(
            """SELECT * FROM workout_exercises WHERE workout_id = ?
               ORDER BY sort_order""",
            (workout_id,)
        )

        return {**workout[0], 'exercises': exercises}

    def get_workouts(self, start_date=None, end_date=None, type=None, limit=30):
        """Get workouts with optional filters."""
        sql = "SELECT * FROM workouts WHERE 1=1"
        params = []

        if start_date:
            sql += " AND workout_date >= ?"
            params.append(start_date)
        if end_date:
            sql += " AND workout_date <= ?"
            params.append(end_date)
        if type:
            sql += " AND type = ?"
            params.append(type)

        sql += " ORDER BY workout_date DESC"
        if limit:
            sql += f" LIMIT {int(limit)}"

        return self.db.execute(sql, params)

    def get_recent_workouts(self, days=7):
        """Get workouts from the last N days."""
        start = (date.today() - timedelta(days=days)).isoformat()
        return self.get_workouts(start_date=start)

    def delete_workout(self, workout_id):
        """Delete a workout and all its exercises."""
        self.db.execute("DELETE FROM workouts WHERE id = ?", (workout_id,))

    # ========================================================================
    # Body Metrics
    # ========================================================================

    def log_metrics(self, metric_date=None, weight=None, weight_unit='lbs',
                    body_fat_pct=None, sleep_hours=None, water_oz=None,
                    steps=None, resting_heart_rate=None, notes=None):
        """Log daily body metrics."""
        if metric_date is None:
            metric_date = date.today().isoformat()

        existing = self.db.execute(
            "SELECT id FROM body_metrics WHERE metric_date = ?", (metric_date,)
        )

        if existing:
            updates = {}
            if weight is not None:
                updates['weight'] = weight
                updates['weight_unit'] = weight_unit
            if body_fat_pct is not None:
                updates['body_fat_pct'] = body_fat_pct
            if sleep_hours is not None:
                updates['sleep_hours'] = sleep_hours
            if water_oz is not None:
                updates['water_oz'] = water_oz
            if steps is not None:
                updates['steps'] = steps
            if resting_heart_rate is not None:
                updates['resting_heart_rate'] = resting_heart_rate
            if notes is not None:
                updates['notes'] = notes

            if updates:
                set_clause = ', '.join(f"{k} = ?" for k in updates)
                values = list(updates.values()) + [existing[0]['id']]
                self.db.execute(
                    f"UPDATE body_metrics SET {set_clause} WHERE id = ?", values
                )
            return existing[0]['id']

        return self.db.execute(
            """INSERT INTO body_metrics (metric_date, weight, weight_unit,
                body_fat_pct, sleep_hours, water_oz, steps,
                resting_heart_rate, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (metric_date, weight, weight_unit, body_fat_pct, sleep_hours,
             water_oz, steps, resting_heart_rate, notes)
        )

    def get_metrics(self, days=30):
        """Get body metrics for the last N days."""
        start_date = (date.today() - timedelta(days=days)).isoformat()
        return self.db.execute(
            """SELECT * FROM body_metrics
               WHERE metric_date >= ?
               ORDER BY metric_date DESC""",
            (start_date,)
        )

    def get_latest_metrics(self):
        """Get the most recent body metrics entry."""
        result = self.db.execute(
            "SELECT * FROM body_metrics ORDER BY metric_date DESC LIMIT 1"
        )
        return result[0] if result else None

    def get_weight_trend(self, days=90):
        """Get weight trend over time."""
        start_date = (date.today() - timedelta(days=days)).isoformat()
        return self.db.execute(
            """SELECT metric_date, weight FROM body_metrics
               WHERE weight IS NOT NULL AND metric_date >= ?
               ORDER BY metric_date ASC""",
            (start_date,)
        )

    # ========================================================================
    # Meals / Nutrition
    # ========================================================================

    def log_meal(self, name, meal_type, meal_date=None, calories=None,
                 protein_g=None, carbs_g=None, fat_g=None, notes=None):
        """Log a meal."""
        if meal_date is None:
            meal_date = date.today().isoformat()
        return self.db.execute(
            """INSERT INTO meals (meal_date, meal_type, name, calories,
                protein_g, carbs_g, fat_g, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (meal_date, meal_type, name, calories, protein_g, carbs_g,
             fat_g, notes)
        )

    def get_meals(self, meal_date=None):
        """Get meals for a specific date (defaults to today)."""
        if meal_date is None:
            meal_date = date.today().isoformat()
        return self.db.execute(
            """SELECT * FROM meals WHERE meal_date = ?
               ORDER BY CASE meal_type WHEN 'breakfast' THEN 0
               WHEN 'lunch' THEN 1 WHEN 'dinner' THEN 2
               WHEN 'snack' THEN 3 END""",
            (meal_date,)
        )

    def get_daily_nutrition(self, meal_date=None):
        """Get nutrition totals for a day."""
        if meal_date is None:
            meal_date = date.today().isoformat()
        result = self.db.execute(
            """SELECT COALESCE(SUM(calories), 0) as total_calories,
                      COALESCE(SUM(protein_g), 0) as total_protein,
                      COALESCE(SUM(carbs_g), 0) as total_carbs,
                      COALESCE(SUM(fat_g), 0) as total_fat,
                      COUNT(*) as meal_count
               FROM meals WHERE meal_date = ?""",
            (meal_date,)
        )
        return result[0] if result else None

    def delete_meal(self, meal_id):
        """Delete a meal."""
        self.db.execute("DELETE FROM meals WHERE id = ?", (meal_id,))

    # ========================================================================
    # Workout Statistics
    # ========================================================================

    def get_workout_stats(self, days=30):
        """Get workout statistics for the last N days."""
        start_date = (date.today() - timedelta(days=days)).isoformat()

        total = self.db.execute(
            """SELECT COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as total_minutes,
                      COALESCE(SUM(calories_burned), 0) as total_calories
               FROM workouts WHERE workout_date >= ?""",
            (start_date,)
        )

        by_type = self.db.execute(
            """SELECT type, COUNT(*) as count,
                      COALESCE(SUM(duration_minutes), 0) as total_minutes
               FROM workouts WHERE workout_date >= ?
               GROUP BY type ORDER BY count DESC""",
            (start_date,)
        )

        return {
            'total_workouts': total[0]['count'] if total else 0,
            'total_minutes': total[0]['total_minutes'] if total else 0,
            'total_calories': total[0]['total_calories'] if total else 0,
            'by_type': by_type,
        }

    def get_stats(self):
        """Get comprehensive fitness overview."""
        workout_stats = self.get_workout_stats()
        latest_metrics = self.get_latest_metrics()
        return {
            'workouts_30d': workout_stats['total_workouts'],
            'minutes_30d': workout_stats['total_minutes'],
            'latest_weight': latest_metrics['weight'] if latest_metrics else None,
            'latest_sleep': latest_metrics['sleep_hours'] if latest_metrics else None,
        }
