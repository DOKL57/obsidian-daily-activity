/** @format */

import DailyActivityPlugin from 'src/main'
import { App, getLinkpath, MarkdownView, Plugin } from 'obsidian'
import { Moment } from 'moment'

export class ActivityLogger {
  app: App
  plugin: Plugin

  constructor(app: App, plugin: DailyActivityPlugin) {
    this.app = app
    this.plugin = plugin
  }

  private getLinksToFilesModifiedOnDate(moment: Moment, makeLink=true) {
    let files = this.app.vault.getFiles()
    let links: string[] = []
    files.forEach((f) => {
      if (moment.isSame(new Date(f.stat.mtime), 'day')) {
        makeLink ? links.push(`[[${getLinkpath(f.path)}]]`) : links.push(getLinkpath(f.path))
      }
    })

    return links
  }

  private getLinksToFilesCreatedOnDate(moment: Moment, makeLink=true) {
    let files = this.app.vault.getFiles()
    let links: string[] = []
    files.forEach((f) => {
      if (moment.isSame(new Date(f.stat.ctime), 'day')) {
        makeLink ? links.push(`[[${getLinkpath(f.path)}]]`) : links.push(getLinkpath(f.path))
      }
    })

    return links
  }

  appendLinksToContent(existingContent: string, links: string[], header: string) {
    return (
      existingContent +
      `

${links.join('\n')}
`
    )
  }

  async insertActivityLog({
    insertCreatedOnDateFiles = false,
    insertModifiedOnDateFiles = false,
    moments = [window.moment()],
    activeView = null,
    makeLink = true
  }: {
    insertCreatedOnDateFiles?: boolean
    insertModifiedOnDateFiles?: boolean
    moments?: Moment[]
    activeView?: MarkdownView,
    makeLink?: boolean
  }) {
    if (activeView == null) {
      return
    }
    let editor = activeView.editor
    let doc = editor.getDoc()

    let content = await this.app.vault.read(activeView.file)
    let createdTodayLinks: string[] = []
    if (insertCreatedOnDateFiles) {
      createdTodayLinks = moments.flatMap((moment) => this.getLinksToFilesCreatedOnDate(moment, makeLink))
      console.log(createdTodayLinks.length, ' Files found created on these date(s): ', moments.map(m => m.date()))
      content = this.appendLinksToContent(content, createdTodayLinks, 'Created')
    }
    if (insertModifiedOnDateFiles) {
      let modifiedTodayLinks: string[] = moments.flatMap((moment) =>this.getLinksToFilesModifiedOnDate(moment, makeLink).filter(
        (link) => createdTodayLinks.indexOf(link) === -1
      ))
      console.log(modifiedTodayLinks.length, ' Files found modified on these date(s): ', moments.map(m => m.date()))
      content = this.appendLinksToContent(content, modifiedTodayLinks, 'Modified')
    }

    await this.app.vault.modify(activeView.file, content)
  }

  generateFileStatRow(moment: Moment, stats: string[]): string {
    let row = `|${moment.format('YYYY-MM-DD')}|`
    stats.forEach((stat) => {
      let statValue
      if (stat == 'created') {
        statValue = this.getLinksToFilesCreatedOnDate(moment).length
      }
      if (stat == 'modified') {
        statValue = this.getLinksToFilesModifiedOnDate(moment).length
      }

      row = row + `${statValue}|`
    })

    return row
  }

  generateFileStatHeader(stats: string[]): string {
    return (
      `| Date |` +
      stats.join(' | ') +
      `|
|-------|${stats.map((s) => '----------').join('|')}|`
    )
  }
  async insertFileStats({
    stats = ['created', 'modified'],
    moments = [window.moment()],
    activeView = null,
    allTime = false,
  }: {
    stats?: string[]
    moments?: Moment[]
    activeView?: MarkdownView
    allTime?: boolean
  }) {
    if (activeView == null) {
      return
    }

    let content = await this.app.vault.read(activeView.file)

    let header = this.generateFileStatHeader(stats)
    console.log(header)

    let rows: string[] = []
    moments.forEach((moment) => {
      console.log('Moment: ' + moment)

      rows.push(this.generateFileStatRow(moment, stats))
    })
    let table = header + `${'\n' + rows.join('\n')}`

    let newContent =
      content +
      `

${table}
`
    await this.app.vault.modify(activeView.file, newContent)
  }
}
