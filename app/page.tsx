import Dashboard from "@/components/Dashboard";
import { getNews } from "@/lib/fetchNews";

export const revalidate = 0;

export default async function Home() {
  const data = await getNews();

  return (
    <main className="page">
      <Dashboard initialData={data} />
    </main>
  );
}
