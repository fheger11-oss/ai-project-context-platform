import ts from "typescript";

import type {
  SourceParser,
  SourceParserInput
} from "../domain/contracts/source-parser.contract.js";
import type {
  SourceDeclaration,
  SourceDeclarationKind,
  SourceVisibility
} from "../domain/source-structure/source-declaration.js";
import type { SourceExport } from "../domain/source-structure/source-export.js";
import type { SourceFileStructure } from "../domain/source-structure/source-file-structure.js";
import type { SourceImport, SourceNamedImport } from "../domain/source-structure/source-import.js";
import type { SourceLocation } from "../domain/source-structure/source-location.js";

type ParsedSourceFile = ts.SourceFile & {
  parseDiagnostics?: readonly ts.Diagnostic[];
};

export class TypeScriptSourceParser implements SourceParser {
  parse(input: SourceParserInput): SourceFileStructure {
    const sourceFile = ts.createSourceFile(
      input.path,
      input.content,
      ts.ScriptTarget.Latest,
      true,
      this.scriptKind(input)
    );
    const imports: SourceImport[] = [];
    const exports: SourceExport[] = [];
    const declarations: SourceDeclaration[] = [];

    const visit = (node: ts.Node, containerName: string | null = null): void => {
      if (ts.isImportDeclaration(node)) {
        imports.push(this.parseImport(node, sourceFile));
      }

      if (ts.isExportDeclaration(node)) {
        exports.push(this.parseExportDeclaration(node, sourceFile));
      }

      if (ts.isExportAssignment(node)) {
        exports.push(this.parseExportAssignment(node, sourceFile));
      }

      if (ts.isFunctionDeclaration(node)) {
        this.addFunctionDeclaration(node, sourceFile, declarations, exports);
      }

      if (ts.isClassDeclaration(node)) {
        this.addClassDeclaration(node, sourceFile, declarations, exports);
        for (const member of node.members) {
          this.visitClassMember(member, sourceFile, declarations, node.name?.text ?? null);
        }
      } else if (ts.isInterfaceDeclaration(node)) {
        this.addNamedDeclaration("INTERFACE", node, sourceFile, declarations, exports);
      } else if (ts.isTypeAliasDeclaration(node)) {
        this.addNamedDeclaration("TYPE_ALIAS", node, sourceFile, declarations, exports);
      } else if (ts.isEnumDeclaration(node)) {
        this.addNamedDeclaration("ENUM", node, sourceFile, declarations, exports);
      } else if (ts.isVariableStatement(node)) {
        this.addVariableDeclarations(node, sourceFile, declarations, exports);
      }

      if (!ts.isClassDeclaration(node)) {
        ts.forEachChild(node, (child) => visit(child, containerName));
      }
    };

    visit(sourceFile);

    return {
      path: input.path,
      language: input.language,
      imports,
      exports,
      declarations,
      issues: this.parseIssues(sourceFile, input.content)
    };
  }

  private scriptKind(input: SourceParserInput): ts.ScriptKind {
    switch (input.language) {
      case "TYPESCRIPT_TSX":
        return ts.ScriptKind.TSX;
      case "JAVASCRIPT":
        return ts.ScriptKind.JS;
      case "JAVASCRIPT_JSX":
        return ts.ScriptKind.JSX;
      case "TYPESCRIPT":
        return ts.ScriptKind.TS;
    }
  }

  private parseIssues(sourceFile: ts.SourceFile, content: string): SourceFileStructure["issues"] {
    if (content.trim() === "") {
      return [
        {
          code: "EMPTY_SOURCE",
          message: "Source file is empty."
        }
      ];
    }

    const diagnostics = (sourceFile as ParsedSourceFile).parseDiagnostics ?? [];

    return diagnostics.map((diagnostic) => ({
      code: "PARSE_ERROR",
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    }));
  }

