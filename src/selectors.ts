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
    description: ".prose",
    thumbnailImg: ".rounded-lg.overflow-hidden img",
    speakerSection: ".bg-white.rounded-lg",
    speakerAffiliation: "p.text-sm.text-gray-600",
    speakerProfile: ".mt-4",
  },
};
