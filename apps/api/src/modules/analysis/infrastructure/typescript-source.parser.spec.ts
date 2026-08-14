import { describe, expect, it } from "vitest";

import { TypeScriptSourceParser } from "./typescript-source.parser.js";

describe("TypeScriptSourceParser", () => {
  const parser = new TypeScriptSourceParser();

  it("extracts basic declarations with deterministic locations", () => {
    const structure = parser.parse({
      path: "src/main.ts",
      language: "TYPESCRIPT",
      content: `
const x = 1;
let y = 2;
function hello(name: string) {}
class User {
  private id: string;
  public save(value: string) {}
}
interface UserData {}
type UserId = string;
enum Role {
  USER,
  ADMIN
}
`
    });

    expect(
      structure.declarations.map((declaration) => ({
        name: declaration.name,
        kind: declaration.kind,
        containerName: declaration.containerName,
        visibility: declaration.visibility
      }))
    ).toEqual([
      { name: "x", kind: "CONSTANT", containerName: null, visibility: null },
      { name: "y", kind: "VARIABLE", containerName: null, visibility: null },
      { name: "hello", kind: "FUNCTION", containerName: null, visibility: null },
      { name: "name", kind: "PARAMETER", containerName: "hello", visibility: null },
      { name: "User", kind: "CLASS", containerName: null, visibility: null },
      { name: "id", kind: "CLASS_PROPERTY", containerName: "User", visibility: "PRIVATE" },
      { name: "save", kind: "METHOD", containerName: "User", visibility: "PUBLIC" },
      { name: "value", kind: "PARAMETER", containerName: "save", visibility: null },
      { name: "UserData", kind: "INTERFACE", containerName: null, visibility: null },
      { name: "UserId", kind: "TYPE_ALIAS", containerName: null, visibility: null },
      { name: "Role", kind: "ENUM", containerName: null, visibility: null }
    ]);
    expect(structure.declarations[0]?.location).toEqual({
      start: 7,
      end: 12,
      startLine: 2,
      startColumn: 7,
      endLine: 2,
      endColumn: 12
    });
    expect(structure.issues).toEqual([]);
  });

  it("extracts import declarations without resolving modules", () => {
    const structure = parser.parse({
      path: "src/imports.ts",
      language: "TYPESCRIPT",
      content: `
import React from "react";
import { foo, bar as baz } from "./utils";
import * as utils from "./utils";
import type { User } from "./types";
`
    });

    expect(structure.imports).toEqual([
      {
        moduleSpecifier: "react",
        defaultImport: "React",
        namespaceImport: null,
        namedImports: [],
        typeOnly: false,
        location: expect.objectContaining({ startLine: 2 })
      },
      {
        moduleSpecifier: "./utils",
        defaultImport: null,
        namespaceImport: null,
        namedImports: [
          { name: "foo", alias: null },
          { name: "bar", alias: "baz" }
        ],
        typeOnly: false,
        location: expect.objectContaining({ startLine: 3 })
      },
      {
        moduleSpecifier: "./utils",
        defaultImport: null,
        namespaceImport: "utils",
        namedImports: [],
        typeOnly: false,
        location: expect.objectContaining({ startLine: 4 })
      },
      {
        moduleSpecifier: "./types",
        defaultImport: null,
        namespaceImport: null,
        namedImports: [{ name: "User", alias: null }],
        typeOnly: true,
        location: expect.objectContaining({ startLine: 5 })
      }
    ]);
  });

  it("extracts export declarations without creating relationships", () => {
    const structure = parser.parse({
      path: "src/exports.ts",
      language: "TYPESCRIPT",
      content: `
export const foo = 1;
export function bar() {}
export default foo;
export { bar as baz };
export * from "./utils";
`
    });

    expect(structure.exports).toEqual([
      {
        kind: "DECLARATION",
        name: "foo",
        moduleSpecifier: null,
        namedExports: [],
        location: expect.objectContaining({ startLine: 2 })
      },
      {
        kind: "DECLARATION",
        name: "bar",
        moduleSpecifier: null,
        namedExports: [],
        location: expect.objectContaining({ startLine: 3 })
      },
      {
        kind: "DEFAULT",
        name: "foo",
        moduleSpecifier: null,
        namedExports: [],
        location: expect.objectContaining({ startLine: 4 })
      },
      {
        kind: "NAMED",
        name: null,
        moduleSpecifier: null,
        namedExports: [{ name: "bar", alias: "baz" }],
        location: expect.objectContaining({ startLine: 5 })
      },
      {
        kind: "NAMESPACE",
        name: null,
        moduleSpecifier: "./utils",
        namedExports: [],
        location: expect.objectContaining({ startLine: 6 })
      }
    ]);
  });

  it("parses TypeScript generic functions and class members", () => {
    const structure = parser.parse({
      path: "src/generic.ts",
      language: "TYPESCRIPT",
      content: `
export interface Box<T> {}
export type Id = string;
export enum Role { USER }
export function identity<T>(value: T): T { return value; }
export class Service {
  protected value = 1;
  run(input: string) {}
}
`
    });

    expect(structure.issues).toEqual([]);
    expect(structure.declarations.map((declaration) => declaration.kind)).toEqual([
      "INTERFACE",
      "TYPE_ALIAS",
      "ENUM",
      "FUNCTION",
      "PARAMETER",
      "CLASS",
      "CLASS_PROPERTY",
      "METHOD",
      "PARAMETER"
    ]);
  });

  it.each([
    ["src/view.tsx", "TYPESCRIPT_TSX", "const element = <div />;"],
    ["src/view.jsx", "JAVASCRIPT_JSX", "const element = <div />;"],
    ["src/main.js", "JAVASCRIPT", "function run(value) { return value; }"],
    ["src/main.mjs", "JAVASCRIPT", "export const value = 1;"],
    ["src/main.cjs", "JAVASCRIPT", "module.exports = {};"],
    ["src/main.mts", "TYPESCRIPT", "export const value: string = 'ok';"],
    ["src/main.cts", "TYPESCRIPT", "export const value: string = 'ok';"]
  ] as const)("parses supported source file %s", (path, language, content) => {
    expect(parser.parse({ path, language, content }).issues).toEqual([]);
  });

  it("returns deterministic parse issues for malformed source", () => {
    const structure = parser.parse({
      path: "src/broken.ts",
      language: "TYPESCRIPT",
      content: "function {"
    });

    expect(structure.issues).toEqual([
      {
        code: "PARSE_ERROR",
        message: "Identifier expected."
      },
      {
        code: "PARSE_ERROR",
        message: "'}' expected."
      }
    ]);
  });

  it("returns a deterministic empty-source issue", () => {
    expect(
      parser.parse({
        path: "src/empty.ts",
        language: "TYPESCRIPT",
        content: ""
      }).issues
    ).toEqual([
      {
        code: "EMPTY_SOURCE",
        message: "Source file is empty."
      }
    ]);
  });

  it("is deterministic for identical input", () => {
    const input = {
      path: "src/main.ts",
      language: "TYPESCRIPT" as const,
      content: "export const value = 1;"
    };

    expect(parser.parse(input)).toEqual(parser.parse(input));
  });
});
