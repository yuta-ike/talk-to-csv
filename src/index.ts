import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as cheerio from "cheerio"
import puppeteer from "puppeteer-core"
import { selectors } from "./selectors.ts"

const BASE_URL = process.env.BASE_URL
const TALKS_URL = `${BASE_URL}/talks`

// GitHub Actions環境かどうか判定する関数
const isGithubActions = () => process.env.GITHUB_ACTIONS === "true"

// セッション情報の型定義
interface SessionInfo {
  title: string
  description?: string
  room?: string
  day?: string
  track?: string
  thumbnailUrl?: string
  speaker: string
  speakerAffiliation?: string
  speakerProfile?: string
  speakerGithub?: string
  speakerTwitter?: string
  speakerIconUrl?: string
  detailPageUrl?: string
}

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchRenderedHTML(url: string): Promise<string> {
  await sleep(1000)
  console.info(`URLにアクセス: ${url}`)

  const options = isGithubActions()
    ? {
        // GitHub Actionsの環境では、プリインストールされたChromeを使う
        executablePath: "/usr/bin/google-chrome",
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      }
    : {
        // ローカル環境では通常通り起動する
        headless: true,
      }

  const browser = await puppeteer.launch(options)
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: "networkidle0" })
  const html = await page.content()
  await browser.close()
  return html
}

async function fetchSessionList(day?: string): Promise<SessionInfo[]> {
  try {
    const url = day ? `${TALKS_URL}?day=${day}` : TALKS_URL
    console.info(`セッション一覧の取得開始：${url}`)

    const html = await fetchRenderedHTML(url)
    const $ = cheerio.load(html)

    // 現在のデイを判別（デフォルトはDay 1）
    const currentDay = day === "2" ? "day2" : "day1"

    const sessions: SessionInfo[] = []

    // セッション情報の抽出
    $(selectors.sessionList.container).each((_index, element) => {
      const titleElement = $(element).find(selectors.sessionList.title)
      const speakerElement = $(element).find(selectors.sessionList.speaker)

      const title = titleElement.text().trim()
      const speaker = speakerElement.text().trim()

      // トラック情報を取得
      const trackElement = $(element)
        .closest("[class*='bg-white']")
        .find(selectors.sessionList.trackElement)
      const track = trackElement.text().trim()

      // セッション詳細ページへのリンクを取得
      let detailPageUrl: string | undefined
      const linkElement = titleElement.parent().filter(selectors.sessionList.linkElement)
      if (linkElement.length > 0) {
        detailPageUrl = `${BASE_URL}${linkElement.attr("href")}`
      }

      // LTセッションは複数のセッションが含まれている場合がある（class="flex flex-col gap-5"を持つ要素）
      const ltContainer = $(element).find(selectors.sessionList.ltContainer)
      if (ltContainer.length > 0) {
        // LTセッションの場合、各セッションを個別に取得
        ltContainer.find(selectors.sessionList.ltItems).each((_i, ltElement) => {
          const ltTitle = $(ltElement).find(selectors.sessionList.title).text().trim()
          const ltSpeaker = $(ltElement).find(selectors.sessionList.speaker).text().trim()
          let ltDetailPageUrl: string | undefined

          const ltLinkElement = $(ltElement).find(selectors.sessionList.linkElement)
          if (ltLinkElement.length > 0) {
            ltDetailPageUrl = `${BASE_URL}${ltLinkElement.attr("href")}`
          }

          if (ltTitle && ltSpeaker) {
            sessions.push({
              title: ltTitle,
              speaker: ltSpeaker,
              day: currentDay,
              track,
              detailPageUrl: ltDetailPageUrl,
            })
          }
        })
      } else if (title && speaker) {
        sessions.push({
          title,
          speaker,
          day: currentDay,
          track,
          detailPageUrl,
        })
      }
    })

    console.info(`${sessions.length}件のセッション情報を取得しました`)
    return sessions
  } catch (error) {
    console.error("セッション一覧の取得中にエラーが発生しました:", error)
    return []
  }
}

