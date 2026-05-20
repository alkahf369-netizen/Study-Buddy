export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-test-runner-root className="min-h-screen bg-zinc-50">
      {children}
    </div>
  );
}
