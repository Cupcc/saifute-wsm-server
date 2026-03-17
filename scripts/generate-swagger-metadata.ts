import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PluginMetadataGenerator } from "@nestjs/cli/lib/compiler/plugins/plugin-metadata-generator";
import { ReadonlyVisitor } from "@nestjs/swagger/dist/plugin";

const projectRoot = process.cwd();
const outputFileName = "swagger-metadata.ts";
const outputDir = join(projectRoot, "src");

async function main(): Promise<void> {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const generator = new PluginMetadataGenerator();
  await generator.generate({
    visitors: [
      new ReadonlyVisitor({
        classValidatorShim: true,
        introspectComments: true,
        pathToSource: join(projectRoot, "src"),
      }),
    ],
    outputDir,
    filename: outputFileName,
    tsconfigPath: "tsconfig.json",
    printDiagnostics: false,
  });
}

void main();
