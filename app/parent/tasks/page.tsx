import { BackLink } from "@/components/BackLink";
import { PresetManagerClient } from "@/components/PresetManagerClient";
import { getBonusConfig } from "@/lib/rewards";

export const dynamic = "force-dynamic";

export default function ParentTasksPage() {
  const bonus = getBonusConfig();
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-4xl">
        <BackLink href="/parent">回家長後台</BackLink>
        <header className="mt-2">
          <h1 className="text-3xl font-extrabold text-amber-700 sm:text-4xl">
            ⚙️ 管理任務預設
          </h1>
          <p className="mt-1 text-zinc-600">
            這裡的清單會出現在小朋友的「📋 今日任務」頁面。
          </p>
        </header>

        <div className="mt-6">
          <PresetManagerClient initialBonus={bonus} />
        </div>
      </div>
    </main>
  );
}
