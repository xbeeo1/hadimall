# -*- coding: utf-8 -*-
{
    "name": "Xbo Highlight Internal Note Product",

    'version': '19.0.0.0',

    'summary': """Xbo Highlight Internal Note Product""",

    'description': """Xbo highlight internal note from search in product from""",

    'category': 'Sales custom',

    'author': "Xbeeo",

    'website': 'https://xbeeo.com/',

    'depends': ['base','xbo_alhadi_custom'],

    "data": [
        # 'views/purchase_order_views.xml',
        # 'views/sale_order_view.xml',
    ],
    "assets": {
            "web.assets_backend": [
                "xbo_highlight_internal_note_search_product/static/src/**/*",
            ],
        },

}
