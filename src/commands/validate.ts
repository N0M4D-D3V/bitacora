import { validateMemory } from "../core/validator";

interface ValidateCommandOptions {
  rootDir: string;
  json: boolean;
}

interface ValidateCommandDependencies {
  onOutput?: (message: string) => void;
}

export function runValidateCommand(
  options: ValidateCommandOptions,
  dependencies: ValidateCommandDependencies = {}
): number {
  const onOutput = dependencies.onOutput ?? (() => {});
  const result = validateMemory(options.rootDir);

  if (options.json) {
    onOutput(`${JSON.stringify(result, null, 2)}\n`);
    return result.ok ? 0 : 1;
  }

  if (result.ok) {
    onOutput("Validation passed");
    return 0;
  }

  onOutput("Validation failed");
  for (const error of result.errors) {
    onOutput(error);
  }
  return 1;
}
