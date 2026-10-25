// File errors, kept apart from the parsers so the page can use them without loading SheetJS.
export class UnsupportedFileError extends Error {
  constructor() {
    super('Only .csv and .xlsx files are supported.')
    this.name = 'UnsupportedFileError'
  }
}

export class UnreadableFileError extends Error {
  constructor() {
    super('This file could not be read. Check that it opens in Excel, then try again.')
    this.name = 'UnreadableFileError'
  }
}
