import type { API } from '../ir/index.js';
import { openApiParser } from './openapi.js';
import { openApi2Parser } from './openapi-2.js';
import { asyncApiParser } from './asyncapi.js';
import { graphqlParser } from './graphql.js';
import { postmanParser } from './postman.js';
import { httpParser } from './http.js';
import { swaggerHubParser } from './swaggerhub.js';
import { harParser } from './har.js';

// Parser 接口
export interface Parser {
  name: string;
  detect(source: string): boolean;
  parse(source: string): Promise<API>;
}

// Parser 注册表
export const parsers = new Map<string, Parser>();

export function registerParser(parser: Parser) {
  parsers.set(parser.name, parser);
}

export function getParser(name: string): Parser | undefined {
  return parsers.get(name);
}

export async function detectAndParse(source: string): Promise<API> {
  for (const parser of parsers.values()) {
    if (parser.detect(source)) {
      return await parser.parse(source);
    }
  }
  throw new Error('无法识别格式');
}

export async function detectAndParseAll(source: string): Promise<API[]> {
  // 优先处理多 API 格式
  if (swaggerHubParser.detect(source)) {
    return (swaggerHubParser as any).parseAll(source);
  }

  // 单 API 格式
  const api = await detectAndParse(source);
  return [api];
}

// Register all Parser (parseAll not in Parser interface, call separately)
registerParser(openApiParser);
registerParser(openApi2Parser);
registerParser(asyncApiParser);
registerParser(graphqlParser);
registerParser(postmanParser);
registerParser(httpParser);
registerParser(harParser);
// swaggerHubParser has parseAll, call separately