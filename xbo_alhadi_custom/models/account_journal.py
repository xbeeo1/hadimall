# -*- coding: utf-8 -*-

from odoo import fields, models


class AccountJournal(models.Model):
    _inherit = 'account.journal'

    is_expense = fields.Boolean(
        string='Is Expense',
        default=False,
        help='Mark this journal as used for expense entries.'
    )