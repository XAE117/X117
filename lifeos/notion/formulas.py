"""
Notion Formula 2.0 Strings.

Ready-to-paste formula strings for Notion formula properties. These
replicate the calculation logic from lifeos/formulas.py as native
Notion formulas that run inside the Notion UI.

Usage:
    1. Create a Formula property in a Notion database
    2. Copy the formula string from the relevant function
    3. Paste it into the Notion formula editor

Each function returns a string that is valid Notion Formula 2.0 syntax.
"""


# ============================================================================
# Task Formulas
# ============================================================================

TASK_OVERDUE = '''let(
    due, prop("Due Date"),
    diff, dateBetween(due, now(), "days"),
    if(empty(due), "",
        if(diff < 0,
            "⚠️ " + format(abs(diff)) + "d overdue",
            if(diff == 0, "📌 Due today",
                if(diff <= 3, "⏰ " + format(diff) + "d left",
                    format(diff) + "d remaining"
                )
            )
        )
    )
)'''

TASK_URGENCY_SCORE = '''let(
    due, prop("Due Date"),
    days_left, if(empty(due), 999, dateBetween(due, now(), "days")),
    priority_score, ifs(
        prop("Priority") == "Critical", 5,
        prop("Priority") == "High", 4,
        prop("Priority") == "Medium", 3,
        prop("Priority") == "Low", 2,
        1
    ),
    energy_bonus, ifs(
        prop("Energy Level") == "Low", 1,
        prop("Energy Level") == "Medium", 0,
        0
    ),
    if(days_left < 0,
        100 + abs(days_left) + priority_score,
        priority_score * 10 - min(days_left, 30) + energy_bonus
    )
)'''

TASK_NEXT_RECURRENCE = '''if(
    prop("Is Recurring"),
    let(
        base, prop("Due Date"),
        interval, prop("Recur Interval"),
        unit, prop("Recur Unit"),
        if(empty(base) or empty(interval) or empty(unit), "",
            "Next: " + formatDate(
                dateAdd(base, interval, unit),
                "MMM D, YYYY"
            )
        )
    ),
    ""
)'''


# ============================================================================
# Project Formulas
# ============================================================================

PROJECT_PROGRESS_BAR = '''let(
    tasks, prop("Tasks"),
    total, tasks.length(),
    done, tasks.filter(current.prop("Status").name == "Done").length(),
    progress, if(total > 0, done / total, 0),
    filled, round(progress * 20),
    slice("████████████████████", 0, filled)
    + slice("░░░░░░░░░░░░░░░░░░░░", 0, 20 - filled)
    + " " + format(round(progress * 100)) + "%"
)'''

PROJECT_TASK_SUMMARY = '''let(
    tasks, prop("Tasks"),
    total, tasks.length(),
    done, tasks.filter(current.prop("Status").name == "Done").length(),
    active, tasks.filter(current.prop("Status").name == "In Progress" or current.prop("Status").name == "Next Action").length(),
    format(done) + "/" + format(total) + " done, " + format(active) + " active"
)'''

PROJECT_DAYS_REMAINING = '''let(
    due, prop("Due Date"),
    start, prop("Start Date"),
    if(empty(due), "",
        let(
            days_left, dateBetween(due, now(), "days"),
            if(days_left < 0,
                "⚠️ " + format(abs(days_left)) + "d overdue",
                format(days_left) + "d remaining"
            )
        )
    )
)'''


# ============================================================================
# Goal Formulas
# ============================================================================

GOAL_PROGRESS = '''let(
    target, prop("Target Value"),
    current, prop("Current Value"),
    if(empty(target) or target == 0, "No target set",
        let(
            pct, round(current / target * 100),
            filled, round(min(pct, 100) / 5),
            slice("████████████████████", 0, filled)
            + slice("░░░░░░░░░░░░░░░░░░░░", 0, 20 - filled)
            + " " + format(pct) + "% ("
            + format(current) + "/" + format(target)
            + " " + prop("Unit") + ")"
        )
    )
)'''

