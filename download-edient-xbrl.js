// 各種 Web サイトから finance 情報を取得する

const fs = require('fs-extra')
const puppeteer = require('puppeteer')

const options = {
  headless: true,
  ignoreHTTPSErrors: true
}

const waitPromise = ms => new Promise(resolve => setTimeout(resolve, ms))

const waitForDownload = async dir => {
  // ダウンロード開始を待つために3秒は待つ
  await waitPromise(3000)
  let wait = true
  while (wait) {
    const files = fs.readdirSync(dir)
    wait = files.find(file => /\.crdownload/.test(file))
  }
  // ダウンロードを確実に完了させつために2秒待つ
  await waitPromise(2000)
}

const serchDocuments = async (page, code) => {
  const EDINET_TOP_URL = 'http://disclosure.edinet-fsa.go.jp/'
  const KENSAKU = 'li.kensaku > a'
  const CODE_INPUT = '#mul_t'
  const OPEN_PERIOD =
    '#control_object_class1 > div > div:nth-child(6) > div.panel-item.panel.panel-up > div > p.txt'
  const PERIOD_SELCT = 'select[name="pfs"]'
  const SEARCH_BTN = '#sch'

  // EDINET のトップページを開く
  await page.goto(EDINET_TOP_URL)

  // 検索ページに移動する
  await page.click(KENSAKU)
  await page.waitFor(CODE_INPUT)
  await page.waitFor(OPEN_PERIOD)

  // 検索ページの '決算期／提出期間を指定する' を開く
  await page.click(OPEN_PERIOD)

  // コードを入力する
  await page.$eval(
    CODE_INPUT,
    (e, c) => {
      e.value = c
    },
    code
  )

  // 期間を全期間にする
  await page.$eval(PERIOD_SELCT, e => {
    e.value = '5'
  })

  // 検索実効
  await page.click(SEARCH_BTN)
}

const downloadXbrl = async (browser, page, downloadPath) => {
  const XBRL_BUTTON = '#xbrlbutton'

  // ダウンロードボタンが存在することを確認
  await page.waitFor(XBRL_BUTTON)

  // ダウンロードの挙動を指定
  const client = await page.target().createCDPSession()
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath
  })

  // ダウンロードボタンをクリック
  page.on('dialog', async dialog => {
    await dialog.accept()
  })
  await page.click(XBRL_BUTTON)

  // ダウンロード終了を待つ(上手くいかないので10秒待つ)
  await waitForDownload(downloadPath)
}

const downloadEdnetXBRL = async code => {
  const browser = await puppeteer.launch(options)
  const page = await browser.newPage()
  const baseDir = '/home/hiroshi/Dropbox/edinet'
  const downloadPath = `${baseDir}/${code}`

  await /* TODO: JSFIX could not patch the breaking change:
  Creating a directory with fs-extra no longer returns the path 
  Suggested fix: The returned promise no longer includes the path of the new directory */
  fs.ensureDir(downloadPath)

  await serchDocuments(page, code)
  await downloadXbrl(browser, page, downloadPath)
  await browser.close()
  console.log(downloadPath)
}

if (require.main === module) {
  console.log('Hello')
} else {
  module.exports = downloadEdnetXBRL
}
