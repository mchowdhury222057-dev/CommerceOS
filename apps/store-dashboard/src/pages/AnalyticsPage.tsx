import { BarChart3 } from "lucide-react";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Card } from "../components/ui/Card";

// Genuinely "Coming Soon" (not the Customer Risk Flagging page, which is
// live at /customers) - deeper analytics beyond the Dashboard's existing
// KPI cards/chart isn't built yet, and this page says so honestly rather
// than faking data to look finished.
export default function AnalyticsPage() {
  return (
    <div>
      <SectionHeader title="Analytics" description="Deeper insights into your store's performance." />
      <Card>
        <EmptyState
          icon={<BarChart3 size={22} aria-hidden="true" />}
          title="Analytics is coming soon"
          description="Cohort trends, product-level performance, and customer lifetime value are on the roadmap. For now, the Dashboard's stats and sales chart cover the essentials."
        />
      </Card>
    </div>
  );
}
