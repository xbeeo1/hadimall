/** @odoo-module **/

import {Component, onWillStart, useState} from "@odoo/owl";
import {registry} from "@web/core/registry";
import {useService} from "@web/core/utils/hooks";

export class AccountSummary extends Component {
    static template = "xbo_alhadi_custom_dashboard.AccountSummary";

    setup() {
        this.orm = useService("orm");

        this.state = useState({
            partner_search: "",

            // Default dates = Current Date
            date_from: this.getToday(),
            date_to: this.getToday(),

            receivable: 0,
            payable: 0,
            expense: 0,
        });

        onWillStart(async () => {
            await this.loadAccountSummary();
        });
    }

    // =========================================================
    // Current Date
    // =========================================================

    getToday() {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // =========================================================
    // Partner Search - Enter Key
    // =========================================================

    onPartnerKeydown(ev) {
        if (ev.key === "Enter") {
            this.onPartnerSearch();
        }
    }

    // =========================================================
    // Partner Search
    // =========================================================

    async onPartnerSearch() {
        await this.loadAccountSummary();
    }

    // =========================================================
    // Date Change
    // =========================================================

    async onDateChange() {
        await this.loadAccountSummary();
    }

    // =========================================================
    // Refresh
    // =========================================================

    async onRefresh() {
        await this.loadAccountSummary();
    }

    // =========================================================
    // Get Partner IDs
    // =========================================================

    async getPartnerIds() {
        const search = this.state.partner_search?.trim();

        // Empty search = All Partners
        if (!search) {
            return null;
        }

        const partnerDomain = [
            "|",
            ["name", "ilike", search],
            ["ref", "ilike", search],
        ];

        const partnerIds = await this.orm.call(
            "res.partner",
            "search",
            [partnerDomain],
            {
                limit: 100,
            }
        );

        return partnerIds;
    }

    // =========================================================
    // Common Domain
    // =========================================================

    async getCommonDomain() {
        const domain = [
            ["parent_state", "=", "posted"],
        ];

        // -----------------------------------------------------
        // From Date
        // -----------------------------------------------------

        if (this.state.date_from) {
            domain.push([
                "date",
                ">=",
                this.state.date_from,
            ]);
        }

        // -----------------------------------------------------
        // To Date
        // -----------------------------------------------------

        if (this.state.date_to) {
            domain.push([
                "date",
                "<=",
                this.state.date_to,
            ]);
        }

        // -----------------------------------------------------
        // Partner
        // -----------------------------------------------------

        const partnerIds = await this.getPartnerIds();

        if (partnerIds !== null) {

            // Search entered but no partner found
            if (!partnerIds.length) {
                domain.push([
                    "partner_id",
                    "=",
                    false,
                ]);
            }

            // Matching partners found
            else {
                domain.push([
                    "partner_id",
                    "in",
                    partnerIds,
                ]);
            }
        }

        return domain;
    }

    // =========================================================
    // Read Group Helper
    // =========================================================

    async getAccountTotals(domain) {

        const result = await this.orm.call(
            "account.move.line",
            "read_group",
            [
                domain,
                [
                    "debit:sum",
                    "credit:sum",
                ],
                [],
            ]
        );

        return {
            debit: result?.[0]?.debit || 0,
            credit: result?.[0]?.credit || 0,
        };
    }

    // =========================================================
    // Load Account Summary
    // =========================================================

    async loadAccountSummary() {

        const commonDomain = await this.getCommonDomain();

        // =====================================================
        // RECEIVABLE
        // =====================================================

        const receivableDomain = [
            ...commonDomain,

            [
                "account_id.account_type",
                "=",
                "asset_receivable",
            ],
        ];

        const receivable = await this.getAccountTotals(
            receivableDomain
        );

        this.state.receivable =
            receivable.debit - receivable.credit;


        // =====================================================
        // PAYABLE
        // =====================================================

        const payableDomain = [
            ...commonDomain,

            [
                "account_id.account_type",
                "=",
                "liability_payable",
            ],
        ];

        const payable = await this.getAccountTotals(
            payableDomain
        );

        this.state.payable =
            payable.credit - payable.debit;


        // =====================================================
        // EXPENSE
        // =====================================================

        const expenseDomain = [
            ...commonDomain,

            [
                "journal_id.type",
                "=",
                "general",
            ],
            [
                "journal_id.is_expense",
                "=",
                true,
            ],
        ];

        const expense = await this.getAccountTotals(
            expenseDomain
        );

        this.state.expense =
            expense.debit
    }

    // =========================================================
    // Format Amount
    // =========================================================

    formatAmount(amount) {
        return new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    }
}

registry
    .category("actions")
    .add("accounts_summary_action", AccountSummary);
