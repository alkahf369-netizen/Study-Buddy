import SharedQuizView from '@/components/quiz/SharedQuizView';

export default async function TestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedQuizView token={token} />;
}
