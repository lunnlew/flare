import { readFile } from 'fs/promises';
import { fetch } from 'undici';
import { detectAndParse } from '../../parsers/index.js';
import { swaggerHubParser } from '../../parsers/swaggerhub.js';
import { gitStore, indexStore } from '../../storage/index.js';
import { buildAuthHeaders, buildAuthUrl, type AuthConfig } from '../../utils/auth.js';

export async function addCommand(args: string[]) {
  // 解析 CLI 参数
  const parsedArgs = parseArgs(args);
  const source = parsedArgs._[0];

  if (!source) {
    console.error('Usage: flare-api add <source> [--auth-location <header|cookie|query|path>] [--auth-key <key>] [--auth-value <value>]');
    process.exit(1);
  }

  console.log(`Importing API from: ${source}`);

  // 构建 auth 配置
  const auth: AuthConfig | undefined = buildAuthConfig(parsedArgs);

  let content: string;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const url = buildAuthUrl(source, auth);
    const urlObj = new URL(source);
    const referer = `${urlObj.protocol}//${urlObj.host}/api/doc.html`;
    const response = await fetch(url, {
      headers: {
        ...buildAuthHeaders(auth),
        Referer: referer,
      },
    });
    content = await response.text();
    (parsedArgs as any)._referer = referer;
  } else {
    content = await readFile(source, 'utf-8');
  }

  console.log('Detecting format...');

  await gitStore.init();

  // Swagger Hub 批量导入
  if (swaggerHubParser.detect(content)) {
    try {
      const apis = await swaggerHubParser.parseAll(content, { sourceUrl: source, auth, referer: (parsedArgs as any)._referer });

      if (apis.length > 1) {
        console.log(`Found ${apis.length} APIs, importing all...`);
      }

      for (const api of apis) {
        console.log(`\nParsed: ${api.name} v${api.version}`);
        console.log(`Endpoints: ${api.endpoints.length}`);
        await gitStore.saveAPI(api);
        console.log(`Saved to .flare/apis/${api.name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
      }

      const allApis = await gitStore.listAPIs();
      await indexStore.buildIndex(allApis);

      console.log(`\nTotal: ${apis.length} API(s) imported`);
      return;
    } catch (error) {
      console.warn('Swagger Hub batch import failed, falling back to single import:', error);
    }
  }

  // 单 API 格式
  try {
    const api = await detectAndParse(content);

    console.log(`Parsed: ${api.name} v${api.version}`);
    console.log(`Endpoints: ${api.endpoints.length}`);

    await gitStore.saveAPI(api);

    const apis = await gitStore.listAPIs();
    await indexStore.buildIndex(apis);

    console.log(`Saved to .flare/apis/${api.name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
  } catch (parseError) {
    console.error('Failed to parse:', parseError);
    process.exit(1);
  }
}

interface ParsedArgs {
  _: string[];
  [key: string]: string | string[];
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = { _: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i += 2;
      } else {
        result[key] = 'true';
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }

  return result;
}

function buildAuthConfig(parsedArgs: ParsedArgs): AuthConfig | undefined {
  const location = parsedArgs['auth-location'] as string | undefined;
  const cookie = parsedArgs['auth-cookie'] as string | undefined;

  // 如果直接传了完整 cookie 字符串
  if (cookie) {
    return {
      location: 'header',
      key: 'Cookie',
      value: cookie,
    };
  }

  const key = parsedArgs['auth-key'] as string | undefined;
  const value = parsedArgs['auth-value'] as string | undefined;

  if (!key || !value) {
    return undefined;
  }

  return {
    location: (location as any) || 'header',
    key,
    value,
  };
}