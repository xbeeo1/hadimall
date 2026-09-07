# -*- coding: utf-8 -*-

{
    "name": "Xbo AlHadi Custom Dashboard",

    'version': '19.0.0.0',

    'summary': """Xbo AlHadi Custom Dashboard""",

    'description': """Xbo AlHadi Custom Dashboard""",

    'category': 'Dashboard',

    'author': "Xbeeo",

    'website': 'https://xbeeo.com/',

    "depends": ['base', 'spreadsheet_dashboard', 'dynamic_accounts_report', 'web','xbo_alhadi_custom'],

    "data": [
        'security/ir.model.access.csv',
        'views/pnl_dashboard_views.xml',
        'views/account_summary_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'xbo_alhadi_custom_dashboard/static/src/pnl_dashboard.js',
            'xbo_alhadi_custom_dashboard/static/src/pnl_dashboard.xml',
            'xbo_alhadi_custom_dashboard/static/src/pnl_dashboard.scss',
            'xbo_alhadi_custom_dashboard/static/src/account_summary_dashboard.js',
            'xbo_alhadi_custom_dashboard/static/src/account_summary_dashboard.xml',
            'xbo_alhadi_custom_dashboard/static/src/account_summary_dashboard.scss',
        ],
    },

}