GOAL_TIME_PROGRESS = '''let(
    start, prop("Start Date"),
    target, prop("Target Date"),
    if(empty(start) or empty(target), "",
        let(
            total_days, dateBetween(target, start, "days"),
            elapsed, dateBetween(now(), start, "days"),
            pct, if(total_days > 0, round(elapsed / total_days * 100), 100),
            if(pct > 100, "⚠️ Past deadline",
                "⏳ " + format(min(pct, 100)) + "% of time elapsed"
            )
        )
    )
)'''

GOAL_AT_RISK = '''let(
    target_val, prop("Target Value"),
    current_val, prop("Current Value"),
    start, prop("Start Date"),
    target_date, prop("Target Date"),
    if(empty(target_val) or target_val == 0 or empty(start) or empty(target_date), false,
        let(
            value_pct, current_val / target_val * 100,
            total_days, dateBetween(target_date, start, "days"),
            elapsed, dateBetween(now(), start, "days"),
            time_pct, if(total_days > 0, elapsed / total_days * 100, 100),
            time_pct > 20 and value_pct < (time_pct - 20)
        )
    )
)'''


# ============================================================================
# Habit Formulas
# ============================================================================

HABIT_STREAK_DISPLAY = '''let(
    streak, prop("Current Streak"),
    longest, prop("Longest Streak"),
    fires, min(floor(streak / 7), 5),
    if(streak == 0, "No active streak",
        format(streak) + "d "
        + slice("🔥🔥🔥🔥🔥", 0, fires * 2)
        + " (best: " + format(longest) + "d)"
    )
)'''

HABIT_COMPLETION_RATE = '''let(
    logs, prop("Habit Logs"),
    total_days, dateBetween(now(), prop("Created time"), "days"),
    logged, logs.length(),
    if(total_days > 0,
        format(round(logged / total_days * 100)) + "% completion",
        "New habit"
    )
)'''


# ============================================================================
# Reading Formulas
# ============================================================================

READING_PROGRESS = '''let(
    total, prop("Total Pages"),
    current, prop("Current Page"),
    if(empty(total) or total == 0, "",
        let(
            pct, round(current / total * 100),
            filled, round(min(pct, 100) / 5),
            slice("████████████████████", 0, filled)
            + slice("░░░░░░░░░░░░░░░░░░░░", 0, 20 - filled)
            + " " + format(pct) + "% ("
            + format(current) + "/" + format(total) + "p)"
        )
    )
)'''

READING_PACE = '''let(
    start, prop("Start Date"),
    current, prop("Current Page"),
    total, prop("Total Pages"),
    if(empty(start) or empty(total) or current == 0, "",
        let(
            days_reading, max(dateBetween(now(), start, "days"), 1),
            pages_per_day, round(current / days_reading * 10) / 10,
            remaining, total - current,
            days_left, if(pages_per_day > 0, ceil(remaining / pages_per_day), 0),
            format(pages_per_day) + " pages/day"
            + if(remaining > 0,
                " · ~" + format(days_left) + "d to finish",
                " · Done!"
            )
        )
    )
)'''


# ============================================================================
# Finance Formulas
# ============================================================================

BUDGET_HEALTH = '''let(
    limit, prop("Monthly Limit"),
    spent, prop("Spent"),
    if(limit == 0, "—",
        let(
            pct, round(spent / limit * 100),
            remaining, limit - spent,
            if(pct > 100,
                "🔴 " + format(pct) + "% ($" + format(abs(remaining)) + " over)",
                if(pct > 80,
                    "🟡 " + format(pct) + "% ($" + format(remaining) + " left)",
                    "🟢 " + format(pct) + "% ($" + format(remaining) + " left)"
                )
            )
        )
    )
)'''

