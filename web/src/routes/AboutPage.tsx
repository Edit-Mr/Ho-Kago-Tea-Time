function AboutPage() {
  return (
    <div className="px-6 py-6">
      <div className="space-y-1">
        <p className="text-sm text-slate-400">關於城視</p>
        <h1 className="text-2xl font-semibold text-slate-50">About CitySight</h1>
        <p className="text-slate-200 text-xl max-w-4xl leading-relaxed">在這裡可以快速瀏覽產品概念與設計稿。若無法正常顯示，請確認瀏覽器是否允許第三方內容。</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg overflow-hidden">
        <div className="flex justify-center">
          <iframe
            title="CitySight Slides"
            style={{ border: "1px solid rgba(0, 0, 0, 0.1)" }}
            width="800"
            height="450"
            src="https://embed.figma.com/slides/z0wx5cO3Dgx38QmrrgdFG1/%E5%9F%8E%E8%A6%96-CitySight?node-id=1-1273&embed-host=share"
            allowFullScreen
          />
        </div>
      </div>
      <div className="space-y-12 mt-16">
        <section className="space-y-3">
          <h2 className="text-5xl font-bold tracking-tight text-slate-50">畫重點，看這裡</h2>
          <div className="">
            <BigPoint label="S（重要性）">新竹是高壓年輕家庭城市，→ 公共安全與租屋/買房決策是在資訊不對稱下做出的。</BigPoint>
            <BigPoint label="H（傷害）">看不到安全狀態、看不到通報進度、看不到預算與風險的對應關係。</BigPoint>
            <BigPoint label="I（現狀障礙）">資料碎片化、流程不公開、沒為市民設計介面 → 自己不會改善。</BigPoint>
            <BigPoint label="P（計畫）">先從新竹公園/遊戲場做一個完整的「健康卡＋時間軸＋風險熱度」，用 open tech 做成可複製模板。</BigPoint>
            <BigPoint label="S（解決力）">一次改變個人決策、政府資源配置、整體治理信任。並且已經有可 demo 的端到端原型。</BigPoint>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-5xl font-bold tracking-tight text-slate-50">誰得利</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <BenefitCard title="對個人：決策變安全、變理性" bullets={["家長看得到附近公園的檢查與事故紀錄 → 知道哪裡安全帶小孩。", "租屋者看得到社區周邊維護狀態與通報熱點 → 不會只看裝潢。"]} />
            <BenefitCard
              title="對政府：資源分配更有依據"
              bullets={["從「誰吵就修誰家前面的路」→「風險最高、弱勢最多的里先處理」。", "預算審查會議可以直接看：「今年把 10 個紅區降為黃區，用了多少錢？」"]}
            />
            <BenefitCard title="對整體治理：信任可被量化" bullets={["通報平均處理時間、逾期比例、風險分數都公開 → 平時就能檢視「有沒有做到」。", "從「口號式公開」走向「資料驅動的責任政治」。"]} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-5xl font-bold tracking-tight text-slate-50">FAQ</h2>
          <div className="space-y-2 text-slate-200">
            <FAQItem question="如何和現有平台整合？">不要求短時間改系統，幾乎沒有任何額外成本。只需按月匯出／提供 API 即可，並可協助進行問題回報自動轉發給相關單位。</FAQItem>
            <FAQItem question="不是市府 IT 做個儀表板就好？">不只是畫圖。要處理資料結構碎片化、為市民設計的介面（API 難獲取、要付費、格式雜亂）、以及把維護流程時間線視為「必須公開」。</FAQItem>
            <FAQItem question="這會不會變成民眾只會拿來噴政府？">現在是「只會噴，卻沒有共同事實基礎」。有了城視：看到哪些地方改善了、排程中、被忽視，這對負責任的政府其實是一種保護。</FAQItem>
          </div>
        </section>

        <section className="rounded-3xl border border-brand-500/30 bg-brand-500/10 px-10 py-32 shadow-inner text-center mt-12 ">
          <p className="text-6xl font-semibold text-slate-50 leading-normal">
            「我們相信，想讓城市變得更好的官員
            <br />
            值得擁有一個真正可靠、透明的工具。」
          </p>
        </section>
      </div>
    </div>
  );
}

function BigPoint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
      <p className="text-lg font-semibold text-brand-100">{label}</p>
      <p className="text-3xl leading-relaxed text-slate-50">{children}</p>
    </div>
  );
}

function BenefitCard({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <p className="text-3xl font-semibold text-slate-50">{title}</p>
      <ul className="space-y-2 text-slate-200 text-xl leading-relaxed">
        {bullets.map(item => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-brand-400/80" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-5 space-y-3">
      <p className="text-2xl font-semibold text-slate-50">{question}</p>
      <p className="text-xl text-slate-200 leading-relaxed">{children}</p>
    </div>
  );
}

export default AboutPage;
