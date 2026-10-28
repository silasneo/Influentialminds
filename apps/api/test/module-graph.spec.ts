import { describe, expect, it } from "vitest";
import type { DynamicModule, ForwardReference, Type } from "@nestjs/common";
import { AppModule } from "../src/app.module";

type ModuleRef =
  | Type<unknown>
  | DynamicModule
  | ForwardReference
  | Promise<unknown>;

interface ModuleNode {
  name: string;
  self: unknown;
  imports: ModuleNode[];
  providerTokens: Set<unknown>;
  exports: unknown[];
}

function metadata(target: unknown, key: string): unknown[] {
  const value = Reflect.getMetadata(key, target as object) as
    | unknown[]
    | undefined;
  return value ?? [];
}

function providerToken(provider: unknown): unknown {
  if (provider && typeof provider === "object" && "provide" in provider) {
    return (provider as { provide: unknown }).provide;
  }
  return provider;
}

/**
 * A module reference may be the class itself, a dynamic module object, or a
 * forward reference. Reduce all three to the owning class plus the metadata
 * that actually applies at runtime.
 */
function describeModule(ref: ModuleRef): ModuleNode | null {
  if (!ref) return null;
  if (ref instanceof Promise) return null;

  if (typeof ref === "object" && "forwardRef" in ref) {
    return describeModule((ref as ForwardReference).forwardRef() as ModuleRef);
  }

  const isDynamic = typeof ref === "object" && "module" in ref;
  const moduleClass = isDynamic
    ? (ref as DynamicModule).module
    : (ref as Type<unknown>);

  const staticImports = metadata(moduleClass, "imports");
  const staticProviders = metadata(moduleClass, "providers");
  const staticExports = metadata(moduleClass, "exports");

  const dynamic = isDynamic ? (ref as DynamicModule) : null;
  const imports = [...staticImports, ...(dynamic?.imports ?? [])];
  const providers = [...staticProviders, ...(dynamic?.providers ?? [])];
  const exports = [...staticExports, ...(dynamic?.exports ?? [])];

  return {
    name: moduleClass.name,
    self: moduleClass,
    imports: imports
      .map(entry => describeModule(entry as ModuleRef))
      .filter((node): node is ModuleNode => node !== null),
    providerTokens: new Set(providers.map(providerToken)),
    exports,
  };
}

function collect(root: ModuleNode): ModuleNode[] {
  const seen = new Set<unknown>();
  const all: ModuleNode[] = [];
  const walk = (node: ModuleNode): void => {
    if (seen.has(node.self)) return;
    seen.add(node.self);
    all.push(node);
    node.imports.forEach(walk);
  };
  walk(root);
  return all;
}

function describeToken(token: unknown): string {
  if (typeof token === "function") return token.name;
  if (typeof token === "symbol") return token.toString();
  return String(token);
}

/**
 * Nest only lets a module export a token it provides itself, or a module it
 * imports — re-exporting another module's provider token throws
 * UnknownExportException. That failure happens at bootstrap, so it survives
 * both the compiler and the unit tests. Walking the declared graph catches it
 * without a database or a DI container.
 */
describe("module graph", () => {
  const root = describeModule(AppModule);
  const modules = collect(root!);

  it("reaches every feature module from AppModule", () => {
    const names = modules.map(node => node.name);
    expect(names).toContain("AskModule");
    expect(names).toContain("AdminModule");
    expect(names).toContain("PrismaModule");
    expect(names).toContain("ConfigModule");
  });

  it("only exports its own providers or modules it imports", () => {
    const offences: string[] = [];

    for (const node of modules) {
      const importedModules = new Set<unknown>(
        node.imports.map(imported => imported.self)
      );

      for (const exported of node.exports) {
        const token = providerToken(exported);
        if (node.providerTokens.has(token)) continue;
        if (importedModules.has(token)) continue;
        offences.push(`${node.name} exports ${describeToken(token)}`);
      }
    }

    expect(offences).toEqual([]);
  });
});
