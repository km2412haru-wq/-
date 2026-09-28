import Nav from "@/components/Nav";
import ReportView from "@/components/ReportView";

export default function ReportPage() {
  return (
    <main>
      <h1 className="no-print">Vitalog</h1>
      <div className="no-print">
        <Nav />
      </div>
      <ReportView />
    </main>
  );
}
