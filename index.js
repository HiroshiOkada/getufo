#!/usr/bin/env node
const { URL } = require('url')
const path = require('path')
const prog = require('commander')
const puppeteer = require('puppeteer')
const {
  toEdinetCode,
  nameLookup,
  waitPromise,
  setUpForDownload,
  waitDownloadFinish,
  downLoadFromUrl
} = require('./getufo_utils.js')

prog
  .version('0.0.4', '-v, --version')
  .description('Download financial statements from EDINET.')
  .option(
    '-f, --folder [folder]',
    'Set download folder (default: current working directory)'
  )
  .option(
    '-n, --numpdf [num]',
    'How many pdf files to download (default: 4)'
  )
  .arguments('<codes>')
  .parse(process.argv)

prog.on('--help', function() {
  console.log('')
  console.log(
    '    Codes are either security codes, EDINET codes or fund codes.'
  )
  console.log('')
  console.log('  Extra:')
  console.log(
    '    Enter a part of the company name instead of the code to display'
  )
  console.log('    a list of codes. (In this case, nothing is downloaded.)')
  console.log('')
})

const baseFolder = prog.folder || process.cwd()
const numPdf = prog.numpdf || 4

const puppeteerOptions = {
  headless: true,
  ignoreHTTPSErrors: true
}

const showList = list => {
  list.forEach(item => {
    const cols = [item.edinetCode, item.secCode, item.name]
    if (item.ruby) {
      cols.push(item.ruby)
    }
    if (item.englishName) {
      cols.push(item.englishName)
    }
    console.log(cols.join(', '))
  })
}

const downloadByCode = async (page, code) => {
  const downloadPath = path.join(baseFolder, code)
  console.log(`Download to ${downloadPath}`)

  // Go to EDINET search page
  const EDINET_TOP_URL = 'http://disclosure.edinet-fsa.go.jp/'
  await page.goto(EDINET_TOP_URL)
  const KENSAKU = 'li.kensaku > a'
  await page.waitFor(KENSAKU)
  await page.$eval(KENSAKU, e => e.click())

  // Set serach period max
  const OPEN_PERIOD =
    '#control_object_class1 > div > div:nth-child(6) > div.panel-item.panel.panel-up > div > p.txt'
  await page.waitFor(OPEN_PERIOD)
  await page.$eval(OPEN_PERIOD, e => e.click())

  const PERIOD_SELCT = 'select[name="pfs"]'
  await page.$eval(PERIOD_SELCT, e => {
    e.value = '5'
  })

  // set code
  const CODE_INPUT = '#mul_t'
  await page.$eval(
    CODE_INPUT,
    (e, c) => {
      e.value = c
    },
    code
  )

  // search
  const SEARCH_BTN = '#sch'
  await page.waitFor(SEARCH_BTN)
  await page.$eval(SEARCH_BTN, e => e.click())

  // download xbrl
  await setUpForDownload(page, downloadPath)
  const XBRL_BUTTON = '#xbrlbutton'
  await page.waitFor(XBRL_BUTTON)
  const dialogAccept = async dialog => {
    await dialog.accept()
  }
  page.on('dialog', dialogAccept)
  console.log('Download XBRL (zip)')
  await page.$eval(XBRL_BUTTON, e => e.click())
  await waitDownloadFinish(downloadPath)
  page.removeListener('dialog', dialogAccept)

  await page.waitFor('a[target="_blank"] img[alt="PDF"]')
  let getPdfHrefs = `Array.from(document.querySelectorAll('a[target="_blank"] img[alt="PDF"]'), e => e.parentElement.href)`
  let pdfHrefs = await page.evaluate(getPdfHrefs)
  for (let n = 0; n < pdfHrefs.length && n < numPdf; n += 1) {
    await waitPromise(2000)
    const targetUrl = new URL(pdfHrefs[n])
    const pdfFileName = `${targetUrl.searchParams.get('s')}.pdf`
    console.log(`Download ${pdfFileName}`)
    await downLoadFromUrl(
      page,
      targetUrl.toString(),
      pdfFileName,
      downloadPath
    )
  }
}

const downloadByCodes = async codes => {
  const browser = await puppeteer.launch(puppeteerOptions)

  const page = await browser.newPage()

  try {
    for (let code of codes) {
      await downloadByCode(page, code, 4)
    }
  } catch (ex) {
    console.log(ex)
  }

  await browser.close()
}

const main = async () => {
  switch (prog.args.length) {
    case 0:
      prog.help()
      break

    case 1:
      {
        const code = toEdinetCode(prog.args[0])
        if (code) {
          await downloadByCodes([code])
        } else {
          showList(nameLookup(prog.args[0]))
        }
      }
      break

    default:
      {
        const codes = Array.from(prog.args, toEdinetCode).filter(
          code => !!code
        )
        if (codes.length == 1) {
          prog.help()
        } else {
          await downloadByCodes(codes)
        }
      }
      break
  }
}

main()
