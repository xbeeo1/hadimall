# -*- coding: utf-8 -*-

from odoo import models, api
import logging
import traceback

_logger = logging.getLogger(__name__)


class PnlDashboard(models.Model):
    _name = 'pnl.dashboard'
    _description = 'P&L Dashboard Data Provider'

    @api.model
    def get_pnl_data(
        self,
        date_from=None,
        date_to=None,
        company_id=None
    ):
        """Return Profit & Loss data using dynamic_accounts_report's
        own dynamic.balance.sheet.report model (the module does not
        use Odoo's account.report engine)."""

        try:
            company = (
                self.env['res.company'].browse(company_id)
                if company_id
                else self.env.company
            )
            if not company.exists():
                company = self.env.company

            report_wizard = self.env['dynamic.balance.sheet.report'].create({
                'company_id': company.id,
                'date_from': date_from,
                'date_to': date_to,
            })

            data, filters, datas = report_wizard.view_report(
                report_wizard.id, False, False
            )

            section_map = [
                ('income', 'Operating Income', False),
                ('expense_direct_cost', 'Cost of Revenue', False),
                ('income_other', 'Other Income', False),
                ('expense', 'Expenses', False),
                ('expense_depreciation', 'Depreciation', False),
            ]

            result = []

            def add_total(name, value):
                result.append({
                    'id': name,
                    'name': name,
                    'level': 0,
                    'columns': [{'name': value, 'no_format': value}],
                    'is_total': True,
                    'unfoldable': False,
                })

            add_total('Net Profit', data.get('total_earnings'))

            result.append({
                'id': 'income_header', 'name': 'Income', 'level': 0,
                'columns': [], 'is_total': True, 'unfoldable': False,
            })

            operating_income_total = float(
                (data.get('income') or ([], '0.00'))[1].replace(',', '') or 0
            )
            cost_of_revenue_total = float(
                (data.get('expense_direct_cost') or ([], '0.00'))[1]
                .replace(',', '') or 0
            )
            gross_profit = operating_income_total - cost_of_revenue_total
            add_total('Gross Profit', "{:,.2f}".format(gross_profit))

            for key, label, _unused in section_map[:3]:
                entries, total = data.get(key, ([], '0.00'))
                result.append({
                    'id': key, 'name': label, 'level': 1,
                    'columns': [{'name': total, 'no_format': total}],
                    'is_total': False, 'unfoldable': True,
                })
                for entry in entries:
                    if entry.get('amount') not in (None, '0.00'):
                        result.append({
                            'id': entry['name'], 'name': entry['name'],
                            'level': 2,
                            'columns': [{
                                'name': entry['amount'],
                                'no_format': entry['amount'],
                            }],
                            'is_total': False, 'unfoldable': False,
                        })

            add_total('Total Income', data.get('total_income'))

            result.append({
                'id': 'expense_header', 'name': 'Expenses', 'level': 0,
                'columns': [], 'is_total': True, 'unfoldable': False,
            })

            for key, label, _unused in section_map[3:]:
                entries, total = data.get(key, ([], '0.00'))
                result.append({
                    'id': key, 'name': label, 'level': 1,
                    'columns': [{'name': total, 'no_format': total}],
                    'is_total': False, 'unfoldable': True,
                })
                for entry in entries:
                    if entry.get('amount') not in (None, '0.00'):
                        result.append({
                            'id': entry['name'], 'name': entry['name'],
                            'level': 2,
                            'columns': [{
                                'name': entry['amount'],
                                'no_format': entry['amount'],
                            }],
                            'is_total': False, 'unfoldable': False,
                        })

            add_total('Total Expenses', data.get('total_expense'))

            return {
                'lines': result,
                'company': company.name,
                'currency': company.currency_id.symbol,
            }

        except Exception as e:
            _logger.error("PnL Dashboard crash:\n%s", traceback.format_exc())
            return {
                'error': '%s: %s' % (type(e).__name__, str(e)),
                'lines': [],
                'company': self.env.company.name,
                'currency': self.env.company.currency_id.symbol,
            }