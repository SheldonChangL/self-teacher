import type { Profile, Subject } from "./db";

function difficultyHint(age: number) {
  if (age <= 5)
    return "用最最簡單的字詞跟句子（每句不超過 10 個中文字），多用注音符號或顏色形狀的形容";
  if (age <= 8)
    return "用國小低年級的詞彙跟簡短句子，每段約 30~50 字，可以加入一點注音";
  if (age <= 11)
    return "用國小中高年級程度的詞彙，可以解釋因果關係，每段約 50~80 字";
  return "用國中程度的詞彙跟句子，可以介紹原理跟有趣的延伸知識";
}

type SubjectPlaybook = {
  label: string;
  focus: string;
  style: string;
  sectionHint: string;
};

const PLAYBOOKS: Record<Subject, SubjectPlaybook> = {
  free: {
    label: "自由探索",
    focus:
      "從照片中找出 1~2 個小朋友會感興趣的學習主題（可以是動植物、物品、文字、現象、文化…等）",
    style: "用好奇、發現的口吻引導，把照片裡的東西變成一場小冒險",
    sectionHint: "兩段：第一段介紹是什麼，第二段補一個有趣的小知識",
  },
  chinese: {
    label: "國語",
    focus:
      "認真辨認照片中的中文字、詞語、句子或注音；如果是課本/作業也請一起讀懂題目",
    style:
      "像國語老師一樣，先認字（含注音）、再說意思、再造個簡單例句；遇到成語或句型要解釋",
    sectionHint:
      "兩段：第一段「認字 / 詞語小教室」，第二段「造句或語感練習」；單字段請改名為「重要詞語」並列出 注音 — 詞 — 意思",
  },
  english: {
    label: "英文",
    focus: "辨認照片中的英文字、單字、片語、句子或對話",
    style:
      "像英文老師，先念音再翻譯，遇到單字一定要附 KK 音標，並用一兩句中文解釋；給一個跟生活有關的例句",
    sectionHint:
      "兩段：第一段「Words & Pronunciation 單字與發音」，第二段「Talk Like This 試著這樣說」",
  },
  math: {
    label: "數學",
    focus:
      "看清楚照片中的數字、算式、幾何圖形或應用題；如果是作業，請把題目讀出來",
    style:
      "一步一步帶著想，用生活實例舉例（蘋果、糖果、零用錢都可以）；解題時用條列『第 1 步、第 2 步…』，不要直接給答案，先引導思路再寫出計算過程；最後給答案並驗算",
    sectionHint:
      "兩段：第一段「題目在說什麼」（解讀題意），第二段「動手解解看」（步驟）；單字段請改成「數學小詞彙」（例如：周長、分母、角度），用簡單中文解釋",
  },
  science: {
    label: "自然",
    focus:
      "從照片中找一個自然或科學主題（生物、氣象、物質、力學、生活科學…）",
    style:
      "用『為什麼？怎麼會？』的好奇口吻；先描述觀察到的現象，再用淺顯比喻解釋原理；可以邀請小朋友動手做小實驗",
    sectionHint:
      "兩段：第一段「我們看到了什麼」，第二段「背後的小秘密」；可以在 fun facts 裡放一個可在家做的小實驗",
  },
  social: {
    label: "社會",
    focus:
      "從照片中找一個社會主題（地理、歷史、文化、生活禮儀、交通號誌、招牌、地圖等）",
    style:
      "把學習扣回小朋友的生活；用故事方式介紹背景或地點；提醒重要的禮儀或安全",
    sectionHint:
      "兩段：第一段「這是哪裡 / 這代表什麼」，第二段「跟我們生活的關係」",
  },
};

const TC_REMINDER =
  "中文一律用「繁體中文／台灣用法」，常見字差異例如：開心（不是开心）、學（不是学）、這（不是这）、什麼（不是什么）、認識（不是认识）、為（不是为）、體（不是体）、個（不是个）";

function bilingualSkeleton(): string {
  return `# {一個有趣的標題（中文 / English）}

{2~3 句開場白：先一段中文，再一段對應英文}

## 🌟 {第一段標題（中文 / English）}

{第一段內容：先中文，再對應英文}

## 🌟 {第二段標題（中文 / English）}

{第二段內容：先中文，再對應英文}

**🔤 重要單字 / Words to learn**
- **{english word}** {KK 音標} — {中文意思}
- **{english word}** {KK 音標} — {中文意思}

## 🎉 有趣的小知識 / Fun Facts

* {一條中文小知識}
* {Another fun fact in English}`;
}

function chineseSkeleton(): string {
  return `# {一個有趣的中文標題}

{2~3 句中文開場白}

## 🌟 {第一段中文標題}

{第一段中文內容}

## 🌟 {第二段中文標題}

{第二段中文內容}

**🔤 重要詞彙**
- {詞} {注音／音標} — {中文意思}
- {詞} {注音／音標} — {中文意思}

## 🎉 有趣的小知識

* {一條中文小知識}
* {再一條中文小知識}`;
}