async function fetchSessionDetail(session: SessionInfo): Promise<SessionInfo> {
  if (!session.detailPageUrl) {
    return session
  }

  try {
    const html = await fetchRenderedHTML(session.detailPageUrl)
    const $ = cheerio.load(html)

    // セッションの詳細説明を取得
    const description = $(selectors.sessionDetail.description).text().trim()
    session.description = description

    // ルーム名を取得 - 「トラック」の情報から取得できる
    if (session.track) {
      session.room = session.track.replace(/トラック$/, "ルーム").trim()
    }

    // サムネイル画像のURLを取得
    const thumbnailImg = $(selectors.sessionDetail.thumbnailImg).first()
    if (thumbnailImg.length > 0) {
      session.thumbnailUrl = thumbnailImg.attr("src")
      if (session.thumbnailUrl && !session.thumbnailUrl.startsWith("http")) {
        session.thumbnailUrl = `${BASE_URL}${session.thumbnailUrl}`
      }
    }

    // 登壇者情報を取得
    const speakerSection = $(selectors.sessionDetail.speakerSection)

    // 登壇者のアイコン
    const speakerIcon = speakerSection.find("img").first()
    if (speakerIcon.length > 0) {
      session.speakerIconUrl = speakerIcon.attr("src")
      if (session.speakerIconUrl && !session.speakerIconUrl.startsWith("http")) {
        session.speakerIconUrl = `${BASE_URL}${session.speakerIconUrl}`
      }
    }

    // 登壇者の所属
    const speakerAffiliation = speakerSection
      .find(selectors.sessionDetail.speakerAffiliation)
      .first()
    if (speakerAffiliation.length > 0) {
      session.speakerAffiliation = speakerAffiliation.text().trim()
    }

    // 登壇者のプロフィール
    const speakerProfile = speakerSection.find(selectors.sessionDetail.speakerProfile).first()
    if (speakerProfile.length > 0) {
      session.speakerProfile = speakerProfile.text().trim()
    }

    // 登壇者のSNSアカウント
    speakerSection.find("a").each((_i, el) => {
      const href = $(el).attr("href")
      if (href) {
        if (href.includes("github.com")) {
          session.speakerGithub = href
        } else if (href.includes("twitter.com") || href.includes("x.com")) {
          session.speakerTwitter = href
        }
      }
    })

    return session
  } catch (error) {
    console.error(`詳細情報の取得中にエラーが発生しました: ${session.title}`, error)
    return session
  }
}

async function saveToCSV(sessions: SessionInfo[]): Promise<void> {
  const headers = [
    "title",
    "description",
    "room",
    "day",
    "track",
    "thumbnailUrl",
    "speaker",
    "speakerAffiliation",
    "speakerProfile",
    "speakerGithub",
    "speakerTwitter",
    "speakerIconUrl",
  ]

  let csvContent = `${headers.join(",")}\n`

  for (const session of sessions) {
    const row = headers.map((header) => {
      const value = session[header as keyof SessionInfo]
      // 値をCSVセーフにする（カンマやダブルクォートをエスケープ）
      if (value === undefined || value === null) return ""
      const stringValue = String(value).replace(/"/g, '""')
      return `"${stringValue}"`
    })
    csvContent += `${row.join(",")}\n`
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const outputDir = path.resolve(currentDir, "..", "outputs")

  // outputsディレクトリが存在しなければ作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, "sessions.csv")

  fs.writeFileSync(outputPath, csvContent)
  console.info(`CSVファイルを作成: ${outputPath}`)
}

async function main(): Promise<void> {
  try {
    // Day 1とDay 2のセッション情報を取得
    const day1Sessions = await fetchSessionList("1")
    const day2Sessions = await fetchSessionList("2")

    // 全セッション情報を結合
    const allSessions = [...day1Sessions, ...day2Sessions]

    // 詳細情報を取得
    const detailedSessions: SessionInfo[] = []
    for (const session of allSessions) {
      const detailedSession = await fetchSessionDetail(session)
      detailedSessions.push(detailedSession)
    }

    // CSVに保存
    await saveToCSV(detailedSessions)
  } catch (error) {
    console.error("実行中にエラーが発生:", error)
    process.exit(1)
  }
}

main()
