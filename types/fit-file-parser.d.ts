declare module 'fit-file-parser' {
  interface FitParserOptions {
    force?: boolean
    speedUnit?: 'km/h' | 'm/s' | 'mph'
    lengthUnit?: 'km' | 'm' | 'mi'
    temperatureUnit?: 'celsius' | 'fahrenheit'
    elapsedRecordField?: boolean
  }

  type ParseCallback = (err: Error | null, data: Record<string, unknown>) => void

  class FitParser {
    constructor(options?: FitParserOptions)
    parse(content: ArrayBuffer | Buffer, callback: ParseCallback): void
  }

  export default FitParser
}
