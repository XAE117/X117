#!/usr/bin/env python3
"""
LifeOS Finance Tracker - Track expenses, income, and budgets.
"""

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "lifeos.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            category TEXT NOT NULL,
            description TEXT,
            account TEXT DEFAULT 'default',
            transaction_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL UNIQUE,
            monthly_limit REAL NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recurring (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            category TEXT NOT NULL,
            description TEXT,
            frequency TEXT DEFAULT 'monthly',
            next_date TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()


def add_transaction(amount, txn_type, category, description=None, account="default", date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    cursor.execute('''
        INSERT INTO transactions (amount, type, category, description, account, transaction_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (abs(amount), txn_type, category, description, account, date, now))

    tid = cursor.lastrowid
    conn.commit()
    conn.close()

    symbol = "+" if txn_type == "income" else "-"
    print(f"\n+ Recorded: {symbol}${abs(amount):.2f} ({category}) on {date}")
    return tid


def list_transactions(days=30, category=None, txn_type=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    query = "SELECT * FROM transactions WHERE transaction_date >= ?"
    params = [start]

    if category:
        query += " AND category = ?"
        params.append(category)
    if txn_type:
        query += " AND type = ?"
        params.append(txn_type)

    query += " ORDER BY transaction_date DESC"
    cursor.execute(query, params)
    transactions = cursor.fetchall()
    conn.close()

    if not transactions:
        print(f"\nNo transactions in the last {days} days.")
        return

    print(f"\n{'=' * 85}")
    print(f"  TRANSACTIONS - Last {days} days")
    print("=" * 85)
    print(f"{'ID':<5} {'Date':<12} {'Type':<8} {'Amount':>10} {'Category':<15} {'Description':<25}")
    print("-" * 85)

    total_income = 0
    total_expense = 0

    for t in transactions:
        if t['type'] == 'income':
            total_income += t['amount']
            amt = f"+${t['amount']:.2f}"
        else:
            total_expense += t['amount']
            amt = f"-${t['amount']:.2f}"

        desc = (t['description'] or '-')[:24]
        print(f"{t['id']:<5} {t['transaction_date']:<12} {t['type']:<8} {amt:>10} {t['category']:<15} {desc:<25}")

    print("=" * 85)
    print(f"  Income: +${total_income:.2f}  |  Expenses: -${total_expense:.2f}  |  Net: ${total_income - total_expense:+.2f}")
    print("=" * 85)


def monthly_summary(year=None, month=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not year or not month:
        now = datetime.now()
        year = now.year
        month = now.month

    start = f"{year}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1}-01-01"
    else:
        end = f"{year}-{month + 1:02d}-01"

    cursor.execute('''
        SELECT type, category, SUM(amount) as total, COUNT(*) as cnt
        FROM transactions
        WHERE transaction_date >= ? AND transaction_date < ?
        GROUP BY type, category
        ORDER BY type DESC, total DESC
    ''', (start, end))

    rows = cursor.fetchall()

    # Get budgets
    cursor.execute("SELECT * FROM budgets")
    budgets = {b['category']: b['monthly_limit'] for b in cursor.fetchall()}

    conn.close()

    month_name = datetime(year, month, 1).strftime("%B %Y")

    print(f"\n{'=' * 60}")
    print(f"  MONTHLY SUMMARY - {month_name}")
    print("=" * 60)

    total_income = 0
    total_expense = 0

    income_rows = [r for r in rows if r['type'] == 'income']
    expense_rows = [r for r in rows if r['type'] == 'expense']

    if income_rows:
        print("\n  INCOME:")
        for r in income_rows:
            total_income += r['total']
            print(f"    {r['category']:<20} +${r['total']:>10.2f}  ({r['cnt']} txns)")

    if expense_rows:
        print("\n  EXPENSES:")
        for r in expense_rows:
            total_expense += r['total']
            budget = budgets.get(r['category'])
            budget_str = ""
            if budget:
                pct = (r['total'] / budget) * 100
                bar = "!" if pct > 100 else ""
                budget_str = f"  [{pct:.0f}% of ${budget:.0f} budget]{bar}"
            print(f"    {r['category']:<20} -${r['total']:>10.2f}  ({r['cnt']} txns){budget_str}")

    print("\n" + "-" * 60)
    print(f"  Total Income:   +${total_income:>10.2f}")
    print(f"  Total Expenses: -${total_expense:>10.2f}")
    print(f"  Net:             ${total_income - total_expense:>+10.2f}")
    print("=" * 60)


def set_budget(category, limit_amount):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        cursor.execute('''
            INSERT INTO budgets (category, monthly_limit, created_at)
            VALUES (?, ?, ?)
        ''', (category, limit_amount, now))
    except sqlite3.IntegrityError:
        cursor.execute('''
            UPDATE budgets SET monthly_limit = ? WHERE category = ?
        ''', (limit_amount, category))

    conn.commit()
    conn.close()
    print(f"\n+ Budget set: {category} = ${limit_amount:.2f}/month")


def show_budgets():
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now()
    start = f"{now.year}-{now.month:02d}-01"
    if now.month == 12:
        end = f"{now.year + 1}-01-01"
    else:
        end = f"{now.year}-{now.month + 1:02d}-01"

    cursor.execute("SELECT * FROM budgets ORDER BY category")
    budgets = cursor.fetchall()

    if not budgets:
        print("\nNo budgets set. Use 'budget <category> <amount>' to create one.")
        conn.close()
        return

    print(f"\n{'=' * 65}")
    print(f"  BUDGET STATUS - {now.strftime('%B %Y')}")
    print("=" * 65)
    print(f"{'Category':<20} {'Budget':>10} {'Spent':>10} {'Remaining':>10} {'Status':>10}")
    print("-" * 65)

    for b in budgets:
        cursor.execute('''
            SELECT COALESCE(SUM(amount), 0) as spent
            FROM transactions
            WHERE type = 'expense' AND category = ? AND transaction_date >= ? AND transaction_date < ?
        ''', (b['category'], start, end))
        spent = cursor.fetchone()['spent']
        remaining = b['monthly_limit'] - spent
        pct = (spent / b['monthly_limit']) * 100 if b['monthly_limit'] > 0 else 0

        if pct > 100:
            status = "OVER"
        elif pct > 80:
            status = "WARNING"
        else:
            status = "OK"

        print(f"{b['category']:<20} ${b['monthly_limit']:>9.2f} ${spent:>9.2f} ${remaining:>9.2f} {status:>10}")

    print("=" * 65)
    conn.close()


def add_recurring(amount, txn_type, category, description=None, frequency="monthly", next_date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not next_date:
        next_date = datetime.now().strftime("%Y-%m-%d")

    cursor.execute('''
        INSERT INTO recurring (amount, type, category, description, frequency, next_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (abs(amount), txn_type, category, description, frequency, next_date, now))

    rid = cursor.lastrowid
    conn.commit()
    conn.close()
    print(f"\n+ Added recurring {txn_type}: ${abs(amount):.2f} {frequency} ({category})")
    return rid


def list_recurring():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM recurring WHERE active = 1 ORDER BY next_date")
    items = cursor.fetchall()
    conn.close()

    if not items:
        print("\nNo recurring transactions.")
        return

    print(f"\n{'=' * 75}")
    print("  RECURRING TRANSACTIONS")
    print("=" * 75)
    print(f"{'ID':<5} {'Type':<8} {'Amount':>10} {'Category':<15} {'Freq':<10} {'Next Date':<12}")
    print("-" * 75)

    for r in items:
        symbol = "+" if r['type'] == 'income' else "-"
        print(f"{r['id']:<5} {r['type']:<8} {symbol}${r['amount']:>8.2f} {r['category']:<15} {r['frequency']:<10} {r['next_date']:<12}")

    print("=" * 75)


def delete_transaction(tid):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tid,))
    txn = cursor.fetchone()
    if not txn:
        print(f"\nTransaction {tid} not found.")
        conn.close()
        return

    cursor.execute("DELETE FROM transactions WHERE id = ?", (tid,))
    conn.commit()
    conn.close()
    print(f"\n+ Deleted transaction #{tid}")


def print_help():
    print("""
+---------------------------------------------------------------+
|                 FINANCE TRACKER - HELP                        |
+---------------------------------------------------------------+
|  TRANSACTIONS:                                                |
|  income                - Record income (interactive)          |
|  expense               - Record expense (interactive)         |
|  list [days] [cat]     - List transactions (default 30 days)  |
|  delete <id>           - Delete a transaction                 |
|                                                               |
|  BUDGETS:                                                     |
|  budget <cat> <amount> - Set monthly budget for category      |
|  budgets               - Show budget status                   |
|  summary [MM] [YYYY]   - Monthly financial summary            |
|                                                               |
|  RECURRING:                                                   |
|  recurring             - Add recurring transaction            |
|  recurrings            - List recurring transactions          |
|                                                               |
|  help                  - Show this help message               |
|  quit                  - Exit finance tracker                 |
+---------------------------------------------------------------+
|  Categories: rent, food, transport, utilities, entertainment, |
|  health, shopping, savings, salary, freelance, etc.           |
+---------------------------------------------------------------+
""")


def interactive_income():
    print("\n--- Record Income ---")
    amount = input("Amount: $").strip()
    if not amount:
        print("Amount is required.")
        return
    amount = float(amount)
    category = input("Category (salary/freelance/investment/gift/etc.): ").strip()
    if not category:
        print("Category is required.")
        return
    description = input("Description (optional): ").strip() or None
    account = input("Account [default]: ").strip() or "default"
    date = input("Date (YYYY-MM-DD, Enter for today): ").strip() or None

    add_transaction(amount, "income", category, description, account, date)


def interactive_expense():
    print("\n--- Record Expense ---")
    amount = input("Amount: $").strip()
    if not amount:
        print("Amount is required.")
        return
    amount = float(amount)
    category = input("Category (food/rent/transport/utilities/etc.): ").strip()
    if not category:
        print("Category is required.")
        return
    description = input("Description (optional): ").strip() or None
    account = input("Account [default]: ").strip() or "default"
    date = input("Date (YYYY-MM-DD, Enter for today): ").strip() or None

    add_transaction(amount, "expense", category, description, account, date)


def interactive_recurring():
    print("\n--- Add Recurring Transaction ---")
    txn_type = input("Type (income/expense): ").strip().lower()
    if txn_type not in ('income', 'expense'):
        print("Must be 'income' or 'expense'.")
        return
    amount = input("Amount: $").strip()
    if not amount:
        return
    amount = float(amount)
    category = input("Category: ").strip()
    description = input("Description (optional): ").strip() or None
    frequency = input("Frequency (monthly/weekly/biweekly) [monthly]: ").strip() or "monthly"
    next_date = input("Next occurrence (YYYY-MM-DD, Enter for today): ").strip() or None

    add_recurring(amount, txn_type, category, description, frequency, next_date)


def main():
    init_db()

    print("\n" + "=" * 50)
    print("       LIFEOS - FINANCE TRACKER")
    print("       Track income, expenses, and budgets")
    print("=" * 50)
    print("  Type 'help' for commands or 'quit' to exit")
    print("=" * 50)

    while True:
        try:
            command = input("\nfinance> ").strip()
            if not command:
                continue

            parts = command.split(maxsplit=2)
            cmd = parts[0].lower()

            if cmd in ('quit', 'exit', 'q'):
                print("\nGoodbye!")
                break
            elif cmd == 'help':
                print_help()
            elif cmd == 'income':
                interactive_income()
            elif cmd == 'expense':
                interactive_expense()
            elif cmd == 'list':
                days = 30
                cat = None
                if len(parts) > 1:
                    try:
                        days = int(parts[1])
                    except ValueError:
                        cat = parts[1]
                if len(parts) > 2:
                    cat = parts[2]
                list_transactions(days, cat)
            elif cmd == 'delete':
                if len(parts) < 2:
                    print("Usage: delete <id>")
                    continue
                try:
                    tid = int(parts[1])
                    confirm = input(f"Delete transaction {tid}? (yes/no): ")
                    if confirm.lower() == 'yes':
                        delete_transaction(tid)
                except ValueError:
                    print("Invalid ID.")
            elif cmd == 'budget':
                if len(parts) < 3:
                    print("Usage: budget <category> <amount>")
                    continue
                try:
                    set_budget(parts[1], float(parts[2]))
                except ValueError:
                    print("Invalid amount.")
            elif cmd == 'budgets':
                show_budgets()
            elif cmd == 'summary':
                month = None
                year = None
                if len(parts) > 1:
                    month = int(parts[1])
                if len(parts) > 2:
                    year = int(parts[2])
                monthly_summary(year, month)
            elif cmd == 'recurring':
                interactive_recurring()
            elif cmd == 'recurrings':
                list_recurring()
            else:
                print(f"Unknown command: {cmd}. Type 'help' for commands.")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
