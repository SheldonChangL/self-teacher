import type { Profile, Subject } from "./db";

const langName = (l: string) =>
  l === "zh" ? "純繁體中文（台灣用法）" : l === "en" ? "純英文" : "繁體中文（台灣用法） + 英文雙語";

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
  label: string; // 顯示名稱
  focus: string; // 在 prompt 中強調的「找什麼」
  style: string; // 教學風格
  sectionHint: string; // 段落主題建議
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
      "像國語老師一樣，先認字（含注音）、再說意思、再造個簡單例句；遇到成語或句型要解釋；不要把英文當主角",
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

export function buildLessonPrompt(opts: {
  profile: Profile;
  imageRelPaths: string[];
  subject: Subject;
  hint?: string;
}): string {
  const { profile, imageRelPaths, subject, hint } = opts;
  const pb = PLAYBOOKS[subject] ?? PLAYBOOKS.free;
  const imgList = imageRelPaths.map((p) => `- ${p}`).join("\n");
  const lang = langName(profile.lang_pref);
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
- 千萬不要編造照片中沒有的東西；如果照片不清楚，就誠實告訴小朋友「老師看不太清楚耶，可以再拍一張嗎？」並仍然就看得見的部分教
- 字數總共控制在 250~450 字（含中英文）
- 風格要溫柔、鼓勵、像跟小朋友說話
- 段落結構：${pb.sectionHint}

請用 Markdown 格式輸出，依下列骨架（你可以依科目調整單字段名稱，但結構要照走）：

# {一個有趣的標題（中文 / English）}

{2~3 句的開場白（雙語就先中文再英文，純中或純英就只用該語言）}

## 🌟 {第一段標題}

{第一段內容}

## 🌟 {第二段標題}

{第二段內容}

**🔤 重要單字 / Words to learn**
- **{詞或英文}** {音標或注音} — {中文意思}

## 🎉 有趣的小知識 / Fun Facts

* {一條有趣的事實或練習邀請}
* {再一條}

非常重要：
1. 直接輸出 Markdown，不要包在 \`\`\` 裡，也不要任何前後的說明
2. 不要呼叫除了 Read 之外的工具
3. 不要加額外的章節，照骨架就好
4. 中文一律用「繁體中文／台灣用法」，常見字差異例如：開心（不是开心）、學（不是学）、這（不是这）、什麼（不是什么）、認識（不是认识）、麼（不是么）、為（不是为）、體（不是体）、個（不是个）`;
}

export function buildQuizPrompt(opts: {
  profile: Profile;
  lessonMarkdown: string;
  subject: Subject;
}): string {
  const { profile, lessonMarkdown, subject } = opts;
  const pb = PLAYBOOKS[subject] ?? PLAYBOOKS.free;
  return `你是兒童「${pb.label}」測驗出題老師。請根據下面這份教材，幫 ${profile.age} 歲的「${profile.name}」出 5 題小測驗（單選題，4 選 1）。

教材內容：
"""
${lessonMarkdown}
"""

規則：
- 5 題單選題，每題 4 個選項
- 題目要中英雙語，選項可以是中英混合
- 難度配合 ${profile.age} 歲的程度
- 題目要扣回教材內容
- 數學題請給能算的數字題；國語題可考字音字義或詞語使用；英文題可考拼字、發音、意思；自然/社會考觀察與理解
- explain 要簡短鼓勵，例如「答對了！...」
- 答案分布要平均（不要全是同一個 index）

中文一律使用繁體中文（台灣用法）。

輸出格式：**只輸出 JSON**，不要包 \`\`\`，不要任何前後文字：

{
  "questions": [
    {
      "q_zh": "中文題目",
      "q_en": "English version",
      "options": ["選項1", "選項2", "選項3", "選項4"],
      "answer_index": 0,
      "explain_zh": "中文解釋",
      "explain_en": "English explanation"
    }
  ]
}`;
}