BUDGET_PROGRESS_BAR = '''let(
    limit, prop("Monthly Limit"),
    spent, prop("Spent"),
    if(limit == 0, "",
        let(
            pct, min(round(spent / limit * 100), 100),
            filled, round(pct / 5),
            slice("████████████████████", 0, filled)
            + slice("░░░░░░░░░░░░░░░░░░░░", 0, 20 - filled)
            + " " + format(pct) + "%"
        )
    )
)'''


# ============================================================================
# Body Metrics Formulas
# ============================================================================

WEIGHT_CHANGE = '''let(
    current, prop("Weight"),
    if(empty(current), "",
        format(current) + " " + prop("Weight Unit")
    )
)'''

DAILY_HEALTH_SCORE = '''let(
    sleep, prop("Sleep (hrs)"),
    water, prop("Water (oz)"),
    steps, prop("Steps"),
    sleep_score, if(empty(sleep), 0,
        if(sleep >= 7 and sleep <= 9, 33,
            if(sleep >= 6, 20, 10)
        )
    ),
    water_score, if(empty(water), 0,
        if(water >= 64, 33,
            if(water >= 32, 20, 10)
        )
    ),
    steps_score, if(empty(steps), 0,
        if(steps >= 10000, 34,
            if(steps >= 5000, 20, 10)
        )
    ),
    let(
        total, sleep_score + water_score + steps_score,
        if(total >= 80, "🟢 " + format(total) + "/100",
            if(total >= 50, "🟡 " + format(total) + "/100",
                "🔴 " + format(total) + "/100"
            )
        )
    )
)'''


# ============================================================================
# Journal Formulas
# ============================================================================

JOURNAL_MOOD_VISUAL = '''let(
    mood, prop("Mood"),
    if(empty(mood), "",
        ifs(
            mood == "10 - Amazing", "😄 Amazing",
            mood == "9", "😊 Great",
            mood == "8", "🙂 Good",
            mood == "7", "🙂 Pretty Good",
            mood == "6", "😐 OK",
            mood == "5 - Neutral", "😐 Neutral",
            mood == "4", "😕 Meh",
            mood == "3", "😞 Down",
            mood == "2", "😢 Bad",
            mood == "1 - Terrible", "😫 Terrible",
            ""
        )
    )
)'''


# ============================================================================
# All formulas indexed by database and property name
# ============================================================================

ALL_FORMULAS = {
    'tasks': {
        'Urgency': TASK_OVERDUE,
        'Urgency Score': TASK_URGENCY_SCORE,
        'Next Recurrence': TASK_NEXT_RECURRENCE,
    },
    'projects': {
        'Progress': PROJECT_PROGRESS_BAR,
        'Task Summary': PROJECT_TASK_SUMMARY,
        'Days Remaining': PROJECT_DAYS_REMAINING,
    },
    'goals': {
        'Progress': GOAL_PROGRESS,
        'Time Progress': GOAL_TIME_PROGRESS,
        'At Risk?': GOAL_AT_RISK,
    },
    'habits': {
        'Streak Display': HABIT_STREAK_DISPLAY,
        'Completion Rate': HABIT_COMPLETION_RATE,
    },
    'reading': {
        'Progress': READING_PROGRESS,
        'Reading Pace': READING_PACE,
    },
    'finance_budgets': {
        'Health': BUDGET_HEALTH,
        'Bar': BUDGET_PROGRESS_BAR,
    },
    'body_metrics': {
        'Weight Display': WEIGHT_CHANGE,
        'Health Score': DAILY_HEALTH_SCORE,
    },
    'journal': {
        'Mood Visual': JOURNAL_MOOD_VISUAL,
    },
}


def get_formulas_for_database(db_name):
    """Get all formula property definitions for a specific database."""
    formulas = ALL_FORMULAS.get(db_name, {})
    return {
        name: {"formula": {"expression": expr}}
        for name, expr in formulas.items()
    }
