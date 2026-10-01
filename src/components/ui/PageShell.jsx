// Henüz yapılmamış sayfalar için geçici iskelet
export function PageShell({ title }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-32 pt-4">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-mut">Bu sayfa sonraki adımlarda dolacak.</p>
    </main>
  );
}
