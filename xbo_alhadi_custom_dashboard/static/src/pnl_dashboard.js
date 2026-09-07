/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const BOLD_LINE_NAMES = [
    "Gross Profit",
    "Net Profit",
    "Net Profit Left After Allocations and Withdrawals",
    "Profit Before Income Tax",
    "Profit for the Year",
];

export class PnlDashboard extends Component {
    static template = "xbo_alhadi_custom_dashboard.PnlDashboard";

    setup() {
        this.orm = useService("orm");
        this.state = useState({
            lines: [],
            company: "",
            currency: "",
            error: null,
            loading: true,
            dateFrom: this.getDefaultDateFrom(),
            dateTo: this.getDefaultDateTo(),
        });

        onWillStart(async () => {
            await this.loadData();
        });
    }

    getDefaultDateFrom() {
        return new Date().toISOString().slice(0, 10);
    }

    getDefaultDateTo() {
        return new Date().toISOString().slice(0, 10);
    }

    isBoldLine(name) {
        if (!name) return false;
        return BOLD_LINE_NAMES.some((target) =>
            name.trim().toLowerCase() === target.toLowerCase()
        );
    }

    async loadData() {
        this.state.loading = true;
        this.state.error = null;
        try {
            const result = await this.orm.call(
                "pnl.dashboard",
                "get_pnl_data",
                [],
                {
                    date_from: this.state.dateFrom,
                    date_to: this.state.dateTo,
                }
            );
            if (result.error) {
                this.state.error = result.error;
                this.state.lines = [];
            } else {
                this.state.lines = result.lines.map((line) => ({
                    ...line,
                    is_total: line.is_total || this.isBoldLine(line.name),
                }));
            }
            this.state.company = result.company;
            this.state.currency = result.currency;
        } catch (e) {
            this.state.error = e.message?.data?.message || "Failed to load Profit and Loss data.";
        } finally {
            this.state.loading = false;
        }
    }

    async onDateChange() {
        await this.loadData();
    }

    async onRefresh() {
        await this.loadData();
    }
}

registry.category("actions").add("pnl_dashboard_action", PnlDashboard);