import Link from "next/link";
import { db, Profile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const profiles = db
    .prepare("SELECT * FROM profiles ORDER BY created_at ASC")
    .all() as Profile[];

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-amber-700 drop-shadow-sm">
          自學小老師 🎒
        </h1>
        <p className="mt-3 text-lg text-zinc-600">
          拍張照，AI 老師就會跟你一起學習！
        </p>
      </header>

      <section className="w-full max-w-3xl">
        <h2 className="mb-4 text-xl font-semibold text-zinc-700">
          請選你自己 👇
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/kid/${p.id}`}
              className="group flex flex-col items-center rounded-3xl bg-white/80 p-6 shadow-md ring-1 ring-amber-100 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"
            >
              <span className="text-6xl transition group-hover:scale-110">
                {p.avatar}
              </span>
              <span className="mt-3 text-lg font-bold text-zinc-800">
                {p.name}
              </span>
              <span className="text-sm text-zinc-500">{p.age} 歲</span>
            </Link>
          ))}

          <Link
            href="/profile/new"
            className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-6 text-amber-700 transition hover:bg-amber-100"
          >
            <span className="text-6xl">➕</span>
            <span className="mt-3 text-lg font-bold">新增小朋友</span>
          </Link>
        </div>

        {profiles.length === 0 && (
          <p className="mt-6 text-center text-zinc-500">
            還沒有人～點上面的「新增小朋友」開始吧！
          </p>
        )}
      </section>

      <Link
        href="/parent"
        className="fixed bottom-4 right-4 rounded-full bg-white/80 px-4 py-2 text-sm text-zinc-500 shadow-sm ring-1 ring-amber-100 transition hover:bg-white hover:text-amber-700"
      >
        👨‍👩‍👧 家長後台
      </Link>
    </main>
  );
}
