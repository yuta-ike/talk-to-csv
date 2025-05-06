export const selectors = {
  // セッション一覧ページのセレクタ
  sessionList: {
    container: ".bg-white .text-left",
    title: "p.text-16",
    speaker: "p.text-14",
    trackElement: "[class*='bg-track-']",
    linkElement: "a.hover\\:underline",
    ltContainer: ".flex.flex-col.gap-5",
    ltItems: ".flex.flex-col.gap-1",
  },

  // セッション詳細ページのセレクタ
  sessionDetail: {
    description: ".px-6.md\\:px-8.lg\\:px-10.gap-6.flex.flex-col.md\\:text-lg > p",
    thumbnailImg: (title: string) => `img[alt='${title}']`,
    speakerSection: ".bg-blue-light-200.p-6.rounded-xl",
    speakerAffiliation: ".flex.flex-col.gap-2 > p:first-child",
    speakerProfile: ".flex.flex-col.gap-2 > p:nth-child(2)",

    // メタデータのセレクタ
    pageTitle: "title",
    metaOgTitle: "meta[property='og:title']",
    metaOgDescription: "meta[property='og:description']",
    metaOgImage: "meta[property='og:image']",
    metaTwitterTitle: "meta[name='twitter:title']",
    metaTwitterDescription: "meta[name='twitter:description']",
    metaTwitterImage: "meta[name='twitter:image']",
  },
}
