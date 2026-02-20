"""
Finance Hub Module - Wealth management and tracking.

Provides comprehensive financial tracking including:
- Multiple account management (checking, savings, credit, investment)
- Income and expense tracking with categorization
- Monthly budget management with spending analysis
- Net worth calculation across all accounts
- Monthly and yearly financial rollups
"""

from datetime import date, timedelta
from collections import defaultdict


class FinanceModule:
    """Manages financial accounts, transactions, and budgets."""

    def __init__(self, db):
        self.db = db

    # ========================================================================
    # Account Management
    # ========================================================================

    def create_account(self, name, type='checking', balance=0, currency='USD'):
        """Create a financial account."""
        return self.db.execute(
            """INSERT INTO finance_accounts (name, type, balance, currency)
               VALUES (?, ?, ?, ?)""",
            (name, type, balance, currency)
        )

    def get_account(self, account_id):
        """Get an account by ID."""
        result = self.db.execute(
            "SELECT * FROM finance_accounts WHERE id = ?", (account_id,)
        )
        return result[0] if result else None

    def get_all_accounts(self, active_only=True):
        """Get all financial accounts."""
        if active_only:
            return self.db.execute(
                "SELECT * FROM finance_accounts WHERE is_active = 1 ORDER BY type, name"
            )
        return self.db.execute("SELECT * FROM finance_accounts ORDER BY type, name")

    def update_account(self, account_id, **kwargs):
        """Update account properties."""
        if not kwargs:
            return
        set_clause = ', '.join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [account_id]
        self.db.execute(
            f"UPDATE finance_accounts SET {set_clause} WHERE id = ?", values
        )

    def update_balance(self, account_id, new_balance):
        """Update an account's balance directly."""
        self.update_account(account_id, balance=new_balance)

    # ========================================================================
    # Transaction Management
    # ========================================================================

    def add_transaction(self, type, category, amount, description=None,
                        account_id=None, transaction_date=None,
                        is_recurring=False, recur_interval=None,
                        recur_unit=None, tags=None):
        """Record a financial transaction."""
        if transaction_date is None:
            transaction_date = date.today().isoformat()

        tx_id = self.db.execute(
            """INSERT INTO finance_transactions (account_id, type, category, amount,
                description, transaction_date, is_recurring, recur_interval,
                recur_unit, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (account_id, type, category, amount, description,
             transaction_date, int(is_recurring), recur_interval, recur_unit, tags)
        )

        # Auto-update account balance
        if account_id:
            account = self.get_account(account_id)
            if account:
                if type == 'income':
                    new_balance = account['balance'] + amount
                elif type == 'expense':
                    new_balance = account['balance'] - amount
                else:
                    new_balance = account['balance']
                self.update_balance(account_id, new_balance)

        return tx_id

    def get_transactions(self, account_id=None, type=None, category=None,
                         start_date=None, end_date=None, limit=50):
        """Get transactions with optional filters."""
        sql = "SELECT * FROM finance_transactions WHERE 1=1"
        params = []

        if account_id:
            sql += " AND account_id = ?"
            params.append(account_id)
        if type:
            sql += " AND type = ?"
            params.append(type)
        if category:
            sql += " AND category = ?"
            params.append(category)
        if start_date:
            sql += " AND transaction_date >= ?"
            params.append(start_date)
        if end_date:
            sql += " AND transaction_date <= ?"
            params.append(end_date)

        sql += " ORDER BY transaction_date DESC"
        if limit:
            sql += f" LIMIT {int(limit)}"

        return self.db.execute(sql, params)

    def delete_transaction(self, tx_id):
        """Delete a transaction."""
        self.db.execute("DELETE FROM finance_transactions WHERE id = ?", (tx_id,))

    # ========================================================================
    # Budget Management
    # ========================================================================

    def set_budget(self, category, monthly_limit, year_month=None):
        """Set a monthly budget for a category."""
        if year_month is None:
            year_month = date.today().strftime('%Y-%m')

        existing = self.db.execute(
            "SELECT id FROM finance_budgets WHERE category = ? AND year_month = ?",
            (category, year_month)
        )

        if existing:
            self.db.execute(
                "UPDATE finance_budgets SET monthly_limit = ? WHERE id = ?",
                (monthly_limit, existing[0]['id'])
            )
            return existing[0]['id']

        return self.db.execute(
            "INSERT INTO finance_budgets (category, monthly_limit, year_month) VALUES (?, ?, ?)",
            (category, monthly_limit, year_month)
        )

    def get_budget_status(self, year_month=None):
        """
        Get budget vs actual spending for a month.

        Returns each budget category with its limit, actual spending,
        and remaining amount.
        """
        if year_month is None:
            year_month = date.today().strftime('%Y-%m')

        budgets = self.db.execute(
            "SELECT * FROM finance_budgets WHERE year_month = ?", (year_month,)
        )

        status = []
        for budget in budgets:
            spent_result = self.db.execute(
                """SELECT COALESCE(SUM(amount), 0) as total
                   FROM finance_transactions
                   WHERE category = ? AND type = 'expense'
                   AND strftime('%Y-%m', transaction_date) = ?""",
                (budget['category'], year_month)
            )
            spent = spent_result[0]['total'] if spent_result else 0

            status.append({
                'category': budget['category'],
                'budget': budget['monthly_limit'],
                'spent': spent,
                'remaining': budget['monthly_limit'] - spent,
                'pct_used': round((spent / budget['monthly_limit'] * 100), 1)
                            if budget['monthly_limit'] > 0 else 0,
            })

        return status

    # ========================================================================
    # Financial Rollups and Analytics
    # ========================================================================

    def get_net_worth(self):
        """Calculate total net worth across all active accounts."""
        result = self.db.execute(
            """SELECT COALESCE(SUM(balance), 0) as net_worth
               FROM finance_accounts WHERE is_active = 1"""
        )
        return result[0]['net_worth'] if result else 0

    def get_monthly_summary(self, year_month=None):
        """Get income vs expenses summary for a month."""
        if year_month is None:
            year_month = date.today().strftime('%Y-%m')

        income = self.db.execute(
            """SELECT COALESCE(SUM(amount), 0) as total
               FROM finance_transactions
               WHERE type = 'income'
               AND strftime('%Y-%m', transaction_date) = ?""",
            (year_month,)
        )

        expenses = self.db.execute(
            """SELECT COALESCE(SUM(amount), 0) as total
               FROM finance_transactions
               WHERE type = 'expense'
               AND strftime('%Y-%m', transaction_date) = ?""",
            (year_month,)
        )

        total_income = income[0]['total'] if income else 0
        total_expenses = expenses[0]['total'] if expenses else 0

        return {
            'year_month': year_month,
            'income': total_income,
            'expenses': total_expenses,
            'savings': total_income - total_expenses,
            'savings_rate': round(
                ((total_income - total_expenses) / total_income * 100), 1
            ) if total_income > 0 else 0,
        }

    def get_expense_breakdown(self, year_month=None):
        """Get expenses broken down by category for a month."""
        if year_month is None:
            year_month = date.today().strftime('%Y-%m')

        return self.db.execute(
            """SELECT category, SUM(amount) as total, COUNT(*) as count
               FROM finance_transactions
               WHERE type = 'expense'
               AND strftime('%Y-%m', transaction_date) = ?
               GROUP BY category
               ORDER BY total DESC""",
            (year_month,)
        )

    def get_income_breakdown(self, year_month=None):
        """Get income broken down by category for a month."""
        if year_month is None:
            year_month = date.today().strftime('%Y-%m')

        return self.db.execute(
            """SELECT category, SUM(amount) as total, COUNT(*) as count
               FROM finance_transactions
               WHERE type = 'income'
               AND strftime('%Y-%m', transaction_date) = ?
               GROUP BY category
               ORDER BY total DESC""",
            (year_month,)
        )

    def get_spending_trend(self, months=6):
        """Get monthly spending trend over the last N months."""
        results = []
        today = date.today()
        for i in range(months):
            month_offset = today.month - i
            year = today.year
            while month_offset <= 0:
                month_offset += 12
                year -= 1
            year_month = f"{year:04d}-{month_offset:02d}"
            summary = self.get_monthly_summary(year_month)
            results.append(summary)
        return list(reversed(results))

    def get_stats(self):
        """Get financial overview stats."""
        current_month = self.get_monthly_summary()
        return {
            'net_worth': self.get_net_worth(),
            'accounts': len(self.get_all_accounts()),
            'monthly_income': current_month['income'],
            'monthly_expenses': current_month['expenses'],
            'monthly_savings': current_month['savings'],
            'savings_rate': current_month['savings_rate'],
        }