  private parseImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): SourceImport {
    const importClause = node.importClause;
    const namedBindings = importClause?.namedBindings;

    return {
      moduleSpecifier: this.moduleSpecifierText(node.moduleSpecifier) ?? "",
      defaultImport: importClause?.name?.text ?? null,
      namespaceImport:
        namedBindings && ts.isNamespaceImport(namedBindings) ? namedBindings.name.text : null,
      namedImports:
        namedBindings && ts.isNamedImports(namedBindings)
          ? namedBindings.elements.map((element) => this.parseNamedImport(element))
          : [],
      typeOnly: importClause?.isTypeOnly === true,
      location: this.location(node, sourceFile)
    };
  }

  private parseNamedImport(element: ts.ImportSpecifier): SourceNamedImport {
    return {
      name: element.propertyName?.text ?? element.name.text,
      alias: element.propertyName ? element.name.text : null
    };
  }

  private parseExportDeclaration(
    node: ts.ExportDeclaration,
    sourceFile: ts.SourceFile
  ): SourceExport {
    const exportClause = node.exportClause;

    if (exportClause && ts.isNamedExports(exportClause)) {
      return {
        kind: "NAMED",
        name: null,
        moduleSpecifier: this.moduleSpecifierText(node.moduleSpecifier),
        namedExports: exportClause.elements.map((element) => ({
          name: element.propertyName?.text ?? element.name.text,
          alias: element.propertyName ? element.name.text : null
        })),
        location: this.location(node, sourceFile)
      };
    }

    return {
      kind: "NAMESPACE",
      name: null,
      moduleSpecifier: this.moduleSpecifierText(node.moduleSpecifier),
      namedExports: [],
      location: this.location(node, sourceFile)
    };
  }

  private parseExportAssignment(
    node: ts.ExportAssignment,
    sourceFile: ts.SourceFile
  ): SourceExport {
    return {
      kind: node.isExportEquals ? "EXPORT_ASSIGNMENT" : "DEFAULT",
      name: node.expression.getText(sourceFile),
      moduleSpecifier: null,
      namedExports: [],
      location: this.location(node, sourceFile)
    };
  }

  private addFunctionDeclaration(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    declarations: SourceDeclaration[],
    exports: SourceExport[]
  ): void {
    if (!node.name) {
      this.addDeclarationExport(node, "default", sourceFile, exports);
      return;
    }

    declarations.push(this.declaration("FUNCTION", node.name.text, node, sourceFile));
    this.addDeclarationExport(node, node.name.text, sourceFile, exports);
    for (const parameter of node.parameters) {
      this.addParameterDeclaration(parameter, sourceFile, declarations, node.name.text);
    }
  }

  private addClassDeclaration(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    declarations: SourceDeclaration[],
    exports: SourceExport[]
  ): void {
    const name = node.name?.text ?? "default";

    declarations.push(this.declaration("CLASS", name, node, sourceFile));
    this.addDeclarationExport(node, name, sourceFile, exports);
  }

  private visitClassMember(
    node: ts.ClassElement,
    sourceFile: ts.SourceFile,
    declarations: SourceDeclaration[],
    containerName: string | null
  ): void {
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      declarations.push(
        this.declaration(
          "METHOD",
          node.name.text,
          node,
          sourceFile,
          containerName,
          this.visibility(node)
        )
      );
      for (const parameter of node.parameters) {
        this.addParameterDeclaration(parameter, sourceFile, declarations, node.name.text);
      }
      return;
    }

    if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
      declarations.push(
        this.declaration(
          "CLASS_PROPERTY",
          node.name.text,
          node,
          sourceFile,
          containerName,
          this.visibility(node)
        )
      );
    }
  }

  private addNamedDeclaration(
    kind: SourceDeclarationKind,
    node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration,
    sourceFile: ts.SourceFile,
    declarations: SourceDeclaration[],
    exports: SourceExport[]
  ): void {
    declarations.push(this.declaration(kind, node.name.text, node, sourceFile));
    this.addDeclarationExport(node, node.name.text, sourceFile, exports);
  }

  private addVariableDeclarations(
    node: ts.VariableStatement,
    sourceFile: ts.SourceFile,
    declarations: SourceDeclaration[],
    exports: SourceExport[]
  ): void {
    const kind = (node.declarationList.flags & ts.NodeFlags.Const) !== 0 ? "CONSTANT" : "VARIABLE";

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) {
        continue;
      }

      declarations.push(this.declaration(kind, declaration.name.text, declaration, sourceFile));
      this.addDeclarationExport(node, declaration.name.text, sourceFile, exports);
    }
  }

  private addParameterDeclaration(
    node: ts.ParameterDeclaration,
    sourceFile: ts.SourceFile,
    declarations: SourceDeclaration[],
    containerName: string
  ): void {
    if (!ts.isIdentifier(node.name)) {
      return;
    }

    declarations.push(
      this.declaration("PARAMETER", node.name.text, node, sourceFile, containerName)
    );
  }

  private addDeclarationExport(
    node: ts.Node,
    name: string,
    sourceFile: ts.SourceFile,
    exports: SourceExport[]
  ): void {
    if (!this.hasExportModifier(node)) {
      return;
    }

    exports.push({
      kind: this.hasDefaultModifier(node) ? "DEFAULT" : "DECLARATION",
      name,
      moduleSpecifier: null,
      namedExports: [],
      location: this.location(node, sourceFile)
    });
  }

  private declaration(
    kind: SourceDeclarationKind,
    name: string,
    node: ts.Node,
    sourceFile: ts.SourceFile,
    containerName: string | null = null,
    visibility: SourceVisibility | null = null
  ): SourceDeclaration {
    return {
      name,
      kind,
      location: this.location(node, sourceFile),
      containerName,
      visibility
    };
  }

  private visibility(node: ts.Node): SourceVisibility | null {
    if (!ts.canHaveModifiers(node)) {
      return null;
    }

    const modifiers = ts.getModifiers(node) ?? [];

    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)) {
      return "PRIVATE";
    }

    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ProtectedKeyword)) {
      return "PROTECTED";
    }

    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.PublicKeyword)) {
      return "PUBLIC";
    }

    return null;
  }

  private hasExportModifier(node: ts.Node): boolean {
    return (
      ts.canHaveModifiers(node) &&
      (ts.getModifiers(node) ?? []).some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
    );
  }

  private hasDefaultModifier(node: ts.Node): boolean {
    return (
      ts.canHaveModifiers(node) &&
      (ts.getModifiers(node) ?? []).some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
      )
    );
  }

  private moduleSpecifierText(moduleSpecifier: ts.Expression | undefined): string | null {
    if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
      return null;
    }

    return moduleSpecifier.text;
  }

  private location(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
    const endPosition = sourceFile.getLineAndCharacterOfPosition(end);

    return {
      start,
      end,
      startLine: startPosition.line + 1,
      startColumn: startPosition.character + 1,
      endLine: endPosition.line + 1,
      endColumn: endPosition.character + 1
    };
  }
}
