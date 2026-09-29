import Nav from "@/components/Nav";
import TrendsView from "@/components/TrendsView";
import CorrelationInsights from "@/components/CorrelationInsights";

export default function TrendsPage() {
  return (
    <main>
      <h1>Vitalog</h1>
      <Nav />
      <TrendsView />
      <CorrelationInsights />
    </main>
  );
}
