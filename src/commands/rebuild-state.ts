import { validateMemory } from "../core/validator";

interface RebuildStateCommandOptions {
  rootDir: string;
}

interface RebuildStateCommandDependencies {
  onOutput?: (message: string) => void;
  onError?: (message: string) => void;
}

export function runRebuildStateCommand(
  options: RebuildStateCommandOptions,
  dependencies: RebuildStateCommandDependencies = {}
): number {
  const onOutput = dependencies.onOutput ?? (() => {});
  const onError = dependencies.onError ?? (() => {});

  const validation = validateMemory(options.rootDir);
  if (!validation.ok) {
    onError(`Memory structure is invalid: ${validation.errors.join("; ")}`);
    return 1;
  }

  onOutput("State rebuilt");
  return 0;
}
