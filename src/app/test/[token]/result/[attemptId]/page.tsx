import ResultView from '@/components/test/ResultView';

export default async function ResultPage({ params }: { params: Promise<{ token: string; attemptId: string }> }) {
  const { token, attemptId } = await params;
  return <ResultView token={token} attemptId={attemptId} />;
}
