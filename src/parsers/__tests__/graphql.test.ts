import { describe, test, expect } from 'vitest';
import { graphqlParser } from '../../parsers/graphql.js';

describe('parsers - GraphQL', () => {
  describe('detect', () => {
    test('[主体] 检测 type Query', () => {
      expect(graphqlParser.detect('type Query { users: [User] }')).toBe(true);
    });

    test('[主体] 检测 type Mutation', () => {
      expect(graphqlParser.detect('type Mutation { createUser: User }')).toBe(true);
    });

    test('[主体] 检测 schema 定义', () => {
      expect(graphqlParser.detect('schema { query: Query }')).toBe(true);
    });

    test('[主体] 检测 type Subscription', () => {
      expect(graphqlParser.detect('type Subscription { onMessage: Message }')).toBe(true);
    });

    test('[边界] 拒绝 OpenAPI', () => {
      expect(graphqlParser.detect('{"openapi":"3.0.0"}')).toBe(false);
    });

    test('[边界] 拒绝无效内容', () => {
      expect(graphqlParser.detect('not graphql at all')).toBe(false);
    });
  });

  describe('parse', () => {
    test('[主体] 解析简单的 Query 类型', async () => {
      const schema = `
type Query {
  users: [User]
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.name).toBe('GraphQL Schema');
      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].path).toBe('/graphql/users');
      expect(api.endpoints[0].method).toBe('POST');
    });

    test('[主体] 解析带参数的 Query', async () => {
      const schema = `
type Query {
  user(id: ID!): User
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].parameters).toBeDefined();
      expect(api.endpoints[0].parameters![0].name).toBe('id');
    });

    test('[主体] 解析 Mutation', async () => {
      const schema = `
type Mutation {
  createUser(name: String!): User
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].method).toBe('POST');
      expect(api.endpoints[0].path).toContain('createUser');
    });

    test('[主体] 解析 Subscription', async () => {
      const schema = `
type Subscription {
  onMessage(id: ID!): Message
}
type Message {
  id: ID!
  content: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].method).toBe('SUBSCRIBE');
    });

    test('[主体] 解析多个操作类型', async () => {
      const schema = `
type Query {
  users: [User]
}
type Mutation {
  createUser(name: String!): User
}
type Subscription {
  onUserCreated: User
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(3);
      const methods = api.endpoints.map(e => e.method);
      expect(methods).toContain('POST'); // Query and Mutation
      expect(methods).toContain('SUBSCRIBE');
    });

    test('[主体] 解析带描述的字段', async () => {
      const schema = `
type Query {
  "Get all users"
  users: [User]
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(1);
    });

    test('[主体] 解析 input 类型', async () => {
      const schema = `
input CreateUserInput {
  name: String!
  email: String!
}
type Query {
  createUser(input: CreateUserInput): User
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(1);
    });

    test('[主体] 解析带默认值的参数', async () => {
      const schema = `
type Query {
  users(limit: Int = 10): [User]
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints[0].parameters).toBeDefined();
      expect(api.endpoints[0].parameters![0].default).toBe('10');
    });

    test('[主体] 解析嵌套类型', async () => {
      const schema = `
type Query {
  user: User
}
type User {
  id: ID!
  profile: Profile
}
type Profile {
  bio: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(1);
      expect(api.endpoints[0].path).toBe('/graphql/user');
    });

    test('[主体] 解析 URL 配置', async () => {
      const schema = `
schema url: "https://api.example.com/graphql"
type Query {
  users: [User]
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.baseUrl).toBe('https://api.example.com/graphql');
    });

    test('[主体] 处理列表类型', async () => {
      const schema = `
type Query {
  users: [User]
}
type User {
  id: ID!
  name: String
}
`;
      const api = await graphqlParser.parse(schema);

      expect(api.endpoints).toHaveLength(1);
    });

    test('[边界] 空 schema', async () => {
      const api = await graphqlParser.parse('# Just comments');

      expect(api.name).toBe('GraphQL Schema');
      expect(api.endpoints).toHaveLength(0);
    });
  });
});