/**
 * 원본 데이터 내려받기 — kt-dashboard 의 data/*.js 를 tools/.cache 에 저장한다.
 *
 *   node tools/fetch-source.mjs         캐시에 없는 것만 받음
 *   node tools/fetch-source.mjs --force 전부 다시 받음
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { CACHE_DIR, SOURCE_FILES, SOURCE_ORIGIN } from './source-files.mjs';

const FETCH_TIMEOUT_MS = 30_000;
const USER_AGENT = 'kt-index-build/1.0';

const exists = async (path) => access(path).then(() => true, () => false);

async function download(name) {
  const url = `${SOURCE_ORIGIN}/data/${name}.js`;
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  if (!body.includes('KT.data')) {
    throw new Error(`${url} → KT.data 를 담고 있지 않은 응답 (${body.length} bytes)`);
  }
  return body;
}

async function main() {
  const force = process.argv.includes('--force');
  await mkdir(CACHE_DIR, { recursive: true });

  for (const name of SOURCE_FILES) {
    const target = join(CACHE_DIR, `${name}.js`);

    if (!force && (await exists(target))) {
      console.log(`skip   ${name}.js (캐시 있음)`);
      continue;
    }

    const body = await download(name);
    await writeFile(target, body, 'utf8');
    console.log(`fetch  ${name}.js — ${body.length.toLocaleString()} bytes`);
  }

  console.log(`\n완료 → ${CACHE_DIR}`);
}

main().catch((error) => {
  console.error(`\n다운로드 실패: ${error.message}`);
  process.exit(1);
});
