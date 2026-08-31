import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <h1 className="pageTitle">AWS認定AI作問クイズ</h1>
      <p className="pageSubtitle">
        AIが公式試験ガイドに基づき、その都度オリジナルの4択問題を生成します。
      </p>
      <div className="card">
        <p>
          Cloud Practitioner(CLF-C02)・Solutions Architect Associate(SAA-C03)の
          2資格に対応しています。
        </p>
        <p style={{ marginBottom: 20 }}>
          問題は毎回AIが新しく生成するため、同じ問題を繰り返し解くのではなく、
          幅広いシナリオで理解度を試すことができます。
        </p>
        <Link href="/quiz" className="primaryButton">
          クイズを始める
        </Link>
      </div>
    </main>
  );
}
