import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

export const StudentDashboardPage = () => (
  <div className="grid gap-4 md:grid-cols-3">
    <Card>
      <p className="text-sm text-slate-500">Book by Grade</p>
      <p className="mt-1 text-lg font-semibold">Find teachers in one click</p>
      <Badge variant="info">Fast</Badge>
    </Card>
    <Card>
      <p className="text-sm text-slate-500">Meeting Confirmations</p>
      <p className="mt-1 text-lg font-semibold">Google Meet link included</p>
      <Badge variant="warning">Secure</Badge>
    </Card>
    <Card>
      <p className="text-sm text-slate-500">Booking Safety</p>
      <p className="mt-1 text-lg font-semibold">Atomic reservation flow</p>
      <Badge>Protected</Badge>
    </Card>
  </div>
);