export function buildLessonPrompt(opts: {
  profile: Profile;
  imageRelPaths: string[];
  subject: Subject;
  hint?: string;
}): string {
  const { profile, imageRelPaths, subject, hint } = opts;
  const pb = PLAYBOOKS[subject] ?? PLAYBOOKS.free;
  const imgList = imageRelPaths.map((p) => `- ${p}`).join("\n");
  const isEnglish = subject === "english";
  const lang = isEnglish ? "繁體中文（台灣用法） + 英文雙語" : "純繁體中文（台灣用法）";
  const skeleton = isEnglish ? bilingualSkeleton() : chineseSkeleton();
  const englishRule = isEnglish
    ? "因為這是英文課，每段都要中英對照，幫小朋友建立中英連結"
    : "整份教材**只用繁體中文**，不要夾雜任何英文句子或翻譯（除非照片裡本來就有英文，那就引用該英文並用中文解釋）";

  const hintLine = hint?.trim()
    ? `\n小朋友 / 家長補充：「${hint.trim()}」（請優先處理這個需求）\n`
    : "";

  return `你是一位耐心又活潑的兒童老師，專門教「${pb.label}」。學生叫做「${profile.name}」，${profile.age} 歲。
請使用 Read 工具仔細看這些照片：
${imgList}
${hintLine}
任務：${pb.focus}。
教學風格：${pb.style}

產生一份簡短有趣的「${lang}」教材。

撰寫規則：
- ${difficultyHint(profile.age)}
- ${englishRule}
- 千萬不要編造照片中沒有的東西；如果照片不清楚，就誠實告訴小朋友「老師看不太清楚耶，可以再拍一張嗎？」並仍然就看得見的部分教
- 字數總共控制在 250~450 字
- 風格要溫柔、鼓勵、像跟小朋友說話
- 段落結構：${pb.sectionHint}

請用 Markdown 格式輸出，依下列骨架：

${skeleton}

非常重要：
1. 直接輸出 Markdown，不要包在 \`\`\` 裡，也不要任何前後的說明
2. 不要呼叫除了 Read 之外的工具
3. 不要加額外的章節，照骨架就好
4. ${TC_REMINDER}`;
}

export function buildRegeneratePrompt(opts: {
  profile: Profile;
  imageRelPaths: string[];
  subject: Subject;
  hint?: string;
  previousMarkdown: string;
  mode: "simpler" | "angle";
}): string {
  const base = buildLessonPrompt({
    profile: opts.profile,
    imageRelPaths: opts.imageRelPaths,
    subject: opts.subject,
    hint: opts.hint,
  });
  const directive =
    opts.mode === "simpler"
      ? "上次的說法對學生太難了。請改用「更簡單、句子更短、舉的例子更生活化」的方式重新講一次。可以多用「就像…」、「想像看看…」這類比喻句。"
      : "請從「完全不同的角度」切入講解（例如改換主題、改換切入點、改換比喻）。內容跟結構不能跟上次重複，要讓學生覺得是新東西。";

  return `${base}

────────────────────────────
這是「再講一次」的請求。上次給這位學生的版本如下：

\`\`\`
${opts.previousMarkdown.slice(0, 2500)}
\`\`\`

${directive}`;
}

export function buildQuizPrompt(opts: {
  profile: Profile;
  lessonMarkdown: string;
  subject: Subject;
}): string {
  const { profile, lessonMarkdown, subject } = opts;
  const pb = PLAYBOOKS[subject] ?? PLAYBOOKS.free;
  const isEnglish = subject === "english";

  const langRule = isEnglish
    ? `- 題目要中英雙語：q_zh 是中文版題目，q_en 是對應英文版；options 可中英混合
- explain_zh 是中文解釋，explain_en 是對應英文解釋（簡短即可）`
    : `- 題目、選項、解釋全部使用**純繁體中文**
- q_en、explain_en 一律輸出空字串 ""
- 不要在中文題目或選項裡夾雜英文`;

  const focusHint = isEnglish
    ? "考拼字、發音、意思、簡單句型"
    : pb.label === "國語"
      ? "考字音、字義、詞語使用"
      : pb.label === "數學"
        ? "出能算的數字題或概念題"
        : "考觀察、理解、應用";

  return `你是兒童「${pb.label}」測驗出題老師。請根據下面這份教材，幫 ${profile.age} 歲的「${profile.name}」出 5 題小測驗（單選題，4 選 1）。

教材內容：
"""
${lessonMarkdown}
"""

規則：
- 5 題單選題，每題 4 個選項
${langRule}
- 難度配合 ${profile.age} 歲的程度
- 題目要扣回教材內容；${focusHint}
- explain 要簡短鼓勵，例如「答對了！...」
- 答案分布要平均（不要全是同一個 index）

${TC_REMINDER}

輸出格式：**只輸出 JSON**，不要包 \`\`\`，不要任何前後文字：

{
  "questions": [
    {
      "q_zh": "中文題目",
      "q_en": "${isEnglish ? "English version" : ""}",
      "options": ["選項1", "選項2", "選項3", "選項4"],
      "answer_index": 0,
      "explain_zh": "中文解釋",
      "explain_en": "${isEnglish ? "English explanation" : ""}"
    }
  ]
}`;
}
