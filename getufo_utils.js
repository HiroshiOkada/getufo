const path = require('path')
const fs = require('fs-extra')

const secToEdinet = require('./sec_to_edinet.json')

const getProperty = (obj, prop) => obj && obj[prop]

const NORMALIZE_MAP = {
  Ａ: 'A',
  Ｂ: 'B',
  Ｃ: 'C',
  Ｄ: 'D',
  Ｅ: 'E',
  Ｆ: 'F',
  Ｇ: 'G',
  Ｈ: 'H',
  Ｉ: 'I',
  Ｊ: 'J',
  Ｋ: 'K',
  Ｌ: 'L',
  Ｍ: 'M',
  Ｎ: 'N',
  Ｏ: 'O',
  Ｐ: 'P',
  Ｑ: 'Q',
  Ｒ: 'R',
  Ｓ: 'S',
  Ｔ: 'T',
  Ｕ: 'U',
  Ｖ: 'V',
  Ｗ: 'W',
  Ｘ: 'X',
  Ｙ: 'Y',
  Ｚ: 'Z',
  ａ: 'a',
  ｂ: 'b',
  ｃ: 'c',
  ｄ: 'd',
  ｅ: 'e',
  ｆ: 'f',
  ｇ: 'g',
  ｈ: 'h',
  ｉ: 'i',
  ｊ: 'j',
  ｋ: 'k',
  ｌ: 'l',
  ｍ: 'm',
  ｎ: 'n',
  ｏ: 'o',
  ｐ: 'p',
  ｑ: 'q',
  ｒ: 'r',
  ｓ: 's',
  ｔ: 't',
  ｕ: 'u',
  ｖ: 'v',
  ｗ: 'w',
  ｘ: 'x',
  ｙ: 'y',
  ｚ: 'z',
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
  '／': '/',
  '（': '(',
  '）': ')',
  '－': '-',
  '＆': '&',
  '　': ' '
}

const normalizeString = str =>
  Array.from(str, c => NORMALIZE_MAP[c] || c).join('')

// Convert a given code to the edient code.
// In case of it is edinet code return itself.
// If it can not convert, returns null or undefined.
const toEdinetCode = code => {
  if (/^\d{4}$/.test(code)) {
    return getProperty(secToEdinet[`${code}0`], 'edinetCode')
  } else if (/^\d{5}$/.test(code)) {
    return getProperty(secToEdinet[code], 'edinetCode')
  } else if (/^[E|G]\d{5}$/.test(code)) {
    return code
  } else if (/^[e|g]\d{5}$/.test(code)) {
    return code.toUpperCase()
  }

  return null
}

const nameLookup = name => {
  const normName = normalizeString(name)
  return Object.keys(secToEdinet)
    .filter(secCode => {
      const item = secToEdinet[secCode]
      return (
        (item.name &&
          item.name.toUpperCase().indexOf(normName.toUpperCase()) >= 0) ||
        (item.ruby &&
          item.ruby.toUpperCase().indexOf(normName.toUpperCase()) >= 0) ||
        (item.englishName &&
          item.englishName.toUpperCase().indexOf(normName.toUpperCase()) >=
            0)
      )
    })
    .map(secCode => secToEdinet[secCode])
}

// wait msec
const waitPromise = ms => new Promise(resolve => setTimeout(resolve, ms))

// search file that match fileNameRex and return full paths
const getFiles = (folder, fileNameRex) =>
  fs
    .readdirSync(folder)
    .filter(fname => fileNameRex.test(fname))
    .map(fname => path.join(folder, fname))

const DOWLOAD_TMP_FILE_PTN = /\.crdownload$/

const eraseDownloadTmpFiles = dir => {
  try {
    const files = getFiles(dir, DOWLOAD_TMP_FILE_PTN)
    files.forEach(fname => fs.unlinkSync(fname))
  } catch (ex) {
    console.warn(ex)
  }
}

const setUpForDownload = async (page, downloadPath) => {
  fs.mkdirpSync(downloadPath)
  eraseDownloadTmpFiles(downloadPath)
  // set download behavior
  const client = await page.target().createCDPSession()
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath
  })
}

const waitDownloadFinish = async dir => {
  let count = 0
  while (count < 30) {
    await waitPromise(100)
    if (getFiles(dir, DOWLOAD_TMP_FILE_PTN).length > 0) {
      count = 0
    } else {
      count += 1
    }
  }
}

const downLoadFromUrl = async (page, url, fileName, downloadPath) => {
  await setUpForDownload(page, downloadPath)

  const dialogAccept = async dialog => {
    await dialog.accept()
  }
  page.on('dialog', dialogAccept)

  const createLinkAndClick = `var a=document.createElement('a');a.href='${url}';a.download='${fileName}';document.querySelector('body').appendChild(a); a.click()`
  await page.evaluate(createLinkAndClick)
  await waitDownloadFinish(downloadPath)

  page.removeListener('dialog', dialogAccept)
}

module.exports = {
  normalizeString,
  nameLookup,
  toEdinetCode,
  waitPromise,
  getFiles,
  setUpForDownload,
  waitDownloadFinish,
  downLoadFromUrl
}
