import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compressDir } from '../../../src/lib/backup/archive.js'

describe('backup/archive', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hsar-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    rmSync(`${dir}.tar.gz`, { force: true })
  })

  it('compressDir creates a .tar.gz of the directory', async () => {
    mkdirSync(join(dir, 'sub'), { recursive: true })
    writeFileSync(join(dir, 'a.json'), '{"hello":1}')
    writeFileSync(join(dir, 'sub', 'b.json'), '{"hello":2}')

    const out = await compressDir(dir)
    expect(out).toBe(`${dir}.tar.gz`)
    expect(existsSync(out)).toBe(true)
    expect(statSync(out).size).toBeGreaterThan(0)
  })
})
